import type {
  TestScript,
  TestStep,
  TestStepResult,
  TestRunResult,
  TranscriptEntry,
} from '../models/test-script-models';
import { TalkdeskConnector } from './talkdesk-connector';

/**
 * TestRunner — Orchestrates end-to-end chatbot testing against Talkdesk.
 *
 * Flow:
 *   1. Authenticate (OAuth client_credentials via proxy)
 *   2. Start a Digital Connect conversation
 *   3. For each step in the script:
 *      a. Send the user message
 *      b. Poll for a bot/agent response
 *      c. Compare against the expected response pattern
 *      d. Record latency, pass/fail, and actual response
 *   4. Compile the full transcript and aggregated results
 */
export class TestRunner {
  private connector: TalkdeskConnector;
  private onStepComplete?: (stepIndex: number, result: TestStepResult) => void;
  private onStatusChange?: (status: string) => void;
  private onTranscriptUpdate?: (transcript: TranscriptEntry[]) => void;

  constructor(
    connector: TalkdeskConnector,
    callbacks?: {
      onStepComplete?: (stepIndex: number, result: TestStepResult) => void;
      onStatusChange?: (status: string) => void;
      onTranscriptUpdate?: (transcript: TranscriptEntry[]) => void;
    }
  ) {
    this.connector = connector;
    this.onStepComplete = callbacks?.onStepComplete;
    this.onStatusChange = callbacks?.onStatusChange;
    this.onTranscriptUpdate = callbacks?.onTranscriptUpdate;
  }

  /**
   * Execute a full test script against Talkdesk.
   */
  public async runScript(script: TestScript): Promise<TestRunResult> {
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const stepResults: TestStepResult[] = [];
    const transcript: TranscriptEntry[] = [];
    let conversationId = '';
    let initialGreetingMs = 0;

    try {
      // Step 1: Authenticate
      this.onStatusChange?.('Authenticating…');
      await this.connector.authenticate();

      // Measure Initial Greeting Latency
      // We log start time explicitly before startConversation completes so we don't miss instant backend routing signals
      this.onStatusChange?.('Starting conversation…');
      const greetStart = Date.now();
      const subject = `Sentinel Test: ${script.name}${script.description ? ` — ${script.description}` : ''}`;
      const conversation = await this.connector.startConversation(subject);
      conversationId = conversation.id;
      console.log(`[TestRunner] Conversation started with subject: "${subject}"`);

      // Clear any existing messages for this conversation ID in the webhook server (sanity check)
      try {
        await fetch(`http://localhost:3001/api/messages/${conversationId}`, { method: 'DELETE' });
      } catch {}

      // TalkDesk does NOT originate a proactive greeting unless prompted. 
      // It will structurally bundle it automatically with the first interaction cycle natively.

      // Step 3: Execute each test step
      for (let i = 0; i < script.steps.length; i++) {
        const step = script.steps[i];
        this.onStatusChange?.(`Step ${i + 1}/${script.steps.length}: Sending message…`);

        const stepResult = await this.executeStep(conversationId, step, i);
        stepResults.push(stepResult);

        // Build transcript
        transcript.push({
          role: 'user',
          content: step.userMessage,
          timestamp: new Date().toISOString(),
        });

        if (stepResult.actualResponse) {
          transcript.push({
            role: 'bot',
            content: stepResult.actualResponse,
            timestamp: new Date().toISOString(),
          });
        }

        // Live stream update to UI
        this.onTranscriptUpdate?.([...transcript]);

        this.onStepComplete?.(i, stepResult);
      }

      // Step 4: Graceful cooldown — wait a few seconds for any final/late bot responses
      // to hit the webhook before we kill the session.
      this.onStatusChange?.('Cooling down (120s)…');
      await new Promise(resolve => setTimeout(resolve, 120000));

    } catch (err: any) {
      // Fatal error — return what we have with the error message
      const completedAt = new Date().toISOString();
      const errorMessage = err.message || 'Unknown error during test execution';
      console.error('[TestRunner] Fatal error:', errorMessage);
      this.onStatusChange?.(`Error: ${errorMessage}`);
      return this.buildResult(runId, script, conversationId, startedAt, completedAt, stepResults, transcript, 'error', errorMessage);
    } finally {
      // Step 5: End the conversation to cleanup TalkDesk (unless specifically told to keep it alive)
      // For Sentinel, we'll usually end it, but for debugging we can skip this.
      const shouldKeepAlive = (window as any).SENTINEL_DEBUG_KEEP_ALIVE === true;
      
      if (conversationId && !shouldKeepAlive) {
        try {
          this.onStatusChange?.('Ending conversation…');
          await this.connector.endConversation(conversationId);
        } catch (err: any) {
          console.warn('[TestRunner] Failed to end conversation:', err.message);
        }
      } else if (conversationId && shouldKeepAlive) {
        console.log('[TestRunner] Debug: Keeping conversation alive per SENTINEL_DEBUG_KEEP_ALIVE');
        this.onStatusChange?.('Complete (Session Active)');
      }
    }

    const completedAt = new Date().toISOString();
    const allPassed = stepResults.every((r) => r.passed);
    const status = allPassed ? 'pass' : 'fail';
    this.onStatusChange?.(`Complete — ${status.toUpperCase()}`);

    return this.buildResult(runId, script, conversationId, startedAt, completedAt, stepResults, transcript, status, undefined, initialGreetingMs);
  }

