import { User } from './user.entity';
import { Equipment, EquipmentType } from './equipment.entity';
export { EquipmentType };
export declare enum RequestStatus {
    SUBMITTED = "Submitted",
    TEAM_LEAD_REVIEW = "TeamLeadReview",
    ADMIN_REVIEW = "AdminReview",
    PENDING_TEAM_LEAD_APPROVAL = "PendingTeamLeadApproval",
    PENDING_ADMIN_APPROVAL = "PendingAdminApproval",
    APPROVED = "Approved",
    REJECTED = "Rejected",
    CANCELLED = "Cancelled",
    ORDERED = "Ordered",
    FULFILLED = "Fulfilled"
}
export declare enum Decision {
    APPROVED = "Approved",
    REJECTED = "Rejected",
    PENDING = "Pending"
}
export declare class Request {
    id: string;
    requesterId: string;
    equipmentType: EquipmentType;
    justification: string;
    specifications: string;
    status: RequestStatus;
    teamLeadId: string;
    teamLeadDecision: Decision;
    teamLeadNotes: string;
    adminId: string;
    adminDecision: Decision;
    adminNotes: string;
    rejectionReason: string;
    notes: string;
    requestedAt: Date;
    teamLeadReviewedAt: Date;
    adminReviewedAt: Date;
    fulfilledAt: Date;
    equipmentId: string;
    requester: User;
    teamLead: User;
    admin: User;
    equipment: Equipment;
    get isApproved(): boolean;
    get isRejected(): boolean;
    get isPending(): boolean;
    get canBeAmended(): boolean;
    get nextApprover(): 'team-lead' | 'admin' | null;
    get processingTimeInHours(): number;
    approveByTeamLead(notes?: string): void;
    rejectByTeamLead(reason: string, notes?: string): void;
    approveByAdmin(adminId: string, notes?: string): void;
    rejectByAdmin(adminId: string, reason: string, notes?: string): void;
    fulfill(equipmentId: string): void;
}
