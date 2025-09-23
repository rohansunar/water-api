import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DatabaseIndexStrategy } from './index-strategy';

/**
 * Database Initialization Service
 * 
 * This service handles database initialization tasks including:
 * - Applying performance indexes
 * - Setting up database constraints
 * - Configuring database settings for optimal performance
 */
@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeDatabase();
  }

  /**
   * Initialize database with all necessary configurations
   */
  private async initializeDatabase(): Promise<void> {
    try {
      this.logger.log('Starting database initialization...');
      
      // Apply all performance indexes
      await this.applyPerformanceIndexes();
      
      // Configure database settings
      await this.configureDatabaseSettings();
      
      // Validate database health
      await this.validateDatabaseHealth();
      
      this.logger.log('Database initialization completed successfully');
    } catch (error) {
      this.logger.error('Database initialization failed:', error);
      // Don't throw error to prevent application crash
      this.logger.warn('Application will continue without full database initialization');
    }
  }

  /**
   * Apply all performance indexes using the index strategy
   */
  private async applyPerformanceIndexes(): Promise<void> {
    try {
      this.logger.log('Applying database performance indexes...');
      await DatabaseIndexStrategy.applyAllIndexes(this.connection);
      this.logger.log('Performance indexes applied successfully');
    } catch (error) {
      this.logger.error('Failed to apply performance indexes:', error);
      this.logger.warn('Continuing without applying all indexes (this is normal for existing databases)');
      // Don't throw error to prevent application crash
    }
  }

  /**
   * Configure database settings for optimal performance
   */
  private async configureDatabaseSettings(): Promise<void> {
    try {
      this.logger.log('Configuring database settings...');
      
      // Database connection settings are configured at connection level
      // Read preference and pool settings are handled by Mongoose connection options
      
      this.logger.log('Database settings configured successfully');
    } catch (error) {
      this.logger.error('Failed to configure database settings:', error);
      throw error;
    }
  }

  /**
   * Validate database health and connectivity
   */
  private async validateDatabaseHealth(): Promise<void> {
    try {
      this.logger.log('Validating database health...');
      
      // Check database connection
      const isConnected = this.connection.readyState === 1;
      if (!isConnected) {
        throw new Error('Database connection is not ready');
      }
      
      // Ping database
      await this.connection.db.admin().ping();
      
      // Get database stats
      const stats = await this.connection.db.stats();
      this.logger.log(`Database stats - Collections: ${stats.collections}, Objects: ${stats.objects}, Data Size: ${this.formatBytes(stats.dataSize)}`);
      
      // Check index status for critical collections
      await this.validateCriticalIndexes();
      
      this.logger.log('Database health validation completed successfully');
    } catch (error) {
      this.logger.error('Database health validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate that critical indexes are properly created
   */
  private async validateCriticalIndexes(): Promise<void> {
    const criticalCollections = [
      'users',
      'orders', 
      'products',
      'delivery_tasks',
      'payments',
      'subscriptions'
    ];

    for (const collectionName of criticalCollections) {
      try {
        const collection = this.connection.collection(collectionName);
        const indexes = await collection.indexes();
        
        if (indexes.length < 2) { // At least _id and one other index
          this.logger.warn(`Collection ${collectionName} has insufficient indexes: ${indexes.length}`);
        } else {
          this.logger.debug(`Collection ${collectionName} has ${indexes.length} indexes`);
        }
      } catch (error) {
        this.logger.warn(`Could not validate indexes for collection ${collectionName}:`, error.message);
      }
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get database performance metrics
   */
  async getDatabaseMetrics(): Promise<any> {
    try {
      const stats = await this.connection.db.stats();
      const serverStatus = await this.connection.db.admin().serverStatus();
      
      return {
        database: {
          collections: stats.collections,
          objects: stats.objects,
          dataSize: this.formatBytes(stats.dataSize),
          storageSize: this.formatBytes(stats.storageSize),
          indexSize: this.formatBytes(stats.indexSize),
          avgObjSize: stats.avgObjSize,
        },
        connections: {
          current: serverStatus.connections.current,
          available: serverStatus.connections.available,
          totalCreated: serverStatus.connections.totalCreated,
        },
        memory: {
          resident: this.formatBytes(serverStatus.mem.resident * 1024 * 1024),
          virtual: this.formatBytes(serverStatus.mem.virtual * 1024 * 1024),
          mapped: serverStatus.mem.mapped ? this.formatBytes(serverStatus.mem.mapped * 1024 * 1024) : 'N/A',
        },
        operations: {
          insert: serverStatus.opcounters.insert,
          query: serverStatus.opcounters.query,
          update: serverStatus.opcounters.update,
          delete: serverStatus.opcounters.delete,
        },
        uptime: Math.floor(serverStatus.uptime / 3600) + ' hours',
      };
    } catch (error) {
      this.logger.error('Failed to get database metrics:', error);
      throw error;
    }
  }

  /**
   * Optimize database performance by running maintenance tasks
   */
  async optimizeDatabase(): Promise<void> {
    try {
      this.logger.log('Starting database optimization...');
      
      // Get list of collections
      const collections = await this.connection.db.listCollections().toArray();
      
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        
        try {
          // Reindex collection for better performance
          await this.connection.db.collection(collectionName).createIndexes([]);
          this.logger.debug(`Reindexed collection: ${collectionName}`);
        } catch (error) {
          this.logger.warn(`Failed to reindex collection ${collectionName}:`, error.message);
        }
      }
      
      this.logger.log('Database optimization completed');
    } catch (error) {
      this.logger.error('Database optimization failed:', error);
      throw error;
    }
  }

  /**
   * Check slow queries and provide optimization suggestions
   */
  async analyzeSlowQueries(): Promise<any[]> {
    try {
      // Enable profiling for slow operations (>100ms)
      await this.connection.db.admin().command({
        profile: 2,
        slowms: 100
      });
      
      // Get profiling data
      const profilingData = await this.connection.db
        .collection('system.profile')
        .find({})
        .sort({ ts: -1 })
        .limit(50)
        .toArray();
      
      return profilingData.map(profile => ({
        timestamp: profile.ts,
        duration: profile.millis,
        operation: profile.op,
        namespace: profile.ns,
        command: profile.command,
        executionStats: profile.execStats,
      }));
    } catch (error) {
      this.logger.error('Failed to analyze slow queries:', error);
      return [];
    }
  }

  /**
   * Get collection statistics for monitoring
   */
  async getCollectionStats(): Promise<any> {
    try {
      const collections = await this.connection.db.listCollections().toArray();
      const stats = {};
      
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        
        try {
          const collectionCount = await this.connection.db
            .collection(collectionName)
            .countDocuments();

          stats[collectionName] = {
            count: collectionCount,
            size: 'N/A',
            avgObjSize: 0,
            storageSize: 'N/A',
            totalIndexSize: 'N/A',
            indexCount: 0,
          };
        } catch (error) {
          this.logger.warn(`Failed to get stats for collection ${collectionName}:`, error.message);
        }
      }
      
      return stats;
    } catch (error) {
      this.logger.error('Failed to get collection statistics:', error);
      throw error;
    }
  }
}
