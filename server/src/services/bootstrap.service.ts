import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';

/**
 * Ensures a designated Administrator account with display name 'NASCOM' exists.
 * If the admin already exists in the database, updates their display name to 'NASCOM'
 * and ensures active status without recreating or duplicating accounts.
 *
 * Surfaces administrator setup status in server/terminal logs outside the frontend UI.
 */
export async function initAdminBootstrap(): Promise<void> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@knowvia.internal';

    // Check if an administrator already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [{ email: adminEmail }, { role: 'ADMIN' }],
      },
    });

    if (existingAdmin) {
      // Safely ensure display name is NASCOM and account is active
      if (existingAdmin.firstName !== 'NASCOM' || existingAdmin.lastName !== '' || !existingAdmin.isActive || existingAdmin.deletedAt !== null) {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: {
            firstName: 'NASCOM',
            lastName: '',
            isActive: true,
            deletedAt: null,
          },
        });
      }

      console.log('-------------------------------------------');
      console.log('🛡️  Administrator Verified (Development):');
      console.log(`   Name:  NASCOM`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role:  ADMIN`);
      console.log('-------------------------------------------');
      return;
    }

    // Provision initial administrator if not found
    const bootstrapPassword = process.env.ADMIN_PASSWORD || 'password123';
    const passwordHash = await bcrypt.hash(bootstrapPassword, 12);

    const newAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'NASCOM',
        lastName: '',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('===========================================');
    console.log('🛡️  Initial Administrator Provisioned:');
    console.log(`   Name:     NASCOM`);
    console.log(`   Email:    ${newAdmin.email}`);
    console.log(`   Password: ${bootstrapPassword}`);
    console.log('   (Manually enter credentials on sign-in screen)');
    console.log('===========================================');
  } catch (err) {
    console.error('⚠️  Failed to bootstrap administrator account:', err);
  }
}
