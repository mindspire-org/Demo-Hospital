const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const htmlPath = 'e:/Jinnah-Medical/OT_ICU_Module_Guide.html';
  const pdfPath = 'e:/Jinnah-Medical/OT_ICU_Module_Guide.pdf';

  if (!fs.existsSync(htmlPath)) {
    console.error('HTML file not found:', htmlPath);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    // Wait a moment for fonts/styles to apply
    await new Promise(r => setTimeout(r, 1000));

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    console.log('PDF created:', pdfPath);
  } catch (err) {
    console.error('Error creating PDF:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
