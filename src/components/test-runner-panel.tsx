import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Play, Loader2, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, ChevronRight, MessageSquare, Clock, Zap,
  Bot, User, RotateCcw, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress-bar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { generateTestScripts } from '@/lib/gemini-api';
import { TestRunner } from '@/lib/test-runner';
import { createTalkdeskConnector } from '@/lib/talkdesk-connector';
import type { TestScript, TestRunResult } from '@/models/test-script-models';

// ─── Sub-Components ──────────────────────────────────────────────

function StatusIcon({ status }: { status: 'pass' | 'fail' | 'error' | 'pending' | 'running' }) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-4 w-4 text-emerald" />;
    case 'fail':
      return <XCircle className="h-4 w-4 text-crimson" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-slate-blue animate-spin" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: 'pass' | 'fail' | 'error' }) {
  const config = {
    pass: { bg: 'bg-emerald-light text-emerald', label: 'Pass' },
    fail: { bg: 'bg-crimson-light text-crimson', label: 'Fail' },
    error: { bg: 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400', label: 'Error' },
  };
  const c = config[status];
  return (
    <Badge className={`${c.bg} border-0 font-semibold px-3 py-1 gap-1.5`}>
      <StatusIcon status={status} />
      {c.label}
    </Badge>
  );
}

// ─── Transcript Viewer ──────────────────────────────────────────

