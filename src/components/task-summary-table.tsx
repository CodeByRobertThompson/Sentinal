import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, RefreshCw, ChevronsUpDown, CheckCircle2, XCircle, Clock, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Task, TaskStatusKey } from '@/generated/models/task-model';
import { TaskStatusKeyToLabel } from '@/generated/models/task-model';

interface TaskSummaryTableProps {
  tasks: Task[];
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const tableVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

function getStatusIcon(statusKey?: TaskStatusKey) {
  switch (statusKey) {
    case 'StatusKey0': // Pass
      return <CheckCircle2 className="h-4 w-4 text-emerald" />;
    case 'StatusKey1': // Fail
      return <XCircle className="h-4 w-4 text-crimson" />;
    case 'StatusKey2': // In Progress
      return <Clock className="h-4 w-4 text-slate-blue" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(statusKey?: TaskStatusKey) {
  const label = statusKey ? TaskStatusKeyToLabel[statusKey] : 'Unknown';
  
  switch (statusKey) {
    case 'StatusKey0': // Pass
      return (
        <Badge className="bg-emerald-light text-emerald border-0 font-semibold px-3 py-1 gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {label}
        </Badge>
      );
    case 'StatusKey1': // Fail
      return (
        <Badge className="bg-crimson-light text-crimson border-0 font-semibold px-3 py-1 gap-1.5">
          <XCircle className="h-3.5 w-3.5" />
          {label}
        </Badge>
      );
    case 'StatusKey2': // In Progress
      return (
        <Badge className="bg-[oklch(0.96_0.02_250)] text-slate-blue border-0 font-semibold px-3 py-1 gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {label}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="font-semibold px-3 py-1">
          Unknown
        </Badge>
      );
  }
}

// Types for transcript messages
interface TranscriptMessage {
  id: string;
  role: 'human' | 'ai';
  content: string;
  timestamp: string;
  latencyMs?: number;
}

// Generate mock transcript data for a task
function generateMockTranscript(task: Task): TranscriptMessage[] {
  const turns = task.dialogueturns ?? 4;
  const messages: TranscriptMessage[] = [];
  const baseTime = new Date();
  baseTime.setMinutes(baseTime.getMinutes() - turns * 2);

  const humanMessages = [
    "Hello, I need help with my account settings.",
    "Can you show me where to find the billing section?",
    "I'd like to update my payment method.",
    "Also, can you confirm my subscription tier?",
    "Perfect, that's all I needed.",
    "One more thing - how do I enable notifications?",
    "Thanks for your help!",
  ];

  const aiMessages = [
    "Hello! Welcome to our support service. I'm here to help you with your account. What would you like to do today?",
    "Of course! You can find the billing section by going to Settings > Account > Billing & Payments. Would you like me to walk you through it?",
    "Absolutely! To update your payment method, click on 'Payment Methods' and then 'Add New Card'. You can also remove existing methods from there.",
    "Your current subscription is the Professional tier, which includes unlimited access to all features and priority support.",
    "You're welcome! Don't hesitate to reach out if you have any other questions.",
    "For notifications, go to Settings > Preferences > Notifications. You can customize email, push, and SMS alerts there.",
    "My pleasure! Have a great day!",
  ];

  for (let i = 0; i < turns; i++) {
    const humanTime = new Date(baseTime.getTime() + i * 120000);
    const aiTime = new Date(humanTime.getTime() + Math.random() * 3000 + 500);

    // Human message
    messages.push({
      id: `${task.id}-human-${i}`,
      role: 'human',
      content: humanMessages[i % humanMessages.length],
      timestamp: humanTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });

    // AI response
    messages.push({
      id: `${task.id}-ai-${i}`,
      role: 'ai',
      content: aiMessages[i % aiMessages.length],
      timestamp: aiTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      latencyMs: Math.floor((aiTime.getTime() - humanTime.getTime())),
    });
  }

  return messages;
}

interface TaskDetailsProps {
  task: Task;
}

function ChatBubble({ message }: { message: TranscriptMessage }) {
  const isHuman = message.role === 'human';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className={`flex flex-col ${isHuman ? 'items-end' : 'items-start'} mb-3`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isHuman
            ? 'bg-emerald text-white rounded-br-md'
            : 'bg-[oklch(0.96_0.005_250)] text-foreground rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
      <div className={`flex items-center gap-2 mt-1 px-1 ${isHuman ? 'flex-row-reverse' : ''}`}>
        <span className="text-[10px] text-muted-foreground font-medium">{message.timestamp}</span>
        {message.latencyMs && (
          <span className="text-[10px] text-muted-foreground/70 font-mono">{message.latencyMs}ms</span>
        )}
      </div>
    </motion.div>
  );
}

function PerformanceMetric({ label, value, unit, highlight }: { label: string; value: string | number; unit?: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-border/50 p-4 hover:shadow-sm transition-shadow">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-emerald' : 'text-slate-blue'}`}>
        {value}{unit && <span className="text-sm font-medium text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function TaskDetails({ task }: TaskDetailsProps) {
  const transcript = generateMockTranscript(task);
  const initialGreetingTime = transcript.length > 0 && transcript[1]?.latencyMs ? (transcript[1].latencyMs / 1000).toFixed(2) : '1.24';
  const goalEvaluation = task.statusKey === 'StatusKey0' ? 'Achieved' : task.statusKey === 'StatusKey1' ? 'Not Achieved' : 'In Progress';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="overflow-hidden"
    >
      <div className="px-6 py-5 bg-gradient-to-b from-[oklch(0.97_0.008_250)] to-[oklch(0.98_0.004_250)] border-t border-border">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Performance Metrics */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-slate-blue rounded-full" />
              <h4 className="text-sm font-bold text-slate-blue uppercase tracking-wider">Performance</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PerformanceMetric
                label="Dialogue Turns"
                value={task.dialogueturns ?? 0}
              />
              <PerformanceMetric
                label="Avg Latency"
                value={task.advlatencys?.toFixed(2) ?? '—'}
                unit="s"
              />
              <PerformanceMetric
                label="Initial Greeting"
                value={initialGreetingTime}
                unit="s"
              />
              <PerformanceMetric
                label="Goal Evaluation"
                value={goalEvaluation}
                highlight={goalEvaluation === 'Achieved'}
              />
            </div>
          </div>

          {/* Right Column - Transcript */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-emerald rounded-full" />
              <h4 className="text-sm font-bold text-slate-blue uppercase tracking-wider">Transcript</h4>
            </div>
            <div className="flex-1 bg-white rounded-xl border border-border/50 shadow-inner overflow-hidden">
              <div className="max-h-[280px] overflow-y-auto p-4 custom-scrollbar">
                {transcript.map((message: TranscriptMessage) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function TaskSummaryTable({ tasks, isLoading, onRefresh, isRefreshing }: TaskSummaryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const filteredTasks = tasks.filter((task: Task) =>
    task.taskname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(filteredTasks.map((t: Task) => t.id)));
    }
    setAllExpanded(!allExpanded);
  };

  return (
    <motion.div
      variants={tableVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-slate-blue px-6 py-4 rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-white tracking-tight">
              Task Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleExpandAll}
                className="bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <ChevronsUpDown className="h-4 w-4 mr-1.5" />
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Search Bar */}
          <div className="p-4 border-b border-border bg-[oklch(0.99_0.002_260)]">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by task name..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[oklch(0.97_0.005_250)] hover:bg-[oklch(0.97_0.005_250)]">
                  <TableHead className="w-10" />
                  <TableHead className="font-semibold text-slate-blue py-4 px-6">Task Name</TableHead>
                  <TableHead className="font-semibold text-slate-blue py-4 text-center">Dialogue Turns</TableHead>
                  <TableHead className="font-semibold text-slate-blue py-4 text-center">Avg Latency (s)</TableHead>
                  <TableHead className="font-semibold text-slate-blue py-4 text-center">Status</TableHead>
                  <TableHead className="font-semibold text-slate-blue py-4 px-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i: number) => (
                    <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[oklch(0.98_0.003_250)]'}>
                      <TableCell className="w-10" />
                      <TableCell className="px-6 py-4"><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell className="px-6 text-right"><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No tasks match your search' : 'No task data available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task: Task, index: number) => (
                    <React.Fragment key={task.id}>
                      <TableRow className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[oklch(0.98_0.003_250)]'}`}>
                        <TableCell className="w-10 pl-4">
                          {getStatusIcon(task.statusKey)}
                        </TableCell>
                        <TableCell className="px-6 py-4 font-medium">{task.taskname}</TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {task.dialogueturns ?? '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {task.advlatencys ? task.advlatencys.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(task.statusKey)}
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => toggleRow(task.id)}
                            className="bg-emerald hover:bg-emerald/90 text-white font-medium gap-1.5"
                          >
                            {expandedRows.has(task.id) ? (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" />
                                Show Details
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      <AnimatePresence>
                        {expandedRows.has(task.id) && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="p-0">
                              <TaskDetails task={task} />
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
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
