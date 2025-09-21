import { RequestService, CreateRequestDto, UpdateRequestDto, TeamLeadReviewDto, AdminReviewDto, FulfillRequestDto } from '../services/request.service';
import { Request, RequestStatus, EquipmentType } from '../models/request.entity';
export declare class RequestsController {
    private readonly requestService;
    constructor(requestService: RequestService);
    getRequests(status: RequestStatus, equipmentType: EquipmentType, requesterId: string, teamLeadId: string, page: number, limit: number, req: any): Promise<{
        requests: Request[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createRequest(createRequestDto: CreateRequestDto, req: any): Promise<Request>;
    getMyRequests(status: RequestStatus, page: number, limit: number, req: any): Promise<{
        requests: Request[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getPendingApprovals(page: number, limit: number, req: any): Promise<{
        requests: Request[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getRequestById(id: string, req: any): Promise<Request>;
    updateRequest(id: string, updateRequestDto: UpdateRequestDto, req: any): Promise<Request>;
    teamLeadReview(id: string, reviewDto: TeamLeadReviewDto, req: any): Promise<Request>;
    adminReview(id: string, reviewDto: AdminReviewDto, req: any): Promise<Request>;
    fulfillRequest(id: string, fulfillDto: FulfillRequestDto, req: any): Promise<Request>;
    cancelRequest(id: string, cancellationData: {
        reason: string;
    }, req: any): Promise<Request>;
    getRequestAnalytics(startDate: string, endDate: string, req: any): Promise<any>;
}
