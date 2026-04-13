import { chromium } from 'playwright';

(async () => {
    // We will directly instantiate a mini session similar to frontend
    console.log("Starting a Playwright server session request...");
    const startRes = await fetch('http://localhost:3002/api/browser/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://tdde-sedemo.s3.us-east-1.amazonaws.com/Product/WaFd/public_area.html' })
    });
    
    const startData = await startRes.json();
    console.log("Session started:", startData);
    const convId = startData.id;

    // Poll for the intro message
    let found = false;
    for(let i=0; i<10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await fetch(`http://localhost:3002/api/browser/${convId}/messages`);
        const json = await res.json();
        console.log(`POLL ${i} DATA:`, json.data);
        if (json.data && json.data.length > 0) {
            found = true;
            break;
        }
    }
    
    // Call close
    await fetch(`http://localhost:3002/api/browser/${convId}`, { method: 'DELETE' });
    console.log("Session clean up successfully.");
})();
