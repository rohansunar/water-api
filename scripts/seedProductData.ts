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
      // WATER_JAR products
      {
        name: '20L Water Jar',
        description: 'Premium quality 20L water jar with secure cap',
        price: 30,
        category: 'WATER_JAR',
        size: '20L',
        stockQuantity: 100,
        images: ['/images/jar-20l.jpg'],
        pincodes: ['110001', '110002', '400001'],
      },
      {
        name: '15L Water Jar',
        description: 'Compact 15L water jar perfect for small families',
        price: 25,
        category: 'WATER_JAR',
        size: '15L',
        stockQuantity: 150,
        images: ['/images/jar-15l.jpg'],
        pincodes: ['110001', '560001', '500001'],
      },
      {
        name: '25L Water Jar',
        description: 'Large capacity 25L water jar for big families',
        price: 35,
        category: 'WATER_JAR',
        size: '25L',
        stockQuantity: 80,
        images: ['/images/jar-25l.jpg'],
        pincodes: ['110001', '400001', '560001'],
      },
      {
        name: '10L Water Bottle',
        description: 'Portable 10L water bottle for office use',
        price: 20,
        category: 'WATER_JAR',
        size: '10L',
        stockQuantity: 200,
        images: ['/images/bottle-10l.jpg'],
        pincodes: ['110001', '400001'],
      },
      {
        name: '5L Water Jar',
        description: 'Small 5L water jar ideal for single users',
        price: 15,
        category: 'WATER_JAR',
        size: '5L',
        stockQuantity: 300,
        images: ['/images/jar-5l.jpg'],
        pincodes: ['110001', '560001'],
      },
      {
        name: '30L Water Jar',
        description: 'Extra large 30L water jar for commercial use',
        price: 50,
        category: 'WATER_JAR',
        size: '30L',
        stockQuantity: 50,
        images: ['/images/jar-30l.jpg'],
        pincodes: ['400001', '500001', '560001'],
      },

      // DISPENSER products
      {
        name: 'Hot & Cold Water Dispenser',
        description: 'Advanced dispenser with hot and cold water options',
        price: 150,
        category: 'DISPENSER',
        size: 'Standard',
        stockQuantity: 25,
        images: ['/images/dispenser-hot-cold.jpg'],
        pincodes: ['110001', '400001', '560001'],
      },
      {
        name: 'Cold Water Dispenser',
        description: 'Energy-efficient cold water dispenser',
        price: 100,
        category: 'DISPENSER',
        size: 'Standard',
        stockQuantity: 40,
        images: ['/images/dispenser-cold.jpg'],
        pincodes: ['110001', '500001'],
      },
      {
        name: 'RO Water Dispenser',
        description: 'Reverse osmosis water dispenser with purification',
        price: 200,
        category: 'DISPENSER',
        size: 'RO',
        stockQuantity: 15,
        images: ['/images/dispenser-ro.jpg'],
        pincodes: ['400001', '560001'],
      },

      // ACCESSORIES products
      {
        name: 'Water Filter Cartridge',
        description: 'Replacement filter cartridge for water purifiers',
        price: 25,
        category: 'ACCESSORIES',
        size: 'Standard',
        stockQuantity: 200,
        images: ['/images/filter-cartridge.jpg'],
        pincodes: ['110001', '400001', '500001', '560001'],
      },
      {
        name: 'Plastic Water Bottle 1L',
        description: 'Durable 1L plastic water bottle',
        price: 5,
        category: 'ACCESSORIES',
        size: '1L',
        stockQuantity: 500,
        images: ['/images/bottle-1l.jpg'],
        pincodes: ['110001', '400001', '560001'],
      },
      {
        name: 'Water Jar Stand',
        description: 'Sturdy stand for water jars',
        price: 12,
        category: 'ACCESSORIES',
        size: 'Standard',
        stockQuantity: 150,
        images: ['/images/jar-stand.jpg'],
        pincodes: ['110001', '500001'],
      },
      {
        name: 'Alkaline Water Filter',
        description: 'Advanced alkaline water filter system',
        price: 75,
        category: 'ACCESSORIES',
        size: 'Alkaline',
        stockQuantity: 80,
        images: ['/images/alkaline-filter.jpg'],
        pincodes: ['400001', '560001'],
      },
      {
        name: 'Water Testing Kit',
        description: 'Complete kit for testing water quality',
        price: 30,
        category: 'ACCESSORIES',
        size: 'Basic',
        stockQuantity: 100,
        images: ['/images/water-test-kit.jpg'],
        pincodes: ['110001', '400001', '500001'],
      },
      {
        name: 'Stainless Steel Water Bottle 500ml',
        description: 'Insulated stainless steel bottle for hot/cold drinks',
        price: 18,
        category: 'ACCESSORIES',
        size: '500ml',
        stockQuantity: 250,
        images: ['/images/ss-bottle-500ml.jpg'],
        pincodes: ['110001', '560001'],
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
            unit: productData.category === 'WATER_JAR' ? 'jar' : productData.category === 'DISPENSER' ? 'unit' : 'piece',
            stock: productData.stockQuantity || 0,
            isAvailable: true,
            minOrderQuantity: 1,
            maxOrderQuantity: 1000,
            areaPincodes: productData.pincodes || [],
            images: productData.images || [],
            specifications: productData.category === 'WATER_JAR' ? {
              material: 'Plastic',
              brand: 'Generic',
              weight: parseFloat(productData.size.replace('L', '')) * 0.5,
              capacity: productData.size,
            } : productData.category === 'DISPENSER' ? {
              material: 'Plastic/Metal',
              brand: 'Generic',
              weight: 15,
              type: productData.name.includes('Hot') ? 'Hot & Cold' : productData.name.includes('RO') ? 'RO' : 'Cold',
              power: '220V',
            } : {
              material: productData.name.includes('Stainless') ? 'Stainless Steel' : 'Plastic',
              brand: 'Generic',
              weight: 0.2,
              type: productData.name.includes('Filter') ? 'Filter' : productData.name.includes('Bottle') ? 'Bottle' : 'Accessory',
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