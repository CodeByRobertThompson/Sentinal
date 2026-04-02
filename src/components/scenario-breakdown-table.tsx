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
      <div className="px-8 py-4 bg-[oklch(0.97_0.005_250)] border-t border-border">
        <div className="rounded-lg border border-border overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[oklch(0.96_0.008_250)] hover:bg-[oklch(0.96_0.008_250)]">
                <TableHead className="font-semibold text-emerald py-3 px-4 text-sm">Run #</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-sm">Started At</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-sm">Duration</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-center text-sm">Passed</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-center text-sm">Failed</TableHead>
                <TableHead className="font-semibold text-emerald py-3 text-center text-sm">Status</TableHead>
                <TableHead className="font-semibold text-emerald py-3 px-4 text-right text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run: ScenarioRun, index: number) => (
                <TableRow 
                  key={run.id} 
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[oklch(0.99_0.002_250)]'}`}
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
                  <TableCell className="px-4 py-3 text-right">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-slate-blue hover:bg-slate-blue/90 text-white font-medium gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Show Details
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
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-emerald px-6 py-4 rounded-t-lg">
          <CardTitle className="text-lg font-semibold text-white tracking-tight">
            Scenario Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[oklch(0.97_0.005_250)] hover:bg-[oklch(0.97_0.005_250)]">
                  <TableHead className="font-semibold text-emerald py-4 px-6 w-[40%]">Name</TableHead>
                  <TableHead className="font-semibold text-emerald py-4 text-center">Total Runs</TableHead>
                  <TableHead className="font-semibold text-emerald py-4 text-center">Pass Rate</TableHead>
                  <TableHead className="font-semibold text-emerald py-4 text-center">Last Status</TableHead>
                  <TableHead className="font-semibold text-emerald py-4 px-6 text-right">Actions</TableHead>
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
                      <TableCell className="px-6 text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : scenarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No scenario data available
                    </TableCell>
                  </TableRow>
                ) : (
                  scenarios.map((scenario: Scenario, index: number) => (
                    <React.Fragment key={scenario.id}>
                      <TableRow className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[oklch(0.98_0.003_250)]'}`}>
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
                        <TableCell className="px-6 text-right">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => toggleRow(scenario.id)}
                            className="bg-slate-blue hover:bg-slate-blue/90 text-white font-medium gap-1.5"
                          >
                            {expandedRows.has(scenario.id) ? (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Hide Runs
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-4 w-4" />
                                Show
                              </>
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
