import { EquipmentService, CreateEquipmentDto, UpdateEquipmentDto, InitiateTransferDto, EquipmentWithMobileOptimization } from '../services/equipment.service';
import { Equipment, EquipmentType, EquipmentStatus, Condition } from '../models/equipment.entity';
import { Transfer } from '../models/transfer.entity';
export declare class EquipmentController {
    private readonly equipmentService;
    constructor(equipmentService: EquipmentService);
    getEquipment(status: EquipmentStatus, type: EquipmentType, ownerId: string, page: number, limit: number, req: any): Promise<{
        equipment: Equipment[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createEquipment(createEquipmentDto: CreateEquipmentDto, req: any): Promise<Equipment>;
    getEquipmentById(id: string, req: any): Promise<Equipment>;
    updateEquipment(id: string, updateEquipmentDto: UpdateEquipmentDto, req: any): Promise<Equipment>;
    transferEquipment(id: string, transferDto: InitiateTransferDto, req: any): Promise<Transfer>;
    getEquipmentByQRCode(qrCode: string, req: any): Promise<EquipmentWithMobileOptimization>;
    reportCondition(id: string, conditionData: {
        condition: Condition;
        notes?: string;
    }, req: any): Promise<Equipment>;
    generateQRCodeImage(id: string, req: any): Promise<Equipment>;
    private getAvailableActions;
    private canReportCondition;
}
