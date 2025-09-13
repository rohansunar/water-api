#!/usr/bin/env ts-node

/**
 * Database Migration Rollback Script for Water Jar Delivery Platform
 * 
 * This script rolls back the database migration by:
 * - Removing role extensions from users
 * - Removing separate address documents
 * - Removing enhanced product fields
 * - Removing wallet documents
 */

import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

interface RollbackResult {
  collection: string;
  processed: number;
  errors: number;
}

class DatabaseRollback {
  private results: RollbackResult[] = [];

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
   * Confirm rollback with user
   */
  async confirmRollback(): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(
        '⚠️  WARNING: This will rollback database changes and may result in data loss.\n' +
        'Are you sure you want to proceed? (yes/no): ',
        (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === 'yes');
        }
      );
    });
  }

  /**
   * Rollback user schema changes
   */
  async rollbackUsers(): Promise<RollbackResult> {
    console.log('Rolling back users collection...');
    const collection = connection.collection('users');
    
    let processed = 0;
    let errors = 0;

    try {
      const users = await collection.find({}).toArray();
      
      for (const user of users) {
        try {
          const unsetFields: any = {};
          let needsUpdate = false;

          // Remove role extensions
          if (user.customerExtension) {
            unsetFields.customerExtension = '';
            needsUpdate = true;
          }

          if (user.vendorExtension) {
            unsetFields.vendorExtension = '';
            needsUpdate = true;
          }

          if (user.agentExtension) {
            unsetFields.agentExtension = '';
            needsUpdate = true;
          }

          if (user.adminExtension) {
            unsetFields.adminExtension = '';
            needsUpdate = true;
          }

          // Remove new fields
          if (user.hasOwnProperty('isDeleted')) {
            unsetFields.isDeleted = '';
            needsUpdate = true;
          }

          if (user.hasOwnProperty('deletedAt')) {
            unsetFields.deletedAt = '';
            needsUpdate = true;
          }

          if (needsUpdate) {
            await collection.updateOne(
              { _id: user._id },
              { 
                $unset: unsetFields,
                $set: { updatedAt: new Date() }
              }
            );
          }
          processed++;
        } catch (error) {
          console.error(`Error rolling back user ${user._id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in user rollback:', error);
      errors++;
    }

    const result = { collection: 'users', processed, errors };
    this.results.push(result);
    console.log(`Users rollback completed: ${processed} processed, ${errors} errors`);
    return result;
  }

  /**
   * Remove separate address documents
   */
  async rollbackAddresses(): Promise<RollbackResult> {
    console.log('Removing separate address documents...');
    const collection = connection.collection('addresses');
    
    let processed = 0;
    let errors = 0;

    try {
      const result = await collection.deleteMany({});
      processed = result.deletedCount || 0;
    } catch (error) {
      console.error('Error removing address documents:', error);
      errors++;
    }

    const rollbackResult = { collection: 'addresses', processed, errors };
    this.results.push(rollbackResult);
    console.log(`Address rollback completed: ${processed} processed, ${errors} errors`);
    return rollbackResult;
  }

  /**
   * Rollback product schema enhancements
   */
  async rollbackProducts(): Promise<RollbackResult> {
    console.log('Rolling back products collection...');
    const collection = connection.collection('products');
    
    let processed = 0;
    let errors = 0;

    try {
      const products = await collection.find({}).toArray();
      
      for (const product of products) {
        try {
          const unsetFields: any = {};
          let needsUpdate = false;

          // Remove enhanced fields
          const fieldsToRemove = [
            'sku',
            'areaPincodes',
            'pricing',
            'inventory',
            'specifications',
            'totalOrders',
            'totalSales',
            'revenue',
            'tags',
            'searchKeywords',
            'metaDescription',
            'metaKeywords',
            'seoTitle',
          ];

          for (const field of fieldsToRemove) {
            if (product.hasOwnProperty(field)) {
              unsetFields[field] = '';
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            await collection.updateOne(
              { _id: product._id },
              { 
                $unset: unsetFields,
                $set: { updatedAt: new Date() }
              }
            );
          }
          processed++;
        } catch (error) {
          console.error(`Error rolling back product ${product._id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in product rollback:', error);
      errors++;
    }

    const result = { collection: 'products', processed, errors };
    this.results.push(result);
    console.log(`Products rollback completed: ${processed} processed, ${errors} errors`);
    return result;
  }

  /**
   * Remove wallet documents
   */
  async rollbackWallets(): Promise<RollbackResult> {
    console.log('Removing wallet documents...');
    const walletsCollection = connection.collection('wallets');
    const transactionsCollection = connection.collection('wallet_transactions');
    
    let processed = 0;
    let errors = 0;

    try {
      // Remove wallet transactions first
      const transactionResult = await transactionsCollection.deleteMany({});
      console.log(`Removed ${transactionResult.deletedCount || 0} wallet transactions`);

      // Remove wallets
      const walletResult = await walletsCollection.deleteMany({});
      processed = walletResult.deletedCount || 0;
    } catch (error) {
      console.error('Error removing wallet documents:', error);
      errors++;
    }

    const result = { collection: 'wallets', processed, errors };
    this.results.push(result);
    console.log(`Wallet rollback completed: ${processed} processed, ${errors} errors`);
    return result;
  }

  /**
   * Remove other new collections
   */
  async rollbackNewCollections(): Promise<RollbackResult> {
    console.log('Removing new collections...');
    
    let processed = 0;
    let errors = 0;

    const collectionsToRemove = [
      'vendor_stores',
      'vendor_areas',
      'order_items',
      'delivery_tasks',
      'ledger_entries',
      'payouts',
      'complaints',
      'complaint_responses',
    ];

    try {
      for (const collectionName of collectionsToRemove) {
        try {
          const collection = connection.collection(collectionName);
          const result = await collection.deleteMany({});
          console.log(`Removed ${result.deletedCount || 0} documents from ${collectionName}`);
          processed += result.deletedCount || 0;
        } catch (error) {
          console.error(`Error removing collection ${collectionName}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error removing new collections:', error);
      errors++;
    }

    const result = { collection: 'new_collections', processed, errors };
    this.results.push(result);
    console.log(`New collections rollback completed: ${processed} processed, ${errors} errors`);
    return result;
  }

  /**
   * Create backup before rollback
   */
  async createBackup(): Promise<void> {
    console.log('Creating backup before rollback...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupCollections = ['users', 'products', 'orders', 'subscriptions'];
    
    try {
      for (const collectionName of backupCollections) {
        const sourceCollection = connection.collection(collectionName);
        const backupCollection = connection.collection(`${collectionName}_backup_${timestamp}`);
        
        const documents = await sourceCollection.find({}).toArray();
        if (documents.length > 0) {
          await backupCollection.insertMany(documents);
          console.log(`Backed up ${documents.length} documents from ${collectionName}`);
        }
      }
      
      console.log(`Backup completed with timestamp: ${timestamp}`);
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Run all rollback operations
   */
  async runAllRollbacks(): Promise<void> {
    console.log('Starting database rollback...\n');
    
    try {
      await this.connect();
      
      // Confirm rollback
      const confirmed = await this.confirmRollback();
      if (!confirmed) {
        console.log('Rollback cancelled by user.');
        return;
      }
      
      // Create backup
      await this.createBackup();
      
      // Run rollbacks in reverse order
      await this.rollbackNewCollections();
      await this.rollbackWallets();
      await this.rollbackProducts();
      await this.rollbackAddresses();
      await this.rollbackUsers();
      
      // Print summary
      console.log('\n=== Rollback Summary ===');
      let totalProcessed = 0;
      let totalErrors = 0;
      
      for (const result of this.results) {
        console.log(`${result.collection}: ${result.processed} processed, ${result.errors} errors`);
        totalProcessed += result.processed;
        totalErrors += result.errors;
      }
      
      console.log(`\nTotal: ${totalProcessed} processed, ${totalErrors} errors`);
      
      if (totalErrors > 0) {
        console.log('\n⚠️  Rollback completed with errors. Please review the logs above.');
        process.exit(1);
      } else {
        console.log('\n✅ Rollback completed successfully!');
        console.log('💡 Backup collections have been created with timestamp suffix for recovery if needed.');
      }
      
    } catch (error) {
      console.error('Rollback failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run rollback if this script is executed directly
if (require.main === module) {
  const rollback = new DatabaseRollback();
  rollback.runAllRollbacks().catch(console.error);
}

export { DatabaseRollback };
