import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOptionsWhere, In, Not, IsNull } from 'typeorm';

import { Transfer, TransferType } from '../models/transfer.entity';
import { Equipment, EquipmentStatus } from '../models/equipment.entity';
import { User, UserRole } from '../models/user.entity';
import { AuditLog, AuditAction } from '../models/audit-log.entity';

export interface CreateTransferDto {
  equipmentId: string;
  fromUserId?: string | null;
  toUserId?: string | null;
  transferType?: TransferType;
  reason: string;
}

export interface TransferFilters {
  equipmentId?: string;
  fromUserId?: string;
  toUserId?: string;
  transferType?: TransferType;
  status?: 'pending' | 'completed' | 'cancelled';
  requiresConfirmation?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TransferConfirmationDto {
  confirmationType: 'fromUser' | 'toUser' | 'admin';
  notes?: string;
}

export interface CancelTransferDto {
  reason: string;
  adminOverride?: boolean;
}

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Transfer)
    private readonly transferRepository: Repository<Transfer>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create a new transfer with validation and automatic confirmation handling
   */
  async create(transferData: CreateTransferDto, initiator: User): Promise<Transfer> {
    // Only admins and team leads can initiate transfers
    if (initiator.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException('Only administrators and team leads can initiate equipment transfers');
    }

    // Validate equipment exists and is transferable
    const equipment = await this.validateEquipmentForTransfer(transferData.equipmentId);

    // Validate users
    const { fromUser, toUser } = await this.validateTransferUsers(
      transferData.fromUserId,
      transferData.toUserId
    );

    // Determine transfer type if not provided
    const transferType = transferData.transferType ||
      Transfer.determineTransferType(transferData.fromUserId, transferData.toUserId);

    // Validate transfer logic
    await this.validateTransferLogic(equipment, fromUser, toUser, transferType);

    // Create transfer
    const transfer = this.transferRepository.create({
      equipmentId: transferData.equipmentId,
      fromUserId: transferData.fromUserId,
      toUserId: transferData.toUserId,
      transferType,
      reason: transferData.reason,
      fromUserConfirmed: false,
      toUserConfirmed: false,
      adminConfirmed: false,
    });

    // Auto-confirm admin if initiator is admin
    if (initiator.role === UserRole.ADMIN) {
      transfer.adminConfirmed = true;
    }

    const savedTransfer = await this.transferRepository.save(transfer);

    // Update equipment status to pending
    await this.equipmentRepository.update(transferData.equipmentId, {
      status: EquipmentStatus.PENDING,
    });

    // Create audit log
    await this.createAuditLog(
      'transfer',
      savedTransfer.id,
      initiator.id,
      AuditAction.CREATE,
      null,
      {
        equipmentId: transferData.equipmentId,
        fromUserId: transferData.fromUserId,
        toUserId: transferData.toUserId,
        transferType,
        reason: transferData.reason,
        initiatedBy: initiator.id,
      }
    );

    // Check if transfer can be auto-completed
    await this.checkAndCompleteTransfer(savedTransfer.id);

    return this.findById(savedTransfer.id);
  }

  /**
   * Get all transfers with filtering and pagination
   */
  async findAll(
    filters: TransferFilters = {},
    pagination: PaginationOptions = {},
    currentUser: User
  ): Promise<PaginatedResult<Transfer>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    let whereConditions: FindOptionsWhere<Transfer> | FindOptionsWhere<Transfer>[] = {};

    // Role-based filtering
    if (currentUser.role === UserRole.EMPLOYEE) {
      // Employees see only transfers involving them
      whereConditions = [
        { fromUserId: currentUser.id },
        { toUserId: currentUser.id },
      ];
    }

    // Apply additional filters
    let queryBuilder = this.transferRepository
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.equipment', 'equipment')
      .leftJoinAndSelect('transfer.fromUser', 'fromUser')
      .leftJoinAndSelect('transfer.toUser', 'toUser')
      .orderBy('transfer.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (currentUser.role === UserRole.EMPLOYEE) {
      queryBuilder = queryBuilder.where(
        '(transfer.fromUserId = :userId OR transfer.toUserId = :userId)',
        { userId: currentUser.id }
      );
    }

    if (filters.equipmentId) {
      queryBuilder = queryBuilder.andWhere('transfer.equipmentId = :equipmentId', {
        equipmentId: filters.equipmentId,
      });
    }

    if (filters.fromUserId && currentUser.role !== UserRole.EMPLOYEE) {
      queryBuilder = queryBuilder.andWhere('transfer.fromUserId = :fromUserId', {
        fromUserId: filters.fromUserId,
      });
    }

    if (filters.toUserId && currentUser.role !== UserRole.EMPLOYEE) {
      queryBuilder = queryBuilder.andWhere('transfer.toUserId = :toUserId', {
        toUserId: filters.toUserId,
      });
    }

    if (filters.transferType) {
      queryBuilder = queryBuilder.andWhere('transfer.transferType = :transferType', {
        transferType: filters.transferType,
      });
    }

    if (filters.status) {
      switch (filters.status) {
        case 'pending':
          queryBuilder = queryBuilder.andWhere('transfer.transferredAt IS NULL');
          break;
        case 'completed':
          queryBuilder = queryBuilder.andWhere('transfer.transferredAt IS NOT NULL');
          break;
      }
    }

    if (filters.requiresConfirmation) {
      queryBuilder = queryBuilder.andWhere(
        '(transfer.fromUserId IS NOT NULL AND transfer.fromUserConfirmed = false) OR ' +
        '(transfer.toUserId IS NOT NULL AND transfer.toUserConfirmed = false) OR ' +
        'transfer.adminConfirmed = false'
      );
    }

    const [transfers, total] = await queryBuilder.getManyAndCount();

    return {
      items: transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get transfer by ID with all relations
   */
  async findById(id: string): Promise<Transfer> {
    const transfer = await this.transferRepository.findOne({
      where: { id },
      relations: [
        'equipment',
        'fromUser',
        'toUser',
      ],
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  /**
   * Confirm a transfer by user or admin
   */
  async confirmTransfer(
    id: string,
    confirmationData: TransferConfirmationDto,
    user: User
  ): Promise<Transfer> {
    const transfer = await this.findById(id);

    if (transfer.isCompleted) {
      throw new BadRequestException('Transfer is already completed');
    }

    // Validate user can confirm this transfer
    this.validateConfirmationPermission(transfer, confirmationData.confirmationType, user);

    const oldValues = {
      fromUserConfirmed: transfer.fromUserConfirmed,
      toUserConfirmed: transfer.toUserConfirmed,
      adminConfirmed: transfer.adminConfirmed,
    };

    // Apply confirmation
    switch (confirmationData.confirmationType) {
      case 'fromUser':
        if (transfer.fromUserConfirmed) {
          throw new BadRequestException('Transfer already confirmed by from user');
        }
        transfer.fromUserConfirmed = true;
        break;
      case 'toUser':
        if (transfer.toUserConfirmed) {
          throw new BadRequestException('Transfer already confirmed by to user');
        }
        transfer.toUserConfirmed = true;
        break;
      case 'admin':
        if (transfer.adminConfirmed) {
          throw new BadRequestException('Transfer already confirmed by admin');
        }
        transfer.adminConfirmed = true;
        break;
    }

    await this.transferRepository.save(transfer);

    // Create audit log for confirmation
    await this.createAuditLog(
      'transfer_confirmation',
      id,
      user.id,
      AuditAction.UPDATE,
      oldValues,
      {
        confirmationType: confirmationData.confirmationType,
        notes: confirmationData.notes,
        confirmedBy: user.id,
      }
    );

    // Check if transfer can be completed now
    await this.checkAndCompleteTransfer(id);

    return this.findById(id);
  }

  /**
   * Get transfer history for a specific equipment
   */
  async getTransferHistory(equipmentId: string, currentUser: User): Promise<Transfer[]> {
    // Validate equipment exists
    const equipment = await this.equipmentRepository.findOne({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    // Role-based access control
    if (currentUser.role === UserRole.EMPLOYEE) {
      // Employees can only see history for equipment they own or have owned
      const userTransfers = await this.transferRepository.find({
        where: [
          { equipmentId, fromUserId: currentUser.id },
          { equipmentId, toUserId: currentUser.id },
        ],
      });

      if (userTransfers.length === 0 && equipment.currentOwnerId !== currentUser.id) {
        throw new ForbiddenException('You can only view transfer history for equipment you own or have owned');
      }
    }

    return this.transferRepository.find({
      where: { equipmentId },
      relations: ['fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get pending transfers for a user
   */
  async getPendingTransfers(userId: string, currentUser: User): Promise<Transfer[]> {
    // Users can only see their own pending transfers unless they're admin/team lead
    if (currentUser.role === UserRole.EMPLOYEE && currentUser.id !== userId) {
      throw new ForbiddenException('You can only view your own pending transfers');
    }

    return this.transferRepository.find({
      where: [
        {
          fromUserId: userId,
          fromUserConfirmed: false,
          transferredAt: IsNull(),
        },
        {
          toUserId: userId,
          toUserConfirmed: false,
          transferredAt: IsNull(),
        },
      ],
      relations: ['equipment', 'fromUser', 'toUser'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Complete a transfer manually (admin override)
   */
  async completeTransfer(id: string, currentUser: User): Promise<Transfer> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can manually complete transfers');
    }

    const transfer = await this.findById(id);

    if (transfer.isCompleted) {
      throw new BadRequestException('Transfer is already completed');
    }

    // Force complete the transfer
    transfer.transferredAt = new Date();
    await this.transferRepository.save(transfer);

    // Update equipment ownership
    await this.updateEquipmentOwnership(transfer);

    // Create audit log
    await this.createAuditLog(
      'transfer_completion',
      id,
      currentUser.id,
      AuditAction.UPDATE,
      { transferredAt: null },
      {
        transferredAt: transfer.transferredAt,
        completedBy: currentUser.id,
        adminOverride: true,
      }
    );

    return this.findById(id);
  }

  /**
   * Cancel a pending transfer
   */
  async cancelTransfer(
    id: string,
    cancelData: CancelTransferDto,
    canceller: User
  ): Promise<Transfer> {
    const transfer = await this.findById(id);

    if (transfer.isCompleted) {
      throw new BadRequestException('Cannot cancel completed transfer');
    }

    // Check permission to cancel
    const canCancel =
      canceller.role === UserRole.ADMIN ||
      (canceller.role === UserRole.TEAM_LEAD && cancelData.adminOverride !== true) ||
      canceller.id === transfer.fromUserId ||
      canceller.id === transfer.toUserId;

    if (!canCancel) {
      throw new ForbiddenException('You do not have permission to cancel this transfer');
    }

    // Mark transfer as cancelled by setting all confirmations to false and adding cancellation reason
    transfer.fromUserConfirmed = false;
    transfer.toUserConfirmed = false;
    transfer.adminConfirmed = false;
    transfer.reason = `${transfer.reason} | CANCELLED: ${cancelData.reason}`;

    await this.transferRepository.save(transfer);

    // Restore equipment status
    await this.equipmentRepository.update(transfer.equipmentId, {
      status: transfer.fromUserId ? EquipmentStatus.ASSIGNED : EquipmentStatus.AVAILABLE,
    });

    // Create audit log
    await this.createAuditLog(
      'transfer_cancellation',
      id,
      canceller.id,
      AuditAction.UPDATE,
      { cancelled: false },
      {
        cancelled: true,
        cancellationReason: cancelData.reason,
        cancelledBy: canceller.id,
        adminOverride: cancelData.adminOverride || false,
      }
    );

    return this.findById(id);
  }

  /**
   * Private method to validate equipment for transfer
   */
  private async validateEquipmentForTransfer(equipmentId: string): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findOne({
      where: { id: equipmentId },
      relations: ['transfers'],
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    // Check if equipment is already in transfer process
    const pendingTransfer = await this.transferRepository.findOne({
      where: {
        equipmentId,
        transferredAt: IsNull(),
      },
    });

    if (pendingTransfer) {
      throw new ConflictException('Equipment already has a pending transfer');
    }

    // Check equipment status
    if (equipment.status === EquipmentStatus.BROKEN || equipment.status === EquipmentStatus.STOLEN) {
      throw new BadRequestException(`Cannot transfer equipment with status: ${equipment.status}`);
    }

    return equipment;
  }

  /**
   * Private method to validate users involved in transfer
   */
  private async validateTransferUsers(
    fromUserId: string | null,
    toUserId: string | null
  ): Promise<{ fromUser: User | null; toUser: User | null }> {
    let fromUser: User | null = null;
    let toUser: User | null = null;

    if (fromUserId) {
      fromUser = await this.userRepository.findOne({
        where: { id: fromUserId, isActive: true },
      });

      if (!fromUser) {
        throw new BadRequestException('From user not found or inactive');
      }
    }

    if (toUserId) {
      toUser = await this.userRepository.findOne({
        where: { id: toUserId, isActive: true },
      });

      if (!toUser) {
        throw new BadRequestException('To user not found or inactive');
      }
    }

    return { fromUser, toUser };
  }

  /**
   * Private method to validate transfer logic
   */
  private async validateTransferLogic(
    equipment: Equipment,
    fromUser: User | null,
    toUser: User | null,
    transferType: TransferType
  ): Promise<void> {
    switch (transferType) {
      case TransferType.ASSIGNMENT:
        if (fromUser !== null) {
          throw new BadRequestException('Assignment transfers must have fromUserId as null');
        }
        if (!toUser) {
          throw new BadRequestException('Assignment transfers must have a valid toUserId');
        }
        if (equipment.status !== EquipmentStatus.AVAILABLE) {
          throw new BadRequestException('Can only assign available equipment');
        }
        break;

      case TransferType.RETURN:
        if (!fromUser) {
          throw new BadRequestException('Return transfers must have a valid fromUserId');
        }
        if (toUser !== null) {
          throw new BadRequestException('Return transfers must have toUserId as null');
        }
        if (equipment.currentOwnerId !== fromUser.id) {
          throw new BadRequestException('From user must be the current owner for returns');
        }
        break;

      case TransferType.TRANSFER:
        if (!fromUser || !toUser) {
          throw new BadRequestException('Transfers must have both fromUserId and toUserId');
        }
        if (equipment.currentOwnerId !== fromUser.id) {
          throw new BadRequestException('From user must be the current owner for transfers');
        }
        break;

      case TransferType.DECOMMISSION:
        if (!fromUser) {
          throw new BadRequestException('Decommission transfers must have a valid fromUserId');
        }
        if (toUser !== null) {
          throw new BadRequestException('Decommission transfers must have toUserId as null');
        }
        if (equipment.currentOwnerId !== fromUser.id) {
          throw new BadRequestException('From user must be the current owner for decommission');
        }
        break;
    }
  }

  /**
   * Private method to validate confirmation permissions
   */
  private validateConfirmationPermission(
    transfer: Transfer,
    confirmationType: string,
    user: User
  ): void {
    switch (confirmationType) {
      case 'fromUser':
        if (!transfer.fromUserId) {
          throw new BadRequestException('No from user to confirm this transfer');
        }
        if (user.id !== transfer.fromUserId && user.role !== UserRole.ADMIN) {
          throw new ForbiddenException('Only the from user or admin can confirm as from user');
        }
        break;

      case 'toUser':
        if (!transfer.toUserId) {
          throw new BadRequestException('No to user to confirm this transfer');
        }
        if (user.id !== transfer.toUserId && user.role !== UserRole.ADMIN) {
          throw new ForbiddenException('Only the to user or admin can confirm as to user');
        }
        break;

      case 'admin':
        if (user.role !== UserRole.ADMIN) {
          throw new ForbiddenException('Only administrators can provide admin confirmation');
        }
        break;

      default:
        throw new BadRequestException('Invalid confirmation type');
    }
  }

  /**
   * Private method to check and complete transfer when all confirmations are received
   */
  private async checkAndCompleteTransfer(transferId: string): Promise<void> {
    const transfer = await this.findById(transferId);

    if (transfer.allConfirmationsReceived && !transfer.isCompleted) {
      transfer.transferredAt = new Date();
      await this.transferRepository.save(transfer);

      // Update equipment ownership and status
      await this.updateEquipmentOwnership(transfer);

      // Create completion audit log
      await this.createAuditLog(
        'transfer_auto_completion',
        transferId,
        'system',
        AuditAction.UPDATE,
        { transferredAt: null },
        {
          transferredAt: transfer.transferredAt,
          autoCompleted: true,
        }
      );
    }
  }

  /**
   * Private method to update equipment ownership after transfer completion
   */
  private async updateEquipmentOwnership(transfer: Transfer): Promise<void> {
    const updateData: Partial<Equipment> = {};

    switch (transfer.transferType) {
      case TransferType.ASSIGNMENT:
        updateData.currentOwnerId = transfer.toUserId;
        updateData.status = EquipmentStatus.ASSIGNED;
        break;

      case TransferType.RETURN:
        updateData.currentOwnerId = null;
        updateData.status = EquipmentStatus.AVAILABLE;
        break;

      case TransferType.TRANSFER:
        updateData.currentOwnerId = transfer.toUserId;
        updateData.status = EquipmentStatus.ASSIGNED;
        break;

      case TransferType.DECOMMISSION:
        updateData.currentOwnerId = null;
        updateData.status = EquipmentStatus.AVAILABLE; // Or could be a separate DECOMMISSIONED status
        break;
    }

    await this.equipmentRepository.update(transfer.equipmentId, updateData);

    // Create audit log for equipment update
    await this.createAuditLog(
      'equipment_ownership',
      transfer.equipmentId,
      'system',
      AuditAction.UPDATE,
      {
        currentOwnerId: transfer.transferType === TransferType.ASSIGNMENT ? null : transfer.fromUserId,
        status: EquipmentStatus.PENDING,
      },
      updateData
    );
  }

  /**
   * Private method to create audit logs
   */
  private async createAuditLog(
    entityType: string,
    entityId: string,
    userId: string,
    action: AuditAction,
    oldValues: any,
    newValues: any,
    metadata?: any
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      entityType,
      entityId,
      action,
      userId,
      oldValues,
      newValues,
      metadata,
    });

    await this.auditLogRepository.save(auditLog);
  }
}