  // ─── Autonomous Execution ────────────────────────────────
  
  public async runAutonomous(objective: string): Promise<TestRunResult> {
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const stepResults: TestStepResult[] = [];
    const transcript: TranscriptEntry[] = [];
    let conversationId = '';
    
    // Create a dynamic script shell to satisfy TestRunResult type
    const scriptShell: TestScript = {
      id: crypto.randomUUID(),
      name: "Autonomous AI Test",
      description: objective,
      steps: [],
      tags: ["Dynamic", "AI"]
    };

    try {
      this.onStatusChange?.('Authenticating…');
      await this.connector.authenticate();

      // Measure Initial Greeting Latency safely
      this.onStatusChange?.('Starting autonomous conversation…');
      const greetStart = Date.now();
      // Enforce the exact identical Subject Line structure as runScript (which successfully routed to Autopilot)
      // specifically matching the 'Sentinel Test: ' prefix with an 'e'. 
      const subject = `Sentinel Test: Autonomous AI Run — ${objective.substring(0, 80)}`;
      const conversation = await this.connector.startConversation(subject);
      conversationId = conversation.id;
      
      try {
        const isVercel = !!(import.meta as any).env.VITE_WEBHOOK_URL;
        const webhookUrl = (import.meta as any).env.VITE_WEBHOOK_URL || 'http://localhost:3001';
        const targetEndpoint = `${webhookUrl}/api/messages/${conversationId}`;

        await fetch(isVercel ? '/api/proxy' : targetEndpoint, { 
           method: 'DELETE',
           headers: {
             'ngrok-skip-browser-warning': 'true',
             'x-target-url': targetEndpoint
           }
        });
      } catch {}

      // Dynamic loop
      // Dynamically load gemini generator to avoid circular deps up top
      const { generateDynamicReply } = await import('./gemini-api');

      let isFinished = false;
      let finalStatus: 'pass' | 'fail' | 'error' = 'error';
      let turnCount = 0;
      const MAX_TURNS = 20;

      while (!isFinished && turnCount < MAX_TURNS) {
        turnCount++;
        
        // 1. Ask Gemini what to say next based on transcript so far
        this.onStatusChange?.(`Turn ${turnCount}: AI synthesizing next message…`);
        const aiDecision = await generateDynamicReply({ objective, transcript });
        
        if (aiDecision.isFinished) {
           finalStatus = aiDecision.passResult as any;
           this.onStatusChange?.(`AI declared objective finished: ${finalStatus.toUpperCase()}`);
           break;
        }

        // 2. Send the suggested message
        this.onStatusChange?.(`Turn ${turnCount}: Sending message to Talkdesk…`);
        const startTime = Date.now();
        await this.connector.sendMessage(conversationId, aiDecision.reply);
        
        transcript.push({
          role: 'user',
          content: aiDecision.reply,
          timestamp: new Date().toISOString()
        });
        this.onTranscriptUpdate?.([...transcript]);

        // 3. Wait for bot reply
        this.onStatusChange?.(`Turn ${turnCount}: Waiting for bot response…`);
        try {
            const botResponse = await this.connector.awaitBotResponse(conversationId, 120000, 1000);
            transcript.push({
                role: 'bot',
                content: botResponse,
                timestamp: new Date().toISOString()
            });
            this.onTranscriptUpdate?.([...transcript]);
            
            // Record a step result so we have latency stats
            stepResults.push({
                step: { userMessage: aiDecision.reply, expectedResponsePattern: "DYNAMIC_AI_EVALUATION" },
                actualResponse: botResponse,
                passed: true,
                latencyMs: Date.now() - startTime
            });
        } catch (e: any) {
            finalStatus = 'fail';
            stepResults.push({
                step: { userMessage: aiDecision.reply, expectedResponsePattern: "DYNAMIC_AI_EVALUATION" },
                actualResponse: '',
                passed: false,
                latencyMs: Date.now() - startTime,
                error: e.message
            });
            throw new Error(`Bot failed to respond: ${e.message}`);
        }
      }

      if (turnCount >= MAX_TURNS && !isFinished) {
         finalStatus = 'fail';
         throw new Error("Autonomous run hit maximum turns without completing objective.");
      }

      return this.buildResult(runId, scriptShell, conversationId, startedAt, new Date().toISOString(), stepResults, transcript, finalStatus, undefined, initialGreetingMs);

    } catch (err: any) {
      console.error('[TestRunner] Autonomous fatal error:', err.message);
      this.onStatusChange?.(`Error: ${err.message}`);
      return this.buildResult(runId, scriptShell, conversationId, startedAt, new Date().toISOString(), stepResults, transcript, 'error', err.message, 0);
    } finally {
      if (conversationId && !(window as any).SENTINEL_DEBUG_KEEP_ALIVE) {
        try {
          this.onStatusChange?.('Ending conversation…');
          await this.connector.endConversation(conversationId);
        } catch (err) {}
      }
    }
  }

