const fs = require('fs');
const puppeteer = require('puppeteer');

async function createPDFFromText(textFile, pdfFile) {
  const text = fs.readFileSync(textFile, 'utf8');
  
  // Create a simple HTML version
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #2c3e50; }
          h2 { color: #34495e; margin-top: 30px; }
        </style>
      </head>
      <body>
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${text}</pre>
      </body>
    </html>
  `;
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({ path: pdfFile, format: 'A4', margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' } });
  await browser.close();
  
  console.log(`Created ${pdfFile}`);
}

async function main() {
  await createPDFFromText('test-protocol.txt', 'test-protocol.pdf');
  await createPDFFromText('test-crf.txt', 'test-crf.pdf');
  console.log('PDF files created successfully');
}

main().catch(console.error);