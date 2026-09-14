import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Knowvia...');

  // 1. Clean existing records in foreign-key safe order
  await prisma.submissionReview.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.classSchedule.deleteMany();
  await prisma.dismissedAnnouncement.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.material.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.departmentMember.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('password123', 12);

  // 2. Create Departments
  console.log('Creating departments...');
  const cyberDept = await prisma.department.create({
    data: {
      name: 'Cybersecurity',
      slug: 'cybersecurity',
      description: 'Defensive and offensive security, network intrusion detection, forensics, and ethical hacking.',
      icon: 'shield',
      colorHex: '#6366f1',
    },
  });

  const webDept = await prisma.department.create({
    data: {
      name: 'Web Development',
      slug: 'web-dev',
      description: 'Modern frontend engineering, scalable APIs, cloud deployments, and Progressive Web Apps.',
      icon: 'globe',
      colorHex: '#0ea5e9',
    },
  });

  const dataDept = await prisma.department.create({
    data: {
      name: 'Data Analysis',
      slug: 'data-analysis',
      description: 'Data wrangling, statistical modeling, machine learning, and business intelligence.',
      icon: 'bar-chart-2',
      colorHex: '#10b981',
    },
  });

  const modelDept = await prisma.department.create({
    data: {
      name: '3D Modelling',
      slug: '3d-modelling',
      description: '3D asset creation, environment design, rigging, and animation for game pipelines.',
      icon: 'box',
      colorHex: '#8b5cf6',
    },
  });

  const designDept = await prisma.department.create({
    data: {
      name: 'Graphic Design',
      slug: 'graphic-design',
      description: 'Brand identity systems, typography, UI/UX interaction design, and visual communication.',
      icon: 'palette',
      colorHex: '#f59e0b',
    },
  });

  // 3. Create Admin & Hub Users
  console.log('Creating Knowvia users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@knowvia.internal',
      passwordHash: defaultPasswordHash,
      firstName: 'NASCOM',
      lastName: '',
      role: 'ADMIN',
    },
  });

  // Tutors
  const cyberTutor = await prisma.user.create({
    data: {
      email: 'cyber.tutor@knowvia.internal',
      passwordHash: defaultPasswordHash,
      firstName: 'Alex',
      lastName: 'Vance',
      role: 'TUTOR',
    },
  });

  const webTutor = await prisma.user.create({
    data: {
      email: 'web.tutor@knowvia.internal',
      passwordHash: defaultPasswordHash,
      firstName: 'Marcus',
      lastName: 'Chen',
      role: 'TUTOR',
    },
  });

  // Interns
  const cyberIntern1 = await prisma.user.create({
    data: {
      email: 'david.cyber@knowvia.internal',
      passwordHash: defaultPasswordHash,
      firstName: 'David',
      lastName: 'Kim',
      role: 'INTERN',
    },
  });

  const cyberIntern2 = await prisma.user.create({
    data: {
      email: 'maya.cyber@knowvia.internal',
      passwordHash: defaultPasswordHash,
      firstName: 'Maya',
      lastName: 'Patel',
      role: 'INTERN',
    },
  });

  const webIntern = await prisma.user.create({
    data: {
      email: 'jordan.web@knowvia.internal',
      passwordHash: defaultPasswordHash,
      firstName: 'Jordan',
      lastName: 'Lee',
      role: 'INTERN',
    },
  });

  // 4. Enroll Single Department Memberships
  console.log('Enrolling department memberships...');
  await prisma.departmentMember.createMany({
    data: [
      { userId: cyberTutor.id, departmentId: cyberDept.id, role: 'TUTOR', status: 'APPROVED' },
      { userId: cyberIntern1.id, departmentId: cyberDept.id, role: 'INTERN', status: 'APPROVED' },
      { userId: cyberIntern2.id, departmentId: cyberDept.id, role: 'INTERN', status: 'APPROVED' },
      { userId: webTutor.id, departmentId: webDept.id, role: 'TUTOR', status: 'APPROVED' },
      { userId: webIntern.id, departmentId: webDept.id, role: 'INTERN', status: 'APPROVED' },
    ],
  });

  // 5. Seed Learning Materials (Tutors share files)
  console.log('Seeding learning materials...');
  const material1 = await prisma.material.create({
    data: {
      departmentId: cyberDept.id,
      uploadedById: cyberTutor.id,
      title: 'OWASP Top 10 Security Architecture Guide',
      description: 'Comprehensive mitigation reference for injection attacks, broken auth, and cryptographic failures.',
      fileName: 'OWASP_Security_Guide_2026.pdf',
      fileUrl: '/uploads/sample-owasp-guide.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: 2450000,
    },
  });

  const material2 = await prisma.material.create({
    data: {
      departmentId: cyberDept.id,
      uploadedById: cyberTutor.id,
      title: 'Wireshark Packet Analysis Practice Labs',
      description: 'PCAP packet capture walkthroughs demonstrating TCP handshakes, TLS renegotiation, and suspicious beacons.',
      fileName: 'Packet_Analysis_Walkthrough.pdf',
      fileUrl: '/uploads/sample-traffic.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: 5200000,
    },
  });

  // 6. Seed Class Schedules
  console.log('Seeding class schedules...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(12, 0, 0, 0);

  const schedule1 = await prisma.classSchedule.create({
    data: {
      departmentId: cyberDept.id,
      scheduledById: cyberTutor.id,
      title: 'Hands-on Web Application Penetration Testing Lab',
      description: 'Exploiting SQL injection and testing Cross-Site Request Forgery mitigation on local testbeds.',
      startTime: tomorrow,
      endTime: tomorrowEnd,
      location: 'Cyber Security Lab 2B & Zoom',
      meetingLink: 'https://meet.google.com/xyz-knowvia-lab',
      reminderSent: false,
    },
  });

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 4);
  nextWeek.setHours(14, 0, 0, 0);

  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(16, 30, 0, 0);

  const schedule2 = await prisma.classSchedule.create({
    data: {
      departmentId: cyberDept.id,
      scheduledById: cyberTutor.id,
      title: 'Memory Forensics & Incident Response Deep-Dive',
      description: 'Analyzing volatile RAM dumps using Volatility 3 to detect rootkits and memory injection.',
      startTime: nextWeek,
      endTime: nextWeekEnd,
      location: 'Hub Auditorium Room A',
      meetingLink: 'https://meet.google.com/xyz-knowvia-forensics',
      reminderSent: false,
    },
  });

  // 7. Seed Assignments & Submissions
  console.log('Seeding assignments and submissions...');
  const assignment1 = await prisma.assignment.create({
    data: {
      departmentId: cyberDept.id,
      createdById: cyberTutor.id,
      title: 'Web Application Vulnerability Assessment',
      description: 'Perform a comprehensive vulnerability audit on the staging environment. Identify at least 3 distinct vulnerabilities, write up reproducible proof-of-concept steps, and provide prioritized remediation recommendations.',
      status: 'OPEN',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      maxFileSize: 25 * 1024 * 1024,
    },
  });

  const assignment2 = await prisma.assignment.create({
    data: {
      departmentId: cyberDept.id,
      createdById: cyberTutor.id,
      title: 'Network Traffic Analysis & Incident Report',
      description: 'Examine the provided PCAP capture from the simulated intrusion. Identify the compromised endpoint, the attack vector utilized, and the command-and-control IP address.',
      status: 'OPEN',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      maxFileSize: 25 * 1024 * 1024,
    },
  });

  // David Kim submitted assignment 1 and received approval feedback
  const submission1 = await prisma.submission.create({
    data: {
      assignmentId: assignment1.id,
      submittedById: cyberIntern1.id,
      notes: 'Completed full penetration testing audit. Uncovered SQL injection on /search endpoint and missing rate limiting on auth.',
      fileUrl: '/uploads/david_kim_vulnerability_report.pdf',
      fileName: 'David_Kim_Audit_Report.pdf',
      fileSizeBytes: 1840000,
      status: 'APPROVED',
    },
  });

  await prisma.submissionReview.create({
    data: {
      submissionId: submission1.id,
      reviewerId: cyberTutor.id,
      comment: 'Superb methodology and clear reproduction steps. Great job adhering to CVSS scoring!',
      verdict: 'APPROVED',
    },
  });

  // Maya Patel submitted assignment 1 and needs revision
  const submission2 = await prisma.submission.create({
    data: {
      assignmentId: assignment1.id,
      submittedById: cyberIntern2.id,
      notes: 'Drafted vulnerability assessment report with screenshot evidence.',
      fileUrl: '/uploads/maya_patel_audit_draft.pdf',
      fileName: 'Maya_Patel_Assessment_Draft.pdf',
      fileSizeBytes: 2150000,
      status: 'NEEDS_REVISION',
    },
  });

  await prisma.submissionReview.create({
    data: {
      submissionId: submission2.id,
      reviewerId: cyberTutor.id,
      comment: 'Good initial findings, but please expand on the remediation steps for the CSRF finding before final approval.',
      verdict: 'NEEDS_REVISION',
    },
  });

  // 8. Seed Announcements with Deep-Links
  console.log('Seeding announcements with deep links...');
  // Global admin announcement (reflects across all departments!)
  await prisma.announcement.create({
    data: {
      departmentId: null, // Global
      authorId: admin.id,
      title: '🌟 Welcome to Knowvia — The Central Knowledge Repository',
      content: 'All departments are now active on Knowvia. Access your flexible class schedules, download learning materials, and manage assignments from your dashboard.',
      priority: 'URGENT',
      isPinned: true,
    },
  });

  // Auto-announcements for scheduled classes, assignments, and materials
  await prisma.announcement.create({
    data: {
      departmentId: cyberDept.id,
      authorId: cyberTutor.id,
      title: `📝 New Assignment: ${assignment1.title}`,
      content: `A new assessment has been assigned: "${assignment1.title}". Review specifications and submit your findings before the deadline.`,
      priority: 'IMPORTANT',
      sourceType: 'ASSIGNMENT',
      sourceId: assignment1.id,
      isPinned: false,
    },
  });

  await prisma.announcement.create({
    data: {
      departmentId: cyberDept.id,
      authorId: cyberTutor.id,
      title: `📅 Class Scheduled: ${schedule1.title}`,
      content: `Class scheduled for tomorrow at 10:00 AM (${schedule1.location}). Please check your scheduler for Zoom credentials.`,
      priority: 'IMPORTANT',
      sourceType: 'CLASS_SCHEDULE',
      sourceId: schedule1.id,
      isPinned: false,
    },
  });

  await prisma.announcement.create({
    data: {
      departmentId: cyberDept.id,
      authorId: cyberTutor.id,
      title: `📚 New Learning Material: ${material1.title}`,
      content: `Tutor Alex Vance shared a new learning guide: "${material1.fileName}". Available for download in Learning Materials.`,
      priority: 'NORMAL',
      sourceType: 'MATERIAL',
      sourceId: material1.id,
      isPinned: false,
    },
  });

  // 9. Seed Department Messages (Text-only with reply-to threading)
  console.log('Seeding text-only chat messages...');
  const msg1 = await prisma.message.create({
    data: {
      departmentId: cyberDept.id,
      senderId: cyberTutor.id,
      content: 'Welcome everyone to the Cybersecurity department space! Class schedules, materials, and assignments are ready.',
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      departmentId: cyberDept.id,
      senderId: cyberIntern1.id,
      content: 'Thanks Alex! Really looking forward to tomorrow’s pen-testing lab session.',
      replyToId: msg1.id,
    },
  });

  await prisma.message.create({
    data: {
      departmentId: cyberDept.id,
      senderId: cyberIntern2.id,
      content: 'I have downloaded the OWASP guide from the Learning Materials tab. Excited to get started!',
      replyToId: msg1.id,
    },
  });

  console.log('✅ Knowvia database successfully seeded with initial departments and NASCOM administrator.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