  // ─── Step Execution ──────────────────────────────────────

  private async executeStep(
    conversationId: string,
    step: TestStep,
    stepIndex: number
  ): Promise<TestStepResult> {
    const startTime = Date.now();

    try {
      // Send the user message
      this.onStatusChange?.(`Step ${stepIndex + 1}: Sending message…`);
      await this.connector.sendMessage(conversationId, step.userMessage);

      // Brief delay to let the message propagate
      await new Promise(resolve => setTimeout(resolve, 800));

      // Poll for bot response via the local webhooks server
      this.onStatusChange?.(`Step ${stepIndex + 1}: Waiting for bot response…`);
      const timeoutMs = step.timeoutMs || 120000; // Increased default to 120s
      const botResponse = await this.connector.awaitBotResponse(conversationId, timeoutMs, 1000);

      const latencyMs = Date.now() - startTime;

      // Evaluate: does the response match the expected pattern?
      const passed = this.evaluateResponse(botResponse, step.expectedResponsePattern);

      return {
        step,
        actualResponse: botResponse,
        passed,
        latencyMs,
      };
    } catch (err: any) {
      return {
        step,
        actualResponse: '',
        passed: false,
        latencyMs: Date.now() - startTime,
        error: err.message || 'Unknown error',
      };
    }
  }

  // ─── Response Evaluation ──────────────────────────────────

  /**
   * Check if the bot response matches the expected pattern.
   * Supports:
   *   - Simple keyword matching (case-insensitive, comma-separated keywords)
   *   - Regex patterns (wrapped in /…/)
   */
  private evaluateResponse(actual: string, expectedPattern: string): boolean {
    if (!actual || !expectedPattern) return false;

    const trimmed = expectedPattern.trim();

    // Regex mode: pattern wrapped in forward slashes
    if (trimmed.startsWith('/') && trimmed.endsWith('/')) {
      try {
        const regex = new RegExp(trimmed.slice(1, -1), 'i');
        return regex.test(actual);
      } catch {
        // Invalid regex — fall back to keyword matching
      }
    }

    // Keyword mode: all comma-separated keywords must be present (case-insensitive)
    const keywords = trimmed.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    const lowerActual = actual.toLowerCase();
    return keywords.every((keyword) => lowerActual.includes(keyword));
  }

  // ─── Result Builder ──────────────────────────────────────

  private buildResult(
    runId: string,
    script: TestScript,
    conversationId: string,
    startedAt: string,
    completedAt: string,
    stepResults: TestStepResult[],
    transcript: TranscriptEntry[],
    status: 'pass' | 'fail' | 'error',
    errorMessage?: string,
    initialGreetingMs?: number
  ): TestRunResult {
    const passedSteps = stepResults.filter((r) => r.passed).length;
    const failedSteps = stepResults.filter((r) => !r.passed).length;
    const totalLatency = stepResults.reduce((sum, r) => sum + r.latencyMs, 0);
    const avgLatencyMs = stepResults.length > 0 ? Math.round(totalLatency / stepResults.length) : 0;
    
    // Each Turn equals one User message sent.
    const dialogueTurns = transcript.filter(t => t.role === 'user').length;

    return {
      id: runId,
      scriptId: script.id,
      scriptName: script.name,
      conversationId,
      startedAt,
      completedAt,
      status,
      stepResults,
      transcript,
      totalSteps: script.steps.length,
      passedSteps,
      failedSteps,
      avgLatencyMs,
      initialGreetingMs,
      dialogueTurns,
      errorMessage,
    };
  }
}
