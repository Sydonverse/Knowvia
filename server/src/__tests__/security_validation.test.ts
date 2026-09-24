import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../index';
import prisma from '../config/prisma';
import {
  validateFileSafety,
  scanZipForBlockedFiles,
  MAX_FILE_SIZE_BYTES,
  BLOCKED_EXTENSIONS,
} from '../utils/fileValidator';
import {
  processStartingNowReminders,
  processAdvanceClassReminders,
} from '../services/reminder.service';

// Helper to construct a synthetic ZIP buffer with central directory records for testing
function createMockZipBuffer(entryNames: string[]): Buffer {
  let entriesBuf = Buffer.alloc(0);
  for (const name of entryNames) {
    const nameBuf = Buffer.from(name, 'utf-8');
    const header = Buffer.alloc(46);
    header[0] = 0x50;
    header[1] = 0x4b;
    header[2] = 0x01;
    header[3] = 0x02;
    header.writeUInt16LE(nameBuf.length, 28);
    entriesBuf = Buffer.concat([entriesBuf, header, nameBuf]);
  }
  const prefix = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  return Buffer.concat([prefix, entriesBuf]);
}

describe('Knowvia Security Validation & Schedule Edit Suite', () => {
  jest.setTimeout(30000);

  describe('File Safety & Malware Scanning Heuristics', () => {
    it('accepts legitimate documents within the size limit', () => {
      const pdfBuffer = Buffer.from('%PDF-1.5 Some legitimate study notes content here');
      const result = validateFileSafety(pdfBuffer, null, 'Course_Syllabus.pdf', pdfBuffer.length);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedFilename).toBe('Course_Syllabus.pdf');
    });

    it('rejects files exceeding the 25MB efficiency limit', () => {
      const result = validateFileSafety(null, null, 'huge_dataset.csv', MAX_FILE_SIZE_BYTES + 1024);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('25MB efficiency limit');
    });

    it('rejects blocked extensions directly (.exe, .bat, .sh, .vbs, .ps1, etc.)', () => {
      for (const ext of ['.exe', '.bat', '.sh', '.vbs', '.ps1', '.cmd', '.msi']) {
        const result = validateFileSafety(Buffer.from('test'), null, `payload${ext}`, 4);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('strictly blocked');
      }
    });

    it('detects and rejects double extension evasion attempts (e.g., malware.exe.pdf)', () => {
      const sample = Buffer.from('innocent content');
      const result = validateFileSafety(sample, null, 'Assignment_Brief.exe.pdf', sample.length);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('double-extension pattern detected');
    });

    it('detects Windows PE / MZ executable disguised as PDF', () => {
      const fakePdf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const result = validateFileSafety(fakePdf, null, 'malicious.pdf', fakePdf.length);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Windows executable (MZ header)');
    });

    it('detects Unix / Linux ELF binary disguised as text file', () => {
      const fakeTxt = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);
      const result = validateFileSafety(fakeTxt, null, 'readme.txt', fakeTxt.length);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unix/Linux executable binary (ELF header)');
    });

    it('detects Mach-O macOS binary disguised as image', () => {
      const fakeImg = Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00, 0x00, 0x01]);
      const result = validateFileSafety(fakeImg, null, 'photo.png', fakeImg.length);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Mach-O executable binary');
    });

    it('detects standard EICAR antivirus test signature', () => {
      const eicarBuffer = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );
      const result = validateFileSafety(eicarBuffer, null, 'test_sample.txt', eicarBuffer.length);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('EICAR standard antivirus test signature');
    });

    it('detects web shell and script signatures in uploaded text/svg files', () => {
      const phpShell = Buffer.from('<?php system($_GET["cmd"]); ?>');
      const resultPhp = validateFileSafety(phpShell, null, 'avatar.svg', phpShell.length);
      expect(resultPhp.isValid).toBe(false);
      expect(resultPhp.error).toContain('Embedded executable script or web-shell');

      const evalShell = Buffer.from('dummy data eval(base64_decode("abc..."))');
      const resultEval = validateFileSafety(evalShell, null, 'notes.txt', evalShell.length);
      expect(resultEval.isValid).toBe(false);

      const shebangScript = Buffer.from('#!/bin/bash\nrm -rf /');
      const resultShebang = validateFileSafety(shebangScript, null, 'setup.txt', shebangScript.length);
      expect(resultShebang.isValid).toBe(false);
    });

    it('scans ZIP archives and rejects nested blocked executables/scripts', () => {
      // Safe zip
      const safeZip = createMockZipBuffer(['syllabus.pdf', 'diagram.png', 'notes.md']);
      const safeScan = scanZipForBlockedFiles(null, safeZip);
      expect(safeScan.containsBlocked).toBe(false);
      const safeValidation = validateFileSafety(safeZip, null, 'materials.zip', safeZip.length);
      expect(safeValidation.isValid).toBe(true);

      // Malicious zip containing nested .exe
      const evilZip = createMockZipBuffer(['slides.pdf', 'trojan.exe']);
      const evilScan = scanZipForBlockedFiles(null, evilZip);
      expect(evilScan.containsBlocked).toBe(true);
      expect(evilScan.blockedEntry).toBe('trojan.exe');
      const evilValidation = validateFileSafety(evilZip, null, 'assignment_files.zip', evilZip.length);
      expect(evilValidation.isValid).toBe(false);
      expect(evilValidation.error).toContain('Compressed archive contains dangerous executable');
    });
  });

  describe('Download & Schedule API Integration', () => {
    let adminToken: string;
    let tutorToken: string;
    let internToken: string;
    let testDeptSlug: string;
    let testDeptId: string;
    let foreignDeptSlug: string;
    let scheduleId: string;
    let tutorId: string;

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash('password123', 12);

      // 1. Admin
      const admin = await prisma.user.upsert({
        where: { email: 'sec-admin@knowvia.internal' },
        update: { isActive: true, deletedAt: null },
        create: {
          email: 'sec-admin@knowvia.internal',
          passwordHash,
          firstName: 'Security',
          lastName: 'Admin',
          role: 'ADMIN',
          isActive: true,
        },
      });

      // 2. Department A
      const deptA = await prisma.department.upsert({
        where: { slug: 'sec-dept-a' },
        update: { isActive: true },
        create: {
          name: 'Security Test Dept A',
          slug: 'sec-dept-a',
          description: 'Dept A',
          icon: 'shield',
          colorHex: '#10b981',
          isActive: true,
        },
      });
      testDeptSlug = deptA.slug;
      testDeptId = deptA.id;

      // 3. Department B (foreign)
      const deptB = await prisma.department.upsert({
        where: { slug: 'sec-dept-b' },
        update: { isActive: true },
        create: {
          name: 'Security Test Dept B',
          slug: 'sec-dept-b',
          description: 'Dept B',
          icon: 'globe',
          colorHex: '#3b82f6',
          isActive: true,
        },
      });
      foreignDeptSlug = deptB.slug;

      // 4. Tutor in Dept A
      const tutor = await prisma.user.upsert({
        where: { email: 'sec-tutor@knowvia.internal' },
        update: { isActive: true, deletedAt: null },
        create: {
          email: 'sec-tutor@knowvia.internal',
          passwordHash,
          firstName: 'Sec',
          lastName: 'Tutor',
          role: 'TUTOR',
          isActive: true,
        },
      });
      tutorId = tutor.id;

      await prisma.departmentMember.upsert({
        where: {
          userId_departmentId: { userId: tutor.id, departmentId: deptA.id },
        },
        update: { status: 'APPROVED', role: 'TUTOR' },
        create: {
          userId: tutor.id,
          departmentId: deptA.id,
          role: 'TUTOR',
          status: 'APPROVED',
        },
      });

      // 5. Intern in Dept B only
      const intern = await prisma.user.upsert({
        where: { email: 'sec-intern-b@knowvia.internal' },
        update: { isActive: true, deletedAt: null },
        create: {
          email: 'sec-intern-b@knowvia.internal',
          passwordHash,
          firstName: 'Sec',
          lastName: 'Intern',
          role: 'INTERN',
          isActive: true,
        },
      });

      await prisma.departmentMember.upsert({
        where: {
          userId_departmentId: { userId: intern.id, departmentId: deptB.id },
        },
        update: { status: 'APPROVED', role: 'INTERN' },
        create: {
          userId: intern.id,
          departmentId: deptB.id,
          role: 'INTERN',
          status: 'APPROVED',
        },
      });

      // Logins
      const adminLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'sec-admin@knowvia.internal',
        password: 'password123',
      });
      adminToken = adminLogin.body.token;

      const tutorLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'sec-tutor@knowvia.internal',
        password: 'password123',
      });
      tutorToken = tutorLogin.body.token;

      const internLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'sec-intern-b@knowvia.internal',
        password: 'password123',
      });
      internToken = internLogin.body.token;

      // Seed a class schedule in Dept A
      const sched = await prisma.classSchedule.create({
        data: {
          departmentId: deptA.id,
          scheduledById: tutor.id,
          title: 'Initial Security Workshop',
          description: 'Introductory session',
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          location: 'Lab Alpha',
        },
      });
      scheduleId = sched.id;
    });

    afterAll(async () => {
      if (scheduleId) {
        await prisma.classSchedule.deleteMany({ where: { id: scheduleId } });
      }
      await prisma.departmentMember.deleteMany({
        where: {
          departmentId: { in: [testDeptId] },
        },
      });
      await prisma.department.deleteMany({
        where: { slug: { in: [testDeptSlug, foreignDeptSlug] } },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'sec-admin@knowvia.internal',
              'sec-tutor@knowvia.internal',
              'sec-intern-b@knowvia.internal',
            ],
          },
        },
      });
    });

    it('rejects unauthenticated requests to download materials with 401', async () => {
      const res = await request(app).get(
        `/api/v1/departments/${testDeptSlug}/materials/download/anyfile.pdf`
      );
      expect(res.status).toBe(401);
    });

    it('rejects users who do not belong to the department with 403 on material download', async () => {
      // Intern from Dept B trying to access Dept A download
      const res = await request(app)
        .get(`/api/v1/departments/${testDeptSlug}/materials/download/anyfile.pdf`)
        .set('Authorization', `Bearer ${internToken}`);
      expect(res.status).toBe(403);
    });

    it('supports authentication via ?token= query parameter for direct browser downloads', async () => {
      // Intern from Dept B trying to access Dept A with ?token= -> should get 403 (membership check), not 401 (token accepted)
      const res = await request(app).get(
        `/api/v1/departments/${testDeptSlug}/materials/download/anyfile.pdf?token=${internToken}`
      );
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated schedule update with 401', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${testDeptSlug}/schedules/${scheduleId}`)
        .send({ title: 'Updated Title' });
      expect(res.status).toBe(401);
    });

    it('rejects intern role from updating schedule with 403', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${testDeptSlug}/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${internToken}`)
        .send({ title: 'Intern Attempt' });
      expect(res.status).toBe(403);
    });

    it('allows tutor who created the schedule to update it successfully', async () => {
      const updatedTitle = 'Advanced Ethical Hacking Lab';
      const updatedLocation = 'Cyber Range Room 4B';

      const res = await request(app)
        .put(`/api/v1/departments/${testDeptSlug}/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: updatedTitle,
          location: updatedLocation,
        });

      expect(res.status).toBe(200);
      expect(res.body.schedule).toBeDefined();
      expect(res.body.schedule.title).toBe(updatedTitle);
      expect(res.body.schedule.location).toBe(updatedLocation);
    });
  });

  describe('Automated Class Reminders (1-Day Advance & Starting Now)', () => {
    let reminderDeptId: string;
    let reminderTutorId: string;
    let reminderInternId: string;
    let advanceScheduleId: string;
    let startingNowScheduleId: string;

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash('password123', 12);

      const dept = await prisma.department.upsert({
        where: { slug: 'reminders-test-dept' },
        update: { isActive: true },
        create: {
          name: 'Reminders Test Dept',
          slug: 'reminders-test-dept',
          description: 'Department for testing automated reminders',
          icon: 'bell',
          colorHex: '#6366f1',
          isActive: true,
        },
      });
      reminderDeptId = dept.id;

      const tutor = await prisma.user.upsert({
        where: { email: 'reminder-tutor@knowvia.internal' },
        update: { isActive: true, deletedAt: null },
        create: {
          email: 'reminder-tutor@knowvia.internal',
          passwordHash,
          firstName: 'Rem',
          lastName: 'Tutor',
          role: 'TUTOR',
          isActive: true,
        },
      });
      reminderTutorId = tutor.id;

      const intern = await prisma.user.upsert({
        where: { email: 'reminder-intern@knowvia.internal' },
        update: { isActive: true, deletedAt: null },
        create: {
          email: 'reminder-intern@knowvia.internal',
          passwordHash,
          firstName: 'Rem',
          lastName: 'Intern',
          role: 'INTERN',
          isActive: true,
        },
      });
      reminderInternId = intern.id;

      await prisma.departmentMember.upsert({
        where: {
          userId_departmentId: { userId: intern.id, departmentId: dept.id },
        },
        update: { status: 'APPROVED', role: 'INTERN' },
        create: {
          userId: intern.id,
          departmentId: dept.id,
          role: 'INTERN',
          status: 'APPROVED',
        },
      });

      // 1. Session scheduled for ~12 hours from now (within 24-26h window)
      const advanceSched = await prisma.classSchedule.create({
        data: {
          departmentId: dept.id,
          scheduledById: tutor.id,
          title: 'Advance Reminder Session',
          description: 'Test session in 12 hours',
          startTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 14 * 60 * 60 * 1000),
          location: 'Lab Beta',
          reminderSent: false,
          startedReminderSent: false,
        },
      });
      advanceScheduleId = advanceSched.id;

      // 2. Session starting right NOW (e.g. started 2 minutes ago, ending in 58 minutes)
      const nowSched = await prisma.classSchedule.create({
        data: {
          departmentId: dept.id,
          scheduledById: tutor.id,
          title: 'Live Pen-Testing Workshop',
          description: 'Test session starting right now',
          startTime: new Date(Date.now() - 2 * 60 * 1000),
          endTime: new Date(Date.now() + 58 * 60 * 1000),
          location: 'Virtual Zoom Room',
          meetingLink: 'https://zoom.us/j/123456789',
          reminderSent: true, // 1-day reminder already sent
          startedReminderSent: false,
        },
      });
      startingNowScheduleId = nowSched.id;
    });

    afterAll(async () => {
      await prisma.notification.deleteMany({
        where: {
          recipientId: { in: [reminderInternId, reminderTutorId] },
        },
      });
      await prisma.classSchedule.deleteMany({
        where: { id: { in: [advanceScheduleId, startingNowScheduleId] } },
      });
      await prisma.departmentMember.deleteMany({
        where: { departmentId: reminderDeptId },
      });
      await prisma.department.deleteMany({
        where: { id: reminderDeptId },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'reminder-tutor@knowvia.internal',
              'reminder-intern@knowvia.internal',
            ],
          },
        },
      });
    });

    it('dispatches 1-day advance reminder and updates reminderSent flag', async () => {
      await processAdvanceClassReminders();

      const updated = await prisma.classSchedule.findUnique({
        where: { id: advanceScheduleId },
      });
      expect(updated?.reminderSent).toBe(true);

      const notif = await prisma.notification.findFirst({
        where: {
          recipientId: reminderInternId,
          type: 'CLASS_REMINDER',
          title: { contains: 'Upcoming Class Reminder' },
        },
      });
      expect(notif).toBeDefined();
    });

    it('dispatches 3rd reminder (Starting Now) at scheduled class time with CLASS_STARTING type', async () => {
      await processStartingNowReminders();

      const updated = await prisma.classSchedule.findUnique({
        where: { id: startingNowScheduleId },
      });
      expect(updated?.startedReminderSent).toBe(true);

      const notif = await prisma.notification.findFirst({
        where: {
          recipientId: reminderInternId,
          type: 'CLASS_STARTING',
          title: { contains: 'Class Starting Now' },
        },
      });
      expect(notif).toBeDefined();
      expect(notif?.title).toContain('Live Pen-Testing Workshop');
      expect(notif?.body).toContain('virtual meeting');
      expect(notif?.actionUrl).toBe(`/schedule/${startingNowScheduleId}`);
    });

    it('prevents duplicate Starting Now reminders from being dispatched on subsequent cron ticks', async () => {
      const countBefore = await prisma.notification.count({
        where: {
          recipientId: reminderInternId,
          type: 'CLASS_STARTING',
        },
      });

      // Run second time (simulating next minute's cron tick)
      await processStartingNowReminders();

      const countAfter = await prisma.notification.count({
        where: {
          recipientId: reminderInternId,
          type: 'CLASS_STARTING',
        },
      });

      expect(countAfter).toBe(countBefore);
    });
  });
});
