import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

/**
 * Database Initialization Service
 *
 * This service handles database initialization tasks.
 * Database operations are now handled by PrismaService.
 * This service provides logging for database initialization status.
 */
@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor() {}

  async onModuleInit(): Promise<void> {
    await this.initializeDatabase();
  }

  /**
   * Initialize database with all necessary configurations
   */
  private async initializeDatabase(): Promise<void> {
    try {
      this.logger.log('Starting database initialization...');

      // Database initialization is now handled by PrismaService
      // Prisma manages connection pooling, migrations, and schema setup

      this.logger.log('Database initialization completed successfully');
    } catch (error) {
      this.logger.error('Database initialization failed:', error);
      // Don't throw error to prevent application crash
      this.logger.warn(
        'Application will continue without full database initialization',
      );
    }
  }
}
