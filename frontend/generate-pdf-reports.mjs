import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const reportsDir = path.resolve('..', 'reports');
const screenshotsDir = path.resolve('..', 'screenshots');

function getBase64Image(filename) {
  const filePath = path.join(screenshotsDir, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  return '';
}

const reports = [
  {
    subject: 'DESIGN AND ANALYSIS OF ALGORITHMS',
    subjectShort: 'DAA',
    mentor: 'Simran Kumari',
    concept: "Greedy Huffman Tree Construction, Min-Heap Priority Queues, and Shannon Entropy",
    subtitle: 'OPTIMAL PREFIX ENTROPY CODING FOR INSTRUCTION MEMORY',
    question: 'How can greedy priority-queue tree construction minimize instruction storage while preserving Shannon entropy limits?',
    mdFile: 'DAA_MICRO_PROJECT_REPORT.md',
    pdfFile: 'DAA_MICRO_PROJECT_REPORT.pdf',
    screenshot: '02_daa_huffman.png'
  },
  {
    subject: 'FORMAL LANGUAGES AND AUTOMATA THEORY',
    subjectShort: 'FLAT',
    mentor: 'Vaibhav Giri',
    concept: "Regular Languages, Modular ε-NFA, Powerset Subset Construction, and 12-Bit Instruction Word Verification",
    subtitle: 'MODULAR ε-NFA TO DFA SUBSET CONSTRUCTION FOR INSTRUCTION VALIDATION',
    question: 'How does formal finite automata verification guarantee syntax and semantic correctness of decoded micro-architectural control words?',
    mdFile: 'FLAT_MICRO_PROJECT_REPORT.md',
    pdfFile: 'FLAT_MICRO_PROJECT_REPORT.pdf',
    screenshot: '03_flat_automata.png'
  },
  {
    subject: 'COMPUTER ORGANIZATION AND ARCHITECTURE',
    subjectShort: 'COA',
    mentor: 'Moufia Justin',
    concept: "Microprogrammed Control Store (ROM), 16-Bit Register Datapath, ALU Status Flags (Z, S, C, V), and Cycle Execution Engine",
    subtitle: 'MICROPROGRAMMED CONTROL UNIT SIMULATION WITH VARIABLE-WIDTH INSTRUCTION DECODING',
    question: 'How does a microprogrammed control store with general-purpose registers and status flags execute compressed instruction streams cycle-by-cycle?',
    mdFile: 'COA_MICRO_PROJECT_REPORT.md',
    pdfFile: 'COA_MICRO_PROJECT_REPORT.pdf',
    screenshot: '04_coa_architecture.png'
  }
];

function generateHtml(r) {
  const mdPath = path.join(reportsDir, r.mdFile);
  let content = fs.readFileSync(mdPath, 'utf8');

  const b64 = getBase64Image(r.screenshot);
  content = content.replace(/!\[.*?\]\(.*?\)/g, `<div style="text-align: center; margin: 20px 0;"><img src="${b64}" style="max-width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" /><p style="font-size: 12px; color: #64748b; margin-top: 6px;">Figure: Live Application Interface for ${r.subjectShort} Simulator</p></div>`);

  const mainBody = content.replace(/^#\s+[^\n]+[\s\S]*?---\s*\n\s*---\s*/m, '');

  let htmlBody = mainBody
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/```mermaid[\s\S]*?```/gim, '<div style="background:#f1f5f9; padding: 12px; border-left: 4px solid #3b82f6; font-family: monospace; font-size: 13px; margin: 15px 0;">[Execution Pipeline Flowchart Diagram Included]</div>')
    .replace(/```[\w]*\n([\s\S]*?)```/gim, '<pre style="background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 6px; overflow-x: auto; font-size: 12px;"><code>$1</code></pre>')
    .replace(/`([^`]+)`/gim, '<code style="background: #e2e8f0; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 13px;">$1</code>')
    .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');

  htmlBody = htmlBody.replace(/(<li>[\s\S]*?<\/li>)/gm, '<ul>$1</ul>');
  htmlBody = htmlBody.replace(/<\/ul>\s*<ul>/g, '');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${r.subject} - Micro Project Report</title>
<style>
  @page {
    size: A4;
    margin: 25mm 20mm 20mm 20mm;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 15px;
    line-height: 1.6;
    color: #111827;
    margin: 0;
    padding: 0;
  }
  .cover-page {
    text-align: center;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100vh;
    box-sizing: border-box;
    padding: 40px 10px;
  }
  .cover-header {
    font-size: 24px;
    font-weight: bold;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #0f172a;
    margin-bottom: 8px;
  }
  .cover-sub {
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 1px;
    margin-bottom: 40px;
    color: #334155;
  }
  .cover-title {
    font-size: 20px;
    font-weight: bold;
    font-style: italic;
    color: #1e293b;
    margin-top: 30px;
    margin-bottom: 10px;
  }
  .cover-question {
    font-size: 15px;
    font-style: italic;
    color: #475569;
    max-width: 600px;
    margin: 0 auto 50px auto;
  }
  .cover-meta {
    margin: 40px 0;
    font-size: 15px;
    line-height: 1.8;
  }
  .cover-meta strong {
    font-size: 16px;
  }
  .cover-footer {
    margin-top: auto;
    font-weight: bold;
    font-size: 15px;
    line-height: 1.5;
    letter-spacing: 0.5px;
  }
  .content-page {
    padding-top: 10px;
  }
  h1, h2, h3 {
    color: #0f172a;
    font-family: 'Times New Roman', Times, serif;
  }
  h1 {
    font-size: 20px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 30px;
  }
  h2 {
    font-size: 18px;
    margin-top: 25px;
    margin-bottom: 8px;
  }
  h3 {
    font-size: 16px;
    margin-top: 18px;
  }
  p {
    margin-bottom: 14px;
    text-align: justify;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 13px;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 8px 12px;
    text-align: left;
  }
  th {
    background-color: #f1f5f9;
    font-weight: bold;
  }
  ul {
    margin-bottom: 15px;
    padding-left: 25px;
  }
  li {
    margin-bottom: 6px;
  }
</style>
</head>
<body>

<div class="cover-page">
  <div>
    <div class="cover-header">${r.subject}</div>
    <div class="cover-sub">MICRO PROJECT REPORT</div>

    <div class="cover-title">${r.subtitle}</div>
    <div class="cover-question">${r.question}</div>
  </div>

  <div class="cover-meta">
    <div><strong>Submitted by:</strong></div>
    <div>Bandla Praharshitha</div>
    <div>Course: Kalvium</div>
    <div>Subject: ${r.subject}</div>
    <div>Concept: ${r.concept}</div>
    <br>
    <div><strong>Submitted to:</strong></div>
    <div>${r.mentor}</div>
    <div>Course Faculty / Mentor</div>
  </div>

  <div class="cover-footer">
    <div>ALLIANCE SCHOOL OF ADVANCED COMPUTING</div>
    <div>Alliance University, Bengaluru</div>
    <div>October 2026</div>
  </div>
</div>

<div class="content-page">
  ${htmlBody}
</div>

</body>
</html>`;
}

async function run() {
  console.log(`Using Chrome for PDF generation: ${executablePath}`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const r of reports) {
    console.log(`Generating report for ${r.subjectShort}...`);
    const html = generateHtml(r);
    const htmlPath = path.join(reportsDir, `${r.subjectShort}_MICRO_PROJECT_REPORT.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    await page.setContent(html, { waitUntil: 'load' });
    const pdfPath = path.join(reportsDir, r.pdfFile);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      }
    });
    console.log(`Saved PDF: ${pdfPath}`);
  }

  await browser.close();
  console.log('All PDF reports successfully created!');
}

run();

