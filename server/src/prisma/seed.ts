import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Knowvia Production & Development Database Seed
 *
 * Provisions ONLY:
 * 1. Required core departments (upserted by slug to avoid clobbering).
 * 2. Legitimate initial administrator account (NASCOM).
 * 3. Default global welcome announcement by NASCOM.
 *
 * ZERO demo accounts, ZERO sample interns, ZERO sample tutors.
 */
async function main() {
  console.log('🌱 Starting clean database initialization for Knowvia...');

  const defaultPasswordHash = await bcrypt.hash('password123', 12);

  // 1. Provision Core Workspace Departments
  console.log('Ensuring core departments exist...');
  const departmentsData = [
    {
      name: 'Cybersecurity',
      slug: 'cybersecurity',
      description: 'Defensive and offensive security, network intrusion detection, forensics, and ethical hacking.',
      icon: 'shield',
      colorHex: '#6366f1',
    },
    {
      name: 'Web Development',
      slug: 'web-dev',
      description: 'Modern frontend engineering, scalable APIs, cloud deployments, and Progressive Web Apps.',
      icon: 'globe',
      colorHex: '#0ea5e9',
    },
    {
      name: 'Data Analysis',
      slug: 'data-analysis',
      description: 'Data wrangling, statistical modeling, machine learning, and business intelligence.',
      icon: 'bar-chart-2',
      colorHex: '#10b981',
    },
    {
      name: '3D Modelling',
      slug: '3d-modelling',
      description: '3D asset creation, environment design, rigging, and animation for game pipelines.',
      icon: 'box',
      colorHex: '#8b5cf6',
    },
    {
      name: 'Graphic Design',
      slug: 'graphic-design',
      description: 'Brand identity systems, typography, UI/UX interaction design, and visual communication.',
      icon: 'palette',
      colorHex: '#f59e0b',
    },
  ];

  for (const dept of departmentsData) {
    await prisma.department.upsert({
      where: { slug: dept.slug },
      update: {
        name: dept.name,
        description: dept.description,
        icon: dept.icon,
        colorHex: dept.colorHex,
      },
      create: dept,
    });
  }

  // 2. Ensure Legitimate Initial Administrator (NASCOM) Exists
  console.log('Ensuring legitimate NASCOM administrator exists...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@knowvia.internal' },
    update: {
      firstName: 'NASCOM',
      lastName: '',
      role: 'ADMIN',
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: 'admin@knowvia.internal',
      passwordHash: defaultPasswordHash,
      firstName: 'NASCOM',
      lastName: '',
      role: 'ADMIN',
      isActive: true,
    },
  });

  // 3. Global Admin Welcome Announcement
  const existingGlobalAnnouncement = await prisma.announcement.findFirst({
    where: { authorId: admin.id, departmentId: null },
  });

  if (!existingGlobalAnnouncement) {
    await prisma.announcement.create({
      data: {
        departmentId: null, // Global broadcast across all departments
        authorId: admin.id,
        title: '🌟 Welcome to Knowvia — The Central Knowledge Repository',
        content: 'All departments are now active on Knowvia. Access your flexible class schedules, download learning materials, and manage assignments from your dashboard.',
        priority: 'URGENT',
        isPinned: true,
      },
    });
  }

  console.log('✅ Knowvia database initialization complete: core departments and NASCOM administrator verified.');
  console.log('🛡️  Zero demo accounts created.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
