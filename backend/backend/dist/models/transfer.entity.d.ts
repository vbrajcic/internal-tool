import { Equipment } from './equipment.entity';
import { User } from './user.entity';
export declare enum TransferType {
    ASSIGNMENT = "Assignment",
    RETURN = "Return",
    TRANSFER = "Transfer",
    DECOMMISSION = "Decommission"
}
export declare class Transfer {
    id: string;
    equipmentId: string;
    fromUserId: string;
    toUserId: string;
    transferType: TransferType;
    reason: string;
    fromUserConfirmed: boolean;
    toUserConfirmed: boolean;
    adminConfirmed: boolean;
    transferredAt: Date;
    createdAt: Date;
    equipment: Equipment;
    fromUser: User;
    toUser: User;
    get isCompleted(): boolean;
    get isPending(): boolean;
    get requiresFromUserConfirmation(): boolean;
    get requiresToUserConfirmation(): boolean;
    get requiresAdminConfirmation(): boolean;
    get allConfirmationsReceived(): boolean;
    get transferDescription(): string;
    confirmByFromUser(): void;
    confirmByToUser(): void;
    confirmByAdmin(): void;
    private checkAndCompleteTransfer;
    static determineTransferType(fromUserId: string | null, toUserId: string | null): TransferType;
}
