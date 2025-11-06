import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'crypto';

export enum TaskStatus {
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface TaskTransition {
  from: TaskStatus;
  to: TaskStatus;
  allowed: boolean;
  requiresValidation?: boolean;
}

export interface TaskAssignmentRequest {
  taskId: bigint;
  riderId: bigint;
  assignedBy: string; // admin or system
}

export interface TaskStateUpdate {
  taskId: bigint;
  riderId: bigint;
  newStatus: TaskStatus;
  metadata?: Record<string, any>;
  proofPhotoUrl?: string;
  failureReason?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

@Injectable()
export class TaskStateMachineService {
  private readonly logger = new Logger(TaskStateMachineService.name);
  private readonly lockPrefix = 'task_lock:';
  private readonly lockTimeout = 30000; // 30 seconds
  private readonly maxRetries = 3;

  // Define valid state transitions
  private readonly transitions: Record<TaskStatus, TaskTransition[]> = {
    [TaskStatus.ASSIGNED]: [
      { from: TaskStatus.ASSIGNED, to: TaskStatus.ACCEPTED, allowed: true },
      { from: TaskStatus.ASSIGNED, to: TaskStatus.CANCELLED, allowed: true },
    ],
    [TaskStatus.ACCEPTED]: [
      { from: TaskStatus.ACCEPTED, to: TaskStatus.PICKED_UP, allowed: true },
      { from: TaskStatus.ACCEPTED, to: TaskStatus.FAILED, allowed: true },
      { from: TaskStatus.ACCEPTED, to: TaskStatus.CANCELLED, allowed: true },
    ],
    [TaskStatus.PICKED_UP]: [
      { from: TaskStatus.PICKED_UP, to: TaskStatus.DELIVERED, allowed: true },
      { from: TaskStatus.PICKED_UP, to: TaskStatus.FAILED, allowed: true },
    ],
    [TaskStatus.DELIVERED]: [
      // Terminal state - no transitions allowed
    ],
    [TaskStatus.FAILED]: [
      // Terminal state - no transitions allowed
    ],
    [TaskStatus.CANCELLED]: [
      // Terminal state - no transitions allowed
    ],
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign a task to a rider with distributed locking
   */
  async assignTask(
    request: TaskAssignmentRequest,
  ): Promise<{ success: boolean; message: string }> {
    const lockKey = `${this.lockPrefix}${request.taskId}`;
    const lockValue = this.generateLockValue();

    try {
      // Acquire distributed lock
      const lockAcquired = await this.acquireLock(
        lockKey,
        lockValue,
        this.lockTimeout,
      );
      if (!lockAcquired) {
        throw new ConflictException(
          'Task is currently being processed by another operation',
        );
      }

      // Validate and assign task
      await this.validateAndAssignTask(request);

      return {
        success: true,
        message: 'Task assigned successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to assign task ${request.taskId}:`, error);
      throw error;
    } finally {
      // Release lock
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Update task state with validation and distributed locking
   */
  async updateTaskState(
    update: TaskStateUpdate,
  ): Promise<{ success: boolean; message: string }> {
    const lockKey = `${this.lockPrefix}${update.taskId}`;
    const lockValue = this.generateLockValue();

    try {
      // Acquire distributed lock
      const lockAcquired = await this.acquireLock(
        lockKey,
        lockValue,
        this.lockTimeout,
      );
      if (!lockAcquired) {
        throw new ConflictException(
          'Task is currently being processed by another operation',
        );
      }

      // Find and validate task
      const task = await this.prisma.deliveryTask.findUnique({
        where: { id: update.taskId },
        include: {
          rider: true,
          order: true,
        },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // Validate rider permission
      if (task.riderId !== update.riderId) {
        throw new BadRequestException(
          'Rider does not have permission to update this task',
        );
      }

      // Validate state transition
      const transition = this.validateTransition(
        task.status as TaskStatus,
        update.newStatus,
      );
      if (!transition.allowed) {
        throw new BadRequestException(
          `Invalid state transition from ${task.status} to ${update.newStatus}`,
        );
      }

      // Prepare update data
      const updateData: any = {
        status: update.newStatus,
        updatedAt: new Date(),
      };

      // Add status-specific fields
      switch (update.newStatus) {
        case TaskStatus.ACCEPTED:
          updateData.acceptedAt = new Date();
          break;
        case TaskStatus.PICKED_UP:
          updateData.pickedUpAt = new Date();
          updateData.actualPickup = new Date();
          if (update.proofPhotoUrl) {
            updateData.proofPhotoUrl = update.proofPhotoUrl;
          }
          break;
        case TaskStatus.DELIVERED:
          updateData.deliveredAt = new Date();
          updateData.actualDelivery = new Date();
          break;
        case TaskStatus.FAILED:
          updateData.failedAt = new Date();
          if (update.failureReason) {
            updateData.failureReason = update.failureReason;
          }
          break;
      }

      // Add location if provided
      if (update.location) {
        updateData.pickupLocation = update.location;
        updateData.deliveryLocation = update.location;
      }

      // Update task
      const updatedTask = await this.prisma.deliveryTask.update({
        where: { id: update.taskId },
        data: updateData,
        include: {
          rider: true,
          order: true,
        },
      });

      // Create delivery event
      await this.createDeliveryEvent(
        update.taskId,
        `task_${update.newStatus.toLowerCase()}`,
        {
          riderId: update.riderId,
          metadata: update.metadata,
          location: update.location,
        },
      );

      this.logger.log(
        `Task ${update.taskId} status updated to ${update.newStatus} by rider ${update.riderId}`,
      );

      return {
        success: true,
        message: `Task status updated to ${update.newStatus}`,
      };
    } catch (error) {
      this.logger.error(`Failed to update task ${update.taskId} state:`, error);
      throw error;
    } finally {
      // Release lock
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Get available tasks for a rider
   */
  async getAvailableTasks(riderId: bigint, limit: number = 10): Promise<any[]> {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider || !rider.isActive) {
      throw new BadRequestException('Rider not found or inactive');
    }

    // Get tasks that can be assigned to this rider
    const tasks = await this.prisma.deliveryTask.findMany({
      where: {
        status: TaskStatus.ASSIGNED,
        riderId: null, // Unassigned tasks
        // Add location-based filtering logic here
      },
      include: {
        order: true,
        vendor: true,
        store: true,
        customer: true,
      },
      orderBy: [{ priority: 'desc' }, { scheduledPickup: 'asc' }],
      take: limit,
    });

    return tasks;
  }

  /**
   * Get rider's active tasks
   */
  async getRiderTasks(riderId: bigint, status?: TaskStatus): Promise<any[]> {
    const whereClause: any = { riderId };

    if (status) {
      whereClause.status = status;
    } else {
      // Get active tasks (not terminal states)
      whereClause.status = {
        in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.PICKED_UP],
      };
    }

    const tasks = await this.prisma.deliveryTask.findMany({
      where: whereClause,
      include: {
        order: true,
        vendor: true,
        store: true,
        customer: true,
      },
      orderBy: { scheduledPickup: 'asc' },
    });

    return tasks;
  }

  /**
   * Validate and assign task
   */
  private async validateAndAssignTask(
    request: TaskAssignmentRequest,
  ): Promise<void> {
    // Find and validate task
    const task = await this.prisma.deliveryTask.findUnique({
      where: { id: request.taskId },
      include: {
        rider: true,
        order: true,
        vendor: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.riderId) {
      throw new ConflictException('Task is already assigned to a rider');
    }

    if (task.status !== TaskStatus.ASSIGNED) {
      throw new BadRequestException(
        `Task cannot be assigned in status: ${task.status}`,
      );
    }

    // Check rider availability
    const rider = await this.prisma.rider.findUnique({
      where: { id: request.riderId },
    });

    if (!rider || !rider.isActive) {
      throw new BadRequestException('Rider not found or inactive');
    }

    // Update task assignment
    const updatedTask = await this.prisma.deliveryTask.update({
      where: { id: request.taskId },
      data: {
        riderId: request.riderId,
        assignedAt: new Date(),
        status: TaskStatus.ASSIGNED,
      },
      include: {
        rider: true,
        order: true,
        vendor: true,
      },
    });

    // Log the assignment
    this.logger.log(
      `Task ${request.taskId} assigned to rider ${request.riderId} by ${request.assignedBy}`,
    );

    // Create delivery event
    await this.createDeliveryEvent(request.taskId, 'task_assigned', {
      riderId: request.riderId,
      assignedBy: request.assignedBy,
    });
  }

  /**
   * Validate state transition
   */
  private validateTransition(from: TaskStatus, to: TaskStatus): TaskTransition {
    const validTransitions = this.transitions[from] || [];
    return (
      validTransitions.find((t) => t.to === to) || { from, to, allowed: false }
    );
  }

  /**
   * Create delivery event
   */
  private async createDeliveryEvent(
    taskId: bigint,
    eventType: string,
    eventData: any,
  ): Promise<void> {
    await this.prisma.deliveryEvent.create({
      data: {
        taskId,
        eventType,
        eventData,
        createdAt: new Date(),
      },
    });
  }

  /**
   * Acquire distributed lock - disabled since Redis is removed
   */
  private async acquireLock(
    lockKey: string,
    lockValue: string,
    timeout: number,
  ): Promise<boolean> {
    // Redis not available, cannot acquire lock
    this.logger.warn('Cannot acquire distributed lock - Redis removed');
    return true; // Allow operation to proceed without locking
  }

  /**
   * Release distributed lock - disabled since Redis is removed
   */
  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    // Redis not available, no lock to release
    this.logger.debug('Cannot release distributed lock - Redis removed');
  }

  /**
   * Generate unique lock value
   */
  private generateLockValue(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get task statistics
   */
  async getTaskStats(riderId?: bigint): Promise<any> {
    const whereClause: any = {};

    if (riderId) {
      whereClause.riderId = riderId;
    }

    const [
      totalTasks,
      assignedTasks,
      acceptedTasks,
      pickedUpTasks,
      deliveredTasks,
      failedTasks,
    ] = await Promise.all([
      this.prisma.deliveryTask.count({ where: whereClause }),
      this.prisma.deliveryTask.count({
        where: { ...whereClause, status: TaskStatus.ASSIGNED },
      }),
      this.prisma.deliveryTask.count({
        where: { ...whereClause, status: TaskStatus.ACCEPTED },
      }),
      this.prisma.deliveryTask.count({
        where: { ...whereClause, status: TaskStatus.PICKED_UP },
      }),
      this.prisma.deliveryTask.count({
        where: { ...whereClause, status: TaskStatus.DELIVERED },
      }),
      this.prisma.deliveryTask.count({
        where: { ...whereClause, status: TaskStatus.FAILED },
      }),
    ]);

    return {
      total: totalTasks,
      assigned: assignedTasks,
      accepted: acceptedTasks,
      pickedUp: pickedUpTasks,
      delivered: deliveredTasks,
      failed: failedTasks,
      completionRate: totalTasks > 0 ? (deliveredTasks / totalTasks) * 100 : 0,
    };
  }
}
