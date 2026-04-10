// ─── Conversational Test Script Models ─────────────────────────

/** A single turn in a conversational test */
export interface TestStep {
  /** The message the tester sends to the chatbot */
  userMessage: string;
  /** Pattern/keywords the bot response must contain to pass */
  expectedResponsePattern: string;
  /** How long to wait for the bot to respond (ms) */
  timeoutMs?: number;
}

/** A full test script: a sequence of conversational turns */
export interface TestScript {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  /** Tags for categorization */
  tags: string[];
}

// ─── Execution Results ──────────────────────────────────────────

/** Result of executing a single test step */
export interface TestStepResult {
  step: TestStep;
  actualResponse: string;
  passed: boolean;
  latencyMs: number;
  error?: string;
}

/** A single transcript entry */
export interface TranscriptEntry {
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
}

/** Result of executing a full test script */
export interface TestRunResult {
  id: string;
  scriptId: string;
  scriptName: string;
  conversationId: string;
  startedAt: string;
  completedAt: string;
  status: 'pass' | 'fail' | 'error';
  stepResults: TestStepResult[];
  transcript: TranscriptEntry[];
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  avgLatencyMs: number;
  /** Performance metric: how fast the bot natively initiated the conversation */
  initialGreetingMs?: number;
  /** Volume metric: total depth of the interaction */
  dialogueTurns: number;
  /** Error message if the run failed at a fatal level (auth, connection, etc.) */
  errorMessage?: string;
}
