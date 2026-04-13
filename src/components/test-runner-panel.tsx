import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Loader2, Bot, User, CheckCircle2, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { TestRunner } from '@/lib/test-runner';
import { PlaywrightConnector } from '@/lib/playwright-connector';
import type { TestRunResult } from '@/models/test-script-models';

// ─── Status Components ──────────────────────────────────────────

function StatusIcon({ status }: { status: 'pass' | 'fail' | 'error' | 'pending' | 'running' }) {
  switch (status) {
    case 'pass': return <CheckCircle2 className="h-5 w-5 text-emerald" />;
    case 'fail': return <XCircle className="h-5 w-5 text-crimson" />;
    case 'error': return <AlertCircle className="h-5 w-5 text-amber-500" />;
    case 'running': return <Loader2 className="h-5 w-5 text-slate-blue animate-spin" />;
    case 'pending': return <div className="h-5 w-5" />;
  }
}

function StatusBadge({ status }: { status: 'pass' | 'fail' | 'error' }) {
  const config = {
    pass: { bg: 'bg-emerald-light text-emerald', label: 'Passed successfully' },
    fail: { bg: 'bg-crimson-light text-crimson', label: 'Failed' },
    error: { bg: 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400', label: 'Error' },
  };
  const c = config[status];
  return (
    <Badge className={`${c.bg} border-0 font-semibold px-4 py-1.5 text-sm gap-2 uppercase tracking-widest`}>
      <StatusIcon status={status} />
      {c.label}
    </Badge>
  );
}

// ─── Live Transcript Viewer ─────────────────────────────────────

function LiveTranscriptViewer({ transcript }: { transcript: any[] }) {
  return (
    <div className="space-y-4 p-6 bg-slate-50/50 dark:bg-slate-900/50">
      <AnimatePresence initial={false}>
        {transcript.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${entry.role === 'user' ? 'justify-end' : ''}`}
          >
             {entry.role === 'bot' && (
               <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald/15 flex items-center justify-center mt-1">
                 <Bot className="h-4 w-4 text-emerald" />
               </div>
             )}
             <div className={`whitespace-pre-wrap rounded-2xl px-5 py-3 shadow-sm text-[15px] font-medium max-w-[80%] ${
               entry.role === 'user' 
                 ? 'bg-slate-blue border border-slate-blue/20 text-white rounded-tr-sm' 
                 : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
             }`}>
               {entry.content}
             </div>
             {entry.role === 'user' && (
               <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-blue/15 flex items-center justify-center mt-1">
                 <User className="h-4 w-4 text-slate-blue" />
               </div>
             )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Testing Interface ─────────────────────────────────────

export function TestRunnerPanel() {
  const [objective, setObjective] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runningStatus, setRunningStatus] = useState('');
  const [liveTranscript, setLiveTranscript] = useState<any[]>([]);
  const [result, setResult] = useState<TestRunResult | null>(null);

  const mockUrl = 'https://tdde-sedemo.s3.us-east-1.amazonaws.com/Product/WaFd/public_area.html';
  
  const handleRun = async () => {
    if (!objective.trim()) return;
    
    setIsRunning(true);
    setResult(null);
    setLiveTranscript([]);
    setRunningStatus('Initializing…');

    try {
      const connector = new PlaywrightConnector(mockUrl);
      const runner = new TestRunner(connector, {
        onStatusChange: (status) => setRunningStatus(status),
        onTranscriptUpdate: (t) => setLiveTranscript(t)
      });

      const runResult = await runner.runAutonomous(objective);
      setResult(runResult);
      if (runResult.status === 'pass') toast.success("Test objective completed successfully!");
      else if (runResult.status === 'fail') toast.error("Test objective failed constraints.");
      else toast.error("The test encountered an error.");

    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
      setRunningStatus('');
    }
  };

  const handleReset = () => {
    setObjective('');
    setResult(null);
    setLiveTranscript([]);
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Walt the Vault Hero Presentation */}
      <motion.div 
        className="flex flex-col items-center justify-center text-center mb-8 relative"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="relative mb-6 group">
           <div className="absolute inset-0 bg-emerald/20 blur-3xl rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
           <motion.img 
             src="/walt.png" 
             alt="Walt the Vault" 
             className="w-48 h-48 sm:w-56 sm:h-56 object-contain relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-out"
             animate={{ y: [0, -10, 0] }}
             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           />
        </div>
        
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 mb-3 drop-shadow-sm">
          Hey there! I'm <span className="text-emerald">Walt</span>.
        </h2>
        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto">
          I'm ready to test our virtual assistant. What scenario would you like me to try today?
        </p>
      </motion.div>

      {/* Interactive Card */}
      <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
        <CardContent className="p-0">
          
          {/* Input Section */}
          <div className="p-6 md:p-8">
            <div className="relative">
              <Textarea
                placeholder="e.g. Try to reset my password but stubbornly refuse to give the last 4 digits of my SSN."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                disabled={isRunning}
                className="min-h-[120px] text-lg p-5 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-200 dark:border-slate-800 rounded-xl resize-none focus-visible:ring-0 focus-visible:border-emerald transition-all shadow-inner placeholder:text-slate-400"
              />
              <div className="absolute bottom-4 right-4 flex gap-3">
                {result && !isRunning && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleReset}
                    className="h-12 w-12 rounded-xl text-slate-500 border-2"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                )}
                <Button 
                  onClick={handleRun} 
                  disabled={!objective.trim() || isRunning} 
                  className="h-12 px-8 rounded-xl bg-slate-blue hover:bg-slate-blue/90 text-white font-bold tracking-wide shadow-lg shadow-slate-blue/20 transition-all active:scale-95 text-base"
                >
                  {isRunning ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    <><Play className="h-5 w-5 mr-2" /> Run Scenario</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Transcript / Output Section */}
          {(isRunning || liveTranscript.length > 0 || result) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
            >
              {/* Status Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
                 <div className="flex items-center gap-3">
                   {isRunning ? (
                     <div className="flex items-center text-sm font-semibold text-slate-blue animate-pulse">
                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       {runningStatus || 'Running...'}
                     </div>
                   ) : (
                     <div className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                       Test Complete
                     </div>
                   )}
                 </div>
                 {result && (
                   <StatusBadge status={result.status} />
                 )}
              </div>

              {/* Live Transcript */}
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {liveTranscript.length > 0 ? (
                  <LiveTranscriptViewer transcript={liveTranscript} />
                ) : (
                  <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-emerald/50" />
                    <p className="text-sm font-medium">Booting up the virtual browser...</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
