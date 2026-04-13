import type { Scenario } from '@/generated/models/scenario-model';
import type { TestScript } from '@/models/test-script-models';

// Use the local Vite env variable logic
const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface GenerateScenarioParams {
  prompt: string;
  quantity: number;
  edgeCasesOnly: boolean;
}

export async function generateScenariosAI(params: GenerateScenarioParams): Promise<Scenario[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not defined in your .env.local file.');
  }

  const systemInstructions = `
    You are an expert QA Automation Architect. Your goal is to generate extremely realistic execution scenarios for an Agentic Testing Dashboard explicitly interacting with a **Virtual Assistant** environment.
    The user will provide a prompt defining what they are looking for. 
    You must generate exactly ${params.quantity} scenarios.
    ${params.edgeCasesOnly ? "CRITICAL: You MUST strictly only generate complex, bizarre, or highly challenging edge-cases." : "Generate a mix of happy-paths and edge cases."}
    
    Ensure the metrics generated look realistic (e.g., if it's a difficult edge case, the 'failed' count should be realistically higher than 0).
    The passratepercent should accurately reflect (passed / totaltests) * 100.

    CRITICAL RULE: For EVERY scenario, you MUST write a highly detailed automation testing script acting exactly on that scenario.
    The script MUST be written using **Playwright with TypeScript**.
    CRITICAL FORMATTING: The \`testScript\` output string MUST be heavily formatted with explicit newlines (\\n) and proper 2-space indentation so it renders beautifully as a multi-line Javascript code block. NEVER return a single, flat, unformatted string.
    Assume the environment relates to a Virtual Assistant chatbot or agentic integration. Use realistic 'page.locator(...)', 'expect', and simulated conversations or workflows.
  `;

  // We explicitly declare the output schema for Gemini so it enforces perfect JSON natively.
  const responseSchema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        scenarioname: { type: "STRING" },
        failed: { type: "INTEGER" },
        passed: { type: "INTEGER" },
        passratepercent: { type: "NUMBER" },
        totaltests: { type: "INTEGER" },
        testScript: { type: "STRING" }
      },
      required: ["scenarioname", "failed", "passed", "passratepercent", "totaltests", "testScript"]
    }
  };

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: systemInstructions },
          { text: `Focus Prompt: ${params.prompt}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.8,
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "Failed to fetch from Gemini API.");
    }

    const data = await res.json();
    
    // Parse out text response correctly.
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawContent) {
      throw new Error("Received an empty or malformed payload from Gemini.");
    }

    const parsedArray = JSON.parse(rawContent);

    // Map strict UUID generation and format
    const formattedScenarios: Scenario[] = parsedArray.map((item: any) => ({
      id: crypto.randomUUID(),
      scenarioname: item.scenarioname,
      failed: item.failed,
      passed: item.passed,
      passratepercent: item.passratepercent,
      totaltests: item.totaltests,
      testScript: item.testScript
    }));

    return formattedScenarios;

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "An unexpected error occurred during generation.");
  }
}

// ═══════════════════════════════════════════════════════════════
// Conversational Test Script Generation (for live Talkdesk tests)
// ═══════════════════════════════════════════════════════════════

export interface GenerateTestScriptParams {
  prompt: string;
  quantity: number;
  edgeCasesOnly: boolean;
}

/**
 * Generate structured conversational test scripts for execution
 * against the Talkdesk Digital Connect API.
 *
 * Each script is a sequence of { userMessage, expectedResponsePattern }
 * turns that get played against the live chatbot.
 */
export async function generateTestScripts(params: GenerateTestScriptParams): Promise<TestScript[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not defined in your .env.local file.');
  }

  const systemInstructions = `
You are an expert QA Conversation Designer for a banking chatbot. Your goal is to generate structured conversational test scripts that will be executed automatically against a **Virtual Assistant** chatbot API.

Each test script represents a multi-turn conversation between a customer and the bank's chatbot. The scripts will be replayed programmatically: the system sends each "userMessage" to the chatbot API, waits for a response, and checks if the response matches the "expectedResponsePattern".

You must generate exactly ${params.quantity} test scripts.
${params.edgeCasesOnly ? 'CRITICAL: Generate ONLY edge cases — confusing inputs, typos, adversarial prompts, multi-intent messages, emotional/frustrated customers, boundary conditions.' : 'Generate a healthy mix of common happy-path scenarios AND challenging edge cases.'}

RULES FOR EACH SCRIPT:
1. Each script must have 3–8 conversation turns (steps).
2. "userMessage" should be realistic customer messages — include natural language, abbreviations, typos where appropriate for edge cases.
3. "expectedResponsePattern" should be comma-separated keywords that the bot response MUST contain. Use broad, flexible keywords (not exact sentences). Example: "balance, account" means the bot response must contain both "balance" and "account" somewhere.
4. For regex patterns, wrap in forward slashes: "/thank you|thanks|you're welcome/"
5. Set "timeoutMs" to 15000 for normal steps, 20000 for steps where the bot might need to look something up.
6. Give each script a clear, descriptive name and 1–3 relevant tags.
7. The description should explain what the test validates in 1–2 sentences.

CONTEXT: This is a WaFd Bank chatbot handling retail banking queries — account balances, transfers, disputes, branch hours, card issues, loan inquiries, etc.
  `;

  const responseSchema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        description: { type: "STRING" },
        tags: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        steps: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              userMessage: { type: "STRING" },
              expectedResponsePattern: { type: "STRING" },
              timeoutMs: { type: "INTEGER" }
            },
            required: ["userMessage", "expectedResponsePattern"]
          }
        }
      },
      required: ["name", "description", "tags", "steps"]
    }
  };

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: systemInstructions },
          { text: `Focus Prompt: ${params.prompt}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.85,
      responseMimeType: "application/json",
      responseSchema
    }
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "Failed to fetch from Gemini API.");
    }

    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      throw new Error("Received an empty or malformed payload from Gemini.");
    }

    const parsedArray = JSON.parse(rawContent);

    const scripts: TestScript[] = parsedArray.map((item: any) => ({
      id: crypto.randomUUID(),
      name: item.name,
      description: item.description,
      tags: item.tags ?? [],
      steps: (item.steps ?? []).map((s: any) => ({
        userMessage: s.userMessage,
        expectedResponsePattern: s.expectedResponsePattern,
        timeoutMs: s.timeoutMs ?? 15000,
      })),
    }));

    return scripts;

  } catch (error: any) {
    console.error("Gemini Test Script Error:", error);
    throw new Error(error.message || "An unexpected error occurred during test script generation.");
  }
}