function TranscriptViewer({ result }: { result: TestRunResult }) {
  return (
    <div className="space-y-3 p-4">
      {/* Step Results */}
      <div className="space-y-2">
        {result.stepResults.map((sr, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 ${
              sr.passed
                ? 'border-emerald/30 bg-emerald/5'
                : 'border-crimson/30 bg-crimson/5'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{sr.latencyMs}ms</span>
                <StatusIcon status={sr.passed ? 'pass' : 'fail'} />
              </div>
            </div>
            <div className="space-y-2">
              {/* User message */}
              <div className="flex gap-2">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-blue/10 flex items-center justify-center">
                  <User className="h-3 w-3 text-slate-blue" />
                </div>
                <div className="bg-slate-blue/10 rounded-lg rounded-tl-none px-3 py-2 text-sm max-w-[85%]">
                  {sr.step.userMessage}
                </div>
              </div>
              {/* Bot response */}
              <div className="flex gap-2 justify-end">
                <div className={`rounded-lg rounded-tr-none px-3 py-2 text-sm max-w-[85%] ${
                  sr.passed ? 'bg-emerald/10' : 'bg-crimson/10'
                }`}>
                  {sr.actualResponse || <span className="italic text-muted-foreground">{sr.error || 'No response'}</span>}
                </div>
                <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                  sr.passed ? 'bg-emerald/10' : 'bg-crimson/10'
                }`}>
                  <Bot className={`h-3 w-3 ${sr.passed ? 'text-emerald' : 'text-crimson'}`} />
                </div>
              </div>
              {/* Expected pattern */}
              <div className="text-xs text-muted-foreground pl-8">
                <span className="font-medium">Expected:</span>{' '}
                <code className="bg-muted/50 px-1.5 py-0.5 rounded text-[11px]">{sr.step.expectedResponsePattern}</code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Script Card ──────────────────────────────────────────────

interface ScriptCardProps {
  script: TestScript;
  result?: TestRunResult;
  isRunning: boolean;
  runningStatus?: string;
  runningProgress?: number;
  onRun: (script: TestScript) => void;
  onRemove: (id: string) => void;
}

function ScriptCard({ script, result, isRunning, runningStatus, runningProgress, onRun, onRemove }: ScriptCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-background/50 transition-shadow hover:shadow-sm">
      {/* Header Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-slate-blue transition-colors"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{script.name}</span>
            {script.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{script.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground font-mono">{script.steps.length} steps</span>

          {result && <StatusBadge status={result.status} />}

          {isRunning ? (
            <Button size="sm" disabled className="min-w-[80px]">
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Running
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => onRun(script)}
                    className="bg-emerald hover:bg-emerald/90 text-white min-w-[80px]"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Run
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Execute this script against Talkdesk</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemove(script.id)}
            className="h-8 w-8 text-muted-foreground hover:text-crimson"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress bar during execution */}
      {isRunning && (
        <div className="px-4 pb-2">
          <Progress value={runningProgress ?? 0} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground mt-1">{runningStatus}</p>
        </div>
      )}

      {/* Expanded: show steps or results */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border"
          >
            {result ? (
              <div>
                {/* Error banner if fatal error */}
                {result.status === 'error' && result.errorMessage && (
                  <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Execution Failed</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5 break-all">{result.errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Result summary bar */}
                <div className="flex items-center gap-4 px-4 py-2 bg-muted/20 text-xs">
                  <span>
                    <span className="font-semibold text-emerald">{result.passedSteps}</span> passed
                  </span>
                  <span>
                    <span className="font-semibold text-crimson">{result.failedSteps}</span> failed
                  </span>
                  <span>
                    <Zap className="h-3 w-3 inline mr-0.5" />
                    <span className="font-mono">{result.avgLatencyMs}ms</span> avg
                  </span>
                  {result.conversationId && (
                    <span className="text-muted-foreground">
                      Conversation: <code className="text-[10px]">{result.conversationId.slice(0, 12)}…</code>
                    </span>
                  )}
                </div>
                {result.stepResults.length > 0 && <TranscriptViewer result={result} />}
              </div>
            ) : (
              /* Preview steps before running */
              <div className="px-4 py-3 space-y-2">
                {script.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="font-mono text-muted-foreground w-6 text-right flex-shrink-0">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-blue" />
                        <span className="font-medium">{step.userMessage}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                        <Bot className="h-3 w-3" />
                        <span>Expect: <code className="bg-muted/40 px-1 py-0.5 rounded text-[10px]">{step.expectedResponsePattern}</code></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Generate Scripts Modal ────────────────────────────────────

function GenerateScriptsModal({ onGenerated }: { onGenerated: (scripts: TestScript[]) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [quantity, setQuantity] = useState<number[]>([3]);
  const [edgeCasesOnly, setEdgeCasesOnly] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first.');
      return;
    }
    setIsGenerating(true);
    try {
      const scripts = await generateTestScripts({
        prompt,
        quantity: quantity[0],
        edgeCasesOnly,
      });
      onGenerated(scripts);
      toast.success(`Generated ${scripts.length} test scripts!`);
      setPrompt('');
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald hover:bg-emerald/90 text-white">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Test Scripts
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald" />
            AI Test Script Generator
          </DialogTitle>
          <DialogDescription>
            Describe the chatbot interactions you want to test. Sentinal will generate
            structured conversation scripts to execute against Talkdesk.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="test-prompt" className="text-emerald">Test Focus</Label>
            <Textarea
              id="test-prompt"
              placeholder="e.g., Customer asking about checking account balance, then trying to transfer money to savings, with potential insufficient funds."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="resize-none h-24 focus-visible:ring-emerald"
            />
          </div>

          <div className="grid gap-4 bg-muted/30 p-4 rounded-lg border border-border/50">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>Scripts to Generate: <span className="font-mono text-emerald">{quantity[0]}</span></Label>
              </div>
              <Slider min={1} max={10} step={1} value={quantity} onValueChange={setQuantity} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex flex-col gap-1">
                <Label>Edge Cases Only</Label>
                <span className="text-xs text-muted-foreground">Adversarial inputs, typos, multi-intent messages.</span>
              </div>
              <Switch checked={edgeCasesOnly} onCheckedChange={setEdgeCasesOnly} />
            </div>
          </div>

          {!(import.meta as any).env.VITE_GEMINI_API_KEY && (
            <div className="flex gap-2 items-center bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 p-3 rounded-md border border-amber-200 dark:border-amber-900/50 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>Warning: <b>VITE_GEMINI_API_KEY</b> was not found in your .env.local file.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="bg-emerald hover:bg-emerald/90 text-white min-w-[130px]"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              'Generate Scripts'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Panel
// ═══════════════════════════════════════════════════════════════

export function TestRunnerPanel() {
  const [scripts, setScripts] = useState<TestScript[]>([]);
  const [results, setResults] = useState<Map<string, TestRunResult>>(new Map());
  const [runningScriptId, setRunningScriptId] = useState<string | null>(null);
  const [runningStatus, setRunningStatus] = useState('');
  const [runningProgress, setRunningProgress] = useState(0);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [keepAlive, setKeepAlive] = useState(false);

  // Sync debug state to global window for the Runner to read
  if (typeof window !== 'undefined') {
    (window as any).SENTINEL_DEBUG_KEEP_ALIVE = keepAlive;
  }

  const handleSimulateReply = async (convId: string) => {
    if (!convId) return;
    try {
      await fetch('http://localhost:3001/webhook/talkdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convId,
          content: "Sentinel Debug: Bot responded correctly via simulation.",
          sender_type: "bot",
          created_at: new Date().toISOString()
        })
      });
      toast.info("Sent simulated bot response to local webhook.");
    } catch {
      toast.error("Failed to reach webhook server on port 3001.");
    }
  };

  const handleGenerated = useCallback((newScripts: TestScript[]) => {
    setScripts((prev) => [...newScripts, ...prev]);
  }, []);

  const handleRunScript = useCallback(async (script: TestScript) => {
    setRunningScriptId(script.id);
    setRunningProgress(0);
    setRunningStatus('Initializing…');

    try {
      const connector = createTalkdeskConnector();
      const runner = new TestRunner(connector, {
        onStatusChange: (status) => setRunningStatus(status),
        onStepComplete: (stepIndex) => {
          setRunningProgress(Math.round(((stepIndex + 1) / script.steps.length) * 100));
        },
      });

      const result = await runner.runScript(script);

      setResults((prev) => {
        const next = new Map(prev);
        next.set(script.id, result);
        return next;
      });

      if (result.status === 'pass') {
        toast.success(`${script.name}: All steps passed!`);
      } else if (result.status === 'error') {
        toast.error(`${script.name}: ${result.errorMessage || 'Unknown error'}`);
      } else {
        toast.error(`${script.name}: ${result.failedSteps} step(s) failed.`);
      }
    } catch (err: any) {
      toast.error(`${script.name}: ${err.message}`);
    } finally {
      setRunningScriptId(null);
      setRunningStatus('');
      setRunningProgress(0);
    }
  }, []);

  const handleRunAll = useCallback(async () => {
    setIsRunningAll(true);
    for (const script of scripts) {
      await handleRunScript(script);
    }
    setIsRunningAll(false);
    toast.success('All test scripts completed!');
  }, [scripts, handleRunScript]);

  const handleRemoveScript = useCallback((id: string) => {
    setScripts((prev) => prev.filter((s) => s.id !== id));
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setScripts([]);
    setResults(new Map());
  }, []);

  // Aggregate stats
  const totalRuns = results.size;
  const passedRuns = Array.from(results.values()).filter((r) => r.status === 'pass').length;
  const failedRuns = Array.from(results.values()).filter((r) => r.status !== 'pass').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="border-0 shadow-sm p-0 gap-0 sm:p-0 overflow-hidden">
        <CardHeader className="bg-slate-blue px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Live Test Runner
            </CardTitle>
            <div className="flex items-center gap-2">
              {totalRuns > 0 && (
                <div className="flex items-center gap-3 mr-4 text-white/80 text-xs">
                  <span><span className="font-semibold text-white">{totalRuns}</span> ran</span>
                  <span><span className="font-semibold text-emerald-light">{passedRuns}</span> passed</span>
                  <span><span className="font-semibold text-crimson-light">{failedRuns}</span> failed</span>
                </div>
              )}
              <GenerateScriptsModal onGenerated={handleGenerated} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {scripts.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 bg-slate-blue/10 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-slate-blue" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">No Test Scripts</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Generate conversational test scripts with AI, then run them against your
                Talkdesk chatbot to validate responses automatically.
              </p>
              <GenerateScriptsModal onGenerated={handleGenerated} />
            </div>
          ) : (
            <div>
              {/* Action bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
                <span className="text-xs font-medium text-muted-foreground">
                  {scripts.length} script{scripts.length !== 1 ? 's' : ''} queued
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-4 mr-4">
                    <div className="flex items-center gap-2">
                       <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Session Cleanup</Label>
                       <Switch 
                         checked={!keepAlive} 
                         onCheckedChange={(val) => setKeepAlive(!val)} 
                         className="scale-75 h-5 w-8 data-[state=checked]:bg-emerald"
                       />
                       <span className="text-[10px] text-muted-foreground">{keepAlive ? 'Keep Active' : 'Auto-End'}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={isRunningAll || !!runningScriptId}
                    className="text-xs dark:border-border"
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    Clear All
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRunAll}
                    disabled={isRunningAll || !!runningScriptId}
                    className="bg-slate-blue hover:bg-slate-blue/90 text-white text-xs"
                  >
                    {isRunningAll ? (
                      <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Running All…</>
                    ) : (
                      <><RotateCcw className="h-3 w-3 mr-1.5" /> Run All</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Debug Banner if Keep Alive is on */}
              {keepAlive && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-widest">
                    <AlertCircle className="h-3 w-3" />
                    Debug Mode: Conversations will not be closed automatically
                  </div>
                  {runningScriptId && (
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={() => handleSimulateReply(runningScriptId || '')}
                       className="h-6 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 border-0"
                     >
                       <Zap className="h-3 w-3 mr-1" />
                       Simulate Bot Reply
                     </Button>
                  )}
                </div>
              )}

              {/* Script list */}
              <div className="p-4 space-y-2 max-h-[700px] overflow-y-auto custom-scrollbar">
                {scripts.map((script) => (
                  <ScriptCard
                    key={script.id}
                    script={script}
                    result={results.get(script.id)}
                    isRunning={runningScriptId === script.id}
                    runningStatus={runningScriptId === script.id ? runningStatus : undefined}
                    runningProgress={runningScriptId === script.id ? runningProgress : undefined}
                    onRun={handleRunScript}
                    onRemove={handleRemoveScript}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
