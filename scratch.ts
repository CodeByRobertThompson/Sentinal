import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log("Loading page...");
  await page.goto('https://tdde-sedemo.s3.us-east-1.amazonaws.com/Product/WaFd/public_area.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); 
  
  try {
     console.log("Clicking #talkdesk-chat-widget-float...");
     await page.locator('#talkdesk-chat-widget-float').click({ force: true, position: {x: 10, y: 10} });
     await page.waitForTimeout(3000);
     
     const chatFrame = page.frameLocator('iframe[src*="index.html"]');
     const input = chatFrame.locator('textarea[name="text"]');
     await input.fill("Hello");
     await input.press('Enter');
     console.log("Sent message 'Hello'");
     
     await page.waitForTimeout(6000); // wait for bot reply
     
     for (const frame of page.frames()) {
       if (frame.url().includes('index.html')) {
          console.log("Saving dump_chat.html");
          fs.writeFileSync('dump_chat.html', await frame.innerHTML('body'));
          break;
       }
     }
  } catch (e: any) {
     console.error("Error generating chat:", e.message);
  }
  
  await browser.close();
})();
