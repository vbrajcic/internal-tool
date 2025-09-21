import { User } from './user.entity';
import { Transfer } from './transfer.entity';
import { Request } from './request.entity';
export declare enum EquipmentType {
    LAPTOP = "Laptop",
    DISPLAY = "Display",
    PHONE = "Phone",
    TABLET = "Tablet",
    DONGLE = "Dongle",
    KEYBOARD = "Keyboard",
    MOUSE = "Mouse",
    FURNITURE = "Furniture"
}
export declare enum EquipmentStatus {
    AVAILABLE = "Available",
    ASSIGNED = "Assigned",
    PENDING = "Pending",
    BROKEN = "Broken",
    STOLEN = "Stolen"
}
export declare enum ClassificationTag {
    PROFICO = "Profico",
    ZOPI = "ZOPI",
    LEASING = "Leasing"
}
export declare enum Condition {
    NEW = "New",
    GOOD = "Good",
    FAIR = "Fair",
    POOR = "Poor"
}
export declare class Equipment {
    id: string;
    serialNumber: string;
    qrCode: string;
    brand: string;
    model: string;
    type: EquipmentType;
    status: EquipmentStatus;
    purchaseDate: Date;
    classificationTag: ClassificationTag;
    currentOwnerId: string;
    condition: Condition;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    currentOwner: User;
    transfers: Transfer[];
    requests: Request[];
    generateQRCode(): Promise<void>;
}
