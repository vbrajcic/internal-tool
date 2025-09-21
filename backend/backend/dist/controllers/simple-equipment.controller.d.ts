import { EquipmentService } from '../services/equipment.service';
export declare class SimpleEquipmentController {
    private readonly equipmentService;
    constructor(equipmentService: EquipmentService);
    findAll(filters: any): Promise<any[] | import("../services/equipment.service").PaginatedResult<import("../models/equipment.entity").Equipment>>;
    findOne(id: string): Promise<import("../models/equipment.entity").Equipment>;
    create(createDto: any): Promise<import("../models/equipment.entity").Equipment>;
    update(id: string, updateDto: any): Promise<import("../models/equipment.entity").Equipment>;
    findByQR(qrCode: string): Promise<import("../services/equipment.service").EquipmentWithMobileOptimization>;
}
