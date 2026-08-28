import { chromium } from 'playwright';

const BASE = 'http://localhost:4028';
const [, , navGroup, href, tableSearchPlaceholder, searchTerm] = process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

async function gotoViaSidebar() {
  const navLink = page.locator(`a[href="${href}"]`).first();
  try {
    await navLink.click({ timeout: 3000 });
  } catch {
    if (navGroup) {
      await page.click(`text=${navGroup}`);
      await page.waitForTimeout(300);
    }
    await navLink.click({ timeout: 8000 });
  }
  await page.waitForURL(`**${href}`, { timeout: 15000 });
}

await page.goto(`${BASE}/login`);
await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });
await page.fill('input[type="email"], input[name="email"]', 'admin@syntera.id');
await page.fill('input[type="password"], input[name="password"]', 'Admin@123');
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForTimeout(500);

await gotoViaSidebar();
await page.waitForTimeout(800);

const rowCountInitial = await page.locator('tbody tr').count();
console.log('Initial row count:', rowCountInitial);

if (tableSearchPlaceholder && searchTerm) {
  const tableSearch = page.locator(`input[placeholder="${tableSearchPlaceholder}"]`);
  await tableSearch.fill(searchTerm);
  await page.waitForTimeout(700);
  const rowCountAfterSearch = await page.locator('tbody tr').count();
  console.log(`Rows after searching "${searchTerm}":`, rowCountAfterSearch);
  await tableSearch.fill('');
  await page.waitForTimeout(700);
}

// revisit from cache
await page.locator('a[href="/"]').first().click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForTimeout(300);
await gotoViaSidebar();
await page.waitForTimeout(400);
const rowCountRevisit = await page.locator('tbody tr').count();
console.log('Row count on revisit:', rowCountRevisit);

console.log('CONSOLE ERRORS:', consoleErrors.length ? consoleErrors : 'none');
await browser.close();
