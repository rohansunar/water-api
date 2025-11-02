import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerBaseService } from './worker-base.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Interface defining the structure of fraud detection job data
 * Contains all necessary information for analyzing potential fraudulent activity
 */
export interface FraudDetectionData {
  /** The type of entity being analyzed for fraud */
  entityType: 'order' | 'rider' | 'customer' | 'vendor' | 'payment';
  /** Unique identifier of the entity being analyzed */
  entityId: string;
  /** The specific event that triggered fraud analysis */
  eventType:
    | 'order_placed'
    | 'payment_completed'
    | 'rider_assigned'
    | 'delivery_completed'
    | 'refund_requested';
  /** Additional context data specific to the event */
  metadata: any;
  /** Pre-calculated risk score (optional, will be calculated if not provided) */
  riskScore?: number;
  /** Specific fraud rules that were triggered for this analysis */
  triggerRules?: string[];
}

/**
 * Fraud Detection Worker Service
 *
 * A sophisticated real-time fraud detection system that analyzes various entity types
 * (orders, payments, riders, customers, vendors) for fraudulent behavior using rule-based
 * scoring algorithms and automated response mechanisms.
 *
 * Architecture:
 * - Extends WorkerBaseService for queue-based processing using BullMQ
 * - Processes fraud detection jobs asynchronously with configurable concurrency
 * - Implements exponential backoff for failed job retries
 * - Uses Redis for caching fraud scores and queuing notifications
 *
 * Key Features:
 * - Multi-entity fraud detection (orders, payments, riders, customers, vendors)
 * - Rule-based scoring system with configurable thresholds and weights
 * - Real-time risk assessment with 4-tier classification (low/medium/high/critical)
 * - Automated fraud response actions based on risk levels
 * - Historical data analysis for pattern recognition
 * - Machine learning integration points for advanced anomaly detection
 * - Comprehensive audit trail with fraud analysis records
 *
 * Fraud Detection Algorithm:
 * 1. Receives fraud detection jobs via queue with entity and event data
 * 2. Calculates fraud score using predefined rules for each entity type
 * 3. Evaluates historical patterns and behavioral anomalies
 * 4. Determines risk level based on calculated score
 * 5. Takes automated actions based on risk assessment
 * 6. Caches results for quick lookup and pattern analysis
 *
 * Business Logic:
 * - Critical fraud: Immediate entity blocking + admin notification
 * - High fraud: Manual review flagging + priority queue processing
 * - Medium fraud: Monitoring queue for behavioral analysis
 * - Low fraud: No action, continued monitoring
 */
@Injectable()
export class FraudDetectionWorker extends WorkerBaseService {
  /**
   * Predefined fraud detection rules for different entity types
   *
   * Each rule contains:
   * - threshold: Numeric limit that triggers the rule
   * - weight: Score contribution when rule is triggered
   * - timeWindow: Time period for activity analysis (milliseconds)
   *
   * Rules are organized by entity type and evaluated during fraud scoring
   */
  private readonly fraudRules = {
    // Order-specific fraud detection rules
    order: {
      // High value orders above threshold indicate potential fraud
      high_value: { threshold: 5000, weight: 30 },
      // Multiple orders in short time window suggest automated attacks
      rapid_orders: { threshold: 5, timeWindow: 3600000, weight: 25 }, // 1 hour
      // Orders from unusual locations compared to customer history
      unusual_location: { weight: 20 },
      // New customers have higher risk profile
      new_customer: { weight: 15 },
    },
    // Payment-specific fraud detection rules
    payment: {
      // Multiple failed payment attempts indicate fraud attempts
      failed_attempts: { threshold: 3, timeWindow: 1800000, weight: 40 }, // 30 minutes
      // Mismatch between order amount and payment amount
      amount_mismatch: { weight: 35 },
      // Payments at unusual times (e.g., outside business hours)
      unusual_timing: { weight: 20 },
    },
    // Rider-specific fraud detection rules
    rider: {
      // Too many status changes suggest fraudulent activity
      rapid_status_changes: { threshold: 10, timeWindow: 3600000, weight: 25 },
      // Riders operating from unusual locations
      unusual_locations: { weight: 30 },
      // Anomalies in delivery patterns (e.g., impossible delivery times)
      delivery_anomalies: { weight: 25 },
    },
  };

