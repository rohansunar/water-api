import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { VendorAuthService } from '../../src/vendor/services/vendor-auth.service';

describe('Store Address Management (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let vendorAuthService: VendorAuthService;
  let testVendor: any;
  let testStore: any;
  let testToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    // Set test environment for OTP
    process.env.OTP_TEST_MODE = 'true';

    await app.init();

    prismaService = app.get(PrismaService);
    vendorAuthService = app.get(VendorAuthService);
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await prismaService.storeAddress.deleteMany({});
    await prismaService.store.deleteMany({});
    await prismaService.vendor.deleteMany({
      where: { phone: { startsWith: '+91' } },
    });

    // Create a test vendor
    const hashedPassword = await vendorAuthService.hashPassword('testPassword123');
    testVendor = await prismaService.vendor.create({
      data: {
        phone: '+919876543210',
        email: 'test-vendor@example.com',
        passwordHash: hashedPassword,
        name: 'Test Vendor',
        isActive: true,
      },
    });

    // Create a test store for the vendor
    testStore = await prismaService.store.create({
      data: {
        vendorId: testVendor.id,
        name: 'Test Store',
        address: '123 Test Street, Mumbai',
        phone: '+919876543211',
        isActive: true,
      },
    });

    // Get authentication token
    const loginResponse = await request(app.getHttpServer())
      .post('/vendors/auth/login')
      .send({
        phone: '+919876543210',
        password: 'testPassword123',
      })
      .expect(200);

    testToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // Clean up test data
    await prismaService.storeAddress.deleteMany({});
    await prismaService.store.deleteMany({});
    await prismaService.vendor.deleteMany({
      where: { phone: { startsWith: '+91' } },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /vendors/me/stores/:storeId/addresses', () => {
    it('should successfully create a store address with valid data', async () => {
      const createAddressDto = {
        label: 'Main Store',
        line1: '123 Main Street',
        line2: 'Near Central Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        latitude: 19.0760,
        longitude: 72.8777,
        isDefault: true,
      };

      const response = await request(app.getHttpServer())
        .post(`/vendors/me/stores/${testStore.id}/addresses`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(createAddressDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('storeId', testStore.id.toString());
      expect(response.body).toHaveProperty('label', 'Main Store');
      expect(response.body).toHaveProperty('line1', '123 Main Street');
      expect(response.body).toHaveProperty('line2', 'Near Central Park');
      expect(response.body).toHaveProperty('city', 'Mumbai');
      expect(response.body).toHaveProperty('state', 'Maharashtra');
      expect(response.body).toHaveProperty('country', 'India');
      expect(response.body).toHaveProperty('pincode', '400001');
      expect(response.body).toHaveProperty('latitude', 19.0760);
      expect(response.body).toHaveProperty('longitude', 72.8777);
      expect(response.body).toHaveProperty('isDefault', true);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create address with minimal required fields', async () => {
      const createAddressDto = {
        line1: '456 Secondary Street',
        city: 'Delhi',
        pincode: '110001',
      };

      const response = await request(app.getHttpServer())
        .post(`/vendors/me/stores/${testStore.id}/addresses`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(createAddressDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('storeId', testStore.id.toString());
      expect(response.body).toHaveProperty('label', 'Store'); // Default label
      expect(response.body).toHaveProperty('line1', '456 Secondary Street');
      expect(response.body).toHaveProperty('city', 'Delhi');
      expect(response.body).toHaveProperty('country', 'India'); // Default country
      expect(response.body).toHaveProperty('pincode', '110001');
      expect(response.body).toHaveProperty('isDefault', false);
    });

    it('should set new address as default and unset previous default', async () => {
      // Create first default address
      const firstAddress = await prismaService.storeAddress.create({
        data: {
          storeId: testStore.id,
          label: 'First Address',
          line1: '123 First Street',
          city: 'Mumbai',
          pincode: '400001',
          isDefault: true,
        },
      });

      // Create second address as default
      const createAddressDto = {
        line1: '456 Second Street',
        city: 'Delhi',
        pincode: '110001',
        isDefault: true,
      };

      const response = await request(app.getHttpServer())
        .post(`/vendors/me/stores/${testStore.id}/addresses`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(createAddressDto)
        .expect(201);

      expect(response.body.isDefault).toBe(true);

      // Verify first address is no longer default
      const updatedFirstAddress = await prismaService.storeAddress.findUnique({
        where: { id: firstAddress.id },
      });
      expect(updatedFirstAddress?.isDefault).toBe(false);
    });

    it('should fail with missing required line1 field', async () => {
      const createAddressDto = {
        city: 'Mumbai',
        pincode: '400001',
      };

      const response = await request(app.getHttpServer())
        .post(`/vendors/me/stores/${testStore.id}/addresses`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(createAddressDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should fail with missing required city field', async () => {
      const createAddressDto = {
        line1: '123 Main Street',
        pincode: '400001',
      };

      const response = await request(app.getHttpServer())
        .post(`/vendors/me/stores/${testStore.id}/addresses`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(createAddressDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should fail with missing required pincode field', async () => {
      const createAddressDto = {
        line1: '123 Main Street',
        city: 'Mumbai',
      };

      const response = await request(app.getHttpServer())
        .post(`/vendors/me/stores/${testStore.id}/addresses`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(createAddressDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should fail with invalid store ID', async () => {
      const createAddressDto = {
        line1: '123 Main Street',
        city: 'Mumbai',
        pincode: '400001',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors/me/stores/99999/addresses')
        .set('Authorization', `Bearer ${testToken}`)
        .send(createAddressDto)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message', 'Store not found or does not belong to this vendor');
    });

    it('should fail with store belonging to different vendor', async () => {
      // Create another vendor and store
      const otherVendor = await prismaService.vendor.create({
        data: {
          phone: '+919876543212',
          email: 'other-vendor@example.com',
          passwordHash: await vendorAuthService.hashPassword('password123'),
          name: 'Other Vendor',
          isActive: true,
        },
      });

      const otherStore = await prismaService.store.create({
        data: {
          vendorId: otherVendor.id,
          name: 'Other Store',
          address: '456 Other Street',
          isActive: true,
        },
      });

      const createAddressDto = {
        line1: '123 Main Street',
        city: 'Mumbai',
        pincode: '400001',
      };

      const response = await request(app.getHttpServer())
        .post(`/vendors/me/stores/${otherStore.id}/addresses`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(createAddressDto)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message', 'Store not found or does not belong to this vendor');
    });

    it('should fail without authentication', async () => {
      const createAddressDto = {
        line1: '123 Main Street',
        city: 'Mumbai',
        pincode: '400001',
      };

      const response = await request(app.getHttpServer())
        .post(`/vendors/me/stores/${testStore.id}/addresses`)
        .send(createAddressDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should fail with invalid latitude/longitude values', async () => {
      const createAddressDto = {
        line1: '123 Main Street',
        city: 'Mumbai',
        pincode: '400001',
        latitude: 'invalid',
        longitude: 72.8777,
      };

      const response = await request(app.getHttpServer())
        .post(`/vendors/me/stores/${testStore.id}/addresses`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(createAddressDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });
  });

  describe('PUT /vendors/me/stores/:storeId/addresses/:addressId', () => {
    let testAddress: any;

    beforeEach(async () => {
      // Create a test address
      testAddress = await prismaService.storeAddress.create({
        data: {
          storeId: testStore.id,
          label: 'Test Address',
          line1: '123 Test Street',
          city: 'Mumbai',
          pincode: '400001',
          isDefault: false,
        },
      });
    });

    it('should successfully update store address with valid data', async () => {
      const updateAddressDto = {
        label: 'Updated Store',
        line1: '456 Updated Street',
        city: 'Delhi',
        pincode: '110001',
        latitude: 28.6139,
        longitude: 77.2090,
        isDefault: true,
      };

      const response = await request(app.getHttpServer())
        .put(`/vendors/me/stores/${testStore.id}/addresses/${testAddress.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateAddressDto)
        .expect(200);

      expect(response.body).toHaveProperty('id', testAddress.id.toString());
      expect(response.body).toHaveProperty('storeId', testStore.id.toString());
      expect(response.body).toHaveProperty('label', 'Updated Store');
      expect(response.body).toHaveProperty('line1', '456 Updated Street');
      expect(response.body).toHaveProperty('city', 'Delhi');
      expect(response.body).toHaveProperty('pincode', '110001');
      expect(response.body).toHaveProperty('latitude', 28.6139);
      expect(response.body).toHaveProperty('longitude', 77.2090);
      expect(response.body).toHaveProperty('isDefault', true);
    });

    it('should update only provided fields', async () => {
      const updateAddressDto = {
        city: 'Pune',
        pincode: '411001',
      };

      const response = await request(app.getHttpServer())
        .put(`/vendors/me/stores/${testStore.id}/addresses/${testAddress.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateAddressDto)
        .expect(200);

      expect(response.body).toHaveProperty('city', 'Pune');
      expect(response.body).toHaveProperty('pincode', '411001');
      expect(response.body).toHaveProperty('label', 'Test Address'); // Unchanged
      expect(response.body).toHaveProperty('line1', '123 Test Street'); // Unchanged
    });

    it('should handle setting address as default and unsetting others', async () => {
      // Create another default address
      const otherAddress = await prismaService.storeAddress.create({
        data: {
          storeId: testStore.id,
          label: 'Other Address',
          line1: '789 Other Street',
          city: 'Mumbai',
          pincode: '400001',
          isDefault: true,
        },
      });

      const updateAddressDto = {
        isDefault: true,
      };

      const response = await request(app.getHttpServer())
        .put(`/vendors/me/stores/${testStore.id}/addresses/${testAddress.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateAddressDto)
        .expect(200);

      expect(response.body.isDefault).toBe(true);

      // Verify other address is no longer default
      const updatedOtherAddress = await prismaService.storeAddress.findUnique({
        where: { id: otherAddress.id },
      });
      expect(updatedOtherAddress?.isDefault).toBe(false);
    });

    it('should fail with invalid address ID', async () => {
      const updateAddressDto = {
        city: 'Pune',
      };

      const response = await request(app.getHttpServer())
        .put(`/vendors/me/stores/${testStore.id}/addresses/99999`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateAddressDto)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message', 'Store address not found or does not belong to this vendor');
    });

    it('should fail with address belonging to different store', async () => {
      // Create another store and address
      const otherStore = await prismaService.store.create({
        data: {
          vendorId: testVendor.id,
          name: 'Other Store',
          address: '456 Other Street',
          isActive: true,
        },
      });

      const otherAddress = await prismaService.storeAddress.create({
        data: {
          storeId: otherStore.id,
          label: 'Other Address',
          line1: '789 Other Street',
          city: 'Delhi',
          pincode: '110001',
        },
      });

      const updateAddressDto = {
        city: 'Pune',
      };

      const response = await request(app.getHttpServer())
        .put(`/vendors/me/stores/${testStore.id}/addresses/${otherAddress.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateAddressDto)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message', 'Store address not found or does not belong to this vendor');
    });

    it('should fail with invalid store ID', async () => {
      const updateAddressDto = {
        city: 'Pune',
      };

      const response = await request(app.getHttpServer())
        .put(`/vendors/me/stores/99999/addresses/${testAddress.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateAddressDto)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message', 'Store address not found or does not belong to this vendor');
    });

    it('should fail without authentication', async () => {
      const updateAddressDto = {
        city: 'Pune',
      };

      const response = await request(app.getHttpServer())
        .put(`/vendors/me/stores/${testStore.id}/addresses/${testAddress.id}`)
        .send(updateAddressDto)
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should fail with empty update payload', async () => {
      const response = await request(app.getHttpServer())
        .put(`/vendors/me/stores/${testStore.id}/addresses/${testAddress.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should handle updating latitude and longitude to null', async () => {
      const updateAddressDto = {
        latitude: null,
        longitude: null,
      };

      const response = await request(app.getHttpServer())
        .put(`/vendors/me/stores/${testStore.id}/addresses/${testAddress.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateAddressDto)
        .expect(200);

      expect(response.body.latitude).toBeUndefined();
      expect(response.body.longitude).toBeUndefined();
    });
  });
});