import * as fs from 'fs';
import * as path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Define paths
const INPUT_FILE = path.resolve(__dirname, '../data.xlsx'); // Drop your excel file here
const OUTPUT_FILE = path.resolve(__dirname, '../src/lib/transcripts.json');
const TASKS_OUTPUT_FILE = path.resolve(__dirname, '../src/lib/tasks.json');

console.log('Reading Excel file from:', INPUT_FILE);

try {
  // 2. Read the workbook
  const workbook = xlsx.readFile(INPUT_FILE);
  const sheetName = workbook.SheetNames[0]; // Gets the first sheet
  const worksheet = workbook.Sheets[sheetName];

  // 3. Convert sheet to JSON array
  // We use header: 1 to get an array of arrays, or defval to fill empty cells
  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  const transcripts = [];
  const tasks = [];
  const seenTaskIds = new Set();

  // 4. Transform into the transcript structure
  rawData.forEach((row, index) => {
    const taskId = row['ID'] || `task-${index + 1}`;
    
    // Human Prompt
    if (row['Prompt']) {
      transcripts.push({
        taskId: taskId.toString(),
        id: `${taskId}-human`,
        role: 'human',
        content: row['Prompt'],
        timestamp: new Date().toLocaleTimeString('en-US'),
      });
    }

    // AI Response (Using WaFd Response - Personal as an example)
    // You can change this to 'Talkdesk Response Feb 7 2026' or 'GPT_Response_1'
    const aiResponse = row['WaFd Response - Personal'] || row['Talkdesk Response Feb 7 2026'] || row['GPT_Response_1'];
    
    if (aiResponse) {
      transcripts.push({
        taskId: taskId.toString(),
        id: `${taskId}-ai`,
        role: 'ai',
        content: aiResponse,
        // Fake a realistic timestamp slightly after the human prompt
        timestamp: new Date(Date.now() + 2000).toLocaleTimeString('en-US'),
        latencyMs: Math.floor(Math.random() * 2000) + 500 // random latency between 500-2500ms
      });
    }

    // Build the Task list
    if (!seenTaskIds.has(taskId.toString())) {
      seenTaskIds.add(taskId.toString());
      
      const isFailed = Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes('fail'));

      tasks.push({
        id: taskId.toString(),
        // Assign the category or prompt snippet as the task name
        taskname: row['Category'] || (row['Prompt'] ? row['Prompt'].substring(0, 40) + '...' : `Task ${taskId}`),
        advlatencys: transcripts[transcripts.length - 1]?.latencyMs ? transcripts[transcripts.length - 1].latencyMs / 1000 : 0,
        dialogueturns: aiResponse ? 2 : 1,
        statusKey: isFailed ? 'StatusKey1' : 'StatusKey0' // StatusKey1 = Fail, 0 = Pass
      });
    }
  });

  // 5. Ensure the directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 6. Write to JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transcripts, null, 2), 'utf-8');
  fs.writeFileSync(TASKS_OUTPUT_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  
  console.log(`✅ Successfully generated ${transcripts.length} transcript messages into src/lib/transcripts.json`);
  console.log(`✅ Successfully generated ${tasks.length} tasks into src/lib/tasks.json`);

} catch (error) {
  console.error('❌ Error processing the Excel file:', error.message);
  console.log('Make sure you have a file named "data.xlsx" in the root directory!');
}
