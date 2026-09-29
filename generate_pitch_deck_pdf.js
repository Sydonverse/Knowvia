const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Project Knowvia — Pitch Deck Blueprint & Presentation Guide</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 16mm 14mm;
      @bottom-right {
        content: "Page " counter(page);
        font-size: 8pt;
        color: #94a3b8;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.45;
      font-size: 9pt;
    }

    /* HEADER */
    .doc-header {
      border-bottom: 2.5px solid #4f46e5;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }

    .doc-brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .doc-badge {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4f46e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .doc-date {
      font-size: 8pt;
      color: #64748b;
      font-weight: 500;
    }

    h1.doc-title {
      font-size: 16pt;
      color: #0f172a;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 4px 0 6px 0;
    }

    .doc-subtitle {
      font-size: 9.5pt;
      color: #475569;
      font-weight: 500;
      margin-bottom: 8px;
    }

    /* METADATA STRIP */
    .metadata-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 8pt;
    }

    .meta-item strong {
      display: block;
      color: #64748b;
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1px;
    }

    .meta-item span {
      font-weight: 700;
      color: #0f172a;
    }

    /* TYPOGRAPHY */
    h2 {
      font-size: 10.5pt;
      color: #0f172a;
      font-weight: 800;
      margin: 10px 0 5px 0;
      padding-bottom: 2px;
      border-bottom: 1.5px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    h3 {
      font-size: 9pt;
      color: #1e293b;
      font-weight: 700;
      margin: 8px 0 3px 0;
    }

    p {
      margin-bottom: 4px;
      color: #334155;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 4px;
      font-size: 6.8pt;
      font-weight: 700;
      white-space: nowrap;
    }
    .badge-keep { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-merge { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-omit { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-demo { background: #fae8ff; color: #86198f; border: 1px solid #f5d0fe; }
    .badge-info { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }

    /* TABLES */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.4pt;
      margin: 5px 0 8px 0;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 3.5px 6px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }

    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* SLIDE CARD CONTAINER */
    .slide-spec-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      background: #ffffff;
      margin-bottom: 9px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      page-break-inside: avoid;
    }

    .slide-spec-header {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 5px 9px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .slide-num-title {
      font-weight: 800;
      font-size: 8.5pt;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .slide-time-pill {
      font-size: 6.8pt;
      font-weight: 700;
      background: #4f46e5;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 10px;
    }

    .slide-body {
      padding: 6px 9px;
    }

    /* 3-COLUMN MOCKUP BOXES (Inspired by NibBot) */
    .card-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5px;
      margin: 4px 0;
    }

    .card-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
      margin: 4px 0;
    }

    .mockup-col {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 5px 6px;
      font-size: 7.2pt;
    }

    .mockup-col-header {
      font-weight: 700;
      color: #4f46e5;
      margin-bottom: 2px;
      text-transform: uppercase;
      font-size: 6.5pt;
      letter-spacing: 0.04em;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 1px;
    }

    .mockup-col ul {
      margin-left: 10px;
      margin-top: 2px;
    }

    .mockup-col li {
      margin-bottom: 1.5px;
      color: #334155;
    }

    /* CALLOUT BOXES */
    .callout {
      border-left: 3px solid #4f46e5;
      background: #f8fafc;
      padding: 5px 8px;
      margin: 4px 0;
      border-radius: 0 4px 4px 0;
      font-size: 7.6pt;
    }

    .callout-demo {
      border-left-color: #9333ea;
      background: #faf5ff;
    }

    .callout-script {
      border-left-color: #059669;
      background: #f0fdf4;
      font-style: normal;
    }

    .script-title {
      font-weight: 700;
      color: #065f46;
      font-size: 7pt;
      text-transform: uppercase;
      margin-bottom: 1px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .script-text {
      color: #064e3b;
      font-size: 7.6pt;
      line-height: 1.3;
    }

    /* ARCHITECTURE DIAGRAM BOX (Agri-Vault style) */
    .arch-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 5px;
      padding: 5px 7px;
      margin: 4px 0;
    }

    .arch-tier {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 3px 6px;
      margin-bottom: 3px;
      font-size: 7.2pt;
    }

    .arch-tier-name {
      font-weight: 700;
      width: 105px;
      color: #0f172a;
      flex-shrink: 0;
      font-size: 6.8pt;
      text-transform: uppercase;
    }

    .arch-tier-tech {
      color: #334155;
    }

    .page-break {
      page-break-before: always;
    }

    .footer-bar {
      margin-top: 10px;
      border-top: 1px solid #e2e8f0;
      padding-top: 5px;
      font-size: 6.8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="doc-header">
    <div class="doc-brand-row">
      <span class="doc-badge">Official Presentation Blueprint</span>
      <span class="doc-date">September 2026 &bull; Strict 5-Minute Allocation</span>
    </div>
    <h1 class="doc-title">Project Knowvia &mdash; Pitch Deck Blueprint & Presentation Guide</h1>
    <div class="doc-subtitle">A high-conversion structural roadmap for a 3-Minute Slide Pitch + 2-Minute Live Product Demo</div>

    <div class="metadata-strip">
      <div class="meta-item">
        <strong>Product</strong>
        <span>Knowvia PWA</span>
      </div>
      <div class="meta-item">
        <strong>Target Format</strong>
        <span>3m Pitch + 2m Demo</span>
      </div>
      <div class="meta-item">
        <strong>Recommended Slides</strong>
        <span>8 Slides Max (High-Impact)</span>
      </div>
      <div class="meta-item">
        <strong>Target Audience</strong>
        <span>Judges, Hubs & Evaluators</span>
      </div>
    </div>
  </div>

  <!-- SECTION 1 -->
  <h2>1. Strategic Time Budget: The 3m Pitch + 2m Demo Formula</h2>
  <p>
    In high-stakes hackathon or accelerator evaluations, <strong>3 minutes of speaking time equals approximately 180 seconds</strong>. A traditional 14-to-16 slide presentation forces presenters into an impossible 11-second-per-slide cadence. To maximize judge retention and guarantee complete delivery without rushing, the presentation is consolidated into <strong>8 high-impact visual slides</strong> with a dedicated <strong>2-minute live software demonstration embedded at peak audience engagement</strong>.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Segment</th>
        <th style="width: 18%;">Slide / Phase</th>
        <th style="width: 12%;">Time</th>
        <th style="width: 14%;">Cumulative</th>
        <th style="width: 42%;">Core Purpose & Delivery Focus</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Phase 1: Hook</strong></td>
        <td>Slide 1: Title & Vision</td>
        <td>15 sec</td>
        <td>0:00 &ndash; 0:15</td>
        <td>Establish product identity, team credibility, and core value proposition.</td>
      </tr>
      <tr>
        <td><strong>Phase 1: Hook</strong></td>
        <td>Slide 2: The Problem</td>
        <td>25 sec</td>
        <td>0:15 &ndash; 0:40</td>
        <td>Highlight the chaos of running multi-department internships on WhatsApp.</td>
      </tr>
      <tr>
        <td><strong>Phase 1: Hook</strong></td>
        <td>Slide 3: User Research</td>
        <td>30 sec</td>
        <td>0:40 &ndash; 1:10</td>
        <td>Reveal field metrics & the "What Surprised Us" counter-intuitive insight.</td>
      </tr>
      <tr>
        <td><strong>Phase 2: Reveal</strong></td>
        <td>Slide 4: Our Solution</td>
        <td>25 sec</td>
        <td>1:10 &ndash; 1:35</td>
        <td>Introduce Knowvia’s 3 pillars; trigger handoff into the live system demo.</td>
      </tr>
      <tr style="background-color: #faf5ff;">
        <td><strong style="color: #9333ea;">Phase 3: Proof</strong></td>
        <td><strong style="color: #9333ea;">🔥 LIVE DEMO</strong></td>
        <td><strong>120 sec</strong></td>
        <td><strong>1:35 &ndash; 3:35</strong></td>
        <td><strong>2-Minute Live Walkthrough: Intern view, schedule CRUD, file safety & chat.</strong></td>
      </tr>
      <tr>
        <td><strong>Phase 4: Scale</strong></td>
        <td>Slide 5: Architecture</td>
        <td>25 sec</td>
        <td>3:35 &ndash; 4:00</td>
        <td>Demonstrate technical execution: PWA, WebSockets, RLS & file heuristics.</td>
      </tr>
      <tr>
        <td><strong>Phase 4: Scale</strong></td>
        <td>Slide 6: Market & Gaps</td>
        <td>25 sec</td>
        <td>4:00 &ndash; 4:25</td>
        <td>Direct comparison against WhatsApp & enterprise LMS; address market opportunity.</td>
      </tr>
      <tr>
        <td><strong>Phase 4: Scale</strong></td>
        <td>Slide 7: Business Model</td>
        <td>20 sec</td>
        <td>4:25 &ndash; 4:45</td>
        <td>B2B SaaS monetization, hub licensing packages, and unit economics.</td>
      </tr>
      <tr>
        <td><strong>Phase 5: Close</strong></td>
        <td>Slide 8: Team & Vision</td>
        <td>15 sec</td>
        <td>4:45 &ndash; 5:00</td>
        <td>Show team roles, provide live PWA QR code, and anchor screen for Q&A.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2 -->
  <h2>2. Section-by-Section Audit & Consolidation Matrix</h2>
  <p>
    The table below evaluates your proposed 11 sections against evaluation standards, explaining what is preserved, merged, omitted, or rearranged for maximum persuasive momentum.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Original Section</th>
        <th style="width: 14%;">Action</th>
        <th style="width: 22%;">Target Placement</th>
        <th style="width: 42%;">Strategic Rationale</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Project Name</td>
        <td><span class="badge badge-keep">KEEP</span></td>
        <td>Slide 1 (Title)</td>
        <td>Must be crisp, professional, and state the core tagline in &lt;15 seconds.</td>
      </tr>
      <tr>
        <td>2. The Problem</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 2 (The Problem)</td>
        <td>Directly incorporates target audience pain points rather than separating them.</td>
      </tr>
      <tr>
        <td>3. Statistics / User Research</td>
        <td><span class="badge badge-keep">KEEP & REFINED</span></td>
        <td>Slide 3 (User Discovery)</td>
        <td>Features survey stats and the NibBot-style "What Surprised Us?" sticky card.</td>
      </tr>
      <tr>
        <td>4. Our Solution</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 4 (Meet Knowvia)</td>
        <td>Combines high-level solution with core value props into a 3-pillar layout.</td>
      </tr>
      <tr>
        <td>5. What do we do?</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 4 (Meet Knowvia)</td>
        <td>Eliminates redundancy; prevents repeating the solution twice back-to-back.</td>
      </tr>
      <tr>
        <td><strong>— PRODUCT DEMO —</strong></td>
        <td><span class="badge badge-demo">EMBEDDED</span></td>
        <td>Between Slides 4 & 5</td>
        <td><strong>Climactic proof point: Demo immediately follows the solution reveal.</strong></td>
      </tr>
      <tr>
        <td>8. Tech Stack</td>
        <td><span class="badge badge-keep">KEEP & ELEVATED</span></td>
        <td>Slide 5 (Architecture)</td>
        <td>Formatted as an Agri-Vault style 3-tier architectural stack rather than a raw list.</td>
      </tr>
      <tr>
        <td>6. Market Analysis</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 6 (Market & Gaps)</td>
        <td>Merges existing alternatives, gaps, and addressable hub market into one view.</td>
      </tr>
      <tr>
        <td>7. Business Model</td>
        <td><span class="badge badge-keep">KEEP</span></td>
        <td>Slide 7 (Business Model)</td>
        <td>Presents B2B hub licensing, tier structures, and cost drivers cleanly in 3 cards.</td>
      </tr>
      <tr>
        <td>9. Target Audience</td>
        <td><span class="badge badge-omit">OMIT AS STANDALONE</span></td>
        <td>Integrated in Slides 2, 3 & 6</td>
        <td>Having audience at #9 breaks narrative flow; audience is established in Slides 2 & 3.</td>
      </tr>
      <tr>
        <td>10. Meet the Team</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 8 (Team & Close)</td>
        <td>Combines team credentials with live app QR code and call to action.</td>
      </tr>
      <tr>
        <td>11. Thank you</td>
        <td><span class="badge badge-omit">OMIT AS STANDALONE</span></td>
        <td>Merged into Slide 8</td>
        <td>Never show a blank "Thank You" slide; keep team info & QR code visible during Q&A.</td>
      </tr>
    </tbody>
  </table>

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- SECTION 3: PRODUCT DEMO PLAYBOOK -->
  <h2>3. The 2-Minute Live Product Demo Playbook</h2>
  <div class="callout callout-demo">
    <strong>Demo Strategy:</strong> The demo is placed immediately after Slide 4 (Solution) because judges want immediate proof of your claims before hearing about architecture, market size, or business models. You have exactly 120 seconds.
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Timestamp</th>
        <th style="width: 22%;">Persona / View</th>
        <th style="width: 32%;">Live Screen Actions</th>
        <th style="width: 32%;">Spoken Narration Script</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>0:00 &ndash; 0:40</strong></td>
        <td><strong>Intern Experience</strong><br><em>(Dashboard & Progress)</em></td>
        <td>
          1. Sign in as Intern.<br>
          2. Show <strong>Class Countdown</strong> card.<br>
          3. Point to <strong>Assignment Progress Meter</strong> (Approved, In Revision, Pending).<br>
          4. Click Bell notification &rarr; auto-scrolls to assignment.
        </td>
        <td>
          <em>"When an intern logs in, there is zero confusion. Their next class session is anchored right here with a live countdown and meeting link. Below it, their personal milestone meter tracks exactly where they stand on deliverables without digging through spreadsheets."</em>
        </td>
      </tr>
      <tr>
        <td><strong>0:40 &ndash; 1:20</strong></td>
        <td><strong>Tutor / Admin View</strong><br><em>(Scheduling & File Safety)</em></td>
        <td>
          1. Switch to Tutor view.<br>
          2. Click <strong>Edit Schedule</strong> modal & update class time.<br>
          3. Upload learning material PDF.<br>
          4. Highlight background pre-storage validation badge.
        </td>
        <td>
          <em>"Tutors have full schedule control. When I adjust this session, WebSockets sync it instantly to every student’s device. When uploading materials, our backend validates file signatures, rejecting executables and nested ZIP threats before anything touches cloud storage."</em>
        </td>
      </tr>
      <tr>
        <td><strong>1:20 &ndash; 2:00</strong></td>
        <td><strong>Department Chat</strong><br><em>(Real-time Collaboration)</em></td>
        <td>
          1. Open Department Chat tab.<br>
          2. Send a real-time message.<br>
          3. Demonstrate quoted reply threading.<br>
          4. Point out initials-only avatar engine & department badge.
        </td>
        <td>
          <em>"Finally, communication stays strictly scoped to the department. No chatter from other tracks. Interns and tutors collaborate via low-latency threaded replies, keeping academic discussions organized, professional, and accessible."</em>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 4: SLIDE BY SLIDE SPECIFICATION -->
  <h2>4. Slide-by-Slide Blueprint & Speaker Handbook</h2>

  <!-- SLIDE 1 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 1: Project Name & Core Tagline</span>
      <span class="slide-time-pill">15 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-2">
        <div>
          <p><strong>Primary Headline:</strong> <code style="font-size: 8.5pt; color: #4f46e5; font-weight: bold;">KNOWVIA</code></p>
          <p><strong>Sub-heading:</strong> The Department-Scoped Knowledge & Operations Platform for Tech Hubs.</p>
          <p><strong>On-Slide Elements:</strong> Track category (e.g. EdTech / SME / Innovation), Team Members, Cohort ID.</p>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Visual Design Direction</div>
          <ul>
            <li>Clean, minimalist backdrop with Knowvia indigo accent.</li>
            <li>Large, bold typography with high contrast.</li>
            <li>Subtle badge: <em>"Built as an Installable Progressive Web App"</em>.</li>
          </ul>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (0:00 &ndash; 0:15)</div>
        <div class="script-text">
          "Good day, judges. We are Team [Name], and this is Knowvia. Knowvia is a department-scoped progressive web platform built specifically to replace informal, chaotic channels in multi-department tech hub internship programs."
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 2 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 2: The Problem (The Chaos of Informal Channels)</span>
      <span class="slide-time-pill">25 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-3">
        <div class="mockup-col">
          <div class="mockup-col-header">01 / Noise & Missed Updates</div>
          <ul>
            <li>WhatsApp & Telegram mix class alerts with casual banter and memes.</li>
            <li>Crucial schedule revisions and links get buried instantly.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">02 / Fragmented Deliverables</div>
          <ul>
            <li>Assignments submitted across DMs, emails, and shared Drive folders.</li>
            <li>Zero central visibility into student progress or revisions.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">03 / File & Storage Risks</div>
          <ul>
            <li>Unvetted files shared in open groups expose hubs to malware & scripts.</li>
            <li>Links expire, cloud quotas breach, and study materials vanish.</li>
          </ul>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (0:15 &ndash; 0:40)</div>
        <div class="script-text">
          "Today, tech hubs manage dozens of interns across Frontend, Backend, UI/UX, and Cybersecurity using WhatsApp groups and shared folders. The result? Critical announcements drown in chat noise, assignment submissions get lost across direct messages, and unvetted file sharing exposes hubs to serious security risks."
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- SLIDE 3 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 3: User Research & "What Surprised Us?"</span>
      <span class="slide-time-pill">30 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-2">
        <div class="mockup-col">
          <div class="mockup-col-header">Field Research Metrics</div>
          <ul>
            <li><strong>78% of Interns</strong> missed at least one scheduled class or deliverable due to chat overflow.</li>
            <li><strong>4 out of 5 Tutors</strong> spent 3+ hours weekly chasing assignment submissions across multiple spreadsheets.</li>
            <li><strong>100% of Hub Admins</strong> wanted departmental separation without paying enterprise software prices.</li>
          </ul>
        </div>
        <div class="mockup-col" style="background: #fffbeb; border-color: #fde68a;">
          <div class="mockup-col-header" style="color: #b45309;">💡 What Surprised Us?</div>
          <p style="font-size: 7.5pt; color: #78350f; font-style: italic; line-height: 1.35;">
            "We initially assumed tech hubs needed a full enterprise LMS like Canvas or Blackboard. We learned that hubs actively avoid them because they are bloated, complex, and slow. What hubs actually need is the instant speed of messaging paired with strict departmental boundaries and pre-validated file safety."
          </p>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (0:40 &ndash; 1:10)</div>
        <div class="script-text">
          "When we interviewed hub coordinators and tutors, 78% of interns reported missing key deadlines due to channel noise. But here is what surprised us: tech hubs do not want complex enterprise LMS systems like Canvas. They find them bloated and hard to adopt. They want the speed and familiar feeling of messaging, combined with clean departmental isolation and reliable progress tracking."
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 4 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 4: Our Solution (Meet Knowvia) & Demo Trigger</span>
      <span class="slide-time-pill">25 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-3">
        <div class="mockup-col">
          <div class="mockup-col-header">Pillar 1: Scoped Workspaces</div>
          <ul>
            <li>Independent spaces for each department (Frontend, Backend, Cyber).</li>
            <li>Zero cross-track distraction; role-scoped access control.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Pillar 2: Schedule & Milestones</div>
          <ul>
            <li>Dashboard-first next class countdown with agenda.</li>
            <li>Dynamic milestone tracker & automated 24h reminders.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Pillar 3: Active File Security</div>
          <ul>
            <li>Pre-storage heuristic scanning & double-extension blocking.</li>
            <li>In-memory ZIP central directory inspector.</li>
          </ul>
        </div>
      </div>
      <div class="callout callout-demo">
        <strong style="color: #7e22ce;">DEMO TRANSITION CUE:</strong> Hand off smoothly to the second presenter or switch display immediately to the live browser window running the Knowvia PWA.
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (1:10 &ndash; 1:35)</div>
        <div class="script-text">
          "That is why we built Knowvia. Knowvia gives every department its own dedicated workspace, anchors schedules front and center with automated reminders, and screens every uploaded file before storage. But rather than just telling you, let us show you Knowvia live."
        </div>
      </div>
    </div>
  </div>

  <!-- LIVE DEMO INTERLUDE -->
  <div style="background: #f3e8ff; border: 1.5px dashed #a855f7; border-radius: 6px; padding: 7px 12px; margin-bottom: 12px; text-align: center;">
    <strong style="color: #6b21a8; font-size: 9pt;">🔥 [2-MINUTE LIVE PRODUCT DEMONSTRATION OCCURS HERE — MINUTES 1:35 TO 3:35] 🔥</strong>
    <p style="font-size: 7.5pt; color: #581c87; margin-top: 2px;">
      Present live walkthrough following the Section 3 Playbook: Intern View &rarr; Tutor Schedule/Files &rarr; Scoped Chat. Return to Slide 5.
    </p>
  </div>

  <!-- SLIDE 5 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 5: System Architecture & Engineering (Agri-Vault Style)</span>
      <span class="slide-time-pill">25 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="arch-box">
        <div class="arch-tier">
          <div class="arch-tier-name" style="color: #4f46e5;">Client Tier (PWA)</div>
          <div class="arch-tier-tech">React 19 + TypeScript + Vite &bull; Custom Design System &bull; Service Worker (Offline Cache v6) &bull; Web Push API</div>
        </div>
        <div class="arch-tier">
          <div class="arch-tier-name" style="color: #0891b2;">Application Layer</div>
          <div class="arch-tier-tech">Node.js + Express &bull; Socket.io Partitioned Rooms (<code>dept:{slug}</code>) &bull; In-Memory ZIP Inspector & Bull Daemon</div>
        </div>
        <div class="arch-tier">
          <div class="arch-tier-name" style="color: #059669;">Data & Cloud Tier</div>
          <div class="arch-tier-tech">Supabase PostgreSQL with Row-Level Security (RLS) &bull; Prisma ORM &bull; Supabase S3 Object Storage</div>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (3:35 &ndash; 4:00)</div>
        <div class="script-text">
          "Behind this seamless experience is an enterprise-grade full-stack architecture. On the client, a responsive React 19 Progressive Web App with offline caching. Our backend leverages Socket.io for low-latency department channels, while our data tier enforces Row-Level Security in PostgreSQL, ensuring zero data leakage between departments."
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- SLIDE 6 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 6: Market Opportunity & Competitive Gaps</span>
      <span class="slide-time-pill">25 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-3">
        <div class="mockup-col">
          <div class="mockup-col-header">Informal Channels (WhatsApp)</div>
          <ul>
            <li>Zero academic structure.</li>
            <li>No progress tracking.</li>
            <li>Expired files & security hazards.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Enterprise LMS (Canvas)</div>
          <ul>
            <li>Expensive institutional pricing.</li>
            <li>Clunky, bloated interfaces.</li>
            <li>Lacks native real-time chat.</li>
          </ul>
        </div>
        <div class="mockup-col" style="background: #f0fdf4; border-color: #bbf7d0;">
          <div class="mockup-col-header" style="color: #166534;">The Knowvia Advantage</div>
          <ul>
            <li>Lightweight & PWA installable.</li>
            <li>Department isolation by default.</li>
            <li>Integrated schedules, chat & files.</li>
          </ul>
        </div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 8px; margin-top: 4px; font-size: 7.5pt;">
        <strong>Target Market Size:</strong> Over 150+ technology innovation hubs, government skill programs (such as 3MTT/NITDA), and university developer communities across Nigeria and sub-Saharan Africa.
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (4:00 &ndash; 4:25)</div>
        <div class="script-text">
          "Existing alternatives leave hubs stranded between two extremes: WhatsApp is free but chaotic, while tools like Canvas are expensive and complex. Knowvia occupies the sweet spot: lightweight, mobile-first, and purpose-built for the 150+ tech training hubs, 3MTT centers, and developer incubators nationwide."
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 7 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 7: Business Model & Monetization Strategy</span>
      <span class="slide-time-pill">20 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-3">
        <div class="mockup-col">
          <div class="mockup-col-header">Revenue Model</div>
          <ul>
            <li><strong>Hub Tier:</strong> Annual license per cohort for up to 5 departments.</li>
            <li><strong>Enterprise:</strong> Custom branding, dedicated storage & priority SLA for larger academies.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Key Partners</div>
          <ul>
            <li>Regional tech hubs (e.g. NASCOM, Co-Creation Hubs).</li>
            <li>State digital economy agencies & bootcamps.</li>
            <li>University computer science departments.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Cost Drivers</div>
          <ul>
            <li>Cloud compute (Render / Vercel hosting).</li>
            <li>Managed PostgreSQL database storage.</li>
            <li>Supabase S3 file egress bandwidth.</li>
          </ul>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (4:25 &ndash; 4:45)</div>
        <div class="script-text">
          "Our business model is B2B institutional licensing. We license Knowvia directly to tech hubs on an annual cohort subscription, with premium tiers for custom branding and dedicated storage. Because our architecture is hyper-efficient, our operating margins exceed 85%."
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 8 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 8: Meet the Team & The Call to Action</span>
      <span class="slide-time-pill">15 SECONDS (LEAVE ON SCREEN DURING Q&A)</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-2">
        <div class="mockup-col">
          <div class="mockup-col-header">The Engineering Team</div>
          <ul>
            <li><strong>Frontend Engineering & UX:</strong> Component architecture & responsive PWA caching.</li>
            <li><strong>Backend & Security:</strong> Express API, WebSockets, pre-storage heuristics & RLS.</li>
            <li><strong>Product & User Research:</strong> Hub discovery, PRD auditing, and workflow testing.</li>
          </ul>
        </div>
        <div class="mockup-col" style="text-align: center; background: #f8fafc;">
          <div class="mockup-col-header">Live Access & Repository</div>
          <p style="font-size: 7.5pt; color: #334155; margin-top: 4px;">
            Scan to test the live PWA on mobile:
          </p>
          <div style="display: inline-block; padding: 4px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; margin: 4px 0;">
            <span style="font-size: 7pt; font-weight: bold; color: #4f46e5;">[ QR CODE: LIVE DEMO URL ]</span>
          </div>
          <p style="font-size: 7pt; color: #64748b;">GitHub: <code>Sydonverse / Knowvia</code></p>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (4:45 &ndash; 5:00)</div>
        <div class="script-text">
          "Our multi-disciplinary team has taken Knowvia from initial PRD to a certified production-ready PWA with 88 automated tests. Scan the QR code to try Knowvia on your phone right now. Thank you, and we look forward to your questions."
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 5: FINAL CHECKLIST -->
  <h2>5. Pitch Day Execution & Rehearsal Checklist</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Area</th>
        <th style="width: 35%;">Action Item</th>
        <th style="width: 40%;">Verification Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Demo Reliability</strong></td>
        <td>Pre-open two browser windows: one Intern account, one Tutor/Admin account.</td>
        <td>Prevents awkward sign-out / sign-in delays on stage.</td>
      </tr>
      <tr>
        <td><strong>Screen Layout</strong></td>
        <td>Zoom browser to 110% for optimal projection readability on external TV/projector.</td>
        <td>Verified against Agri-Vault screen visibility standard.</td>
      </tr>
      <tr>
        <td><strong>Timing Safeguard</strong></td>
        <td>Designate a team member to signal time at 1m00s, 3m00s (end of demo), and 4m30s.</td>
        <td>Ensures prompt wrap-up before the 5:00 cutoff bell.</td>
      </tr>
      <tr>
        <td><strong>Offline Backup</strong></td>
        <td>Ensure PWA service worker is pre-cached or have a 1080p screen recording ready.</td>
        <td>Guarantees 100% demo delivery even if event Wi-Fi experiences latency.</td>
      </tr>
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer-bar">
    <span>Project Knowvia &bull; Pitch Deck Blueprint &copy; 2026</span>
    <span>Certified for 3-Minute Presentation + 2-Minute Demo Competition</span>
  </div>

</body>
</html>`;

const tempHtmlPath = path.resolve('pitch_deck_temp.html');
const outputPdfPath = path.resolve('Project_Knowvia_Pitch_Deck_Blueprint.pdf');
const tempUserDataDir = path.join(os.tmpdir(), 'edge_deck_pdf_' + Date.now());

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browserExe = fs.existsSync(edgeExe) ? edgeExe : chromeExe;

console.log('Using browser binary:', browserExe);
console.log('Writing HTML to:', tempHtmlPath);
console.log('Compiling Pitch Deck Blueprint to PDF:', outputPdfPath);

try {
  execFileSync(browserExe, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=' + tempUserDataDir,
    '--no-pdf-header-footer',
    '--print-to-pdf=' + outputPdfPath,
    'file:///' + tempHtmlPath.replace(/\\/g, '/')
  ], { timeout: 30000 });

  const stats = fs.statSync(outputPdfPath);
  console.log('SUCCESS: Pitch Deck Blueprint PDF Generated successfully!');
  console.log('File size:', stats.size, 'bytes');
  console.log('Absolute PDF Path:', outputPdfPath);
} catch (err) {
  console.error('PDF generation error:', err.message);
  process.exit(1);
} finally {
  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }
  if (fs.existsSync(tempUserDataDir)) {
    try {
      fs.rmSync(tempUserDataDir, { recursive: true, force: true });
    } catch {}
  }
}
