import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

/**
 * Test utilities and helpers for comprehensive testing
 */
export class TestHelper {
  /**
   * Create a test application with proper configuration
   */
  static async createTestApp(module: TestingModule): Promise<INestApplication> {
    const app = module.createNestApplication();

    // Apply the same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
    return app;
  }

  /**
   * Create authenticated request with JWT token
   */
  static createAuthenticatedRequest(app: INestApplication, token: string) {
    return request(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
  }

  /**
   * Generate test JWT token for testing
   */
  static generateTestToken(payload: any = {}): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const body = Buffer.from(JSON.stringify({
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'customer',
      ...payload,
    })).toString('base64');
    const signature = 'test-signature'; // In real tests, use actual JWT signing

    return `${header}.${body}.${signature}`;
  }

  /**
   * Wait for a specific amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          break;
        }

        await this.wait(delay * Math.pow(2, attempt - 1));
      }
    }

    throw lastError!;
  }
}

/**
 * Mock data generators for common test scenarios
 */
export class MockDataGenerator {
  /**
   * Generate mock user data for testing
   */
  static generateMockUser(overrides: any = {}) {
    return {
      id: 'test-user-id',
      phone: '+919876543210',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate mock order data for testing
   */
  static generateMockOrder(overrides: any = {}) {
    return {
      id: 'test-order-id',
      userId: 'test-user-id',
      vendorId: 'test-vendor-id',
      productId: 'test-product-id',
      quantity: 2,
      totalAmount: 200,
      depositAmount: 50,
      deliveryFee: 30,
      status: 'pending',
      schedule: 'instant',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      deliveryAddress: {
        street: 'Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        latitude: 28.6139,
        longitude: 77.2090,
        contactPhone: '+919876543210',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate mock vendor data for testing
   */
  static generateMockVendor(overrides: any = {}) {
    return {
      id: 'test-vendor-id',
      businessName: 'Test Water Store',
      ownerName: 'Test Owner',
      phone: '+919876543211',
      email: 'vendor@example.com',
      address: 'Test Vendor Address',
      isActive: true,
      rating: 4.5,
      totalOrders: 150,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate mock rider data for testing
   */
  static generateMockRider(overrides: any = {}) {
    return {
      id: 'test-rider-id',
      userId: 'test-user-id',
      phone: '+919876543212',
      vehicleType: 'bike',
      vehicleNumber: 'DL01CA1234',
      licenseNumber: 'DL123456789',
      isAvailable: true,
      currentLocation: {
        latitude: 28.6139,
        longitude: 77.2090,
      },
      rating: 4.8,
      totalDeliveries: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
}

/**
 * Database test helpers
 */
export class DatabaseTestHelper {
  /**
   * Clean up test data after tests
   */
  static async cleanupTestData(): Promise<void> {
    // Implementation depends on the database being used
    // For MongoDB: await TestDatabaseConnection.clearDatabase();
    // For Prisma: await prisma.$executeRaw('TRUNCATE TABLE ...');
  }

  /**
   * Setup test data before tests
   */
  static async setupTestData(): Promise<void> {
    // Implementation depends on the database being used
    // Create necessary test records
  }

  /**
   * Reset database to clean state
   */
  static async resetDatabase(): Promise<void> {
    await this.cleanupTestData();
    await this.setupTestData();
  }
}

/**
 * Performance test helpers
 */
export class PerformanceTestHelper {
  /**
   * Measure execution time of a function
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T; averageTime: number; minTime: number; maxTime: number }> {
    const times: number[] = [];

    let result: T;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      result = await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return { result, averageTime, minTime, maxTime };
  }

  /**
   * Assert performance requirements
   */
  static assertPerformance(
    averageTime: number,
    maxAllowedTime: number,
    description: string
  ): void {
    if (averageTime > maxAllowedTime) {
      throw new Error(
        `Performance test failed for ${description}: ${averageTime}ms > ${maxAllowedTime}ms`
      );
    }
  }
}

/**
 * Test data validators
 */
export class TestDataValidator {
  /**
   * Validate API response structure
   */
  static validateApiResponse(response: any, expectedStructure: any): boolean {
    // Deep comparison of response structure
    return this.deepEqual(response, expectedStructure);
  }

  /**
   * Validate pagination response
   */
  static validatePaginationResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      'meta' in response &&
      'pagination' in response.meta
    );
  }

  /**
   * Validate error response structure
   */
  static validateErrorResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      'statusCode' in response &&
      'message' in response &&
      'error' in response
    );
  }

  private static deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (obj1 == null || obj2 == null) return obj1 === obj2;

    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 !== 'object') return obj1 === obj2;

    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
  }
}