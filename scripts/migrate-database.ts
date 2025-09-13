#!/usr/bin/env ts-node

/**
 * Database Migration Script for Water Jar Delivery Platform
 * 
 * This script migrates existing data to the new enhanced schema structure.
 * It handles:
 * - User schema enhancements with role extensions
 * - Address schema separation and geospatial data
 * - Product schema enhancements
 * - Order schema improvements
 * - New schema implementations (subscriptions, wallets, etc.)
 */

import { connect, connection, Types } from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface MigrationResult {
  collection: string;
  migrated: number;
  errors: number;
  skipped: number;
}

class DatabaseMigration {
  private results: MigrationResult[] = [];

  async connect(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/water-jar-delivery';
    await connect(mongoUri);
    console.log('Connected to MongoDB');
  }

  async disconnect(): Promise<void> {
    await connection.close();
    console.log('Disconnected from MongoDB');
  }

  /**
   * Migrate user documents to new schema with role extensions
   */
  async migrateUsers(): Promise<MigrationResult> {
    console.log('Migrating users collection...');
    const collection = connection.collection('users');
    
    let migrated = 0;
    let errors = 0;
    let skipped = 0;

    try {
      const users = await collection.find({}).toArray();
      
      for (const user of users) {
        try {
          const updates: any = {};
          let needsUpdate = false;

          // Initialize role extensions if not present
          if (user.role === 'customer' && !user.customerExtension) {
            updates.customerExtension = {
              loyaltyPoints: 0,
              totalOrders: 0,
              totalSpent: 0,
              averageOrderValue: 0,
              lastOrderDate: null,
              preferences: {
                deliveryInstructions: '',
                preferredDeliveryTime: '',
                notificationPreferences: {
                  sms: true,
                  email: true,
                  push: true,
                },
              },
              subscriptions: [],
              favoriteProducts: [],
            };
            needsUpdate = true;
          }

          if (user.role === 'vendor' && !user.vendorExtension) {
            updates.vendorExtension = {
              kycStatus: 'pending',
              kycDocuments: [],
              businessLicense: '',
              gstNumber: '',
              rating: 0,
              totalReviews: 0,
              totalOrders: 0,
              businessMetrics: {
                totalRevenue: 0,
                averageOrderValue: 0,
                customerRetentionRate: 0,
                deliverySuccessRate: 0,
              },
              bankDetails: {
                accountNumber: '',
                ifscCode: '',
                accountHolderName: '',
                bankName: '',
              },
              operatingAreas: [],
            };
            needsUpdate = true;
          }

          if (user.role === 'delivery_agent' && !user.agentExtension) {
            updates.agentExtension = {
              vehicleType: 'bike',
              vehicleNumber: '',
              licenseNumber: '',
              shift: {
                startTime: '09:00',
                endTime: '18:00',
                daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              },
              status: 'inactive',
              currentLocation: {
                latitude: 0,
                longitude: 0,
                lastUpdated: new Date(),
              },
              performanceMetrics: {
                totalDeliveries: 0,
                averageRating: 0,
                onTimeDeliveryRate: 0,
                totalEarnings: 0,
              },
              assignedOrders: [],
            };
            needsUpdate = true;
          }

          if (user.role === 'admin' && !user.adminExtension) {
            updates.adminExtension = {
              roleLevel: 'support',
              permissions: [],
              accessLevel: 1,
              lastLogin: null,
              loginHistory: [],
            };
            needsUpdate = true;
          }

          // Convert old address format to new embedded format
          if (user.addresses && Array.isArray(user.addresses)) {
            const convertedAddresses = user.addresses.map((addr: any) => ({
              _id: addr._id || new Types.ObjectId(),
              label: addr.type || addr.label || 'home',
              street: addr.street || addr.line1 || '',
              city: addr.city || '',
              state: addr.state || '',
              pincode: addr.pincode || '',
              country: addr.country || 'IN',
              latitude: addr.latitude || 0,
              longitude: addr.longitude || 0,
              contactPhone: addr.contactPhone || user.phone || '',
              landmark: addr.landmark || '',
              isDefault: addr.isDefault || false,
              isActive: addr.isActive !== false,
              createdAt: addr.createdAt || new Date(),
              updatedAt: addr.updatedAt || new Date(),
            }));

            if (JSON.stringify(convertedAddresses) !== JSON.stringify(user.addresses)) {
              updates.addresses = convertedAddresses;
              needsUpdate = true;
            }
          }

          // Add missing fields with defaults
          if (!user.hasOwnProperty('isDeleted')) {
            updates.isDeleted = false;
            needsUpdate = true;
          }

          if (!user.hasOwnProperty('deletedAt')) {
            updates.deletedAt = null;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await collection.updateOne(
              { _id: user._id },
              { $set: { ...updates, updatedAt: new Date() } }
            );
            migrated++;
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`Error migrating user ${user._id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in user migration:', error);
      errors++;
    }

    const result = { collection: 'users', migrated, errors, skipped };
    this.results.push(result);
    console.log(`Users migration completed: ${migrated} migrated, ${errors} errors, ${skipped} skipped`);
    return result;
  }

  /**
   * Create separate address documents from embedded addresses
   */
  async migrateAddresses(): Promise<MigrationResult> {
    console.log('Creating separate address documents...');
    const usersCollection = connection.collection('users');
    const addressesCollection = connection.collection('addresses');
    
    let migrated = 0;
    let errors = 0;
    let skipped = 0;

    try {
      const users = await usersCollection.find({ addresses: { $exists: true, $ne: [] } }).toArray();
      
      for (const user of users) {
        try {
          if (user.addresses && Array.isArray(user.addresses)) {
            for (const addr of user.addresses) {
              // Check if address document already exists
              const existingAddress = await addressesCollection.findOne({
                userId: user._id,
                line1: addr.street,
                pincode: addr.pincode,
              });

              if (!existingAddress) {
                const addressDoc = {
                  userId: user._id,
                  label: addr.label || 'home',
                  line1: addr.street || '',
                  line2: '',
                  city: addr.city || '',
                  state: addr.state || '',
                  pincode: addr.pincode || '',
                  country: addr.country || 'IN',
                  location: {
                    type: 'Point',
                    coordinates: [addr.longitude || 0, addr.latitude || 0],
                  },
                  contactPhone: addr.contactPhone || user.phone || '',
                  landmark: addr.landmark || '',
                  isDefault: addr.isDefault || false,
                  isActive: addr.isActive !== false,
                  createdAt: addr.createdAt || new Date(),
                  updatedAt: addr.updatedAt || new Date(),
                };

                await addressesCollection.insertOne(addressDoc);
                migrated++;
              } else {
                skipped++;
              }
            }
          }
        } catch (error) {
          console.error(`Error migrating addresses for user ${user._id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in address migration:', error);
      errors++;
    }

    const result = { collection: 'addresses', migrated, errors, skipped };
    this.results.push(result);
    console.log(`Address migration completed: ${migrated} migrated, ${errors} errors, ${skipped} skipped`);
    return result;
  }

  /**
   * Migrate product documents to enhanced schema
   */
  async migrateProducts(): Promise<MigrationResult> {
    console.log('Migrating products collection...');
    const collection = connection.collection('products');
    
    let migrated = 0;
    let errors = 0;
    let skipped = 0;

    try {
      const products = await collection.find({}).toArray();
      
      for (const product of products) {
        try {
          const updates: any = {};
          let needsUpdate = false;

          // Add SKU if not present
          if (!product.sku) {
            const vendorPrefix = product.vendorId.toString().slice(-4).toUpperCase();
            const categoryPrefix = (product.category || 'GEN').substring(0, 3).toUpperCase();
            const timestamp = Date.now().toString().slice(-6);
            updates.sku = `${vendorPrefix}-${categoryPrefix}-${timestamp}`;
            needsUpdate = true;
          }

          // Add enhanced fields
          if (!product.areaPincodes) {
            updates.areaPincodes = [];
            needsUpdate = true;
          }

          if (!product.pricing) {
            updates.pricing = {
              discountPercentage: 0,
              discountStartDate: null,
              discountEndDate: null,
              bulkPricing: [],
            };
            needsUpdate = true;
          }

          if (!product.inventory) {
            updates.inventory = {
              reorderLevel: Math.max(10, Math.floor(product.stock * 0.2)),
              maxStock: product.stock * 5 || 1000,
              reservedStock: 0,
            };
            needsUpdate = true;
          }

          if (!product.specifications) {
            updates.specifications = {
              brand: '',
              material: '',
              weight: 0,
              dimensions: {
                length: 0,
                width: 0,
                height: 0,
              },
            };
            needsUpdate = true;
          }

          // Add performance metrics
          if (!product.hasOwnProperty('totalOrders')) {
            updates.totalOrders = 0;
            needsUpdate = true;
          }

          if (!product.hasOwnProperty('totalSales')) {
            updates.totalSales = 0;
            needsUpdate = true;
          }

          if (!product.hasOwnProperty('revenue')) {
            updates.revenue = 0;
            needsUpdate = true;
          }

          // Add SEO fields
          if (!product.tags) {
            updates.tags = [];
            needsUpdate = true;
          }

          if (!product.searchKeywords) {
            updates.searchKeywords = [];
            needsUpdate = true;
          }

          if (needsUpdate) {
            await collection.updateOne(
              { _id: product._id },
              { $set: { ...updates, updatedAt: new Date() } }
            );
            migrated++;
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`Error migrating product ${product._id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in product migration:', error);
      errors++;
    }

    const result = { collection: 'products', migrated, errors, skipped };
    this.results.push(result);
    console.log(`Products migration completed: ${migrated} migrated, ${errors} errors, ${skipped} skipped`);
    return result;
  }

  /**
   * Create wallet documents for existing users
   */
  async createWallets(): Promise<MigrationResult> {
    console.log('Creating wallet documents for users...');
    const usersCollection = connection.collection('users');
    const walletsCollection = connection.collection('wallets');
    
    let migrated = 0;
    let errors = 0;
    let skipped = 0;

    try {
      const users = await usersCollection.find({}).toArray();
      
      for (const user of users) {
        try {
          // Check if wallet already exists
          const existingWallet = await walletsCollection.findOne({ userId: user._id });
          
          if (!existingWallet) {
            const walletDoc = {
              userId: user._id,
              balance: user.walletBalance || 0,
              currency: 'INR',
              isActive: true,
              isBlocked: false,
              maxBalance: 50000,
              dailyTransactionLimit: 10000,
              monthlyTransactionLimit: 25000,
              totalCredits: 0,
              totalDebits: 0,
              totalTransactions: 0,
              dailySpent: 0,
              monthlySpent: 0,
              isKycVerified: false,
              securityScore: 50,
              totalCashback: 0,
              availableCashback: 0,
              loyaltyPoints: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await walletsCollection.insertOne(walletDoc);
            migrated++;
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`Error creating wallet for user ${user._id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in wallet creation:', error);
      errors++;
    }

    const result = { collection: 'wallets', migrated, errors, skipped };
    this.results.push(result);
    console.log(`Wallet creation completed: ${migrated} migrated, ${errors} errors, ${skipped} skipped`);
    return result;
  }

  /**
   * Run all migrations
   */
  async runAllMigrations(): Promise<void> {
    console.log('Starting database migration...\n');
    
    try {
      await this.connect();
      
      // Run migrations in order
      await this.migrateUsers();
      await this.migrateAddresses();
      await this.migrateProducts();
      await this.createWallets();
      
      // Print summary
      console.log('\n=== Migration Summary ===');
      let totalMigrated = 0;
      let totalErrors = 0;
      let totalSkipped = 0;
      
      for (const result of this.results) {
        console.log(`${result.collection}: ${result.migrated} migrated, ${result.errors} errors, ${result.skipped} skipped`);
        totalMigrated += result.migrated;
        totalErrors += result.errors;
        totalSkipped += result.skipped;
      }
      
      console.log(`\nTotal: ${totalMigrated} migrated, ${totalErrors} errors, ${totalSkipped} skipped`);
      
      if (totalErrors > 0) {
        console.log('\n⚠️  Migration completed with errors. Please review the logs above.');
        process.exit(1);
      } else {
        console.log('\n✅ Migration completed successfully!');
      }
      
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const migration = new DatabaseMigration();
  migration.runAllMigrations().catch(console.error);
}

export { DatabaseMigration };
