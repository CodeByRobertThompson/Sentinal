import type { Scenario } from '@/generated/models/scenario-model';

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
    You are an expert QA Automation Architect. Your goal is to generate extremely realistic execution scenarios for an Agentic Testing Dashboard explicitly interacting with a **Talkdesk** environment.
    The user will provide a prompt defining what they are looking for. 
    You must generate exactly ${params.quantity} scenarios.
    ${params.edgeCasesOnly ? "CRITICAL: You MUST strictly only generate complex, bizarre, or highly challenging edge-cases." : "Generate a mix of happy-paths and edge cases."}
    
    Ensure the metrics generated look realistic (e.g., if it's a difficult edge case, the 'failed' count should be realistically higher than 0).
    The passratepercent should accurately reflect (passed / totaltests) * 100.

    CRITICAL RULE: For EVERY scenario, you MUST write a highly detailed automation testing script acting exactly on that scenario.
    The script MUST be written using **Playwright with TypeScript**.
    CRITICAL FORMATTING: The \`testScript\` output string MUST be heavily formatted with explicit newlines (\\n) and proper 2-space indentation so it renders beautifully as a multi-line Javascript code block. NEVER return a single, flat, unformatted string.
    Assume the environment relates to a Talkdesk chatbot or agentic integration. Use realistic 'page.locator(...)', 'expect', and simulated conversations or workflows.
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
