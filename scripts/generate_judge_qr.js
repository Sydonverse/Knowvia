const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Generate 30-day token for The Judge
const jwt = require('../server/node_modules/jsonwebtoken');
const userId = '7937de23-5f9c-43ce-b79c-96eb4f2fc2df';
const role = 'INTERN';
const secret = 'nexus_jwt_secret_dev_key_2026_secure';

const token = jwt.sign({ userId, role }, secret, { expiresIn: '30d' });
const targetUrl = `https://knowvia-five.vercel.app/?token=${token}`;

console.log('--- THE JUDGE QR LOGIN ---');
console.log('Account Name: The Judge');
console.log('Account Email: knowviademo@gmail.com');
console.log('Target URL: ' + targetUrl);

// 2. Generate PNG QR Code
const pngPath = path.resolve('judge_qr_code.png');
execSync(`npx -y qrcode "${targetUrl}" -w 600 -m 2 -o "${pngPath}"`);
console.log('Generated PNG QR Code:', pngPath);

// 3. Generate SVG QR Code
const svgPath = path.resolve('judge_qr_code.svg');
execSync(`npx -y qrcode "${targetUrl}" -t svg -o "${svgPath}"`);
console.log('Generated SVG QR Code:', svgPath);

// 4. Create a standalone presentation badge / card HTML
const qrPngBase64 = fs.readFileSync(pngPath).toString('base64');
const cardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Knowvia — The Judge Instant Access Pass</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: #090d16;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px 20px;
    }

    .badge-card {
      width: 100%;
      max-width: 440px;
      background: linear-gradient(180deg, #131b2e 0%, #0d1322 100%);
      border: 1.5px solid rgba(99, 102, 241, 0.35);
      border-radius: 24px;
      padding: 36px 32px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(99, 102, 241, 0.25);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .badge-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #6366f1, #06b6d4, transparent);
    }

    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      color: #818cf8;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }

    .title {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .qr-container {
      background: #ffffff;
      padding: 16px;
      border-radius: 20px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      border: 4px solid #f1f5f9;
    }

    .qr-image {
      width: 240px;
      height: 240px;
      display: block;
    }

    .info-box {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 20px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      padding: 4px 0;
    }

    .info-label {
      color: #64748b;
      font-weight: 600;
    }

    .info-value {
      color: #f1f5f9;
      font-weight: 700;
    }

    .instructions {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }

    .direct-link {
      display: inline-block;
      margin-top: 14px;
      font-size: 12px;
      color: #38bdf8;
      text-decoration: none;
      word-break: break-all;
    }

    .direct-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="badge-card">
    <div class="brand-pill">
      <span>★ Knowvia Demo Access Pass</span>
    </div>
    <h1 class="title">The Judge</h1>
    <p class="subtitle">Scan to authenticate directly into the platform without email or password</p>

    <div class="qr-container">
      <img src="data:image/png;base64,${qrPngBase64}" class="qr-image" alt="The Judge Login QR Code" />
    </div>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Account Name:</span>
        <span class="info-value">The Judge</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">knowviademo@gmail.com</span>
      </div>
      <div class="info-row">
        <span class="info-label">Workspace:</span>
        <span class="info-value">Cybersecurity</span>
      </div>
      <div class="info-row">
        <span class="info-label">Access Type:</span>
        <span class="info-value" style="color: #34d399;">Direct Instant Pass</span>
      </div>
    </div>

    <p class="instructions">
      Open camera on mobile device or tablet and point at the QR code. You will be redirected straight to the Knowvia workspace dashboard.
    </p>

    <a href="${targetUrl}" target="_blank" class="direct-link">Click here to open login link directly</a>
  </div>
</body>
</html>`;

const cardPath = path.resolve('judge_access_card.html');
fs.writeFileSync(cardPath, cardHtml, 'utf8');
console.log('Generated Presentation Card HTML:', cardPath);

// 5. Also copy files to artifacts directory
const artifactDir = 'C:\\\\Users\\\\HP\\\\.gemini\\\\antigravity-ide\\\\brain\\\\2ba243b0-b2e3-459d-b56c-102b0fe782f7';
fs.copyFileSync(pngPath, path.join(artifactDir, 'judge_qr_code.png'));
fs.copyFileSync(svgPath, path.join(artifactDir, 'judge_qr_code.svg'));
fs.copyFileSync(cardPath, path.join(artifactDir, 'judge_access_card.html'));
console.log('Artifacts copied to brain directory successfully!');
