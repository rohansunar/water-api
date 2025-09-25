import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CustomLoggerService } from '../src/common/logger/logger.service';

const prisma = new PrismaClient();
const logger = new CustomLoggerService();

async function main() {
  logger.log('Seeding admin users...');

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

  logger.log('Admin users created:');
  logger.log(`- Super Admin: ${superAdmin.email}`);
  logger.log(`- Finance Admin: ${financeAdmin.email}`);
  logger.log(`- Support Admin: ${supportAdmin.email}`);
  logger.log('\nDefault password for all admins: Admin123!');
  logger.log('Please change passwords after first login.');
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });