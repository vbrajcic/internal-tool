import { Repository } from 'typeorm';
import { Request, RequestStatus, Decision } from '../models/request.entity';
import { User, UserRole } from '../models/user.entity';
import { Team } from '../models/team.entity';
import { Equipment, EquipmentType } from '../models/equipment.entity';
export interface CreateRequestDto {
    equipmentType: EquipmentType;
    justification: string;
    specifications?: string;
}
export interface UpdateRequestDto {
    justification?: string;
    specifications?: string;
}
export interface TeamLeadReviewDto {
    decision: Decision;
    notes?: string;
    rejectionReason?: string;
}
export interface AdminReviewDto {
    decision: Decision;
    notes?: string;
    rejectionReason?: string;
}
export interface FulfillRequestDto {
    equipmentId: string;
    notes?: string;
}
export interface RequestFilters {
    status?: RequestStatus;
    requesterId?: string;
    teamLeadId?: string;
    equipmentType?: EquipmentType;
    startDate?: Date;
    endDate?: Date;
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
export interface WorkflowStep {
    action: string;
    actor: string;
    timestamp: Date;
    notes?: string;
    decision?: Decision;
}
export interface RequestStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    fulfilled: number;
    byStatus: Record<RequestStatus, number>;
    avgProcessingTimeHours: number;
}
export declare class RequestService {
    private readonly requestRepository;
    private readonly userRepository;
    private readonly teamRepository;
    private readonly equipmentRepository;
    constructor(requestRepository: Repository<Request>, userRepository: Repository<User>, teamRepository: Repository<Team>, equipmentRepository: Repository<Equipment>);
    create(requestData: CreateRequestDto, requester: User): Promise<Request>;
    findAll(filters: RequestFilters, pagination: PaginationOptions, user: User): Promise<PaginatedResult<Request>>;
    findById(id: string, user: User): Promise<Request>;
    update(id: string, updateData: UpdateRequestDto, user: User): Promise<Request>;
    teamLeadReview(id: string, reviewData: TeamLeadReviewDto, reviewer: User): Promise<Request>;
    adminReview(id: string, reviewData: AdminReviewDto, reviewer: User): Promise<Request>;
    fulfillRequest(id: string, fulfillmentData: FulfillRequestDto, admin: User): Promise<Request>;
    getWorkflowHistory(id: string, user: User): Promise<WorkflowStep[]>;
    getRequestQueue(role: UserRole, userId: string): Promise<Request[]>;
    getRequestStats(): Promise<RequestStats>;
    getPendingApprovals(user: User): Promise<Request[]>;
    fulfill(id: string, fulfillmentData: FulfillRequestDto, admin: User): Promise<Request>;
    cancel(id: string, cancellationData: {
        reason: string;
    }, user: User): Promise<Request>;
    getAnalytics(dateRange: {
        startDate?: Date;
        endDate?: Date;
    }, user: User): Promise<any>;
    private canAccessRequest;
    private canModifyRequest;
    private simulateNotification;
}
