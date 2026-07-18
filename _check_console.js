const { chromium } = require('playwright');
const fs = require('fs');

const pages = fs.readdirSync('.').filter(f => f.endsWith('.html'));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const p of pages) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('http://localhost:8877')) route.continue();
      else route.abort();
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      errors.push('pageerror: ' + err.message);
    });
    try {
      await page.goto(`http://localhost:8877/${p}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await page.waitForTimeout(800);
    } catch (e) {}
    if (errors.length) {
      console.log(`--- ${p} ---`);
      // Deduplicar y filtrar errores de red esperados (recursos externos bloqueados)
      const unique = [...new Set(errors)].filter(e => !e.includes('ERR_FAILED') && !e.includes('net::'));
      unique.forEach(e => console.log('  ' + e.slice(0, 200)));
    }
    await page.close();
  }
  await browser.close();
})();
