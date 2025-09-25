import { Test, TestingModule } from '@nestjs/testing';
import { EnvValidationService } from './env-validation.service';
import { Logger } from '@nestjs/common';

describe('EnvValidationService', () => {
  let service: EnvValidationService;
  let loggerWarnSpy: jest.SpyInstance;

  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'secret',
    JWT_ADMIN_SECRET: 'admin-secret',
    MONGODB_URI: 'mongodb://localhost:27017/db',
    PORT: '3000',
    FRONTEND_URL: 'http://localhost:3000',
    LOG_LEVEL: 'info',
    JWT_EXPIRES_IN: '1h',
    MONGODB_TEST_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'development',
    LOG_DIR: '/logs',
    THROTTLE_TTL: '60',
    THROTTLE_LIMIT: '10',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnvValidationService],
    }).compile();

    service = module.get<EnvValidationService>(EnvValidationService);
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset process.env after each test
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('TEST_')) {
        delete process.env[key];
      }
    });
  });

  describe('validate', () => {
    it('should pass validation when all mandatory variables are present and valid', () => {
      // Arrange
      process.env = { ...validEnv };

      // Act & Assert
      expect(() => service.validate()).not.toThrow();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should throw error when mandatory DATABASE_URL is missing', () => {
      // Arrange
      const envWithoutDb = { ...validEnv };
      delete envWithoutDb.DATABASE_URL;
      process.env = envWithoutDb;

      // Act & Assert
      expect(() => service.validate()).toThrow(
        'Mandatory environment variables are missing: DATABASE_URL'
      );
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should throw error when mandatory JWT_SECRET is missing', () => {
      // Arrange
      const envWithoutJwt = { ...validEnv };
      delete envWithoutJwt.JWT_SECRET;
      process.env = envWithoutJwt;

      // Act & Assert
      expect(() => service.validate()).toThrow(
        'Mandatory environment variables are missing: JWT_SECRET'
      );
    });

    it('should throw error when mandatory JWT_ADMIN_SECRET is missing', () => {
      // Arrange
      const envWithoutAdminJwt = { ...validEnv };
      delete envWithoutAdminJwt.JWT_ADMIN_SECRET;
      process.env = envWithoutAdminJwt;

      // Act & Assert
      expect(() => service.validate()).toThrow(
        'Mandatory environment variables are missing: JWT_ADMIN_SECRET'
      );
    });

    it('should throw error when mandatory MONGODB_URI is missing', () => {
      // Arrange
      const envWithoutMongo = { ...validEnv };
      delete envWithoutMongo.MONGODB_URI;
      process.env = envWithoutMongo;

      // Act & Assert
      expect(() => service.validate()).toThrow(
        'Mandatory environment variables are missing: MONGODB_URI'
      );
    });

    it('should throw error when multiple mandatory variables are missing', () => {
      // Arrange
      const envWithoutMultiple = { ...validEnv };
      delete envWithoutMultiple.DATABASE_URL;
      delete envWithoutMultiple.JWT_SECRET;
      process.env = envWithoutMultiple;

      // Act & Assert
      expect(() => service.validate()).toThrow(
        'Mandatory environment variables are missing: DATABASE_URL'
      );
    });

    it('should throw error when DATABASE_URL has invalid format', () => {
      // Arrange
      process.env = { ...validEnv, DATABASE_URL: 'invalid-url' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: DATABASE_URL/
      );
    });

    it('should throw error when MONGODB_URI has invalid format', () => {
      // Arrange
      process.env = { ...validEnv, MONGODB_URI: 'invalid-url' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: MONGODB_URI/
      );
    });

    it('should throw error when JWT_SECRET is empty', () => {
      // Arrange
      process.env = { ...validEnv, JWT_SECRET: '' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: JWT_SECRET/
      );
    });

    it('should throw error when JWT_ADMIN_SECRET is empty', () => {
      // Arrange
      process.env = { ...validEnv, JWT_ADMIN_SECRET: '' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: JWT_ADMIN_SECRET/
      );
    });

    it('should not log warning when optional PORT is missing', () => {
      // Arrange
      const envWithoutPort = { ...validEnv };
      delete envWithoutPort.PORT;
      process.env = envWithoutPort;

      // Act & Assert
      expect(() => service.validate()).not.toThrow();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should not log warning when optional FRONTEND_URL is missing', () => {
      // Arrange
      const envWithoutFrontend = { ...validEnv };
      delete envWithoutFrontend.FRONTEND_URL;
      process.env = envWithoutFrontend;

      // Act & Assert
      expect(() => service.validate()).not.toThrow();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should throw error when PORT has invalid format', () => {
      // Arrange
      process.env = { ...validEnv, PORT: 'invalid-port' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: PORT/
      );
    });

    it('should throw error when PORT is below minimum', () => {
      // Arrange
      process.env = { ...validEnv, PORT: '0' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: PORT/
      );
    });

    it('should throw error when PORT is above maximum', () => {
      // Arrange
      process.env = { ...validEnv, PORT: '70000' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: PORT/
      );
    });

    it('should throw error when FRONTEND_URL has invalid format', () => {
      // Arrange
      process.env = { ...validEnv, FRONTEND_URL: 'invalid-url' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: FRONTEND_URL/
      );
    });

    it('should throw error when LOG_LEVEL has invalid value', () => {
      // Arrange
      process.env = { ...validEnv, LOG_LEVEL: 'invalid-level' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: LOG_LEVEL/
      );
    });

    it('should pass validation when LOG_LEVEL has valid value', () => {
      // Arrange
      const validLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
      validLevels.forEach(level => {
        process.env = { ...validEnv, LOG_LEVEL: level };

        // Act & Assert
        expect(() => service.validate()).not.toThrow();
      });
    });

    it('should throw error when NODE_ENV has invalid value', () => {
      // Arrange
      process.env = { ...validEnv, NODE_ENV: 'invalid-env' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: NODE_ENV/
      );
    });

    it('should pass validation when NODE_ENV has valid value', () => {
      // Arrange
      const validEnvs = ['development', 'production', 'test'];
      validEnvs.forEach(env => {
        process.env = { ...validEnv, NODE_ENV: env };

        // Act & Assert
        expect(() => service.validate()).not.toThrow();
      });
    });

    it('should throw error when THROTTLE_TTL is below minimum', () => {
      // Arrange
      process.env = { ...validEnv, THROTTLE_TTL: '0' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: THROTTLE_TTL/
      );
    });

    it('should throw error when THROTTLE_LIMIT is below minimum', () => {
      // Arrange
      process.env = { ...validEnv, THROTTLE_LIMIT: '0' };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid: THROTTLE_LIMIT/
      );
    });

    it('should handle multiple validation errors', () => {
      // Arrange
      process.env = {
        ...validEnv,
        DATABASE_URL: 'invalid-url',
        JWT_SECRET: '',
        PORT: 'invalid-port',
      };

      // Act & Assert
      expect(() => service.validate()).toThrow(
        /Environment variables are invalid:/
      );
      const error = service.validate.bind(service);
      expect(error).toThrow();
    });
  });
});