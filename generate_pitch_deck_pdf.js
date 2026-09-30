const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

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
      line-height: 1.42;
      font-size: 8.8pt;
    }

    /* HEADER */
    .doc-header {
      border-bottom: 2.5px solid #4f46e5;
      padding-bottom: 8px;
      margin-bottom: 12px;
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
      padding: 2.5px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .doc-date {
      font-size: 8pt;
      color: #64748b;
      font-weight: 500;
    }

    h1.doc-title {
      font-size: 15.5pt;
      color: #0f172a;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 4px 0 5px 0;
    }

    .doc-subtitle {
      font-size: 9pt;
      color: #475569;
      font-weight: 500;
      margin-bottom: 6px;
    }

    /* METADATA STRIP */
    .metadata-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 7px 10px;
      margin-bottom: 10px;
      font-size: 8pt;
    }

    .meta-item strong {
      display: block;
      color: #64748b;
      font-size: 6.8pt;
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

    /* 3-COLUMN MOCKUP BOXES */
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
      line-height: 1.32;
    }

    /* BENEFIT BOX */
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
      width: 110px;
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
      <span class="doc-badge">Plain-English Presentation Blueprint</span>
      <span class="doc-date">September 2026 &bull; Strict 5-Minute Allocation</span>
    </div>
    <h1 class="doc-title">Project Knowvia &mdash; Pitch Deck Blueprint & Speaker Guide</h1>
    <div class="doc-subtitle">A clear, non-technical roadmap designed so general audiences, mentors, and judges can easily follow along</div>

    <div class="metadata-strip">
      <div class="meta-item">
        <strong>Product</strong>
        <span>Knowvia Digital Campus</span>
      </div>
      <div class="meta-item">
        <strong>Target Format</strong>
        <span>3m Pitch + 2m Demo</span>
      </div>
      <div class="meta-item">
        <strong>Audience Profile</strong>
        <span>General / Non-Technical Judges</span>
      </div>
      <div class="meta-item">
        <strong>Deck Structure</strong>
        <span>8 High-Impact Slides</span>
      </div>
    </div>
  </div>

  <!-- SECTION 1 -->
  <h2>1. Strategic Time Budget: The 3m Pitch + 2m Demo Formula</h2>
  <p>
    When speaking to a general or non-technical audience, <strong>clarity beats complexity</strong>. Jargon causes listeners to tune out. This presentation uses simple, everyday terms to explain the real-world frustration of running tech training programs on WhatsApp and demonstrates how Knowvia solves it in <strong>8 crisp slides</strong> followed by a <strong>2-minute live demonstration</strong>.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Segment</th>
        <th style="width: 18%;">Slide / Phase</th>
        <th style="width: 12%;">Time</th>
        <th style="width: 14%;">Cumulative</th>
        <th style="width: 42%;">Core Purpose & Delivery Focus (Plain Language)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Phase 1: Hook</strong></td>
        <td>Slide 1: Title & Vision</td>
        <td>15 sec</td>
        <td>0:00 &ndash; 0:15</td>
        <td>Introduce Knowvia as the simple digital campus for tech hubs.</td>
      </tr>
      <tr>
        <td><strong>Phase 1: Hook</strong></td>
        <td>Slide 2: The Problem</td>
        <td>25 sec</td>
        <td>0:15 &ndash; 0:40</td>
        <td>Relate to the chaos of WhatsApp groups: lost links, missed homework, unsafe files.</td>
      </tr>
      <tr>
        <td><strong>Phase 1: Hook</strong></td>
        <td>Slide 3: What We Learned</td>
        <td>30 sec</td>
        <td>0:40 &ndash; 1:10</td>
        <td>Share 8/10 student statistic and the revelation that hubs avoid clunky school portals.</td>
      </tr>
      <tr>
        <td><strong>Phase 2: Reveal</strong></td>
        <td>Slide 4: Our Solution</td>
        <td>25 sec</td>
        <td>1:10 &ndash; 1:35</td>
        <td>Present Knowvia’s 3 pillars: Dedicated Classrooms, Clear Schedules, Safe Study Files.</td>
      </tr>
      <tr style="background-color: #faf5ff;">
        <td><strong style="color: #9333ea;">Phase 3: Proof</strong></td>
        <td><strong style="color: #9333ea;">🔥 LIVE DEMO</strong></td>
        <td><strong>120 sec</strong></td>
        <td><strong>1:35 &ndash; 3:35</strong></td>
        <td><strong>Show a day in the life: Student dashboard &rarr; Tutor schedule/files &rarr; Class chat.</strong></td>
      </tr>
      <tr>
        <td><strong>Phase 4: Scale</strong></td>
        <td>Slide 5: How It Works</td>
        <td>25 sec</td>
        <td>3:35 &ndash; 4:00</td>
        <td>Explain technology simply: works on any phone, live alerts, automatic file safety.</td>
      </tr>
      <tr>
        <td><strong>Phase 4: Scale</strong></td>
        <td>Slide 6: Why We Win</td>
        <td>25 sec</td>
        <td>4:00 &ndash; 4:25</td>
        <td>Highlight why WhatsApp is too messy and university tools are too complicated.</td>
      </tr>
      <tr>
        <td><strong>Phase 4: Scale</strong></td>
        <td>Slide 7: How We Grow</td>
        <td>20 sec</td>
        <td>4:25 &ndash; 4:45</td>
        <td>Explain B2B hub licensing: affordable annual fee per cohort that saves hubs time.</td>
      </tr>
      <tr>
        <td><strong>Phase 5: Close</strong></td>
        <td>Slide 8: Team & Try It</td>
        <td>15 sec</td>
        <td>4:45 &ndash; 5:00</td>
        <td>Introduce team, invite audience to scan QR code with their phones, transition to Q&A.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2 -->
  <h2>2. Section-by-Section Audit & Consolidation Matrix</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Original Section</th>
        <th style="width: 14%;">Action</th>
        <th style="width: 22%;">Target Placement</th>
        <th style="width: 42%;">Non-Technical Translation & Rationale</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Project Name</td>
        <td><span class="badge badge-keep">KEEP</span></td>
        <td>Slide 1 (Title)</td>
        <td>Clear tagline: <em>"The simple digital campus for tech hubs"</em>.</td>
      </tr>
      <tr>
        <td>2. The Problem</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 2 (The Problem)</td>
        <td>Explains real everyday pain points instead of abstract technical issues.</td>
      </tr>
      <tr>
        <td>3. Statistics / User Research</td>
        <td><span class="badge badge-keep">KEEP & REFINED</span></td>
        <td>Slide 3 (What We Learned)</td>
        <td>Humanized: <em>"8 out of 10 students missed classes due to chat noise"</em>.</td>
      </tr>
      <tr>
        <td>4. Our Solution</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 4 (Meet Knowvia)</td>
        <td>Replaces technical jargon with 3 intuitive benefits: Rooms, Schedules, Safe Files.</td>
      </tr>
      <tr>
        <td>5. What do we do?</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 4 (Meet Knowvia)</td>
        <td>Combined with Solution to avoid repeating concepts back-to-back.</td>
      </tr>
      <tr>
        <td><strong>— PRODUCT DEMO —</strong></td>
        <td><span class="badge badge-demo">EMBEDDED</span></td>
        <td>Between Slides 4 & 5</td>
        <td><strong>Right after Solution: Show the working product while interest is highest.</strong></td>
      </tr>
      <tr>
        <td>8. Tech Stack</td>
        <td><span class="badge badge-keep">SIMPLIFIED</span></td>
        <td>Slide 5 (How It Works)</td>
        <td>Translated from code terms into: <em>Works on Any Phone &bull; Live Updates &bull; File Safety</em>.</td>
      </tr>
      <tr>
        <td>6. Market Analysis</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 6 (Why We Win)</td>
        <td>Compares WhatsApp (messy) vs. Canvas (too complex) vs. Knowvia (just right).</td>
      </tr>
      <tr>
        <td>7. Business Model</td>
        <td><span class="badge badge-keep">KEEP</span></td>
        <td>Slide 7 (How We Grow)</td>
        <td>Explained as an affordable annual fee per cohort that saves hubs hundreds of hours.</td>
      </tr>
      <tr>
        <td>9. Target Audience</td>
        <td><span class="badge badge-omit">OMIT AS STANDALONE</span></td>
        <td>Woven into Slides 2, 3 & 6</td>
        <td>Tutors, students, and hub managers are introduced naturally in the story.</td>
      </tr>
      <tr>
        <td>10. Meet the Team</td>
        <td><span class="badge badge-merge">MERGE</span></td>
        <td>Slide 8 (Team & QR)</td>
        <td>Combined with interactive QR code so listeners can test the app on their phones.</td>
      </tr>
      <tr>
        <td>11. Thank you</td>
        <td><span class="badge badge-omit">OMIT AS STANDALONE</span></td>
        <td>Merged into Slide 8</td>
        <td>Keeps contact info and the live demo QR code on screen during Q&A.</td>
      </tr>
    </tbody>
  </table>

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- SECTION 3: PRODUCT DEMO PLAYBOOK -->
  <h2>3. The 2-Minute Live Product Demo Playbook (Plain Language)</h2>
  <div class="callout callout-demo">
    <strong>Demo Rule:</strong> Speak like a human, not a developer. Do not explain database tables or WebSockets. Explain <em>what the student sees</em> and <em>what the tutor accomplishes</em>.
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Timestamp</th>
        <th style="width: 22%;">Persona / View</th>
        <th style="width: 32%;">Live Screen Actions</th>
        <th style="width: 32%;">Plain-English Narration Script</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>0:00 &ndash; 0:40</strong></td>
        <td><strong>The Student View</strong><br><em>(Dashboard & Progress)</em></td>
        <td>
          1. Show the phone dashboard.<br>
          2. Point to the <strong>Next Class Countdown</strong> card.<br>
          3. Point to the <strong>Homework Progress Bar</strong>.<br>
          4. Click Bell alert &rarr; jumps right to the assignment.
        </td>
        <td>
          <em>"When a student opens Knowvia, there is zero confusion. Right at the top is their next class with a live countdown and meeting link. Below it, a simple progress bar shows completed homework and tutor feedback, so nobody ever falls behind."</em>
        </td>
      </tr>
      <tr>
        <td><strong>0:40 &ndash; 1:20</strong></td>
        <td><strong>The Tutor View</strong><br><em>(Schedules & Lesson Files)</em></td>
        <td>
          1. Switch to Tutor view.<br>
          2. Click <strong>Edit Schedule</strong> & change class time.<br>
          3. Upload a lesson notes PDF.<br>
          4. Show the green safety checkmark.
        </td>
        <td>
          <em>"For tutors, managing classes takes seconds. When I update a class time, every student’s phone updates instantly. And when uploading lesson notes, Knowvia automatically screens the file for viruses, keeping students' laptops safe."</em>
        </td>
      </tr>
      <tr>
        <td><strong>1:20 &ndash; 2:00</strong></td>
        <td><strong>Classroom Chat</strong><br><em>(Focused Discussions)</em></td>
        <td>
          1. Open Department Chat tab.<br>
          2. Type a message.<br>
          3. Demonstrate quoted reply to a question.<br>
          4. Highlight zero outside chatter.
        </td>
        <td>
          <em>"Finally, discussions stay strictly inside the department. Coding students only see coding discussions. Learners can reply directly to questions, keeping conversations focused, tidy, and easy to review."</em>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 4: SLIDE BY SLIDE SPECIFICATION -->
  <h2>4. Slide-by-Slide Blueprint & Speaker Handbook</h2>

  <!-- SLIDE 1 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 1: Project Name & Vision</span>
      <span class="slide-time-pill">15 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-2">
        <div>
          <p><strong>Primary Title:</strong> <code style="font-size: 8.5pt; color: #4f46e5; font-weight: bold;">KNOWVIA</code></p>
          <p><strong>Subtitle:</strong> A Purpose-Built Digital Campus & Operations Platform for Our Hub.</p>
          <p><strong>Badge:</strong> In-House Hub Academy Platform &bull; Team Sydonverse / Knowvia</p>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Visual Style</div>
          <ul>
            <li>Dark, sleek background with crisp white typography.</li>
            <li>Tagline explaining the direct value to our hub.</li>
            <li>No generic external startup phrasing.</li>
          </ul>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (0:00 &ndash; 0:15)</div>
        <div class="script-text">
          "Good day, leadership and mentors. We are Team [Name], and this is Knowvia. Knowvia is a digital campus and operations platform built exclusively for our hub, designed to replace the chaos of WhatsApp groups with a unified, professional workspace tailored for our internship cohorts."
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 2 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 2: The Challenge in Our Hub (Why WhatsApp Fails)</span>
      <span class="slide-time-pill">25 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-3">
        <div class="mockup-col">
          <div class="mockup-col-header">01 / Lost Announcements</div>
          <ul>
            <li>Tutor class links, venue changes, and urgent updates get buried under chat banter and memes.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">02 / Lost Homework</div>
          <ul>
            <li>Interns submit tasks across personal DMs, emails, and shared folders; tutors lose track of submissions.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">03 / Security & File Risks</div>
          <ul>
            <li>Download links expire, phone storage fills up, and unvetted shared files put hub laptops at risk of viruses.</li>
          </ul>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (0:15 &ndash; 0:40)</div>
        <div class="script-text">
          "Today, right here in our hub, we manage over 50 interns across Frontend, Backend, UI/UX, and Cybersecurity using open WhatsApp groups. The result? Important announcements drown in chat noise, homework submissions get scattered across personal DMs, and unvetted file sharing exposes our hub's computers to serious malware risks."
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- SLIDE 3 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 3: Internal Hub Feedback & "What Surprised Us?"</span>
      <span class="slide-time-pill">30 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-2">
        <div class="mockup-col">
          <div class="mockup-col-header">Our Internal Survey Findings</div>
          <ul>
            <li><strong>8 of 10 of Our Interns</strong> reported missing a class or homework deadline because notices got lost in chat.</li>
            <li><strong>3+ Hours Every Week</strong> wasted by each tutor manually chasing deliverables across spreadsheets.</li>
            <li><strong>100% Alignment:</strong> Tutors and students want organized, quiet departmental classrooms.</li>
          </ul>
        </div>
        <div class="mockup-col" style="background: #fffbeb; border-color: #fde68a;">
          <div class="mockup-col-header" style="color: #b45309;">💡 What Surprised Us Most</div>
          <p style="font-size: 7.4pt; color: #78350f; line-height: 1.35;">
            "We realized our hub does not need expensive, rigid foreign software like Canvas or Blackboard that students abandon.<br><br>
            <strong>What our hub really needed:</strong> The speed and ease of a chat app, but built specifically around <strong>our department schedules, homework tracking, and verified file safety.</strong>"
          </p>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (0:40 &ndash; 1:10)</div>
        <div class="script-text">
          "When we surveyed our own hub's instructors and interns, 8 out of 10 of our students reported missing classes or deadlines because messages got lost in chat. And our tutors waste over 3 hours every week manually chasing submissions. But what surprised us was that our hub doesn't need expensive foreign portals like Canvas that students abandon. We need a tool as fast as messaging, but built around our department schedules, homework tracking, and file safety."
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 4 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 4: Our Solution (Meet Knowvia &mdash; Built for Our Hub)</span>
      <span class="slide-time-pill">25 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-3">
        <div class="mockup-col">
          <div class="mockup-col-header">Pillar 1: Dedicated Rooms</div>
          <ul>
            <li>Frontend, Backend, Design, and Cyber cohorts each have their own private workspace.</li>
            <li>Zero noise or distractions from other tracks.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Pillar 2: Never Miss a Session</div>
          <ul>
            <li>Next class countdown is right at the top of the phone screen.</li>
            <li>Live progress bar shows completed homework & feedback.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Pillar 3: Safe Study Archive</div>
          <ul>
            <li>Our lesson notes and slides never expire.</li>
            <li>Files are automatically screened for viruses.</li>
          </ul>
        </div>
      </div>
      <div class="callout callout-demo">
        <strong style="color: #7e22ce;">DEMO TRANSITION CUE:</strong> Hand off smoothly to the second presenter or switch display immediately to the live browser window running the Knowvia PWA.
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (1:10 &ndash; 1:35)</div>
        <div class="script-text">
          "That is why we built Knowvia exclusively for our hub. It gives our Frontend, Backend, Design, and Cyber cohorts their own dedicated classrooms, anchors class countdowns right on their phones, and keeps our study materials permanently safe. Let us take 2 minutes to show you how Knowvia works live right here in our hub."
        </div>
      </div>
    </div>
  </div>

  <!-- LIVE DEMO INTERLUDE -->
  <div style="background: #f3e8ff; border: 1.5px dashed #a855f7; border-radius: 6px; padding: 7px 12px; margin-bottom: 12px; text-align: center;">
    <strong style="color: #6b21a8; font-size: 9pt;">🔥 [2-MINUTE LIVE PRODUCT DEMONSTRATION OCCURS HERE — MINUTES 1:35 TO 3:35] 🔥</strong>
    <p style="font-size: 7.5pt; color: #581c87; margin-top: 2px;">
      Present live walkthrough in our hub: Student View &rarr; Tutor Schedule/Files &rarr; Scoped Chat. Return to Slide 5.
    </p>
  </div>

  <!-- SLIDE 5 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 5: How It Works (Simple, Fast & Secure for Our Hub)</span>
      <span class="slide-time-pill">25 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="arch-box">
        <div class="arch-tier">
          <div class="arch-tier-name" style="color: #4f46e5;">Works on Any Phone</div>
          <div class="arch-tier-tech"><strong>No App Download Needed:</strong> Our interns simply open a link in their phone browser. It loads instantly like an app, saves mobile data, and works on any device.</div>
        </div>
        <div class="arch-tier">
          <div class="arch-tier-name" style="color: #0891b2;">Instant Live Updates</div>
          <div class="arch-tier-tech"><strong>Instant Notifications Across Tracks:</strong> When an instructor updates class times or posts a new assignment, all students in that track receive instant alerts.</div>
        </div>
        <div class="arch-tier">
          <div class="arch-tier-name" style="color: #059669;">Hub Data Privacy & Safety</div>
          <div class="arch-tier-tech"><strong>Safe Files & Data Sovereignty:</strong> All our hub's student records, grades, and materials remain private and secure, completely screened against viruses.</div>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (3:35 &ndash; 4:00)</div>
        <div class="script-text">
          "Under the hood, Knowvia is engineered for effortless everyday use in our hub. First, our interns do not need to download an app from an app store—it opens in any phone browser and uses very little data. Second, when our tutors update a timetable, all students in that track get alerted immediately. And third, all our student records, grades, and study files remain completely safe and private within our hub."
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- SLIDE 6 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 6: Why External Tools Don't Fit Our Hub</span>
      <span class="slide-time-pill">25 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-3">
        <div class="mockup-col">
          <div class="mockup-col-header">Informal Channels (WhatsApp)</div>
          <ul>
            <li>Familiar, but chaotic and unmonitored.</li>
            <li>No central progress tracking or grading.</li>
            <li>Important notices buried in noise.</li>
            <li>Files expire; malware risks on hub laptops.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Foreign Portals (Canvas)</div>
          <ul>
            <li>Expensive recurring USD subscriptions.</li>
            <li>Rigid, bloated, and slow to onboard.</li>
            <li>No real-time department chat.</li>
            <li>Students rarely check or engage with them.</li>
          </ul>
        </div>
        <div class="mockup-col" style="background: #f0fdf4; border-color: #bbf7d0;">
          <div class="mockup-col-header" style="color: #166534;">Custom-Built for Us</div>
          <ul>
            <li><strong>Zero friction:</strong> Open in any phone browser.</li>
            <li><strong>Department Isolation:</strong> No track noise.</li>
            <li><strong>All-in-one:</strong> Schedules, homework, chat & files.</li>
            <li><strong>Hub Ownership:</strong> Fully branded asset for our hub.</li>
          </ul>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (4:00 &ndash; 4:25)</div>
        <div class="script-text">
          "Why not use off-the-shelf tools? WhatsApp is familiar, but it is unmonitored, messy, and puts hub laptops at risk. Foreign portals like Canvas charge expensive recurring USD fees, are clunky, and lack local real-time chat. Knowvia is custom-built for our exact workflow, has zero recurring foreign software fees, is fully branded for our hub, and is ready to deploy today."
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 7 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 7: Business Model &mdash; Selling & Deploying to Our Hub</span>
      <span class="slide-time-pill">20 SECONDS</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-3">
        <div class="mockup-col">
          <div class="mockup-col-header">In-House Adoption Model</div>
          <ul>
            <li><strong>Platform Buyout / License:</strong> Our hub acquires Knowvia as its proprietary learning and operations system for all cohorts.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">Maintenance & Support</div>
          <ul>
            <li><strong>Annual Support Retainer:</strong> A modest service fee covering cloud database/storage, cohort onboarding, and continuous updates.</li>
          </ul>
        </div>
        <div class="mockup-col">
          <div class="mockup-col-header">High ROI for Our Hub</div>
          <ul>
            <li>Saves 3+ hours per tutor weekly.</li>
            <li>Gives management complete oversight over tracks.</li>
            <li>Showcase platform for sponsors (NITDA, 3MTT).</li>
          </ul>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (4:25 &ndash; 4:45)</div>
        <div class="script-text">
          "Our proposal to our hub is simple: an in-house platform acquisition and annual maintenance agreement. For a modest annual retainer covering hosting and cohort onboarding, our hub gains a proprietary platform that saves tutors hundreds of hours, gives administration complete oversight, and serves as a flagship showcase for external sponsors like NITDA and 3MTT."
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 8 -->
  <div class="slide-spec-card">
    <div class="slide-spec-header">
      <span class="slide-num-title">Slide 8: Ready for Our Next Cohort</span>
      <span class="slide-time-pill">15 SECONDS (LEAVE ON SCREEN DURING Q&A)</span>
    </div>
    <div class="slide-body">
      <div class="card-grid-2">
        <div class="mockup-col">
          <div class="mockup-col-header">Our In-House Team</div>
          <ul>
            <li><strong>Built by Our Hub's Talent:</strong> Dedicated frontend, backend, and product builders trained right here.</li>
            <li><strong>Tested & Proven:</strong> 88 automated tests passed &bull; Production Certified.</li>
            <li><strong>Ready Today:</strong> Ready to deploy immediately for our hub's upcoming cohort.</li>
          </ul>
        </div>
        <div class="mockup-col" style="text-align: center; background: #f8fafc;">
          <div class="mockup-col-header">Test Knowvia Right Now</div>
          <p style="font-size: 7.5pt; color: #334155; margin-top: 4px;">
            Point your phone camera to test live:
          </p>
          <div style="display: inline-block; padding: 4px; background: #ffffff; border: 1.5px solid #4f46e5; border-radius: 4px; margin: 4px 0;">
            <span style="font-size: 7pt; font-weight: bold; color: #4f46e5;">[ QR CODE: SCAN TO TRY LIVE PWA ]</span>
          </div>
          <p style="font-size: 7pt; color: #64748b;">GitHub: <code>Sydonverse / Knowvia</code></p>
        </div>
      </div>
      <div class="callout callout-script">
        <div class="script-title">Speaker Script (4:45 &ndash; 5:00)</div>
        <div class="script-text">
          "We are proud to present a platform built by our hub's own talent, tested with 88 automated quality checks, and ready to elevate our internship program. Scan the QR code to try Knowvia on your phone right now. Thank you, and we welcome your questions!"
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 5: FINAL CHECKLIST -->
  <h2>5. Pitch Day Non-Technical Delivery Tips</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Area</th>
        <th style="width: 35%;">Action Item</th>
        <th style="width: 40%;">Why It Matters to Non-Tech Audiences</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Relatable Hook</strong></td>
        <td>Ask the crowd: <em>"Who here has ever had an important message lost in a noisy WhatsApp group?"</em></td>
        <td>Instantly creates empathy and head-nods across the entire room.</td>
      </tr>
      <tr>
        <td><strong>Avoid Acronyms</strong></td>
        <td>Say <em>"Works on any phone"</em> instead of <em>"PWA"</em>; say <em>"Private classroom"</em> instead of <em>"Department-scoped RLS"</em>.</td>
        <td>Prevents mental fatigue and keeps judges engaged on the business and human value.</td>
      </tr>
      <tr>
        <td><strong>Clear Demo Roleplay</strong></td>
        <td>Say: <em>"I am Sarah, a Web Design student logging in before class..."</em></td>
        <td>Grounding the demo in a human story makes features immediately intuitive.</td>
      </tr>
      <tr>
        <td><strong>QR Code Engagement</strong></td>
        <td>Hold up your phone or point to the QR code on Slide 8: <em>"Try it on your own phone right now."</em></td>
        <td>Turns judges from passive listeners into active product testers during Q&A.</td>
      </tr>
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer-bar">
    <span>Project Knowvia &bull; Pitch Deck Blueprint &copy; 2026</span>
    <span>Simplified Plain-English Edition &bull; Certified for 5-Minute Presentation</span>
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
      console.log('SUCCESS: Pitch Deck Blueprint PDF Generated successfully!');
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
