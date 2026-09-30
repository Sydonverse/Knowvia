const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Knowvia — Minimal Pitch Deck Slides (16:9)</title>
  <style>
    @page {
      size: 297mm 167mm; /* 16:9 widescreen */
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
      background: #f8fafc;
      padding: 16mm 22mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    /* TOP ACCENT DECORATION (Inspired by Agri-Vault) */
    .top-accent-pill {
      position: absolute;
      top: 14mm;
      right: 22mm;
      width: 32mm;
      height: 5mm;
      background: #4f46e5;
      border-radius: 10px;
      opacity: 0.85;
    }

    .top-accent-dot {
      position: absolute;
      top: 14mm;
      right: 15mm;
      width: 5mm;
      height: 5mm;
      background: #4f46e5;
      border-radius: 50%;
      opacity: 0.85;
    }

    /* SLIDE TOP HEADER */
    .slide-top {
      display: flex;
      flex-direction: column;
      margin-bottom: 4mm;
      position: relative;
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 2.5mm;
      margin-bottom: 2mm;
    }

    .brand-icon {
      width: 6mm;
      height: 6mm;
      background: #4f46e5;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 900;
      font-size: 8pt;
    }

    .brand-name {
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 0.16em;
      color: #4f46e5;
      text-transform: uppercase;
    }

    .slide-title {
      font-size: 26pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.1;
      text-transform: uppercase;
      display: flex;
      align-items: baseline;
      gap: 3mm;
    }

    /* Agri-Vault style 3 accent dots under title */
    .title-dots {
      display: flex;
      gap: 2mm;
      margin-top: 1.5mm;
      margin-bottom: 1.5mm;
    }

    .title-dot {
      width: 3mm;
      height: 3mm;
      background: #4f46e5;
      border-radius: 50%;
      opacity: 0.7;
    }

    .slide-subtitle {
      font-size: 11pt;
      color: #64748b;
      font-weight: 500;
    }

    /* SLIDE MAIN CONTENT */
    .slide-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 5mm;
    }

    /* FOOTER */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 3mm;
      font-size: 7.5pt;
      color: #94a3b8;
    }

    .slide-footer-brand {
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #4f46e5;
    }

    /* HERO COVER */
    .slide-hero {
      background: radial-gradient(circle at 50% 35%, #1e1b4b 0%, #0f172a 100%);
      color: #ffffff;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 24mm;
    }

    .hero-badge {
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #a5b4fc;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(165, 180, 252, 0.25);
      padding: 4px 16px;
      border-radius: 20px;
      display: inline-block;
      margin-bottom: 6mm;
    }

    .hero-title {
      font-size: 52pt;
      font-weight: 900;
      letter-spacing: -0.03em;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 4mm;
    }

    .hero-tagline {
      font-size: 15pt;
      color: #cbd5e1;
      max-width: 210mm;
      margin: 0 auto 10mm auto;
      font-weight: 400;
      line-height: 1.35;
    }

    .hero-meta-row {
      display: flex;
      justify-content: center;
      gap: 12mm;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 6mm;
      font-size: 9.5pt;
      color: #94a3b8;
    }

    .hero-meta-row strong {
      color: #ffffff;
    }

    /* AGRI-VAULT STYLE NUMBERED CAPSULES */
    .capsule-list {
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }

    .capsule-item {
      display: flex;
      align-items: center;
      gap: 5.5mm;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 4.5mm 6mm;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .capsule-num {
      width: 12mm;
      height: 12mm;
      border-radius: 50%;
      background: #4f46e5;
      color: #ffffff;
      font-size: 12pt;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .capsule-content {
      display: flex;
      flex-direction: column;
    }

    .capsule-title {
      font-size: 13.5pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }

    .capsule-desc {
      font-size: 10pt;
      color: #64748b;
      margin-top: 1mm;
      line-height: 1.35;
    }

    /* 2-COLUMN & 3-COLUMN MINIMAL GRIDS */
    .grid-2 {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 8mm;
      align-items: center;
    }

    .grid-2-equal {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8mm;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6mm;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4.5mm;
    }

    /* CARD STYLING */
    .mini-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 6.5mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      position: relative;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .mini-card-tag {
      font-size: 8.5pt;
      font-weight: 900;
      color: #4f46e5;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 2mm;
    }

    .mini-card-title {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2mm;
      line-height: 1.2;
    }

    .mini-card-text {
      font-size: 10pt;
      color: #475569;
      line-height: 1.45;
    }

    .mini-card-text ul {
      margin-left: 5mm;
      margin-top: 1mm;
    }

    .mini-card-text li {
      margin-bottom: 1.5mm;
    }

    /* STATS CALLOUTS */
    .stat-pill {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 5.5mm 6mm;
      display: flex;
      align-items: center;
      gap: 5mm;
      margin-bottom: 4mm;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .stat-big {
      font-size: 34pt;
      font-weight: 900;
      color: #4f46e5;
      line-height: 1;
      flex-shrink: 0;
      min-width: 25mm;
    }

    .stat-label {
      font-size: 11pt;
      color: #1e293b;
      font-weight: 600;
      line-height: 1.35;
    }

    .insight-quote-box {
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
      border-radius: 14px;
      padding: 7mm;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .insight-quote-tag {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #1d4ed8;
      margin-bottom: 2.5mm;
    }

    .insight-quote-body {
      font-size: 11.5pt;
      color: #1e3a8a;
      line-height: 1.5;
    }

    /* DEMO SLIDE */
    .slide-demo {
      background: radial-gradient(circle at 50% 35%, #1e1b4b 0%, #0f172a 100%);
      color: #ffffff;
    }

    .slide-demo .slide-title {
      color: #ffffff;
    }

    .slide-demo .slide-subtitle {
      color: #cbd5e1;
    }

    .slide-demo .title-dot {
      background: #a5b4fc;
    }

    .slide-demo .brand-name {
      color: #a5b4fc;
    }

    .slide-demo .brand-icon {
      background: #a5b4fc;
      color: #1e1b4b;
    }

    .demo-step-box {
      background: rgba(255, 255, 255, 0.07);
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      padding: 6.5mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .demo-step-badge {
      font-size: 8.5pt;
      font-weight: 900;
      color: #a5b4fc;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 2mm;
    }

    .demo-step-heading {
      font-size: 15pt;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 2mm;
    }

    .demo-step-desc {
      font-size: 10pt;
      color: #cbd5e1;
      line-height: 1.45;
    }

    /* HOW IT WORKS TIERS */
    .arch-stack {
      display: flex;
      flex-direction: column;
      gap: 3.5mm;
    }

    .arch-card {
      display: flex;
      align-items: center;
      gap: 6mm;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 4.5mm 6mm;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .arch-badge {
      width: 48mm;
      font-size: 10.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    .arch-text {
      font-size: 10.5pt;
      color: #334155;
      line-height: 1.4;
    }

    /* MOCKUP FRAME (Agri-Vault photo card style) */
    .preview-frame {
      background: #ffffff;
      border: 2px solid #cbd5e1;
      border-radius: 16px;
      padding: 5mm;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 2.5mm;
    }

    .preview-dot-row {
      display: flex;
      gap: 1.5mm;
    }

    .preview-dot {
      width: 2.5mm;
      height: 2.5mm;
      border-radius: 50%;
      background: #cbd5e1;
    }

    .preview-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 3mm 4mm;
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: COVER -->
  <div class="slide slide-hero">
    <div>
      <div class="hero-badge">IN-HOUSE PLATFORM &bull; OUR HUB</div>
      <div class="hero-title">KNOWVIA</div>
      <div class="hero-tagline">
        A Purpose-Built Digital Campus & Operations Platform for Our Hub's Internship Program.
      </div>
      <div class="hero-meta-row">
        <div><strong>Presentation:</strong> 3-Min Pitch + 2-Min Live Demo</div>
        <div><strong>Access:</strong> Phone Browser &bull; Zero Installation</div>
        <div><strong>Team:</strong> Sydonverse / Knowvia</div>
      </div>
    </div>
  </div>

  <!-- SLIDE 2: THE PROBLEM (MINIMAL NUMBERED POINTS) -->
  <div class="slide">
    <div class="top-accent-pill"></div>
    <div class="top-accent-dot"></div>

    <div class="slide-top">
      <div class="brand-row">
        <div class="brand-icon">K</div>
        <div class="brand-name">Knowvia</div>
      </div>
      <div class="slide-title">The Problem</div>
      <div class="title-dots">
        <div class="title-dot"></div>
        <div class="title-dot"></div>
        <div class="title-dot"></div>
      </div>
      <div class="slide-subtitle">Running 50+ interns across open WhatsApp groups creates daily friction</div>
    </div>

    <div class="slide-body">
      <div class="capsule-list">
        <div class="capsule-item">
          <div class="capsule-num">01</div>
          <div class="capsule-content">
            <div class="capsule-title">Lost Announcements & Links</div>
            <div class="capsule-desc">Class links, venue changes, and urgent tutor notices get buried under everyday chat noise.</div>
          </div>
        </div>

        <div class="capsule-item">
          <div class="capsule-num">02</div>
          <div class="capsule-content">
            <div class="capsule-title">Scattered Homework Submissions</div>
            <div class="capsule-desc">Interns submit tasks across personal DMs and emails. Tutors lose hours tracking who submitted.</div>
          </div>
        </div>

        <div class="capsule-item">
          <div class="capsule-num">03</div>
          <div class="capsule-content">
            <div class="capsule-title">Expired Links & Virus Risks</div>
            <div class="capsule-desc">Download links expire, phone storage fills up, and unvetted shared files put hub laptops at risk.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 2 of 8</span>
    </div>
  </div>

  <!-- SLIDE 3: USER INSIGHTS (CLEAN METRICS + TAKEAWAY) -->
  <div class="slide">
    <div class="top-accent-pill"></div>
    <div class="top-accent-dot"></div>

    <div class="slide-top">
      <div class="brand-row">
        <div class="brand-icon">K</div>
        <div class="brand-name">Knowvia</div>
      </div>
      <div class="slide-title">User Insights</div>
      <div class="title-dots">
        <div class="title-dot"></div>
        <div class="title-dot"></div>
        <div class="title-dot"></div>
      </div>
      <div class="slide-subtitle">What our tutors and interns confirmed during discovery</div>
    </div>

    <div class="slide-body">
      <div class="grid-2-equal">
        <div style="display: flex; flex-direction: column; justify-content: center;">
          <div class="stat-pill">
            <div class="stat-big">85%</div>
            <div class="stat-label">of interns missed an urgent class notice or submission deadline in group chats.</div>
          </div>
          <div class="stat-pill">
            <div class="stat-big">3+ Hrs</div>
            <div class="stat-label">wasted each week by each tutor manually hunting down deliverables.</div>
          </div>
        </div>

        <div class="insight-quote-box">
          <div class="insight-quote-tag">💡 The Core Realization</div>
          <div class="insight-quote-body">
            Open-source portals like <strong>Moodle</strong> and <strong>Frappe</strong> are costly to host, complex to navigate, and <strong>lack live chat</strong>.<br><br>
            What our hub truly needed was <strong>the instant speed of messaging</strong> built directly into <strong>department schedules and homework tracking</strong>.
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 3 of 8</span>
    </div>
  </div>

  <!-- SLIDE 4: OUR SOLUTION (AGRI-VAULT STYLE 3 PILLARS + CLEAN PREVIEW) -->
  <div class="slide">
    <div class="top-accent-pill"></div>
    <div class="top-accent-dot"></div>

    <div class="slide-top">
      <div class="brand-row">
        <div class="brand-icon">K</div>
        <div class="brand-name">Knowvia</div>
      </div>
      <div class="slide-title">Our Solution</div>
      <div class="title-dots">
        <div class="title-dot"></div>
        <div class="title-dot"></div>
        <div class="title-dot"></div>
      </div>
      <div class="slide-subtitle">A focused, lightweight digital campus custom-built for our hub</div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="capsule-list">
          <div class="capsule-item">
            <div class="capsule-num">01</div>
            <div class="capsule-content">
              <div class="capsule-title">Dedicated Classrooms</div>
              <div class="capsule-desc">Separate spaces for Frontend, Backend, Design, and Cyber. Zero chatter bleed.</div>
            </div>
          </div>

          <div class="capsule-item">
            <div class="capsule-num">02</div>
            <div class="capsule-content">
              <div class="capsule-title">Live Schedule & Milestones</div>
              <div class="capsule-desc">Next-class countdown right on mobile, plus a clear homework checklist.</div>
            </div>
          </div>

          <div class="capsule-item">
            <div class="capsule-num">03</div>
            <div class="capsule-content">
              <div class="capsule-title">Permanent Study Archive</div>
              <div class="capsule-desc">Lesson materials never expire, and all uploaded files are virus-checked.</div>
            </div>
          </div>
        </div>

        <!-- Sleek Live Mobile Preview Component -->
        <div class="preview-frame">
          <div class="preview-header">
            <div class="preview-dot-row">
              <div class="preview-dot" style="background:#ef4444;"></div>
              <div class="preview-dot" style="background:#eab308;"></div>
              <div class="preview-dot" style="background:#22c55e;"></div>
            </div>
            <span style="font-size: 7.5pt; font-weight: 700; color: #64748b;">KNOWVIA &bull; MOBILE DASHBOARD</span>
          </div>

          <div class="preview-card" style="border-left: 3px solid #4f46e5;">
            <div style="font-size: 7.5pt; font-weight: 800; color: #4f46e5; text-transform: uppercase;">Next Up: Frontend Track</div>
            <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-top: 1mm;">React Hooks & API Integration</div>
            <div style="font-size: 8pt; color: #64748b; margin-top: 0.5mm;">Starts in: <strong>45 mins</strong> &bull; Hall B / Google Meet</div>
          </div>

          <div class="preview-card" style="border-left: 3px solid #10b981;">
            <div style="font-size: 7.5pt; font-weight: 800; color: #10b981; text-transform: uppercase;">Homework Status</div>
            <div style="font-size: 9pt; font-weight: 700; color: #0f172a; margin-top: 0.5mm;">Week 4 Project: <strong>Submitted</strong></div>
            <div style="font-size: 7.5pt; color: #64748b;">Reviewed &bull; Grade: 95/100 (Pass)</div>
          </div>

          <div class="preview-card" style="border-left: 3px solid #06b6d4;">
            <div style="font-size: 7.5pt; font-weight: 800; color: #06b6d4; text-transform: uppercase;">Classroom Channel</div>
            <div style="font-size: 8pt; color: #334155; margin-top: 0.5mm;"><strong>Tutor Dave:</strong> "Starter repository pushed. Pull latest branch."</div>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 4 of 8 &bull; Transition to Live Demo</span>
    </div>
  </div>

  <!-- SLIDE 5: LIVE DEMO (DARK HERO THEME & CLEAN HIGHLIGHTS) -->
  <div class="slide slide-demo">
    <div class="top-accent-pill" style="background: #a5b4fc;"></div>
    <div class="top-accent-dot" style="background: #a5b4fc;"></div>

    <div class="slide-top">
      <div class="brand-row">
        <div class="brand-icon">K</div>
        <div class="brand-name">Knowvia</div>
      </div>
      <div class="slide-title">Live Product Demo</div>
      <div class="title-dots">
        <div class="title-dot"></div>
        <div class="title-dot"></div>
        <div class="title-dot"></div>
      </div>
      <div class="slide-subtitle">2-Minute walkthrough on live mobile device</div>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="demo-step-box">
          <div class="demo-step-badge">Step 1 &bull; Student View</div>
          <div class="demo-step-heading">Class & Homework</div>
          <div class="demo-step-desc">
            &bull; Live class countdown & link.<br>
            &bull; Clear homework checklist.<br>
            &bull; Tap notification deep-linking.
          </div>
        </div>

        <div class="demo-step-box">
          <div class="demo-step-badge">Step 2 &bull; Tutor View</div>
          <div class="demo-step-heading">Schedules & Files</div>
          <div class="demo-step-desc">
            &bull; Instant timetable updates.<br>
            &bull; Virus-screened study uploads.<br>
            &bull; Rapid submission grading.
          </div>
        </div>

        <div class="demo-step-box">
          <div class="demo-step-badge">Step 3 &bull; Classroom Chat</div>
          <div class="demo-step-heading">Department Chat</div>
          <div class="demo-step-desc">
            &bull; Quiet department-only space.<br>
            &bull; Threaded Q&A replies.<br>
            &bull; Verified role badges.
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer" style="border-top-color: rgba(255,255,255,0.1); color: #94a3b8;">
      <span style="color: #a5b4fc; font-weight: 700;">Live Screen Active</span>
      <span>Slide 5 of 8 &bull; Transitioning to "How It Works"</span>
    </div>
  </div>

  <!-- SLIDE 6: HOW IT WORKS (3 CLEAN ARCHITECTURE TIERS) -->
  <div class="slide">
    <div class="top-accent-pill"></div>
    <div class="top-accent-dot"></div>

    <div class="slide-top">
      <div class="brand-row">
        <div class="brand-icon">K</div>
        <div class="brand-name">Knowvia</div>
      </div>
      <div class="slide-title">How It Works</div>
      <div class="title-dots">
        <div class="title-dot"></div>
        <div class="title-dot"></div>
        <div class="title-dot"></div>
      </div>
      <div class="slide-subtitle">Simple, fast, and secure technology tailored for our hub</div>
    </div>

    <div class="slide-body">
      <div class="arch-stack">
        <div class="arch-card" style="border-left: 5px solid #4f46e5;">
          <div class="arch-badge" style="color: #4f46e5;">01 / Mobile Access</div>
          <div class="arch-text">
            <strong>Works in Any Phone Browser:</strong> Opens instantly without downloading an app store binary, saving storage and mobile data.
          </div>
        </div>

        <div class="arch-card" style="border-left: 5px solid #0891b2;">
          <div class="arch-badge" style="color: #0891b2;">02 / Real-Time Sync</div>
          <div class="arch-text">
            <strong>Instant Notifications:</strong> Class reschedules and tutor notices alert interns instantly across devices.
          </div>
        </div>

        <div class="arch-card" style="border-left: 5px solid #059669;">
          <div class="arch-badge" style="color: #059669;">03 / Data Security</div>
          <div class="arch-text">
            <strong>Safe Storage:</strong> Uploaded materials are automatically scanned for malware, and each department's files remain private.
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 6 of 8</span>
    </div>
  </div>

  <!-- SLIDE 7: MARKET ANALYSIS (4 PILLARS) -->
  <div class="slide">
    <div class="top-accent-pill"></div>
    <div class="top-accent-dot"></div>

    <div class="slide-top">
      <div class="brand-row">
        <div class="brand-icon">K</div>
        <div class="brand-name">Knowvia</div>
      </div>
      <div class="slide-title">Market Analysis</div>
      <div class="title-dots">
        <div class="title-dot"></div>
        <div class="title-dot"></div>
        <div class="title-dot"></div>
      </div>
      <div class="slide-subtitle">Examining current makeshifts, open-source alternatives, and our hub's in-house advantage</div>
    </div>

    <div class="slide-body">
      <div class="grid-4">
        <div class="mini-card" style="padding: 5.5mm 4.5mm;">
          <div class="mini-card-tag" style="color: #64748b;">CURRENT MAKESHIFTS</div>
          <div class="mini-card-title" style="font-size: 12.5pt;">WhatsApp & Telegram</div>
          <div class="mini-card-text" style="font-size: 9pt;">
            <div style="margin-bottom: 2mm; color: #ef4444; font-weight: 700;">&times; Cluttered group chat noise</div>
            <div style="margin-bottom: 2mm; color: #ef4444; font-weight: 700;">&times; Zero homework tracking</div>
            <div style="color: #ef4444; font-weight: 700;">&times; Links expire & virus risks</div>
          </div>
        </div>

        <div class="mini-card" style="padding: 5.5mm 4.5mm;">
          <div class="mini-card-tag" style="color: #dc2626;">EXISTING ALTERNATIVES</div>
          <div class="mini-card-title" style="font-size: 12.5pt;">Moodle & Frappe</div>
          <div class="mini-card-text" style="font-size: 9pt;">
            <div style="margin-bottom: 2mm; color: #ef4444; font-weight: 700;">&times; Costly ongoing server hosting</div>
            <div style="margin-bottom: 2mm; color: #ef4444; font-weight: 700;">&times; No live department chat</div>
            <div style="color: #ef4444; font-weight: 700;">&times; Clunky; abandoned on mobile</div>
          </div>
        </div>

        <div class="mini-card" style="padding: 5.5mm 4.5mm; background: #fffbeb; border: 1.5px solid #fde68a;">
          <div class="mini-card-tag" style="color: #b45309;">THE OPERATIONAL GAP</div>
          <div class="mini-card-title" style="font-size: 12.5pt; color: #78350f;">The Disconnect</div>
          <div class="mini-card-text" style="font-size: 9pt;">
            <div style="margin-bottom: 2mm; color: #b45309; font-weight: 700;">! Chat lacks academic tracking</div>
            <div style="margin-bottom: 2mm; color: #b45309; font-weight: 700;">! Portals lack live messaging</div>
            <div style="color: #b45309; font-weight: 700;">! Interns split across broken tools</div>
          </div>
        </div>

        <div class="mini-card" style="padding: 5.5mm 4.5mm; background: #f0fdf4; border: 1.5px solid #86efac;">
          <div class="mini-card-tag" style="color: #16a34a;">THE HUB ADVANTAGE</div>
          <div class="mini-card-title" style="font-size: 13pt; color: #14532d;">Knowvia</div>
          <div class="mini-card-text" style="font-size: 9pt;">
            <div style="margin-bottom: 2mm; color: #15803d; font-weight: 700;">&#10003; Lightweight phone web app</div>
            <div style="margin-bottom: 2mm; color: #15803d; font-weight: 700;">&#10003; Chat + Classrooms unified</div>
            <div style="color: #15803d; font-weight: 700;">&#10003; 100% Hub owned & managed</div>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="slide-footer-brand">Knowvia &bull; Pitch Deck</span>
      <span>Slide 7 of 8</span>
    </div>
  </div>

  <!-- SLIDE 8: PROPOSAL TO OUR HUB (IN-HOUSE ADOPTION) -->
  <div class="slide">
    <div class="top-accent-pill"></div>
    <div class="top-accent-dot"></div>

    <div class="slide-top">
      <div class="brand-row">
        <div class="brand-icon">K</div>
        <div class="brand-name">Knowvia</div>
      </div>
      <div class="slide-title">Proposal to Our Hub</div>
      <div class="title-dots">
        <div class="title-dot"></div>
        <div class="title-dot"></div>
        <div class="title-dot"></div>
      </div>
      <div class="slide-subtitle">A sustainable in-house adoption model for our upcoming cohorts</div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="capsule-list">
          <div class="capsule-item">
            <div class="capsule-num">01</div>
            <div class="capsule-content">
              <div class="capsule-title">Platform Buyout</div>
              <div class="capsule-desc">Our hub acquires full proprietary ownership of Knowvia as our official platform.</div>
            </div>
          </div>

          <div class="capsule-item">
            <div class="capsule-num">02</div>
            <div class="capsule-content">
              <div class="capsule-title">Maintenance Retainer</div>
              <div class="capsule-desc">Modest annual fee for cloud hosting, updates, and onboarding each new cohort.</div>
            </div>
          </div>

          <div class="capsule-item">
            <div class="capsule-num">03</div>
            <div class="capsule-content">
              <div class="capsule-title">Proven Time Return</div>
              <div class="capsule-desc">Saves staff 3+ hours weekly and gives hub leadership live cohort tracking.</div>
            </div>
          </div>
        </div>

        <div class="mini-card" style="text-align: center; justify-content: center; align-items: center; background: #ffffff; padding: 5mm 6mm;">
          <div class="mini-card-tag" style="color: #16a34a;">DEPLOYMENT READY</div>
          <div class="mini-card-title" style="font-size: 14pt;">Scan to Test Live on Mobile</div>
          <img src="knowvia_qr_code.png" alt="Knowvia QR Code" style="width: 34mm; height: 34mm; margin: 1.5mm auto; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 1.5mm; background: #ffffff;" />
          <div style="font-size: 8pt; font-weight: 700; color: #4f46e5; margin-top: 1mm;">knowvia-five.vercel.app</div>
          <p style="margin-top: 1mm; font-size: 7.5pt; color: #64748b;">Repository: <code>Sydonverse / Knowvia</code></p>
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
