import { Repository } from 'typeorm';
import { Transfer, TransferType } from '../models/transfer.entity';
import { Equipment } from '../models/equipment.entity';
import { User } from '../models/user.entity';
import { AuditLog } from '../models/audit-log.entity';
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
export declare class TransferService {
    private readonly transferRepository;
    private readonly equipmentRepository;
    private readonly userRepository;
    private readonly auditLogRepository;
    constructor(transferRepository: Repository<Transfer>, equipmentRepository: Repository<Equipment>, userRepository: Repository<User>, auditLogRepository: Repository<AuditLog>);
    create(transferData: CreateTransferDto, initiator: User): Promise<Transfer>;
    findAll(filters: TransferFilters, pagination: PaginationOptions, currentUser: User): Promise<PaginatedResult<Transfer>>;
    findById(id: string): Promise<Transfer>;
    confirmTransfer(id: string, confirmationData: TransferConfirmationDto, user: User): Promise<Transfer>;
    getTransferHistory(equipmentId: string, currentUser: User): Promise<Transfer[]>;
    getPendingTransfers(userId: string, currentUser: User): Promise<Transfer[]>;
    completeTransfer(id: string, currentUser: User): Promise<Transfer>;
    cancelTransfer(id: string, cancelData: CancelTransferDto, canceller: User): Promise<Transfer>;
    private validateEquipmentForTransfer;
    private validateTransferUsers;
    private validateTransferLogic;
    private validateConfirmationPermission;
    private checkAndCompleteTransfer;
    private updateEquipmentOwnership;
    private createAuditLog;
}
