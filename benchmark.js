function generateMockRuns(scenario) {
  const totalRuns = scenario.totaltests ?? 5;
  const passed = scenario.passed ?? 0;
  const failed = scenario.failed ?? 0;
  const runs = [];

  for (let i = 0; i < Math.min(totalRuns, 8); i++) {
    const isPass = i < passed;
    const isFail = i >= passed && i < passed + failed;
    runs.push({
      id: `${scenario.id}-run-${i}`,
      runNumber: totalRuns - i,
      startedAt: new Date(Date.now() - (i * 86400000)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      duration: `${Math.floor(Math.random() * 5) + 1}m ${Math.floor(Math.random() * 60)}s`,
      status: isPass ? 'pass' : isFail ? 'fail' : 'running',
      passedTests: isPass ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * 5),
      failedTests: isFail ? Math.floor(Math.random() * 5) + 1 : 0,
    });
  }
  return runs;
}

const scenario = { id: 'test', totaltests: 50, passed: 45, failed: 5 };

const start = performance.now();
for (let i = 0; i < 100000; i++) {
    generateMockRuns(scenario);
}
const end = performance.now();

console.log(`Execution time for 100,000 renders: ${end - start}ms`);
