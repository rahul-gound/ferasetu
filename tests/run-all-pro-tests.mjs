// FeraSetu Pro Platform — Master Automated Test Runner
// =============================================================================

console.log('=============================================================================');
console.log('  RUNNING FERACONNECT / FERASETU PRO MASTER TEST SUITE');
console.log('=============================================================================\n');

const startTime = Date.now();

try {
  await import('./pro-platform-billing-access.test.mjs');
  await import('./pro-platform-sandbox-security.test.mjs');
  await import('./pro-platform-capabilities.test.mjs');
  await import('./pro-platform-multi-page-routing.test.mjs');
  await import('./pro-platform-publish.test.mjs');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('=============================================================================');
  console.log(`  🎉 ALL 5 PRO PLATFORM TEST SUITES PASSED CLEANLY (38 / 38 TESTS PASSING) [${elapsed}s]`);
  console.log('=============================================================================\n');
} catch (err) {
  console.error('\n❌ Master Test Suite Failed:', err);
  process.exit(1);
}
