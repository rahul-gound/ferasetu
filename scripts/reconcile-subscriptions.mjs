/**
 * scripts/reconcile-subscriptions.mjs
 * 
 * Reconciles FeraSetu billing state across users, organizations, transactions,
 * and provisions authoritative rows in the new `subscriptions` table.
 * 
 * Flags:
 *   --dry-run (default) : Analyzes database state and prints proposed changes without modifying anything.
 *   --apply             : Executes the reconciliation SQL statements against remote D1.
 * 
 * Usage:
 *   node scripts/reconcile-subscriptions.mjs [--dry-run | --apply]
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerDir = path.resolve(__dirname, '../worker');

const isApply = process.argv.includes('--apply');
const isDryRun = !isApply || process.argv.includes('--dry-run');

console.log('='.repeat(70));
console.log(`FeraSetu Subscription State Reconciliation`);
console.log(`Mode: ${isApply ? 'APPLY (PRODUCTION WRITES ENABLED)' : 'DRY-RUN (READ-ONLY ANALYSIS)'}`);
console.log('='.repeat(70));

function runD1Query(sql) {
  const sanitizedSql = sql.replace(/"/g, '\\"');
  const cmd = `npx wrangler d1 execute DB --remote --json --command="${sanitizedSql}"`;
  const stdout = execSync(cmd, { cwd: workerDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed) && parsed[0] && parsed[0].results) {
      return parsed[0].results;
    }
    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse D1 JSON output: ${err.message}\nRaw output: ${stdout}`);
  }
}

async function main() {
  console.log('\n[1/4] Fetching remote database state...');
  
  const users = runD1Query('SELECT id, email, name, plan, market, trial_ends_at, trial_started_at, created_at FROM users;');
  console.log(`Fetched ${users.length} users.`);

  const orgs = runD1Query('SELECT id, name, plan, created_at FROM organizations;');
  console.log(`Fetched ${orgs.length} organizations.`);

  const orgMembers = runD1Query('SELECT organization_id, user_id, role FROM organization_members;');
  console.log(`Fetched ${orgMembers.length} organization members.`);

  const transactions = runD1Query('SELECT id, user_id, organization_id, provider, provider_order_id, provider_payment_id, amount, currency, status, plan, billing_cycle, metadata, created_at FROM transactions;');
  console.log(`Fetched ${transactions.length} transactions.`);

  const existingSubs = runD1Query('SELECT id, user_id, organization_id, plan, status, trial_used FROM subscriptions;');
  console.log(`Fetched ${existingSubs.length} existing subscriptions.`);

  const userOrgMap = new Map();
  for (const m of orgMembers) {
    if (!userOrgMap.has(m.user_id)) {
      userOrgMap.set(m.user_id, m.organization_id);
    }
  }

  console.log('\n[2/4] Analyzing reconciliation requirements...');

  const plannedSubscriptions = [];
  const plannedUserUpdates = [];
  const plannedOrgUpdates = [];
  const plannedTxUpdates = [];
  const sqlStatements = [];

  const now = new Date().toISOString();

  for (const user of users) {
    const userId = user.id;
    const orgId = userOrgMap.get(userId) || null;
    const userTxs = transactions.filter(t => t.user_id === userId);
    
    // Check if user has completed or intended paid subscription transactions
    const paidSubTx = userTxs.find(t => 
      t.provider === 'cashfree' && 
      (t.plan === 'pro' || t.plan === 'growth' || t.plan === 'business') &&
      (t.status === 'completed' || t.id === '71907c72-e3fa-439b-935b-ff57bb3f36ac')
    );

    let plan = 'free';
    let status = 'free';
    let trialUsed = 0;
    let trialStartedAt = null;
    let trialEndsAt = null;
    let currentPeriodStart = null;
    let currentPeriodEnd = null;
    let paymentProvider = null;
    let providerOrderId = null;
    let providerPaymentId = null;
    let repairReason = '';

    // Special repair for user_01M1QV37J3DRK73T5N9W03ZTPS (Known affected customer)
    if (userId === 'user_01M1QV37J3DRK73T5N9W03ZTPS' || (paidSubTx && paidSubTx.id === '71907c72-e3fa-439b-935b-ff57bb3f36ac')) {
      plan = 'pro';
      status = 'active';
      trialUsed = 1; // User paid for plan; trial consumed
      const txTime = paidSubTx?.created_at || '2026-09-15T09:20:11.005Z';
      currentPeriodStart = txTime;
      const periodEnd = new Date(new Date(txTime).getTime() + 30 * 24 * 60 * 60 * 1000);
      currentPeriodEnd = periodEnd.toISOString();
      paymentProvider = 'cashfree';
      providerOrderId = paidSubTx?.provider_order_id || '71907c72-e3fa-439b-935b-ff57bb3f36ac';
      providerPaymentId = '6920002988'; // CF order ID from Cashfree metadata
      repairReason = 'Customer paid INR 1 for Pro plan (Order 71907c72-e3fa-439b-935b-ff57bb3f36ac, CF 6920002988). Repairing unactivated Pro status.';

      // Transaction update from pending -> completed
      if (paidSubTx && paidSubTx.status !== 'completed') {
        plannedTxUpdates.push({
          id: paidSubTx.id,
          oldStatus: paidSubTx.status,
          newStatus: 'completed',
          providerPaymentId: '6920002988'
        });
        sqlStatements.push(`UPDATE transactions SET status = 'completed', provider_payment_id = '6920002988', updated_at = '${now}' WHERE id = '${paidSubTx.id}'`);
      }
    } else if (paidSubTx && paidSubTx.status === 'completed') {
      plan = paidSubTx.plan;
      status = 'active';
      trialUsed = 1;
      currentPeriodStart = paidSubTx.created_at;
      currentPeriodEnd = new Date(new Date(paidSubTx.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      paymentProvider = paidSubTx.provider;
      providerOrderId = paidSubTx.provider_order_id;
      providerPaymentId = paidSubTx.provider_payment_id;
      repairReason = `Completed paid subscription transaction ${paidSubTx.id} found.`;
    } else {
      // Historical trial analysis
      const isHistoricalTrial = user.plan === 'trial' || 
        user.trial_ends_at !== null || 
        user.trial_started_at !== null ||
        (user.created_at && (new Date().getTime() - new Date(user.created_at).getTime() > 14 * 24 * 60 * 60 * 1000));

      if (isHistoricalTrial) {
        trialUsed = 1;
        trialStartedAt = user.trial_started_at || user.created_at;
        trialEndsAt = user.trial_ends_at || new Date(new Date(trialStartedAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
        
        const isExpired = new Date(trialEndsAt).getTime() < new Date().getTime();
        if (user.market === 'IN') {
          // India market has permanent free tier
          plan = 'free';
          status = 'free';
          repairReason = 'India user with consumed trial. Mapped to authoritative free status with trial_used = 1.';
        } else {
          plan = isExpired ? 'free' : (user.plan || 'trial');
          status = isExpired ? 'expired' : 'trial';
          repairReason = isExpired 
            ? 'International user with expired trial. Mapped to expired free status with trial_used = 1.'
            : 'Active trial in progress.';
        }
      } else {
        // Fresh user or permanent free
        plan = 'free';
        status = 'free';
        trialUsed = 0;
        repairReason = 'Fresh user. Initialized free subscription with trial_used = 0.';
      }
    }

    plannedSubscriptions.push({
      userId,
      email: user.email || '(no email)',
      orgId,
      plan,
      status,
      trialUsed,
      currentPeriodStart,
      currentPeriodEnd,
      paymentProvider,
      providerOrderId,
      providerPaymentId,
      reason: repairReason
    });

    // Subscriptions upsert statement
    const subId = `sub_${userId}`;
    const metaStr = JSON.stringify({ reconciled_at: now, reason: repairReason });
    sqlStatements.push(`INSERT INTO subscriptions (
      id, user_id, organization_id, plan, status, trial_used,
      trial_started_at, trial_ends_at, current_period_start, current_period_end,
      cancel_at_period_end, payment_provider, provider_order_id, provider_payment_id,
      metadata, created_at, updated_at
    ) VALUES (
      '${subId}', '${userId}', ${orgId ? `'${orgId}'` : 'NULL'}, '${plan}', '${status}', ${trialUsed},
      ${trialStartedAt ? `'${trialStartedAt}'` : 'NULL'}, ${trialEndsAt ? `'${trialEndsAt}'` : 'NULL'},
      ${currentPeriodStart ? `'${currentPeriodStart}'` : 'NULL'}, ${currentPeriodEnd ? `'${currentPeriodEnd}'` : 'NULL'},
      0, ${paymentProvider ? `'${paymentProvider}'` : 'NULL'}, ${providerOrderId ? `'${providerOrderId}'` : 'NULL'}, ${providerPaymentId ? `'${providerPaymentId}'` : 'NULL'},
      '${metaStr.replace(/'/g, "''")}', '${now}', '${now}'
    ) ON CONFLICT(user_id) DO UPDATE SET
      organization_id = excluded.organization_id,
      plan = excluded.plan,
      status = excluded.status,
      trial_used = MAX(subscriptions.trial_used, excluded.trial_used),
      trial_started_at = COALESCE(subscriptions.trial_started_at, excluded.trial_started_at),
      trial_ends_at = COALESCE(subscriptions.trial_ends_at, excluded.trial_ends_at),
      current_period_start = COALESCE(excluded.current_period_start, subscriptions.current_period_start),
      current_period_end = COALESCE(excluded.current_period_end, subscriptions.current_period_end),
      payment_provider = COALESCE(excluded.payment_provider, subscriptions.payment_provider),
      provider_order_id = COALESCE(excluded.provider_order_id, subscriptions.provider_order_id),
      provider_payment_id = COALESCE(excluded.provider_payment_id, subscriptions.provider_payment_id),
      metadata = excluded.metadata,
      updated_at = excluded.updated_at`);

    // Compatibility mirror updates
    plannedUserUpdates.push({ userId, plan, trialUsed });
    sqlStatements.push(`UPDATE users SET plan = '${plan}', trial_used = ${trialUsed}, updated_at = '${now}' WHERE id = '${userId}'`);

    if (orgId) {
      plannedOrgUpdates.push({ orgId, plan, trialUsed });
      sqlStatements.push(`UPDATE organizations SET plan = '${plan}', trial_used = ${trialUsed}, updated_at = '${now}' WHERE id = '${orgId}'`);
    }
  }

  console.log('\n[3/4] Reconciliation Plan Summary:');
  console.log(`- Subscriptions to insert/update: ${plannedSubscriptions.length}`);
  console.log(`- Users to mirror:               ${plannedUserUpdates.length}`);
  console.log(`- Organizations to mirror:       ${plannedOrgUpdates.length}`);
  console.log(`- Transactions to reconcile:     ${plannedTxUpdates.length}`);

  console.log('\nDetailed User Subscriptions Plan:');
  console.table(plannedSubscriptions.map(s => ({
    userId: s.userId.length > 20 ? s.userId.substring(0, 18) + '...' : s.userId,
    email: s.email.length > 25 ? s.email.substring(0, 22) + '...' : s.email,
    plan: s.plan,
    status: s.status,
    trialUsed: s.trialUsed,
    provider: s.paymentProvider || 'none',
    reason: s.reason.substring(0, 50) + '...'
  })));

  if (plannedTxUpdates.length > 0) {
    console.log('\nDetailed Transaction Updates:');
    console.table(plannedTxUpdates);
  }

  console.log(`\nGenerated ${sqlStatements.length} SQL statements for execution.`);

  if (isDryRun) {
    console.log('\n' + '='.repeat(70));
    console.log('DRY-RUN COMPLETE — NO PRODUCTION DATA WAS ALTERED.');
    console.log('To apply these changes to remote D1, run:');
    console.log('  node scripts/reconcile-subscriptions.mjs --apply');
    console.log('='.repeat(70));
    return;
  }

  // If --apply was provided
  console.log('\n[4/4] Applying reconciliation SQL to remote D1 database...');
  const tempFile = path.resolve(workerDir, '_temp_reconciliation.sql');
  const fullSql = sqlStatements.join(';\n') + ';';
  fs.writeFileSync(tempFile, fullSql, 'utf-8');
  try {
    const cmd = `npx wrangler d1 execute DB --remote --file=_temp_reconciliation.sql`;
    const stdout = execSync(cmd, { cwd: workerDir, encoding: 'utf-8' });
    console.log(stdout);
    console.log('\n RECONCILIATION SUCCESSFULLY APPLIED TO PRODUCTION D1!');
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

main().catch(err => {
  console.error('\n Reconciliation failed with error:');
  console.error(err);
  process.exit(1);
});
