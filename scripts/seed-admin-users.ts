import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin users...');

  // Hash password for admin users
  const hashedPassword = await bcrypt.hash('Admin123!', 12);

  // Create super admin
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@platform.com' },
    update: {},
    create: {
      email: 'superadmin@platform.com',
      name: 'Super Administrator',
      passwordHash: hashedPassword,
      roleLevel: 'super_admin',
      permissions: {
        canManageUsers: true,
        canManageVendors: true,
        canModerateProducts: true,
        canManageCommissions: true,
        canProcessRefunds: true,
        canViewReports: true,
        canManagePayouts: true,
        canResolveDisputes: true,
      },
      isActive: true,
    },
  });

  // Create finance admin
  const financeAdmin = await prisma.admin.upsert({
    where: { email: 'finance@platform.com' },
    update: {},
    create: {
      email: 'finance@platform.com',
      name: 'Finance Administrator',
      passwordHash: hashedPassword,
      roleLevel: 'finance_admin',
      permissions: {
        canManageUsers: false,
        canManageVendors: false,
        canModerateProducts: false,
        canManageCommissions: true,
        canProcessRefunds: true,
        canViewReports: true,
        canManagePayouts: true,
        canResolveDisputes: false,
      },
      isActive: true,
    },
  });

  // Create support admin
  const supportAdmin = await prisma.admin.upsert({
    where: { email: 'support@platform.com' },
    update: {},
    create: {
      email: 'support@platform.com',
      name: 'Support Administrator',
      passwordHash: hashedPassword,
      roleLevel: 'support_admin',
      permissions: {
        canManageUsers: false,
        canManageVendors: false,
        canModerateProducts: true,
        canManageCommissions: false,
        canProcessRefunds: true,
        canViewReports: false,
        canManagePayouts: false,
        canResolveDisputes: true,
      },
      isActive: true,
    },
  });

  console.log('Admin users created:');
  console.log('- Super Admin:', superAdmin.email);
  console.log('- Finance Admin:', financeAdmin.email);
  console.log('- Support Admin:', supportAdmin.email);
  console.log('\nDefault password for all admins: Admin123!');
  console.log('Please change passwords after first login.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });