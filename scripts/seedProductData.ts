import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/common/database/prisma.service';

const configService = new ConfigService();
const prismaService = new PrismaService(configService);
const logger = console;

export async function seedProductData(): Promise<void> {
  try {
    // Ensure a test vendor exists
    const testVendorId = BigInt('1');
    const existingVendor = await prismaService.vendor.findUnique({
      where: { id: testVendorId },
    });

    if (!existingVendor) {
      await prismaService.vendor.create({
        data: {
          id: testVendorId,
          name: 'Test Vendor',
          phone: '1234567890',
          email: 'test@vendor.com',
          isActive: true,
          isVerified: true,
        },
      });
      logger.log('Created test vendor');
    }

    const testProducts = [
      {
        name: '20L Water Jar',
        description: 'Premium quality 20L water jar with secure cap',
        price: 30,
        category: 'water_jar',
        size: '20L',
        stockQuantity: 100,
        images: ['/images/jar-20l.jpg'],
      },
      {
        name: '15L Water Jar',
        description: 'Compact 15L water jar perfect for small families',
        price: 25,
        category: 'water_jar',
        size: '15L',
        stockQuantity: 150,
        images: ['/images/jar-15l.jpg'],
      },
      {
        name: '25L Water Jar',
        description: 'Large capacity 25L water jar for big families',
        price: 35,
        category: 'water_jar',
        size: '25L',
        stockQuantity: 80,
        images: ['/images/jar-25l.jpg'],
      },
      {
        name: '10L Water Bottle',
        description: 'Portable 10L water bottle for office use',
        price: 20,
        category: 'water_jar',
        size: '10L',
        stockQuantity: 200,
        images: ['/images/bottle-10l.jpg'],
      },
    ];

    for (const productData of testProducts) {
      const existingProduct = await prismaService.product.findFirst({
        where: { name: productData.name },
      });

      if (!existingProduct) {
        await prismaService.product.create({
          data: {
            vendorId: testVendorId,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            category: productData.category,
            capacity: productData.size,
            unit: 'jar', // Default unit
            stock: productData.stockQuantity || 0,
            isAvailable: true,
            minOrderQuantity: 1,
            maxOrderQuantity: 1000,
            areaPincodes: [],
            images: productData.images || [],
            specifications: {
              material: 'Plastic',
              brand: 'Generic',
              weight: 1.5,
            },
            moderationStatus: 'PENDING',
          },
        });
        logger.log(`Created product: ${productData.name}`);
      } else {
        logger.log(`Product already exists: ${productData.name}`);
      }
    }

    logger.log('Product test data seeded successfully');
  } catch (error) {
    logger.error('Error seeding product test data:', error);
    throw error;
  }
}

async function main() {
  await seedProductData();
}

if (require.main === module) {
  main()
    .catch((e) => {
      logger.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prismaService.$disconnect();
    });
}