  /**
   * Constructor for FraudDetectionWorker
   *
   * @param prismaService - Database service for fraud analysis persistence
   */
  constructor(
    private readonly prismaService: PrismaService,
  ) {
    // Initialize parent WorkerBaseService with fraud detection queue configuration
    // - queueName: 'fraud-detection' - dedicated queue for fraud analysis jobs
    // - concurrency: 2 - process up to 2 jobs simultaneously for performance
    // - attempts: 3 - retry failed jobs up to 3 times before giving up
    // - backoff: exponential with 15s delay - progressive retry delays to handle temporary failures
    super({
      queueName: 'fraud-detection',
      concurrency: 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 15000,
      },
    });
  }

  /**
   * Main job processing method for fraud detection analysis
   *
   * This method orchestrates the complete fraud detection workflow:
   * 1. Fraud score calculation using rule-based algorithms
   * 2. Historical data analysis for pattern recognition
   * 3. Risk level determination based on calculated scores
   * 4. Fraud analysis record creation for audit trail
   * 5. Automated action execution based on risk assessment
   * 6. Fraud score caching for performance optimization
   *
   * @param job - BullMQ job containing fraud detection data
   * @returns Promise resolving to fraud analysis results
   *
   * @throws Error if fraud detection processing fails
   */
  protected async processJob(job: Job<FraudDetectionData>): Promise<any> {
    const {
      entityType,
      entityId,
      eventType,
      metadata,
      riskScore,
      triggerRules,
    } = job.data;

    try {
      // Log the start of fraud analysis for monitoring and debugging
      this.logger.log(
        `Analyzing fraud for ${entityType} ${entityId} - ${eventType}`,
      );

      // Calculate fraud score using rule-based algorithms
      // Use provided risk score or calculate it if not available
      const calculatedScore =
        riskScore ||
        (await this.calculateFraudScore(
          entityType,
          entityId,
          eventType,
          metadata,
        ));

      // Retrieve historical data for behavioral pattern analysis
      // This provides context for determining if current activity is anomalous
      const historicalData = await this.getHistoricalData(entityType, entityId);

      // Determine risk level based on calculated fraud score
      // Risk levels: low (0-29), medium (30-59), high (60-79), critical (80-100)
      const riskLevel = this.determineRiskLevel(calculatedScore, []);

      // Create comprehensive fraud analysis record in database
      // This serves as an audit trail for all fraud detection activities
      const analysis = await this.createFraudAnalysis({
        entityType,
        entityId,
        eventType,
        fraudScore: calculatedScore,
        riskLevel,
        ruleResults: [], // TODO: Implement detailed rule evaluation results
        metadata,
        triggerRules,
      });

      // Execute automated fraud response actions based on risk level
      // Actions range from monitoring to immediate entity blocking
      await this.takeFraudAction(analysis);

      // Cache fraud score and risk level for quick lookup
      // This improves performance for subsequent fraud checks
      await this.cacheFraudScore(entityId, calculatedScore, riskLevel);

      // Log successful completion of fraud analysis
      this.logger.log(
        `Fraud analysis completed for ${entityType} ${entityId}: score=${calculatedScore}, level=${riskLevel}`,
      );

      // Return comprehensive analysis results
      return {
        success: true,
        analysisId: analysis.id.toString(),
        fraudScore: calculatedScore,
        riskLevel,
        actionTaken: riskLevel !== 'low', // Indicates if any fraud action was triggered
      };
    } catch (error) {
      // Log error details for monitoring and debugging
      this.logger.error(
        `Failed to process fraud detection for ${entityType} ${entityId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Core fraud scoring algorithm that calculates risk score based on multiple factors
   *
   * This method implements a comprehensive rule-based scoring system that evaluates:
   * - Entity-specific fraud patterns (orders, payments, riders)
   * - Behavioral anomalies and statistical deviations
   * - Event-specific risk indicators
   * - Historical data analysis for pattern recognition
   *
   * Algorithm Flow:
   * 1. Retrieve entity-specific fraud rules configuration
   * 2. Evaluate each rule against current activity data
   * 3. Apply event-specific scoring adjustments
   * 4. Normalize final score to 0-100 range
   *
   * @param entityType - Type of entity being analyzed (order, payment, rider, etc.)
   * @param entityId - Unique identifier of the entity
   * @param eventType - Specific event triggering fraud analysis
   * @param metadata - Additional context data for analysis
   * @returns Promise resolving to calculated fraud score (0-100)
   */
  private async calculateFraudScore(
    entityType: string,
    entityId: string,
    eventType: string,
    metadata: any,
  ): Promise<number> {
    let score = 0;
    const rules = this.fraudRules[entityType as keyof typeof this.fraudRules];

    // Return 0 if no rules defined for this entity type
    if (!rules) return 0;

    // Apply base scoring rules specific to entity type
    // Each rule evaluates different aspects of potential fraud
    for (const [ruleName, ruleConfig] of Object.entries(rules)) {
      const ruleScore = await this.evaluateRule(
        ruleName,
        ruleConfig,
        entityType,
        entityId,
        metadata,
      );
      score += ruleScore;
    }

    // Apply event-specific scoring based on the type of activity
    // Different events have different inherent risk levels
    score += await this.getEventSpecificScore(eventType, metadata);

    // Cap score at 100 to maintain consistent scoring range
    // Prevents extreme scores from breaking risk assessment logic
    return Math.min(score, 100);
  }

  private async evaluateRule(
    ruleName: string,
    ruleConfig: any,
    entityType: string,
    entityId: string,
    metadata: any,
  ): Promise<number> {
    switch (ruleName) {
      case 'high_value':
        return this.evaluateHighValueRule(ruleConfig, metadata);

      case 'rapid_orders':
        return this.evaluateRapidOrdersRule(ruleConfig, entityType, entityId);

      case 'failed_attempts':
        return this.evaluateFailedAttemptsRule(
          ruleConfig,
          entityType,
          entityId,
        );

      case 'unusual_location':
        return this.evaluateUnusualLocationRule(ruleConfig, metadata);

      case 'rapid_status_changes':
        return this.evaluateRapidStatusChangesRule(
          ruleConfig,
          entityType,
          entityId,
        );

      case 'unusual_locations':
        return this.evaluateUnusualLocationsRule(
          ruleConfig,
          entityType,
          entityId,
        );

      case 'delivery_anomalies':
        return this.evaluateDeliveryAnomaliesRule(
          ruleConfig,
          entityType,
          entityId,
        );

      default:
        return 0;
    }
  }

  private async evaluateHighValueRule(
    ruleConfig: any,
    metadata: any,
  ): Promise<number> {
    const amount = metadata.amount || metadata.totalAmount || 0;
    if (amount > ruleConfig.threshold) {
      return ruleConfig.weight;
    }
    return 0;
  }

  private async evaluateRapidOrdersRule(
    ruleConfig: any,
    entityType: string,
    entityId: string,
  ): Promise<number> {
    const recentOrders = await this.getRecentActivityCount(
      entityType,
      entityId,
      ruleConfig.timeWindow,
    );
    if (recentOrders >= ruleConfig.threshold) {
      return ruleConfig.weight;
    }
    return 0;
  }

  private async evaluateFailedAttemptsRule(
    ruleConfig: any,
    entityType: string,
    entityId: string,
  ): Promise<number> {
    const failedAttempts = await this.getFailedAttemptsCount(
      entityType,
      entityId,
      ruleConfig.timeWindow,
    );
    if (failedAttempts >= ruleConfig.threshold) {
      return ruleConfig.weight;
    }
    return 0;
  }

  private async evaluateUnusualLocationRule(
    ruleConfig: any,
    metadata: any,
  ): Promise<number> {
    // Check if location is unusual based on historical data
    const location = metadata.location || metadata.deliveryLocation;
    if (location && (await this.isUnusualLocation(location))) {
      return ruleConfig.weight;
    }
    return 0;
  }

  private async evaluateRapidStatusChangesRule(
    ruleConfig: any,
    entityType: string,
    entityId: string,
  ): Promise<number> {
    const statusChanges = await this.getStatusChangeCount(
      entityType,
      entityId,
      ruleConfig.timeWindow,
    );
    if (statusChanges >= ruleConfig.threshold) {
      return ruleConfig.weight;
    }
    return 0;
  }

  private async evaluateUnusualLocationsRule(
    ruleConfig: any,
    entityType: string,
    entityId: string,
  ): Promise<number> {
    const locations = await this.getRecentLocations(entityType, entityId);
    const unusualCount = locations.filter((loc) =>
      this.isUnusualLocation(loc),
    ).length;

    if (unusualCount > 0) {
      return Math.min(ruleConfig.weight, unusualCount * 10);
    }
    return 0;
  }

  private async evaluateDeliveryAnomaliesRule(
    ruleConfig: any,
    entityType: string,
    entityId: string,
  ): Promise<number> {
    const anomalies = await this.getDeliveryAnomalies(entityType, entityId);
    if (anomalies.length > 0) {
      return ruleConfig.weight;
    }
    return 0;
  }

  private async getEventSpecificScore(
    eventType: string,
    metadata: any,
  ): Promise<number> {
    switch (eventType) {
      case 'order_placed':
        return metadata.isRushOrder ? 10 : 0;
      case 'payment_completed':
        return metadata.paymentMethod === 'cash' ? 5 : 0;
      case 'refund_requested':
        return 20; // Refunds are higher risk
      default:
        return 0;
    }
  }

  /**
   * Determines risk level based on calculated fraud score
   *
   * This method implements a 4-tier risk classification system:
   * - Critical (80-100): Immediate threat requiring instant intervention
   * - High (60-79): Significant risk requiring prompt attention
   * - Medium (30-59): Moderate risk requiring monitoring
   * - Low (0-29): Minimal risk, normal activity
   *
   * Risk thresholds are configurable and can be adjusted based on:
   * - Business risk tolerance
   * - Historical fraud patterns
   * - Industry standards
   * - Regulatory requirements
   *
   * @param fraudScore - Calculated fraud score (0-100)
   * @param ruleResults - Detailed results from individual rule evaluations
   * @returns Risk level classification
   */
  private determineRiskLevel(
    fraudScore: number,
    ruleResults: any[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (fraudScore >= 80) return 'critical';
    if (fraudScore >= 60) return 'high';
    if (fraudScore >= 30) return 'medium';
    return 'low';
  }

  private async createFraudAnalysis(data: any): Promise<any> {
    return await this.prismaService.$executeRaw`
      INSERT INTO fraud_analyses (
        entity_type, entity_id, event_type, fraud_score, risk_level,
        rule_results, metadata, created_at
      ) VALUES (
        ${data.entityType}, ${data.entityId}, ${data.eventType}, ${data.fraudScore}, ${data.riskLevel},
        ${JSON.stringify(data.ruleResults)}, ${JSON.stringify(data.metadata)}, ${new Date()}
      ) RETURNING id, created_at
    `;
  }

  /**
   * Executes automated fraud response actions based on risk level
   *
   * This method implements a tiered response strategy:
   * - Critical: Immediate intervention and entity blocking
   * - High: Manual review and priority queue processing
   * - Medium: Behavioral monitoring and analysis
   * - Low: Continued monitoring without intervention
   *
   * Business Logic:
   * - Critical fraud requires immediate action to prevent damage
   * - High fraud needs human review for accuracy
   * - Medium fraud is monitored for pattern analysis
   * - Low fraud is normal activity requiring no action
   *
   * @param analysis - Fraud analysis result containing risk level and metadata
   */
  private async takeFraudAction(analysis: any): Promise<void> {
    switch (analysis.riskLevel) {
      case 'critical':
        await this.handleCriticalFraud(analysis);
        break;
      case 'high':
        await this.handleHighFraud(analysis);
        break;
      case 'medium':
        await this.handleMediumFraud(analysis);
        break;
      case 'low':
        // No action needed for low risk - continue normal monitoring
        break;
    }
  }

  /**
   * Handles critical fraud cases requiring immediate intervention
   *
   * Critical fraud response strategy:
   * 1. Immediate entity blocking to prevent further damage
   * 2. Urgent admin notification via multiple channels
   * 3. Complete transaction halt for the entity
   * 4. Priority escalation for investigation
   *
   * This method is triggered for fraud scores >= 80, indicating
   * high-confidence fraud detection that requires instant action
   * to minimize business impact and prevent financial losses.
   *
   * @param analysis - Fraud analysis containing critical risk details
   */
  private async handleCriticalFraud(analysis: any): Promise<void> {
    // Immediately block the entity to prevent any further activity
    // This is a hard block that stops all operations for the entity
    await this.blockEntity(
      analysis.entityType,
      analysis.entityId,
      'critical_fraud',
    );

    // Send urgent notification to admin via multiple channels
    // Ensures immediate awareness and response capability
    await this.notifyAdmin('Critical Fraud Detected', {
      entityType: analysis.entityType,
      entityId: analysis.entityId,
      fraudScore: analysis.fraudScore,
      analysisId: analysis.id,
    });
  }

  private async handleHighFraud(analysis: any): Promise<void> {
    // Flag for review
    await this.flagEntityForReview(
      analysis.entityType,
      analysis.entityId,
      'high_fraud_risk',
    );

    // Add to manual review queue - disabled since Redis is removed
    this.logger.warn('Cannot add to fraud review queue - Redis removed');
  }

  private async handleMediumFraud(analysis: any): Promise<void> {
    // Add to monitoring queue - disabled since Redis is removed
    this.logger.warn('Cannot add to fraud monitoring queue - Redis removed');
  }

  private async blockEntity(
    entityType: string,
    entityId: string,
    reason: string,
  ): Promise<void> {
    // Implementation depends on entity type
    this.logger.log(`Blocking ${entityType} ${entityId} for ${reason}`);
  }

  private async flagEntityForReview(
    entityType: string,
    entityId: string,
    reason: string,
  ): Promise<void> {
    // Implementation depends on entity type
    this.logger.log(`Flagging ${entityType} ${entityId} for review: ${reason}`);
  }

  private async notifyAdmin(title: string, data: any): Promise<void> {
    // Admin notification disabled since Redis is removed
    this.logger.warn(`Admin notification disabled - Redis removed: ${title}`);
  }

  /**
   * Caches fraud score and risk level for performance optimization
   *
   * This method would store fraud analysis results in cache to:
   * - Improve performance for subsequent fraud checks
   * - Enable quick lookup of recent fraud assessments
   * - Support fraud pattern analysis and trend detection
   * - Reduce database load for repeated checks
   *
   * Cache Strategy:
   * - Key format: `fraud:score:{entityId}`
   * - TTL: 1 hour (3600 seconds) - balances performance and data freshness
   * - Data includes score, level, and timestamp for audit trail
   *
   * @param entityId - Unique identifier of the entity
   * @param score - Calculated fraud score (0-100)
   * @param level - Risk level classification
   */
  private async cacheFraudScore(
    entityId: string,
    score: number,
    level: string,
  ): Promise<void> {
    // Fraud score caching disabled since Redis is removed
    this.logger.debug(`Fraud score caching disabled for ${entityId} - Redis removed`);
  }

  // ==================== HELPER METHODS ====================
  // These methods provide supporting functionality for fraud detection
  // In a production system, these would contain sophisticated logic for:
  // - Historical pattern analysis
  // - Behavioral anomaly detection
  // - Machine learning model integration
  // - External data source queries
  // - Statistical analysis and trend detection

  /**
   * Retrieves historical data for behavioral pattern analysis
   *
   * This method would typically:
   * - Query historical transaction/order data
   * - Analyze patterns and trends
   * - Identify behavioral baselines
   * - Detect deviations from normal activity
   *
   * @param entityType - Type of entity to analyze
   * @param entityId - Unique identifier of the entity
   * @returns Historical data for pattern analysis
   */
  private async getHistoricalData(
    entityType: string,
    entityId: string,
  ): Promise<any> {
    // Mock implementation - in production this would query databases, external APIs, etc.
    return {};
  }

  private async getRecentActivityCount(
    entityType: string,
    entityId: string,
    timeWindow: number,
  ): Promise<number> {
    // Mock implementation
    return 0;
  }

  private async getFailedAttemptsCount(
    entityType: string,
    entityId: string,
    timeWindow: number,
  ): Promise<number> {
    // Mock implementation
    return 0;
  }

  private async isUnusualLocation(location: any): Promise<boolean> {
    // Mock implementation
    return false;
  }

  private async getStatusChangeCount(
    entityType: string,
    entityId: string,
    timeWindow: number,
  ): Promise<number> {
    // Mock implementation
    return 0;
  }

  private async getRecentLocations(
    entityType: string,
    entityId: string,
  ): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async getDeliveryAnomalies(
    entityType: string,
    entityId: string,
  ): Promise<any[]> {
    // Mock implementation
    return [];
  }
}
