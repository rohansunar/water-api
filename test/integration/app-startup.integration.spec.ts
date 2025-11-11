import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';

describe('Application Startup (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get(PrismaService);

    await app.init();
  }, 30000); // Increased timeout for startup

  afterAll(async () => {
    await app.close();
  });

  describe('Database Connection', () => {
    it('should successfully connect to PostgreSQL database', async () => {
      // Check if PrismaService is properly initialized
      expect(prismaService).toBeDefined();

      // Verify database connection status
      const connectionStatus = prismaService.getConnectionStatus();
      expect(connectionStatus.isConnected).toBe(true);
      expect(connectionStatus.connectionUrl).toBe('configured');
    });

    it('should be able to execute a simple database query', async () => {
      // Execute a simple query to verify database connectivity
      const result = await prismaService.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBeGreaterThan(0);
    });
  });

  describe('Application Health', () => {
    it('should start the NestJS application without errors', () => {
      expect(app).toBeDefined();
      expect(app.getHttpServer()).toBeDefined();
    });

    it('should have all required services initialized', () => {
      // Verify that critical services are available
      expect(prismaService).toBeDefined();
    });
  });
});