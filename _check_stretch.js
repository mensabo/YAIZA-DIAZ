const { chromium } = require('playwright');
const fs = require('fs');

const pages = fs.readdirSync('.').filter(f => f.endsWith('.html') && f !== 'admin.html' && f !== '404.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const p of pages) {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith('http://localhost:8877')) route.continue();
        else route.abort();
      });
      try {
        await page.goto(`http://localhost:8877/${p}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
        await page.waitForTimeout(600);
      } catch (e) { continue; }
      const results = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('img').forEach(img => {
          if (!img.src.includes('localhost:8877') || img.src.includes('images/social/')) return;
          if (!img.naturalWidth || !img.complete) return;
          const rect = img.getBoundingClientRect();
          if (rect.width < 5) return;
          const ratio = rect.width / img.naturalWidth;
          if (ratio > 1.2) {
            out.push({
              src: img.src.replace(location.origin + '/', ''),
              renderedW: Math.round(rect.width),
              naturalW: img.naturalWidth,
              ratio: ratio.toFixed(2)
            });
          }
        });
        return out;
      });
      for (const r of results) {
        console.log(`${p} @${width}px: ${r.src} — renderizado ${r.renderedW}px, real ${r.naturalW}px (x${r.ratio})`);
      }
      await page.close();
    }
  }
  await browser.close();
})();
