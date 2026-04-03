import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { generateScenariosAI } from '@/lib/gemini-api';
import type { Scenario } from '@/generated/models/scenario-model';

export function ScenarioGeneratorModal() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [quantity, setQuantity] = useState<number[]>([5]);
  const [edgeCasesOnly, setEdgeCasesOnly] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first.');
      return;
    }

    setIsGenerating(true);
    try {
      const generatedScenarios = await generateScenariosAI({
        prompt,
        quantity: quantity[0],
        edgeCasesOnly
      });

      // Optimistically push into the local TanStack cache
      queryClient.setQueryData(['scenario-list', undefined], (oldData: Scenario[] | undefined) => {
        if (!oldData) return generatedScenarios;
        return [...generatedScenarios, ...oldData]; // Push to front
      });

      toast.success(`Successfully generated ${generatedScenarios.length} new scenarios!`);
      setPrompt('');
      setOpen(false); // close modal

    } catch (err: any) {
      toast.error(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-emerald/10 hover:bg-emerald/20 text-emerald border-emerald/30">
          <Sparkles className="h-4 w-4 mr-2" />
          Auto-Generate Scenarios
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald" />
            AI Scenario Generator
          </DialogTitle>
          <DialogDescription>
            Describe a hypothetical user context or vulnerability. The LLM will structurally generate realistic test scenarios exploring that boundary.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt" className="text-emerald">Scenario Prompt</Label>
            <Textarea 
              id="prompt" 
              placeholder="e.g., A user rapidly trying differing passwords with slight typos while on a spotty mobile connection."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="resize-none h-24 focus-visible:ring-emerald"
            />
          </div>
          
          <div className="grid gap-4 bg-muted/30 p-4 rounded-lg border border-border/50">
             <div className="flex flex-col gap-3">
               <div className="flex items-center justify-between">
                 <Label htmlFor="quantity">Quantity to Generate: <span className="font-mono text-emerald">{quantity[0]}</span></Label>
               </div>
               <Slider 
                 id="quantity"
                 min={1} 
                 max={20} 
                 step={1} 
                 value={quantity} 
                 onValueChange={setQuantity}
               />
             </div>
             
             <div className="flex items-center justify-between pt-2 border-t border-border/50">
               <div className="flex flex-col gap-1">
                 <Label htmlFor="edge-cases">Strict Edge-Cases</Label>
                 <span className="text-xs text-muted-foreground">Force generation to avoid happy-paths completely.</span>
               </div>
               <Switch 
                 id="edge-cases" 
                 checked={edgeCasesOnly}
                 onCheckedChange={setEdgeCasesOnly}
               />
             </div>
          </div>

          {!(import.meta as any).env.VITE_GEMINI_API_KEY && (
            <div className="flex gap-2 items-center bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 p-3 rounded-md border border-amber-200 dark:border-amber-900/50 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>Warning: <b>VITE_GEMINI_API_KEY</b> was not found in your .env.local file. Requests will fail.</p>
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
             className="bg-emerald hover:bg-emerald/90 text-white min-w-[120px]"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              'Generate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
