import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/common/database/prisma.service';

async function testCustomerAuthenticationFlow() {
  console.log('🚀 Starting Customer Authentication Flow Test...\n');

  let app: NestFastifyApplication;
  let prismaService: PrismaService;

  try {
    // Initialize the NestJS application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.OTP_TEST_MODE = 'true';

    await app.init();

    prismaService = app.get(PrismaService);

    // Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    await prismaService.customer.deleteMany({
      where: { phone: { startsWith: '+91-test' } },
    });
    await prismaService.otpCode.deleteMany({
      where: { phone: { startsWith: '+91-test' } },
    });

    // Test phone number
    const testPhone = '+919876543210';

    console.log(`📱 Testing with phone number: ${testPhone}\n`);

    // Step 1: Send OTP
    console.log('📤 Step 1: Sending OTP...');
    const sendOtpResponse = await request(app.getHttpServer())
      .post('/customers/auth/login')
      .send({ phone: testPhone })
      .expect(200);

    console.log('✅ OTP Send Response:', sendOtpResponse.body);

    // Extract OTP from response (only available in test mode)
    const otp = sendOtpResponse.body.otp;
    if (!otp) {
      throw new Error('OTP not returned in test mode');
    }
    console.log(`🔢 Received OTP: ${otp}\n`);

    // Step 2: Verify OTP
    console.log('🔐 Step 2: Verifying OTP...');
    const verifyOtpResponse = await request(app.getHttpServer())
      .post('/customers/auth/verify')
      .send({
        phone: testPhone,
        otp: otp,
      })
      .expect(200);

    console.log('✅ OTP Verification Response:', verifyOtpResponse.body);

    // Extract JWT token
    const token = verifyOtpResponse.body.token;
    if (!token) {
      throw new Error('JWT token not received');
    }
    console.log(`🎫 Received JWT Token: ${token.substring(0, 50)}...\n`);

    // Step 3: Test protected endpoint
    console.log('🛡️  Step 3: Testing protected endpoint with JWT token...');

    const getProfileResponse = await request(app.getHttpServer())
      .get('/customers/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    console.log('✅ Get Profile Response:', getProfileResponse.body);

    // Step 4: Test without token (should fail)
    console.log('❌ Step 4: Testing protected endpoint without token...');
    const unauthorizedResponse = await request(app.getHttpServer())
      .get('/customers/auth/me')
      .expect(401);

    console.log('✅ Unauthorized Response:', unauthorizedResponse.body);

    // Step 5: Test with invalid token (should fail)
    console.log('❌ Step 5: Testing protected endpoint with invalid token...');
    const invalidTokenResponse = await request(app.getHttpServer())
      .get('/customers/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    console.log('✅ Invalid Token Response:', invalidTokenResponse.body);

    console.log('\n🎉 All basic tests passed! Authentication flow is working correctly.');

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('✅ OTP sent successfully');
    console.log('✅ OTP verified successfully');
    console.log('✅ JWT token generated');
    console.log('✅ Protected endpoint accessible with valid token');
    console.log('✅ Protected endpoint properly secured without token');
    console.log('✅ Protected endpoint properly secured with invalid token');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    // Clean up
    if (prismaService) {
      console.log('\n🧹 Cleaning up test data...');
      await prismaService.customer.deleteMany({
        where: { phone: { startsWith: '+91-test' } },
      });
      await prismaService.otpCode.deleteMany({
        where: { phone: { startsWith: '+91-test' } },
      });
    }

    if (app) {
      await app.close();
    }
  }
}

// Run the test
testCustomerAuthenticationFlow()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });