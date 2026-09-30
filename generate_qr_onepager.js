const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Read the QR code SVG or PNG as base64 so it embeds reliably with zero file path issues
const qrPngBase64 = fs.readFileSync(path.resolve('knowvia_qr_code.png')).toString('base64');
const qrDataUri = `data:image/png;base64,${qrPngBase64}`;

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Knowvia — Live App Access QR Code</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      width: 210mm;
      height: 297mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 24mm 20mm;
      -webkit-font-smoothing: antialiased;
    }

    /* TOP HEADER */
    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 3.5mm;
      margin-bottom: 4mm;
    }

    .brand-icon {
      width: 10mm;
      height: 10mm;
      background: #4f46e5;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 900;
      font-size: 14pt;
    }

    .brand-name {
      font-size: 16pt;
      font-weight: 900;
      letter-spacing: 0.18em;
      color: #0f172a;
      text-transform: uppercase;
    }

    .badge {
      display: inline-block;
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #4f46e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 3px 14px;
      border-radius: 20px;
      margin-bottom: 4mm;
    }

    .main-title {
      font-size: 26pt;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #0f172a;
      line-height: 1.15;
    }

    .sub-title {
      font-size: 12pt;
      color: #64748b;
      margin-top: 2.5mm;
      max-width: 140mm;
    }

    /* CENTER QR CARD */
    .qr-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 24px;
      padding: 10mm;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .qr-image-wrapper {
      background: #ffffff;
      padding: 4mm;
      border: 1.5px solid #cbd5e1;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-image {
      width: 105mm;
      height: 105mm;
      display: block;
    }

    .url-pill {
      margin-top: 7mm;
      display: inline-flex;
      align-items: center;
      gap: 2mm;
      background: #f1f5f9;
      border: 1.5px solid #cbd5e1;
      border-radius: 30px;
      padding: 4mm 10mm;
      font-size: 13pt;
      font-weight: 800;
      color: #4f46e5;
      letter-spacing: 0.02em;
    }

    .instructions {
      font-size: 10.5pt;
      color: #64748b;
      margin-top: 4mm;
      line-height: 1.4;
    }

    /* FOOTER */
    .footer {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1.5px solid #e2e8f0;
      padding-top: 5mm;
      font-size: 9pt;
      color: #94a3b8;
    }

    .footer-left {
      font-weight: 700;
      color: #4f46e5;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="brand-row">
      <div class="brand-icon">K</div>
      <div class="brand-name">Knowvia</div>
    </div>
    <div class="badge">Live Deployment &bull; Our Hub</div>
    <div class="main-title">Scan to Test Live on Mobile</div>
    <div class="sub-title">Open your phone's camera, scan the QR code below, and explore the Knowvia digital campus instantly.</div>
  </div>

  <!-- CENTER LARGE QR CODE -->
  <div class="qr-card">
    <div class="qr-image-wrapper">
      <img src="${qrDataUri}" alt="Knowvia Live App QR Code" class="qr-image" />
    </div>

    <div class="url-pill">
      <span>🌐</span>
      <span>knowvia-five.vercel.app</span>
    </div>

    <div class="instructions">
      Works in any mobile browser &bull; Zero app store download required &bull; Ultra-fast load
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-left">Knowvia &bull; In-House Platform for Our Hub</div>
    <div>Sydonverse / Knowvia &bull; 88 Automated Tests Passed</div>
  </div>

</body>
</html>`;

const tempHtmlPath = path.resolve('qr_onepager_temp.html');
const outputPdfPath = path.resolve('Knowvia_Live_App_QR_Code.pdf');
const tempUserDataDir = path.join(os.tmpdir(), 'edge_qr_pdf_' + Date.now());

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browserExe = fs.existsSync(edgeExe) ? edgeExe : chromeExe;

console.log('Writing HTML to:', tempHtmlPath);
console.log('Compiling QR One-Pager PDF to:', outputPdfPath);

if (fs.existsSync(outputPdfPath)) {
  fs.unlinkSync(outputPdfPath);
}

const child = spawn(browserExe, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=' + tempUserDataDir,
  '--no-pdf-header-footer',
  '--print-to-pdf=' + outputPdfPath,
  'file:///' + tempHtmlPath.replace(/\\/g, '/')
]);

const interval = setInterval(() => {
  if (fs.existsSync(outputPdfPath)) {
    const stats = fs.statSync(outputPdfPath);
    if (stats.size > 15000) {
      clearInterval(interval);
      console.log('SUCCESS: QR One-Pager PDF Generated successfully!');
      console.log('File size:', stats.size, 'bytes');
      console.log('Absolute PDF Path:', outputPdfPath);
      try { child.kill(); } catch {}
      setTimeout(() => process.exit(0), 500);
    }
  }
}, 500);

setTimeout(() => {
  clearInterval(interval);
  if (fs.existsSync(outputPdfPath)) {
    console.log('PDF was written before timeout.');
    process.exit(0);
  } else {
    console.error('Timeout waiting for PDF generation');
    process.exit(1);
  }
}, 15000);
