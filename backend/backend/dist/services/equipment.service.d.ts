import { Repository } from 'typeorm';
import { Equipment, EquipmentType, EquipmentStatus, ClassificationTag, Condition } from '../models/equipment.entity';
import { User } from '../models/user.entity';
import { Transfer } from '../models/transfer.entity';
import { AuditLog } from '../models/audit-log.entity';
export interface CreateEquipmentDto {
    serialNumber: string;
    brand: string;
    model: string;
    type: EquipmentType;
    purchaseDate: Date;
    classificationTag: ClassificationTag;
    condition?: Condition;
    notes?: string;
}
export interface UpdateEquipmentDto {
    brand?: string;
    model?: string;
    status?: EquipmentStatus;
    condition?: Condition;
    notes?: string;
}
export interface EquipmentFilters {
    status?: EquipmentStatus;
    type?: EquipmentType;
    currentOwnerId?: string;
    classificationTag?: ClassificationTag;
    condition?: Condition;
    brand?: string;
    search?: string;
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
export interface EquipmentWithMobileOptimization extends Omit<Equipment, 'generateQRCode'> {
    mobileOptimized?: boolean;
    availableActions?: string[];
    canReportCondition?: boolean;
    scanLogged?: boolean;
    scanTimestamp?: Date;
    responseTime?: number;
}
export interface EquipmentStats {
    total: number;
    available: number;
    assigned: number;
    pending: number;
    broken: number;
    stolen: number;
    byType: Record<EquipmentType, number>;
    byCondition: Record<Condition, number>;
    byClassification: Record<ClassificationTag, number>;
}
export interface InitiateTransferDto {
    toUserId?: string | null;
    fromUserId?: string | null;
    reason: string;
}
export declare class EquipmentService {
    private readonly equipmentRepository;
    private readonly userRepository;
    private readonly transferRepository;
    private readonly auditLogRepository;
    constructor(equipmentRepository: Repository<Equipment>, userRepository: Repository<User>, transferRepository: Repository<Transfer>, auditLogRepository: Repository<AuditLog>);
    create(equipmentData: CreateEquipmentDto, currentUser: User): Promise<Equipment>;
    findAll(filters: EquipmentFilters, pagination: PaginationOptions, currentUser: User): Promise<PaginatedResult<Equipment>>;
    findById(id: string): Promise<Equipment>;
    findByQR(qrCode: string, currentUser: User, scanMetadata?: any): Promise<EquipmentWithMobileOptimization>;
    update(id: string, updateData: UpdateEquipmentDto, currentUser: User): Promise<Equipment>;
    updateCondition(id: string, condition: Condition, notes: string, currentUser: User): Promise<Equipment>;
    getTransferHistory(id: string, currentUser: User): Promise<Transfer[]>;
    initiateTransfer(equipmentId: string, transferData: InitiateTransferDto, currentUser: User): Promise<Transfer>;
    delete(id: string, currentUser: User): Promise<void>;
    regenerateQRCode(id: string, currentUser: User): Promise<Equipment>;
    getEquipmentStats(): Promise<EquipmentStats>;
    private generateQRCode;
    private validateStatusTransition;
    private createAuditLog;
}
