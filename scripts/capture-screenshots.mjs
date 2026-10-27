import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
const outDir = path.resolve('screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const targets = [
  { url: 'http://localhost:3000/', file: '01_dashboard.png' },
  { url: 'http://localhost:3000/daa', file: '02_daa_huffman.png' },
  { url: 'http://localhost:3000/flat', file: '03_flat_automata.png' },
  { url: 'http://localhost:3000/coa', file: '04_coa_architecture.png' },
  { url: 'http://localhost:3000/simulation', file: '05_simulation_pipeline.png' },
  { url: 'http://localhost:3000/documentation', file: '06_documentation.png' },
];

async function capture() {
  console.log(`Using browser executable: ${executablePath}`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  for (const t of targets) {
    console.log(`Navigating to ${t.url}...`);
    try {
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 30000 });
      // Small pause for client animations/charts to settle
      await new Promise(r => setTimeout(r, 1500));
      const dest = path.join(outDir, t.file);
      await page.screenshot({ path: dest, fullPage: false });
      console.log(`Saved screenshot: ${dest}`);
    } catch (err) {
      console.error(`Failed to capture ${t.url}:`, err.message);
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

capture();

