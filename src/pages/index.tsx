import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useQualitySnapshotList } from '@/generated/hooks/use-quality-snapshot';
import { useScenarioList } from '@/generated/hooks/use-scenario';
import { useTaskList } from '@/generated/hooks/use-task';
import { QualitySnapshotCards } from '@/components/quality-snapshot-cards';
import { ScenarioBreakdownTable } from '@/components/scenario-breakdown-table';
import { TaskSummaryTable } from '@/components/task-summary-table';
import { Button } from '@/components/ui/button';

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

export default function HomePage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const { data: qualitySnapshots, isLoading: isLoadingSnapshots } = useQualitySnapshotList();
  const { data: scenarios, isLoading: isLoadingScenarios } = useScenarioList();
  const { data: tasks, isLoading: isLoadingTasks } = useTaskList();

  // Use the first quality snapshot for the summary cards
  const qualitySnapshot = qualitySnapshots?.[0];

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['qualitySnapshot-list'] }),
      queryClient.invalidateQueries({ queryKey: ['scenario-list'] }),
      queryClient.invalidateQueries({ queryKey: ['task-list'] }),
    ]);
    setLastSynced(new Date());
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <motion.header
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="sticky top-0 z-50 bg-white border-t-[6px] border-t-emerald border-b border-border shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <img src="/logo.png" alt="WaFd Bank Logo" className="h-9 w-auto" />
            </div>

            {/* Center: Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-xl font-bold text-emerald tracking-tight whitespace-nowrap">
                Agentic Chat Test Report
              </h1>
            </div>

            {/* Right: Refresh Button & Last Synced */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                Last Synced: {lastSynced ? formatTimestamp(lastSynced) : '--:--:--'}
              </span>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-slate-blue hover:bg-slate-blue/90 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Quality Snapshot Section */}
          <section>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-4"
            >
              <h2 className="text-lg font-semibold text-emerald tracking-tight">
                Quality Snapshot
              </h2>
              <p className="text-sm text-muted-foreground">
                Overall test execution summary
              </p>
            </motion.div>
            <QualitySnapshotCards
              data={qualitySnapshot}
              isLoading={isLoadingSnapshots}
            />
          </section>

          {/* Scenario Breakdown Section */}
          <section>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-4"
            >
              <h2 className="text-lg font-semibold text-emerald tracking-tight">
                Test Coverage
              </h2>
              <p className="text-sm text-muted-foreground">
                Detailed breakdown by scenario
              </p>
            </motion.div>
            <ScenarioBreakdownTable
              scenarios={scenarios ?? []}
              isLoading={isLoadingScenarios}
            />
          </section>

          {/* Task Summary Section */}
          <section className="pb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-4"
            >
              <h2 className="text-lg font-semibold text-emerald tracking-tight">
                Execution Details
              </h2>
              <p className="text-sm text-muted-foreground">
                Individual task performance metrics
              </p>
            </motion.div>
            <TaskSummaryTable
              tasks={tasks ?? []}
              isLoading={isLoadingTasks}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </section>
        </div>
      </main>

      {/* Subtle footer gradient */}
      <div className="h-1 bg-gradient-to-r from-emerald via-slate-blue to-crimson opacity-30" />
    </div>
  );
}
