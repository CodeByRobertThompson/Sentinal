import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Scenario } from '@/generated/models/scenario-model';

interface ScenarioBreakdownTableProps {
  scenarios: Scenario[];
  isLoading: boolean;
}

const tableVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

// Simulated run data for nested table
interface ScenarioRun {
  id: string;
  runNumber: number;
  startedAt: string;
  duration: string;
  status: 'pass' | 'fail' | 'running';
  passedTests: number;
  failedTests: number;
}

function generateMockRuns(scenario: Scenario): ScenarioRun[] {
  const totalRuns = scenario.totaltests ?? 5;
  const passed = scenario.passed ?? 0;
  const failed = scenario.failed ?? 0;
  const runs: ScenarioRun[] = [];
  
  // Generate mock runs based on scenario data
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

function getLastStatus(scenario: Scenario): 'pass' | 'fail' | 'running' {
  const passRate = scenario.passratepercent ?? 0;
  if (passRate >= 90) return 'pass';
  if (passRate < 50) return 'fail';
  return 'running';
}

function StatusBadge({ status }: { status: 'pass' | 'fail' | 'running' }) {
  switch (status) {
    case 'pass':
      return (
        <Badge className="bg-emerald-light text-emerald border-0 font-semibold px-3 py-1 gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Pass
        </Badge>
      );
    case 'fail':
      return (
        <Badge className="bg-crimson-light text-crimson border-0 font-semibold px-3 py-1 gap-1.5">
          <XCircle className="h-3.5 w-3.5" />
          Fail
        </Badge>
      );
    case 'running':
      return (
        <Badge className="bg-[oklch(0.96_0.02_250)] text-slate-blue border-0 font-semibold px-3 py-1 gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Running
        </Badge>
      );
  }
}

interface NestedRunsTableProps {
  scenario: Scenario;
}

function NestedRunsTable({ scenario }: NestedRunsTableProps) {
  const runs = generateMockRuns(scenario);
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' as const }}
      className="overflow-hidden"
    >
      <div className="px-8 py-4 bg-[oklch(0.97_0.005_250)] dark:bg-muted/20 border-t border-border flex flex-col gap-4">
        {scenario.testScript && (
          <div className="rounded-lg border border-[#30363d] overflow-hidden bg-[#0d1117] text-[#c9d1d9] font-mono text-sm leading-relaxed p-5 shadow-inner relative">
             <div className="absolute top-0 right-0 bg-[#161b22] text-xs px-3 py-1.5 text-emerald font-semibold rounded-bl-lg border-l border-b border-[#30363d] shadow-sm flex items-center gap-2">
               <span>tests/scenario.spec.ts</span>
             </div>
             <pre className="overflow-x-auto custom-scrollbar pt-2">
               <code>{scenario.testScript}</code>
             </pre>
          </div>
        )}
        <div className="rounded-lg border border-border overflow-hidden bg-white dark:bg-background/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-[oklch(0.96_0.008_250)] dark:bg-muted/40 hover:bg-[oklch(0.96_0.008_250)] dark:hover:bg-muted/40">
                <TableHead className="font-semibold text-emerald py-3 px-4 text-sm">Run #</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-sm">Started At</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-sm">Duration</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-center text-sm">Passed</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-center text-sm">Failed</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-center text-sm">Status</TableHead>
                <TableHead className="print:hidden font-semibold text-emerald py-3 px-4 text-right text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run: ScenarioRun, index: number) => (
                <TableRow 
                  key={run.id} 
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-background/50' : 'bg-[oklch(0.99_0.002_250)] dark:bg-muted/10'}`}
                >
                  <TableCell className="px-4 py-3 font-mono text-sm font-medium">#{run.runNumber}</TableCell>
                  <TableCell className="py-3 text-sm">{run.startedAt}</TableCell>
                  <TableCell className="py-3 font-mono text-sm">{run.duration}</TableCell>
                  <TableCell className="py-3 text-center">
                    <span className="text-emerald font-semibold font-mono text-sm">{run.passedTests}</span>
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <span className="text-crimson font-semibold font-mono text-sm">{run.failedTests}</span>
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <StatusBadge status={run.status} />
                  </TableCell>
                  <TableCell className="print:hidden px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-slate-blue hover:bg-slate-100 h-8 w-8 rounded-full transition-colors"
                      title="Show Details"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
}

export function ScenarioBreakdownTable({ scenarios, isLoading }: ScenarioBreakdownTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const totalPages = Math.ceil(scenarios.length / pageSize);
  const currentScenarios = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return scenarios.slice(start, start + pageSize);
  }, [scenarios, currentPage, pageSize]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <motion.div
      variants={tableVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="border-0 shadow-sm p-0 gap-0 sm:p-0 overflow-hidden">
        <CardHeader className="bg-emerald px-6 py-4 rounded-t-xl">
          <CardTitle className="text-lg font-semibold text-white tracking-tight">
            Scenario Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto overflow-x-auto print:max-h-none print:overflow-visible custom-scrollbar relative block">
            <Table>
              <TableHeader className="sticky top-0 z-20 shadow-sm bg-white dark:bg-card">
                <TableRow className="bg-[oklch(0.97_0.005_250)] dark:bg-muted/40 hover:bg-[oklch(0.97_0.005_250)] dark:hover:bg-muted/40">
                  <TableHead className="font-semibold text-emerald py-4 px-6 w-[40%]">Name</TableHead>
                  <TableHead className="font-semibold text-emerald py-4 text-center">Total Runs</TableHead>
                  <TableHead className="font-semibold text-emerald py-4 text-center">Pass Rate</TableHead>
                  <TableHead className="font-semibold text-emerald py-4 text-center">Last Status</TableHead>
                  <TableHead className="print:hidden font-semibold text-emerald py-4 px-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(4)].map((_, i: number) => (
                    <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[oklch(0.98_0.003_250)]'}>
                      <TableCell className="px-6 py-4"><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell className="print:hidden px-6 text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : currentScenarios.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                       No scenario data available
                     </TableCell>
                  </TableRow>
                ) : (
                  currentScenarios.map((scenario: Scenario, index: number) => (
                    <React.Fragment key={scenario.id}>
                      <TableRow className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-background/50' : 'bg-[oklch(0.98_0.003_250)] dark:bg-muted/20'}`}>
                        <TableCell className="px-6 py-4 font-medium">{scenario.scenarioname}</TableCell>
                        <TableCell className="text-center font-mono text-sm font-semibold">{scenario.totaltests ?? 0}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-semibold font-mono ${
                              (scenario.passratepercent ?? 0) >= 70 ? 'text-emerald' : 'text-crimson'
                            }`}
                          >
                            {(scenario.passratepercent ?? 0).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={getLastStatus(scenario)} />
                        </TableCell>
                        <TableCell className="print:hidden px-6 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRow(scenario.id)}
                            className="text-muted-foreground hover:text-slate-blue hover:bg-slate-100 h-8 w-8 rounded-full transition-colors"
                            title={expandedRows.has(scenario.id) ? "Hide Runs" : "Show Runs"}
                          >
                            {expandedRows.has(scenario.id) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(scenario.id) && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={5} className="p-0">
                            <NestedRunsTable scenario={scenario} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-white dark:bg-card">
              <span className="text-sm text-muted-foreground font-medium">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, scenarios.length)} of {scenarios.length} entries
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-transparent dark:border-border"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-transparent dark:border-border"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
