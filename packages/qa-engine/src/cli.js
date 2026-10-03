#!/usr/bin/env node
/**
 * FeraSetu QA Engine CLI Runner
 * =============================
 * Usage:
 *   node src/cli.js --mode smoke --url http://localhost:5173
 *   node src/cli.js --mode full --url https://ferasetu.com
 */

import { QARunOrchestrator } from './orchestrator.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'smoke',
    targetUrl: 'http://localhost:5173',
    environment: 'local',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
      options.mode = args[i + 1];
      i++;
    } else if (args[i] === '--url' && args[i + 1]) {
      options.targetUrl = args[i + 1];
      i++;
    } else if (args[i] === '--env' && args[i + 1]) {
      options.environment = args[i + 1];
      i++;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  console.log(`\n================================================================`);
  console.log(`🔍 FeraSetu QA Control Plane - Autonomous Reliability Scanner`);
  console.log(`================================================================`);
  console.log(`Target:      ${options.targetUrl}`);
  console.log(`Scan Mode:   ${options.mode.toUpperCase()}`);
  console.log(`Environment: ${options.environment}\n`);

  const orchestrator = new QARunOrchestrator({
    mode: options.mode,
    targetUrl: options.targetUrl,
    environment: options.environment,
  });

  const result = await orchestrator.run({
    onProgress: (status) => {
      process.stdout.write(`\r[${status.progress_percent}%] ${status.current_step}...        `);
    },
  });

  console.log(`\n\n────────────────────────────────────────────────────────────────`);
  console.log(`📊 SCAN RESULTS (Run: ${result.runId})`);
  console.log(`────────────────────────────────────────────────────────────────`);
  console.log(`Duration:              ${(result.duration_ms / 1000).toFixed(2)}s`);
  console.log(`Routes Scanned:        ${result.routes_tested} / ${result.routes_discovered}`);
  console.log(`Buttons Tested:        ${result.buttons_tested}`);
  console.log(`Images Tested:         ${result.images_tested}`);
  console.log(`Issues Discovered:     ${result.issues.length}`);
  console.log(`  - P0 (Catastrophic): ${result.p0_count}`);
  console.log(`  - P1 (Critical):     ${result.p1_count}`);
  console.log(`  - P2 (Degraded):     ${result.p2_count}`);
  console.log(`  - P3 (Minor):        ${result.p3_count}\n`);

  if (result.issues.length > 0) {
    console.log(`🚨 DISCOVERED ISSUES:`);
    result.issues.forEach((issue, idx) => {
      console.log(`\n[#${idx + 1}] [${issue.severity}] ${issue.title}`);
      console.log(`     Route:    ${issue.route}`);
      console.log(`     Category: ${issue.category}`);
      console.log(`     Summary:  ${issue.observedSummary}`);
      if (issue.likelySubsystem) {
        console.log(`     Subsystem: ${issue.likelySubsystem}`);
      }
    });
  } else {
    console.log(`✅ All automated checks passed cleanly! Zero defects observed.`);
  }

  console.log(`\n================================================================\n`);
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
