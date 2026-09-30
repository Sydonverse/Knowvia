const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Knowvia — Pitch Deck Slides (16:9)</title>
  <style>
    @page {
      size: 297mm 167mm; /* 16:9 landscape */
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0f172a;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }

    .slide {
      width: 297mm;
      height: 167mm;
      page-break-after: always;
      position: relative;
      background: #ffffff;
      padding: 16mm 20mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    /* SLIDE HEADER */
    .slide-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6mm;
    }

    .slide-category {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #4f46e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 2.5px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 2mm;
    }

    .slide-title {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }

    .slide-subtitle {
      font-size: 11pt;
      color: #64748b;
      font-weight: 500;
      margin-top: 1mm;
    }

    .slide-timer-badge {
      font-size: 8pt;
      font-weight: 700;
      color: #475569;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 3px 9px;
      border-radius: 12px;
      white-space: nowrap;
    }

    /* SLIDE CONTENT AREA */
    .slide-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    /* FOOTER */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 3mm;
      font-size: 7.5pt;
      color: #94a3b8;
    }

    .slide-footer-brand {
      font-weight: 700;
      color: #4f46e5;
    }

    /* GRID LAYOUTS */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6mm;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8mm;
    }

    /* CARD STYLING */
    .card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 6mm 7mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      position: relative;
    }

    .card-num {
      font-size: 9pt;
      font-weight: 800;
      color: #4f46e5;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 2mm;
    }

    .card-heading {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2.5mm;
      line-height: 1.25;
    }

    .card-text {
      font-size: 9.5pt;
      color: #475569;
      line-height: 1.45;
    }

    .card-text ul {
      margin-left: 5mm;
      margin-top: 2mm;
    }

    .card-text li {
      margin-bottom: 1.5mm;
    }

    /* HERO COVER SLIDE */
    .slide-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #ffffff;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 20mm;
    }

    .hero-badge {
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #a5b4fc;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(165, 180, 252, 0.3);
      padding: 4px 14px;
      border-radius: 20px;
      display: inline-block;
      margin-bottom: 5mm;
    }

    .hero-title {
      font-size: 46pt;
      font-weight: 900;
      letter-spacing: -0.03em;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 4mm;
    }

    .hero-tagline {
      font-size: 16pt;
      color: #cbd5e1;
      max-width: 200mm;
      margin: 0 auto 8mm auto;
      font-weight: 400;
      line-height: 1.35;
    }

    .hero-meta-row {
      display: flex;
      justify-content: center;
      gap: 12mm;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 6mm;
      font-size: 10pt;
      color: #94a3b8;
    }

    .hero-meta-row strong {
      color: #ffffff;
    }

    /* METRIC PILLS & HIGHLIGHT BOXES */
    .stat-box {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 5mm;
      margin-bottom: 4mm;
    }

    .stat-number {
      font-size: 26pt;
      font-weight: 800;
      color: #4f46e5;
      line-height: 1;
      margin-bottom: 1.5mm;
    }

    .stat-desc {
      font-size: 9.5pt;
      color: #475569;
      font-weight: 500;
      line-height: 1.35;
    }

    .sticky-card {
      background: #fefce8;
      border: 1.5px solid #fef08a;
      border-radius: 8px;
      padding: 6mm;
      box-shadow: 2px 3px 6px rgba(0, 0, 0, 0.04);
    }

    .sticky-title {
      font-size: 11pt;
      font-weight: 800;
      color: #854d0e;
      margin-bottom: 2mm;
      display: flex;
      align-items: center;
      gap: 2mm;
    }

    .sticky-quote {
      font-size: 10pt;
      color: #713f12;
      line-height: 1.45;
    }

    /* BENEFIT ROWS (Simplified Architecture) */
    .tier-stack {
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }

    .tier-row {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 4mm 6mm;
      display: flex;
      align-items: center;
      gap: 6mm;
    }

    .tier-label {
      width: 60mm;
      font-size: 10.5pt;
      font-weight: 800;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }

    .tier-content {
      font-size: 10pt;
      color: #334155;
      line-height: 1.4;
    }

    /* DEMO SLIDE */
    .slide-demo {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      color: #ffffff;
    }

    .slide-demo .slide-title {
      color: #ffffff;
    }

    .slide-demo .slide-subtitle {
      color: #cbd5e1;
    }

    .demo-step-card {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 6mm;
      color: #ffffff;
    }

    .demo-step-time {
      font-size: 9pt;
      font-weight: 800;
      color: #a5b4fc;
      text-transform: uppercase;
      margin-bottom: 2mm;
    }

    .demo-step-title {
      font-size: 13pt;
      font-weight: 700;
      margin-bottom: 2mm;
    }

    .demo-step-text {
      font-size: 9.5pt;
      color: #e2e8f0;
      line-height: 1.45;
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: COVER -->
  <div class="slide slide-hero">
    <div>
      <div class="hero-badge">TECH HUB ACADEMY PLATFORM</div>
      <div class="hero-title">KNOWVIA</div>
      <div class="hero-tagline">
        The Simple, All-in-One Digital Campus Built for Multi-Department Tech Hub Programs.
      </div>
      <div class="hero-meta-row">
        <div><strong>Presentation:</strong> 3-Minute Pitch + 2-Minute Live Demo</div>
        <div><strong>Format:</strong> Works in Any Phone Browser (PWA)</div>
        <div><strong>Team:</strong> Sydonverse / Knowvia</div>
      </div>
    </div>
  </div>

  <!-- SLIDE 2: THE PROBLEM (EVERYDAY REALITY) -->
  <div class="slide">
    <div class="slide-top">
      <div>
        <div class="slide-category">The Everyday Reality</div>
        <div class="slide-title">Why WhatsApp Fails for Tech Hubs</div>
        <div class="slide-subtitle">Managing 50+ students in large group chats creates daily confusion for tutors and learners.</div>
      </div>
      <div class="slide-timer-badge">0:15 &ndash; 0:40 (25s)</div>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="card">
          <div class="card-num">01 / Lost Announcements</div>
          <div class="card-heading">Drowned in Chat Noise</div>
          <div class="card-text">
            Important class links, timetable changes, and tutor updates get buried under hundreds of casual messages, memes, and banter.
          </div>
        </div>

        <div class="card">
          <div class="card-num">02 / Lost Homework</div>
          <div class="card-heading">Scattered Submissions</div>
          <div class="card-text">
            Students send assignments across direct messages, random emails, and shared folders. Tutors lose track of who submitted what.
          </div>
        </div>

        <div class="card">
          <div class="card-num">03 / Unsafe Files</div>
          <div class="card-heading">Expired & Risky Files</div>
          <div class="card-text">
            Download links expire, phone storage fills up, and unvetted shared files put students' laptops at risk of malware and viruses.
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 2 of 8</span>
    </div>
  </div>

  <!-- SLIDE 3: USER RESEARCH (WHAT SURPRISED US) -->
  <div class="slide">
    <div class="slide-top">
      <div>
        <div class="slide-category">What We Learned</div>
        <div class="slide-title">Talking to Tutors & Students: What Surprised Us?</div>
        <div class="slide-subtitle">Direct findings from interviewing hub managers, course instructors, and interns.</div>
      </div>
      <div class="slide-timer-badge">0:40 &ndash; 1:10 (30s)</div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div>
          <div class="stat-box">
            <div class="stat-number">8 of 10</div>
            <div class="stat-desc"><strong>Students</strong> reported missing at least one class or assignment deadline because messages got lost in chat.</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">3+ Hours</div>
            <div class="stat-desc"><strong>Wasted every week</strong> by tutors manually chasing student homework across spreadsheets and chat threads.</div>
          </div>
        </div>

        <div class="sticky-card">
          <div class="sticky-title">💡 What Surprised Us Most</div>
          <div class="sticky-quote">
            "We initially assumed tech hubs needed heavy university software like Canvas or Blackboard.<br><br>
            <strong>We were wrong.</strong> Hubs told us those systems are too complicated, too expensive, and students abandon them.<br><br>
            What they really wanted was <strong>the speed and ease of a chat app</strong>, but with <strong>organized classrooms, clear schedules, and safe study materials.</strong>"
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 3 of 8</span>
    </div>
  </div>

  <!-- SLIDE 4: OUR SOLUTION -->
  <div class="slide">
    <div class="slide-top">
      <div>
        <div class="slide-category">The Solution</div>
        <div class="slide-title">Meet Knowvia</div>
        <div class="slide-subtitle">A clean, easy-to-use digital home where every department stays focused and organized.</div>
      </div>
      <div class="slide-timer-badge">1:10 &ndash; 1:35 (25s)</div>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="card" style="border-top: 4px solid #4f46e5;">
          <div class="card-num">Pillar 01</div>
          <div class="card-heading">Dedicated Classrooms</div>
          <div class="card-text">
            Web Development, Design, and Cybersecurity each have their own private workspace. Zero noise or distractions from other tracks.
          </div>
        </div>

        <div class="card" style="border-top: 4px solid #06b6d4;">
          <div class="card-num">Pillar 02</div>
          <div class="card-heading">Never Miss a Class</div>
          <div class="card-text">
            Your next class countdown is right at the top. A simple progress bar shows your homework status and feedback in real time.
          </div>
        </div>

        <div class="card" style="border-top: 4px solid #10b981;">
          <div class="card-num">Pillar 03</div>
          <div class="card-heading">Safe Study Materials</div>
          <div class="card-text">
            Lesson notes and slides never expire. Files are automatically screened for viruses before anyone downloads them.
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 4 of 8 &bull; Transition to Live Demo</span>
    </div>
  </div>

  <!-- SLIDE 5: LIVE DEMO INTERLUDE -->
  <div class="slide slide-demo">
    <div class="slide-top">
      <div>
        <div class="slide-category" style="background: rgba(255,255,255,0.15); color: #e0e7ff; border-color: rgba(255,255,255,0.3);">
          Live Walkthrough
        </div>
        <div class="slide-title">A Day in the Life on Knowvia</div>
        <div class="slide-subtitle">2-Minute live walkthrough showing the student, tutor, and classroom experience.</div>
      </div>
      <div class="slide-timer-badge" style="background: #fbbf24; color: #78350f; font-weight: 800;">
        1:35 &ndash; 3:35 (120 SECONDS)
      </div>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="demo-step-card">
          <div class="demo-step-time">Step 1 &bull; 0:00 &ndash; 0:40</div>
          <div class="demo-step-title">The Student Experience</div>
          <div class="demo-step-text">
            &bull; Live countdown to today's class with meeting link.<br>
            &bull; Clear homework checklist (Approved, Needs Work).<br>
            &bull; Tap notification bell to jump straight to homework.
          </div>
        </div>

        <div class="demo-step-card">
          <div class="demo-step-time">Step 2 &bull; 0:40 &ndash; 1:20</div>
          <div class="demo-step-title">The Tutor Experience</div>
          <div class="demo-step-text">
            &bull; Change class schedule in one click (syncs live).<br>
            &bull; Upload slides & guides with automatic virus check.<br>
            &bull; Review and approve student homework in seconds.
          </div>
        </div>

        <div class="demo-step-card">
          <div class="demo-step-time">Step 3 &bull; 1:20 &ndash; 2:00</div>
          <div class="demo-step-title">Focused Classroom Chat</div>
          <div class="demo-step-text">
            &bull; Pure department discussion (zero outside chatter).<br>
            &bull; Reply directly to questions with quoted threads.<br>
            &bull; Clean, professional member badges.
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer" style="border-top-color: rgba(255,255,255,0.1); color: #94a3b8;">
      <span style="color: #a5b4fc; font-weight: 700;">Live Demo Screen Active</span>
      <span>Transitioning to "How It Works" on Slide 6</span>
    </div>
  </div>

  <!-- SLIDE 6: HOW IT WORKS (SIMPLIFIED TECH) -->
  <div class="slide">
    <div class="slide-top">
      <div>
        <div class="slide-category">How It Works</div>
        <div class="slide-title">Built for Simplicity, Speed & Safety</div>
        <div class="slide-subtitle">Reliable technology designed to work effortlessly for everyone, even on slow mobile data.</div>
      </div>
      <div class="slide-timer-badge">3:35 &ndash; 4:00 (25s)</div>
    </div>

    <div class="slide-body">
      <div class="tier-stack">
        <div class="tier-row" style="border-left: 5px solid #4f46e5;">
          <div class="tier-label" style="color: #4f46e5;">Works on Any Phone</div>
          <div class="tier-content">
            <strong>No App Store Download Required:</strong> Students and tutors simply open a link in their browser. It loads instantly like an app, saves mobile data, and works on any smartphone or laptop.
          </div>
        </div>

        <div class="tier-row" style="border-left: 5px solid #0891b2;">
          <div class="tier-label" style="color: #0891b2;">Instant Live Updates</div>
          <div class="tier-content">
            <strong>Never Miss an Alert:</strong> When a tutor reschedules a class or posts a new assignment, everyone receives an instant alert on their screen—no refreshing required.
          </div>
        </div>

        <div class="tier-row" style="border-left: 5px solid #059669;">
          <div class="tier-label" style="color: #059669;">Built-in Safety & Privacy</div>
          <div class="tier-content">
            <strong>Safe Files & Private Workspaces:</strong> Every study file is automatically screened for viruses before storage, and each department's private discussions stay completely secure.
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 6 of 8</span>
    </div>
  </div>

  <!-- SLIDE 7: MARKET & WHY WE WIN -->
  <div class="slide">
    <div class="slide-top">
      <div>
        <div class="slide-category">Why Knowvia Wins</div>
        <div class="slide-title">Why Existing Tools Don't Work</div>
        <div class="slide-subtitle">The best of both worlds: as easy as a chat app, as structured as a digital school.</div>
      </div>
      <div class="slide-timer-badge">4:00 &ndash; 4:25 (25s)</div>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="card">
          <div class="card-num" style="color: #64748b;">Informal Apps</div>
          <div class="card-heading">WhatsApp & Telegram</div>
          <div class="card-text">
            <ul>
              <li>Easy to use, but messy and chaotic.</li>
              <li>No homework tracking or grading.</li>
              <li>Constant chat noise; missed deadlines.</li>
              <li>Files expire; virus risks.</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-num" style="color: #dc2626;">School Portals</div>
          <div class="card-heading">Canvas & Blackboard</div>
          <div class="card-text">
            <ul>
              <li>Built for universities, not fast bootcamps.</li>
              <li>Very expensive for local tech hubs.</li>
              <li>Heavy, slow, and hard to learn.</li>
              <li>Students rarely check them.</li>
            </ul>
          </div>
        </div>

        <div class="card" style="background: #f0fdf4; border-color: #86efac;">
          <div class="card-num" style="color: #16a34a;">The Knowvia Advantage</div>
          <div class="card-heading" style="color: #14532d;">The Sweet Spot</div>
          <div class="card-text">
            <ul>
              <li><strong>Zero friction:</strong> Open in any phone browser.</li>
              <li><strong>Department Rooms:</strong> No outside noise.</li>
              <li><strong>Everything in one place:</strong> Schedules, homework, chat & safe files.</li>
              <li><strong>Huge Reach:</strong> 150+ hubs & youth programs.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 7 of 8</span>
    </div>
  </div>

  <!-- SLIDE 8: BUSINESS MODEL & TEAM -->
  <div class="slide">
    <div class="slide-top">
      <div>
        <div class="slide-category">The Business & Team</div>
        <div class="slide-title">How We Grow & Who We Are</div>
        <div class="slide-subtitle">A sustainable partnership model backed by a team passionate about tech education.</div>
      </div>
      <div class="slide-timer-badge">4:25 &ndash; 5:00 (35s &bull; Q&A Anchor)</div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="card">
          <div class="card-num">How We Make Money</div>
          <div class="card-heading">B2B Hub Partnerships</div>
          <div class="card-text">
            &bull; <strong>Affordable Hub License:</strong> Tech hubs pay a simple annual fee per cohort (covering all departments).<br>
            &bull; <strong>Custom Enterprise Tier:</strong> For large government programs (like 3MTT) needing custom branding & storage.<br>
            &bull; <strong>A Clear Win-Win:</strong> Hubs save hundreds of hours of admin chaos; students actually finish their courses.
          </div>
        </div>

        <div class="card" style="background: #f8fafc; border-color: #cbd5e1; text-align: center;">
          <div class="card-num">Meet the Team</div>
          <div class="card-heading">Ready for Deployment</div>
          <div class="card-text" style="margin-top: 2mm;">
            <strong>Built by:</strong> Dedicated team of frontend, backend, and user researchers.<br>
            <strong>Tested & Proven:</strong> 88 automated tests passed &bull; Production Certified.<br><br>
            <div style="display: inline-block; padding: 4px 12px; background: #ffffff; border: 1.5px solid #4f46e5; border-radius: 6px; font-weight: 700; color: #4f46e5; font-size: 8pt;">
              SCAN WITH YOUR PHONE CAMERA TO TRY LIVE
            </div>
            <p style="margin-top: 2mm; font-size: 7.5pt; color: #64748b;">GitHub: Sydonverse / Knowvia</p>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 8 of 8 &bull; Ready for Q&A</span>
    </div>
  </div>

</body>
</html>`;

const tempHtmlPath = path.resolve('slides_temp.html');
const presentationHtmlPath = path.resolve('presentation_slides.html');
const outputPdfPath = path.resolve('Project_Knowvia_Presentation_Slides_16x9.pdf');
const tempUserDataDir = path.join(os.tmpdir(), 'edge_slides_pdf_' + Date.now());

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
fs.writeFileSync(presentationHtmlPath, htmlContent, 'utf8');

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browserExe = fs.existsSync(edgeExe) ? edgeExe : chromeExe;

console.log('Using browser binary:', browserExe);
console.log('Writing HTML to:', tempHtmlPath);
console.log('Compiling 16:9 Presentation Slides to PDF:', outputPdfPath);

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
    if (stats.size > 20000) {
      clearInterval(interval);
      console.log('SUCCESS: 16:9 Presentation Slides PDF Generated successfully!');
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
