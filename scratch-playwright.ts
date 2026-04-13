import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    console.log("Launching browser to see how Talkdesk replies...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://tdde-sedemo.s3.us-east-1.amazonaws.com/Product/WaFd/public_area.html');
    console.log("Navigated to WaFd demo");

    const toggle = page.locator('#talkdesk-chat-widget-float');
    await toggle.waitFor({ state: 'attached', timeout: 15000 });
    await toggle.click({ force: true, position: { x: 20, y: 20 } });
    console.log("Clicked toggle.");

    const chatFrame = page.frameLocator('iframe[src*="index.html"]');
    const input = chatFrame.locator('textarea[name="text"]');
    await input.waitFor({ state: 'visible', timeout: 15000 });
    console.log("Chat frame ready.");

    await input.fill("learn about all the options Wafd has for checking accounts in spanish");
    await input.press('Enter');
    console.log("Message sent. Waiting 15 seconds for bot to reply...");

    await new Promise(r => setTimeout(r, 15000));

    // Dump all data elements
    const extractedData = await chatFrame.locator('body').evaluate((node) => {
        const types = Array.from(document.querySelectorAll('[data-chat-bubble-type]')).map(el => el.getAttribute('data-chat-bubble-type'));
        return {
            html: node.innerHTML,
            types: [...new Set(types)]
        };
    });

    console.log("BUBBLE TYPES FOUND:", extractedData.types);
    fs.writeFileSync('dom_dump.html', extractedData.html);
    console.log("DOM saved to dom_dump.html");

    await browser.close();
})();