// ═══════════════════════════════════════════════════════════════
// Autonomous Test Runner Generation
// ═══════════════════════════════════════════════════════════════

export interface GenerateDynamicReplyParams {
  objective: string;
  transcript: { role: string; content: string }[];
}

export async function generateDynamicReply(params: GenerateDynamicReplyParams): Promise<{ reply: string, isFinished: boolean, passResult: 'pass' | 'fail' | 'pending' }> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not defined in your .env.local file.');
  }

  const systemInstructions = `
You are an expert QA Conversation Agent acting as a human customer. Your goal is to carry out an overarching 'Objective' by interacting dynamically with a bank chatbot.
You will be provided with the current live transcript of the conversation so far.

Based on the transcript and your Objective:
1. Generate the next logical, realistic customer message to send to the bot (keep it under 3 sentences).
2. Determine if the objective has been definitively completed (or definitively failed). If it is formally over, set 'isFinished' to true.
3. If finished, set 'passResult' to 'pass' if the bot successfully handled the objective, or 'fail' if the bot malfunctioned, refused, or failed.

CRITICAL INSTRUCTION: You MUST aggressively set 'isFinished' to FALSE if the bot asks a clarifying question, asks for account details, or gives a multi-step instruction. ONLY set 'isFinished' to TRUE if the bot definitively confirms the final resolution, explicitly gives you the final piece of requested data, or if you are stuck in an inescapable loop. Do not end the chat early!
`;

  const transcriptText = params.transcript.length > 0 
    ? params.transcript.map(t => `${t.role.toUpperCase()}: ${t.content}`).join("\\n")
    : "No messages yet. (You send the first message!)";

  const responseSchema = {
    type: "OBJECT",
    properties: {
      reply: { type: "STRING" },
      isFinished: { type: "BOOLEAN" },
      passResult: { type: "STRING" }
    },
    required: ["reply", "isFinished", "passResult"]
  };

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: systemInstructions },
          { text: `Objective: ${params.objective}\\n\\nCurrent Transcript:\\n${transcriptText}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema
    }
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      throw new Error("Failed to fetch dynamic reply from Gemini.");
    }

    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) throw new Error("Empty response from AI.");

    return JSON.parse(rawContent);

  } catch (error: any) {
    console.error("Dynamic Generation Error:", error);
    throw new Error(error.message || "An unexpected error occurred generating dynamic reply.");
  }
}


