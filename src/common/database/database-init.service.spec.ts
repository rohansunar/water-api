import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DatabaseInitService } from './database-init.service';
import { DatabaseIndexStrategy } from './index-strategy';

describe('DatabaseInitService', () => {
  let service: DatabaseInitService;
  let mockConnection: Partial<Connection>;
  let mockDb: any;
  let mockAdmin: any;
  let mockCollection: any;

  beforeEach(async () => {
    mockCollection = {
      indexes: jest
        .fn()
        .mockResolvedValue([{ _id: 1 }, { phone: 1 }, { email: 1 }]),
      reIndex: jest.fn().mockResolvedValue({}),
      stats: jest.fn().mockResolvedValue({
        count: 1000,
        size: 1024000,
        avgObjSize: 1024,
        storageSize: 2048000,
        totalIndexSize: 512000,
        nindexes: 5,
      }),
    };

    mockAdmin = {
      ping: jest.fn().mockResolvedValue({ ok: 1 }),
      serverStatus: jest.fn().mockResolvedValue({
        connections: {
          current: 10,
          available: 90,
          totalCreated: 100,
        },
        mem: {
          resident: 256,
          virtual: 512,
          mapped: 128,
        },
        opcounters: {
          insert: 1000,
          query: 5000,
          update: 500,
          delete: 100,
        },
        uptime: 7200, // 2 hours
      }),
      command: jest.fn().mockResolvedValue({ ok: 1 }),
    };

    mockDb = {
      readPreference: 'primary',
      options: {},
      admin: jest.fn().mockReturnValue(mockAdmin),
      stats: jest.fn().mockResolvedValue({
        collections: 10,
        objects: 10000,
        dataSize: 10240000,
        storageSize: 20480000,
        indexSize: 5120000,
        avgObjSize: 1024,
      }),
      listCollections: jest.fn().mockReturnValue({
        toArray: jest
          .fn()
          .mockResolvedValue([
            { name: 'users' },
            { name: 'orders' },
            { name: 'products' },
            { name: 'system.profile' },
          ]),
      }),
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    mockConnection = {
      readyState: 1, // Connected
      db: mockDb,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseInitService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<DatabaseInitService>(DatabaseInitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize database on module init', async () => {
      const initializeDatabaseSpy = jest
        .spyOn(service as any, 'initializeDatabase')
        .mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(initializeDatabaseSpy).toHaveBeenCalled();
    });
  });

  describe('initializeDatabase', () => {
    it('should complete database initialization successfully', async () => {
      const applyPerformanceIndexesSpy = jest
        .spyOn(service as any, 'applyPerformanceIndexes')
        .mockResolvedValue(undefined);
      const configureDatabaseSettingsSpy = jest
        .spyOn(service as any, 'configureDatabaseSettings')
        .mockResolvedValue(undefined);
      const validateDatabaseHealthSpy = jest
        .spyOn(service as any, 'validateDatabaseHealth')
        .mockResolvedValue(undefined);

      await (service as any).initializeDatabase();

      expect(applyPerformanceIndexesSpy).toHaveBeenCalled();
      expect(configureDatabaseSettingsSpy).toHaveBeenCalled();
      expect(validateDatabaseHealthSpy).toHaveBeenCalled();
    });

    it('should throw error if initialization fails', async () => {
      jest
        .spyOn(service as any, 'applyPerformanceIndexes')
        .mockRejectedValue(new Error('Index creation failed'));

      await expect((service as any).initializeDatabase()).rejects.toThrow(
        'Index creation failed',
      );
    });
  });

  describe('applyPerformanceIndexes', () => {
    it('should apply all indexes using DatabaseIndexStrategy', async () => {
      const applyAllIndexesSpy = jest
        .spyOn(DatabaseIndexStrategy, 'applyAllIndexes')
        .mockResolvedValue(undefined);

      await (service as any).applyPerformanceIndexes();

      expect(applyAllIndexesSpy).toHaveBeenCalledWith(mockConnection);
    });

    it('should throw error if index application fails', async () => {
      jest
        .spyOn(DatabaseIndexStrategy, 'applyAllIndexes')
        .mockRejectedValue(new Error('Index error'));

      await expect((service as any).applyPerformanceIndexes()).rejects.toThrow(
        'Index error',
      );
    });
  });

  describe('configureDatabaseSettings', () => {
    it('should configure database settings for optimal performance', async () => {
      await (service as any).configureDatabaseSettings();

      expect(mockConnection.db.readPreference).toBe('secondaryPreferred');
      // Note: These options are set at connection level, not db level
      expect(mockConnection.db).toBeDefined();
      expect(mockConnection.readyState).toBe(1); // Connected
    });
  });

  describe('validateDatabaseHealth', () => {
    it('should validate database health successfully', async () => {
      const validateCriticalIndexesSpy = jest
        .spyOn(service as any, 'validateCriticalIndexes')
        .mockResolvedValue(undefined);

      await (service as any).validateDatabaseHealth();

      expect(mockAdmin.ping).toHaveBeenCalled();
      expect(mockDb.stats).toHaveBeenCalled();
      expect(validateCriticalIndexesSpy).toHaveBeenCalled();
    });

    it('should throw error if database is not connected', async () => {
      // Mock disconnected state
      Object.defineProperty(mockConnection, 'readyState', {
        value: 0,
        writable: true,
      });

      await expect((service as any).validateDatabaseHealth()).rejects.toThrow(
        'Database connection is not ready',
      );
    });

    it('should throw error if ping fails', async () => {
      mockAdmin.ping.mockRejectedValue(new Error('Ping failed'));

      await expect((service as any).validateDatabaseHealth()).rejects.toThrow(
        'Ping failed',
      );
    });
  });

  describe('validateCriticalIndexes', () => {
    it('should validate indexes for critical collections', async () => {
      await (service as any).validateCriticalIndexes();

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockDb.collection).toHaveBeenCalledWith('orders');
      expect(mockDb.collection).toHaveBeenCalledWith('products');
      expect(mockCollection.indexes).toHaveBeenCalledTimes(6); // 6 critical collections
    });

    it('should warn about insufficient indexes', async () => {
      mockCollection.indexes.mockResolvedValue([{ _id: 1 }]); // Only _id index
      const loggerWarnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation();

      await (service as any).validateCriticalIndexes();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('has insufficient indexes'),
      );
    });
  });

  describe('getDatabaseMetrics', () => {
    it('should return comprehensive database metrics', async () => {
      const metrics = await service.getDatabaseMetrics();

      expect(metrics).toHaveProperty('database');
      expect(metrics).toHaveProperty('connections');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('operations');
      expect(metrics).toHaveProperty('uptime');

      expect(metrics.database.collections).toBe(10);
      expect(metrics.database.objects).toBe(10000);
      expect(metrics.connections.current).toBe(10);
      expect(metrics.operations.insert).toBe(1000);
      expect(metrics.uptime).toBe('2 hours');
    });

    it('should handle errors gracefully', async () => {
      mockDb.stats.mockRejectedValue(new Error('Stats error'));

      await expect(service.getDatabaseMetrics()).rejects.toThrow('Stats error');
    });
  });

  describe('optimizeDatabase', () => {
    it('should reindex all collections', async () => {
      await service.optimizeDatabase();

      expect(mockDb.listCollections).toHaveBeenCalled();
      expect(mockCollection.reIndex).toHaveBeenCalledTimes(4); // 4 collections
    });

    it('should handle reindex failures gracefully', async () => {
      mockCollection.reIndex.mockRejectedValue(new Error('Reindex failed'));
      const loggerWarnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation();

      await service.optimizeDatabase();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to reindex collection'),
      );
    });
  });

  describe('analyzeSlowQueries', () => {
    it('should enable profiling and return slow query data', async () => {
      const mockProfilingData = [
        {
          ts: new Date(),
          millis: 150,
          op: 'query',
          ns: 'test.users',
          command: { find: 'users' },
          execStats: { totalDocsExamined: 1000 },
        },
      ];

      mockCollection.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(mockProfilingData),
          }),
        }),
      });

      const result = await service.analyzeSlowQueries();

      expect(mockAdmin.command).toHaveBeenCalledWith({
        profile: 2,
        slowms: 100,
      });
      expect(result).toHaveLength(1);
      expect(result[0].duration).toBe(150);
      expect(result[0].operation).toBe('query');
    });

    it('should return empty array on error', async () => {
      mockAdmin.command.mockRejectedValue(new Error('Profiling error'));

      const result = await service.analyzeSlowQueries();

      expect(result).toEqual([]);
    });
  });

  describe('getCollectionStats', () => {
    it('should return statistics for all collections', async () => {
      const stats = await service.getCollectionStats();

      expect(stats).toHaveProperty('users');
      expect(stats).toHaveProperty('orders');
      expect(stats).toHaveProperty('products');

      expect(stats.users.count).toBe(1000);
      expect(stats.users.indexCount).toBe(5);
      expect(typeof stats.users.size).toBe('string');
    });

    it('should handle collection stats errors gracefully', async () => {
      mockCollection.stats.mockRejectedValue(new Error('Stats error'));
      const loggerWarnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation();

      const stats = await service.getCollectionStats();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get stats for collection'),
      );
      expect(stats).toEqual({});
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      const formatBytes = (service as any).formatBytes;

      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });
});
