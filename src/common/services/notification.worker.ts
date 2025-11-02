import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerBaseService } from './worker-base.service';
import { PrismaService } from '../database/prisma.service';

export interface NotificationData {
  type:
    | 'task_assigned'
    | 'task_updated'
    | 'delivery_reminder'
    | 'payment_reminder'
    | 'system_alert';
  recipientId: string;
  recipientType: 'rider' | 'customer' | 'vendor' | 'admin';
  title: string;
  message: string;
  metadata?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channels?: ('push' | 'sms' | 'email')[];
}

@Injectable()
export class NotificationWorker extends WorkerBaseService {
  constructor(
    private readonly prismaService: PrismaService,
  ) {
    super({
      queueName: 'notifications',
      concurrency: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  protected async processJob(job: Job<NotificationData>): Promise<any> {
    const {
      type,
      recipientId,
      recipientType,
      title,
      message,
      metadata,
      priority,
      channels,
    } = job.data;

    try {
      // Get recipient details
      const recipient = await this.getRecipientDetails(
        recipientId,
        recipientType,
      );
      if (!recipient) {
        this.logger.warn(`Recipient ${recipientId} not found`);
        return { success: false, reason: 'Recipient not found' };
      }

      // Determine notification channels
      const notificationChannels =
        channels || (await this.getPreferredChannels(recipient, type));

      // Send notifications via different channels
      const results = await Promise.allSettled(
        notificationChannels.map((channel) =>
          this.sendNotification(channel, recipient, title, message, metadata),
        ),
      );

      // Log notification for audit trail
      await this.logNotification(
        recipientId,
        recipientType,
        type,
        title,
        message,
        results,
      );

      // Cache notification for quick retrieval
      await this.cacheNotification(recipientId, type, title, message);

      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      this.logger.log(
        `Notification sent via ${successCount}/${notificationChannels.length} channels for ${recipientType} ${recipientId}`,
      );

      return {
        success: successCount > 0,
        channels: notificationChannels,
        successCount,
        totalCount: notificationChannels.length,
      };
    } catch (error) {
      this.logger.error(`Failed to process notification ${job.id}:`, error);
      throw error;
    }
  }

  private async getRecipientDetails(
    recipientId: string,
    recipientType: string,
  ): Promise<any> {
    switch (recipientType) {
      case 'rider':
        return await this.prismaService.rider.findUnique({
          where: { id: BigInt(recipientId) },
          include: { orders: { take: 1 } },
        });

      case 'customer':
        return await this.prismaService.customer.findUnique({
          where: { id: BigInt(recipientId) },
          include: { orders: { take: 1 } },
        });

      case 'vendor':
        return await this.prismaService.vendor.findUnique({
          where: { id: BigInt(recipientId) },
          include: { stores: { take: 1 } },
        });

      case 'admin':
        return await this.prismaService.admin.findUnique({
          where: { id: BigInt(recipientId) },
        });

      default:
        return null;
    }
  }

  private async getPreferredChannels(
    recipient: any,
    notificationType: string,
  ): Promise<string[]> {
    // Default channels based on notification type and recipient preferences
    const defaultChannels: Record<string, string[]> = {
      task_assigned: ['push'],
      task_updated: ['push'],
      delivery_reminder: ['push', 'sms'],
      payment_reminder: ['push', 'sms', 'email'],
      system_alert: ['push', 'email'],
    };

    const channels = defaultChannels[notificationType] || ['push'];

    // Add SMS for urgent notifications if phone is available
    if (notificationType.includes('reminder') && recipient.phone) {
      channels.push('sms');
    }

    return [...new Set(channels)]; // Remove duplicates
  }

  private async sendNotification(
    channel: string,
    recipient: any,
    title: string,
    message: string,
    metadata: any,
  ): Promise<boolean> {
    try {
      switch (channel) {
        case 'push':
          return await this.sendPushNotification(
            recipient,
            title,
            message,
            metadata,
          );

        case 'sms':
          return await this.sendSMS(recipient.phone, message);

        case 'email':
          return await this.sendEmail(
            recipient.email,
            title,
            message,
            metadata,
          );

        default:
          this.logger.warn(`Unknown notification channel: ${channel}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send ${channel} notification:`, error);
      return false;
    }
  }

  private async sendPushNotification(
    recipient: any,
    title: string,
    message: string,
    metadata: any,
  ): Promise<boolean> {
    // Integration with Firebase Cloud Messaging or similar service
    const payload = {
      token: recipient.fcmToken || recipient.deviceToken,
      notification: {
        title,
        body: message,
      },
      data: metadata || {},
    };

    // Mock implementation - in real app, integrate with FCM
    this.logger.debug(`Push notification payload:`, payload);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    return true;
  }

  private async sendSMS(phone: string, message: string): Promise<boolean> {
    // Integration with SMS service (Twilio, AWS SNS, etc.)
    const smsPayload = {
      to: phone,
      message,
    };

    // Mock implementation
    this.logger.debug(`SMS payload:`, smsPayload);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 200));

    return true;
  }

  private async sendEmail(
    email: string,
    title: string,
    message: string,
    metadata: any,
  ): Promise<boolean> {
    // Integration with email service (SendGrid, AWS SES, etc.)
    const emailPayload = {
      to: email,
      subject: title,
      html: `<h3>${title}</h3><p>${message}</p>`,
      metadata,
    };

    // Mock implementation
    this.logger.debug(`Email payload:`, emailPayload);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    return true;
  }

  private async logNotification(
    recipientId: string,
    recipientType: string,
    type: string,
    title: string,
    message: string,
    results: PromiseSettledResult<boolean>[],
  ): Promise<void> {
    // Log to database for audit trail
    await this.prismaService.$executeRaw`
      INSERT INTO notifications (recipient_id, recipient_type, type, title, message, status, created_at)
      VALUES (${recipientId}, ${recipientType}, ${type}, ${title}, ${message}, ${results.some((r) => r.status === 'fulfilled') ? 'sent' : 'failed'}, ${new Date()})
    `;
  }

  private async cacheNotification(
    recipientId: string,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    // Notification caching disabled since Redis is removed
    this.logger.debug(`Notification caching disabled for ${recipientId} - Redis removed`);
  }

  async getQueueMetrics(): Promise<any> {
    // Return inactive status since Redis is removed
    return { isActive: false, reason: 'Redis removed' };
  }
}
