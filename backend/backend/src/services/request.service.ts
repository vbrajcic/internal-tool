import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOptionsWhere, In } from 'typeorm';
import { Request, RequestStatus, Decision } from '../models/request.entity';
import { User, UserRole } from '../models/user.entity';
import { Team } from '../models/team.entity';
import { Equipment, EquipmentType, EquipmentStatus } from '../models/equipment.entity';

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

@Injectable()
export class RequestService {
  constructor(
    @InjectRepository(Request)
    private readonly requestRepository: Repository<Request>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  /**
   * Create a new equipment request with automatic team lead assignment
   */
  async create(requestData: CreateRequestDto, requester: User): Promise<Request> {
    // Validate justification minimum length
    if (requestData.justification.length < 10) {
      throw new BadRequestException('Justification must be at least 10 characters long');
    }

    // Validate equipment type
    if (!Object.values(EquipmentType).includes(requestData.equipmentType)) {
      throw new BadRequestException('Invalid equipment type');
    }

    // Get requester's team to determine team lead
    const requesterWithTeam = await this.userRepository.findOne({
      where: { id: requester.id },
      relations: ['team']
    });

    if (!requesterWithTeam?.team) {
      throw new BadRequestException('Requester must be assigned to a team');
    }

    // Get team with team lead
    const team = await this.teamRepository.findOne({
      where: { id: requesterWithTeam.team.id },
      relations: ['lead']
    });

    if (!team?.lead) {
      throw new BadRequestException('Team must have an assigned team lead');
    }

    // Create request with auto-assigned team lead
    const request = this.requestRepository.create({
      ...requestData,
      requesterId: requester.id,
      teamLeadId: team.lead.id,
      status: RequestStatus.SUBMITTED,
      teamLeadDecision: Decision.PENDING,
    });

    const savedRequest = await this.requestRepository.save(request);

    // Trigger notification (simulated)
    this.simulateNotification(team.lead.email, 'new-request', savedRequest.id);

    // Return request with relations
    return this.findById(savedRequest.id, requester);
  }

  /**
   * Get all requests with role-based filtering and pagination
   */
  async findAll(
    filters: RequestFilters = {},
    pagination: PaginationOptions = {},
    user: User
  ): Promise<PaginatedResult<Request>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    // Build base where conditions
    const whereConditions: FindOptionsWhere<Request> = {};

    // Apply role-based filtering
    if (user.role === UserRole.EMPLOYEE) {
      // Employees only see their own requests
      whereConditions.requesterId = user.id;
    } else if (user.role === UserRole.TEAM_LEAD) {
      // Team leads see their team member requests
      const teamMembers = await this.userRepository.find({
        where: { teamId: user.teamId },
        select: ['id']
      });
      const memberIds = teamMembers.map(member => member.id);
      whereConditions.requesterId = In(memberIds);
    }
    // Admins see all requests (no additional filtering)

    // Apply additional filters
    if (filters.status) {
      if (!Object.values(RequestStatus).includes(filters.status)) {
        throw new BadRequestException('Invalid status filter');
      }
      whereConditions.status = filters.status;
    }

    if (filters.requesterId) {
      // Check if user can access this requester's data
      if (user.role === UserRole.EMPLOYEE && filters.requesterId !== user.id) {
        throw new ForbiddenException('Cannot access other users\' requests');
      }
      whereConditions.requesterId = filters.requesterId;
    }

    if (filters.teamLeadId) {
      whereConditions.teamLeadId = filters.teamLeadId;
    }

    if (filters.equipmentType) {
      if (!Object.values(EquipmentType).includes(filters.equipmentType)) {
        throw new BadRequestException('Invalid equipment type filter');
      }
      whereConditions.equipmentType = filters.equipmentType;
    }

    const [requests, total] = await this.requestRepository.findAndCount({
      where: whereConditions,
      relations: ['requester', 'teamLead', 'admin', 'equipment'],
      skip,
      take: limit,
      order: {
        requestedAt: 'DESC',
      },
    });

    return {
      items: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get request by ID with access control
   */
  async findById(id: string, user: User): Promise<Request> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['requester', 'teamLead', 'admin', 'equipment'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check access permissions
    if (!this.canAccessRequest(request, user)) {
      throw new ForbiddenException('Access denied to this request');
    }

    return request;
  }

  /**
   * Update request when in amendable status
   */
  async update(id: string, updateData: UpdateRequestDto, user: User): Promise<Request> {
    const request = await this.findById(id, user);

    // Check if request can be amended
    if (!request.canBeAmended) {
      throw new BadRequestException('Request cannot be modified in current status');
    }

    // Check if user can modify this request
    if (!this.canModifyRequest(request, user)) {
      throw new ForbiddenException('Cannot modify this request');
    }

    // Validate justification if provided
    if (updateData.justification && updateData.justification.length < 10) {
      throw new BadRequestException('Justification must be at least 10 characters long');
    }

    // Update only provided fields
    const updateFields: Partial<Request> = {};
    if (updateData.justification !== undefined) {
      updateFields.justification = updateData.justification;
    }
    if (updateData.specifications !== undefined) {
      updateFields.specifications = updateData.specifications;
    }

    await this.requestRepository.update(id, updateFields);

    // Return updated request
    return this.findById(id, user);
  }

  /**
   * Team lead review process
   */
  async teamLeadReview(id: string, reviewData: TeamLeadReviewDto, reviewer: User): Promise<Request> {
    // Validate reviewer role
    if (reviewer.role !== UserRole.TEAM_LEAD) {
      throw new ForbiddenException('Only team leads can perform team lead reviews');
    }

    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['requester', 'teamLead', 'admin', 'equipment'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Validate request status
    if (request.status !== RequestStatus.SUBMITTED) {
      throw new BadRequestException('Request cannot be reviewed in current status');
    }

    // Validate reviewer is the assigned team lead
    if (request.teamLeadId !== reviewer.id) {
      throw new ForbiddenException('You are not the assigned team lead for this request');
    }

    // Validate decision
    if (reviewData.decision === Decision.REJECTED && !reviewData.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting');
    }

    // Apply decision using entity methods
    if (reviewData.decision === Decision.APPROVED) {
      request.approveByTeamLead(reviewData.notes);
      this.simulateNotification('admin@company.com', 'admin-review-needed', request.id);
    } else if (reviewData.decision === Decision.REJECTED) {
      request.rejectByTeamLead(reviewData.rejectionReason!, reviewData.notes);
      this.simulateNotification(request.requester?.email || '', 'request-rejected', request.id);
    }

    const updatedRequest = await this.requestRepository.save(request);

    return this.findById(updatedRequest.id, reviewer);
  }

  /**
   * Admin review process
   */
  async adminReview(id: string, reviewData: AdminReviewDto, reviewer: User): Promise<Request> {
    // Validate reviewer role
    if (reviewer.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can perform admin reviews');
    }

    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['requester', 'teamLead', 'admin', 'equipment'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Validate request status
    if (request.status !== RequestStatus.ADMIN_REVIEW) {
      throw new BadRequestException('Request cannot be reviewed by admin in current status');
    }

    // Validate decision
    if (reviewData.decision === Decision.REJECTED && !reviewData.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting');
    }

    // Apply decision using entity methods
    if (reviewData.decision === Decision.APPROVED) {
      request.approveByAdmin(reviewer.id, reviewData.notes);
      this.simulateNotification(request.requester?.email || '', 'request-approved', request.id);
    } else if (reviewData.decision === Decision.REJECTED) {
      request.rejectByAdmin(reviewer.id, reviewData.rejectionReason!, reviewData.notes);
      this.simulateNotification(request.requester?.email || '', 'request-rejected', request.id);
    }

    const updatedRequest = await this.requestRepository.save(request);

    return this.findById(updatedRequest.id, reviewer);
  }

  /**
   * Fulfill request with equipment assignment
   */
  async fulfillRequest(id: string, fulfillmentData: FulfillRequestDto, admin: User): Promise<Request> {
    // Validate admin role
    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can fulfill requests');
    }

    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['requester', 'teamLead', 'admin', 'equipment'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Validate request status
    if (request.status !== RequestStatus.APPROVED) {
      throw new BadRequestException('Only approved requests can be fulfilled');
    }

    // Validate equipment exists and is available
    const equipment = await this.equipmentRepository.findOne({
      where: { id: fulfillmentData.equipmentId }
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    if (equipment.status !== EquipmentStatus.AVAILABLE) {
      throw new BadRequestException('Equipment is not available for assignment');
    }

    // Fulfill request using entity method
    request.fulfill(fulfillmentData.equipmentId);

    // Assign equipment to requester
    await this.equipmentRepository.update(fulfillmentData.equipmentId, {
      currentOwnerId: request.requesterId,
      status: EquipmentStatus.ASSIGNED,
    });

    const updatedRequest = await this.requestRepository.save(request);

    // Send notification
    this.simulateNotification(request.requester?.email || '', 'request-fulfilled', request.id);

    return this.findById(updatedRequest.id, admin);
  }

  /**
   * Get complete workflow history for a request
   */
  async getWorkflowHistory(id: string, user: User): Promise<WorkflowStep[]> {
    const request = await this.findById(id, user);

    const history: WorkflowStep[] = [];

    // Request submission
    history.push({
      action: 'Request Submitted',
      actor: `${request.requester?.firstName} ${request.requester?.lastName}`,
      timestamp: request.requestedAt,
    });

    // Team lead review
    if (request.teamLeadReviewedAt) {
      history.push({
        action: 'Team Lead Review',
        actor: `${request.teamLead?.firstName} ${request.teamLead?.lastName}`,
        timestamp: request.teamLeadReviewedAt,
        decision: request.teamLeadDecision,
        notes: request.teamLeadNotes,
      });
    }

    // Admin review
    if (request.adminReviewedAt) {
      history.push({
        action: 'Admin Review',
        actor: `${request.admin?.firstName} ${request.admin?.lastName}`,
        timestamp: request.adminReviewedAt,
        decision: request.adminDecision,
        notes: request.adminNotes,
      });
    }

    // Fulfillment
    if (request.fulfilledAt) {
      history.push({
        action: 'Request Fulfilled',
        actor: 'System',
        timestamp: request.fulfilledAt,
        notes: `Equipment assigned: ${request.equipment?.brand} ${request.equipment?.model}`,
      });
    }

    return history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get pending requests queue by role
   */
  async getRequestQueue(role: UserRole, userId: string): Promise<Request[]> {
    const whereConditions: FindOptionsWhere<Request> = {};

    if (role === UserRole.TEAM_LEAD) {
      whereConditions.teamLeadId = userId;
      whereConditions.status = RequestStatus.SUBMITTED;
    } else if (role === UserRole.ADMIN) {
      whereConditions.status = RequestStatus.ADMIN_REVIEW;
    } else {
      return []; // Employees don't have review queues
    }

    return this.requestRepository.find({
      where: whereConditions,
      relations: ['requester', 'teamLead'],
      order: {
        requestedAt: 'ASC', // Oldest first for queue processing
      },
    });
  }

  /**
   * Get request statistics
   */
  async getRequestStats(): Promise<RequestStats> {
    const [total, statusStats, processingTimes] = await Promise.all([
      this.requestRepository.count(),
      this.requestRepository
        .createQueryBuilder('request')
        .select('request.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('request.status')
        .getRawMany(),
      this.requestRepository
        .createQueryBuilder('request')
        .select('AVG(EXTRACT(epoch FROM (request.teamLeadReviewedAt - request.requestedAt)) / 3600)', 'avgHours')
        .where('request.teamLeadReviewedAt IS NOT NULL')
        .getRawOne(),
    ]);

    const byStatus = {
      [RequestStatus.SUBMITTED]: 0,
      [RequestStatus.TEAM_LEAD_REVIEW]: 0,
      [RequestStatus.ADMIN_REVIEW]: 0,
      [RequestStatus.APPROVED]: 0,
      [RequestStatus.REJECTED]: 0,
      [RequestStatus.ORDERED]: 0,
      [RequestStatus.FULFILLED]: 0,
      [RequestStatus.PENDING_TEAM_LEAD_APPROVAL]: 0,
      [RequestStatus.PENDING_ADMIN_APPROVAL]: 0,
      [RequestStatus.CANCELLED]: 0,    };

    statusStats.forEach(stat => {
      byStatus[stat.status as RequestStatus] = parseInt(stat.count);
    });

    const pending = byStatus[RequestStatus.SUBMITTED] + byStatus[RequestStatus.TEAM_LEAD_REVIEW] + byStatus[RequestStatus.ADMIN_REVIEW];
    const approved = byStatus[RequestStatus.APPROVED] + byStatus[RequestStatus.FULFILLED];
    const rejected = byStatus[RequestStatus.REJECTED];

    return {
      total,
      pending,
      approved,
      rejected,
      fulfilled: byStatus[RequestStatus.FULFILLED],
      byStatus,
      avgProcessingTimeHours: parseFloat(processingTimes?.avgHours || '0'),
    };
  }


  /**
   * Get pending approvals for a user (team lead or admin)
   */
  async getPendingApprovals(user: User): Promise<Request[]> {
    let whereConditions: any = {};

    if (user.role === UserRole.TEAM_LEAD) {
      whereConditions = {
        teamLeadId: user.id,
        status: RequestStatus.PENDING_TEAM_LEAD_APPROVAL
      };
    } else if (user.role === UserRole.ADMIN) {
      whereConditions = {
        status: RequestStatus.PENDING_ADMIN_APPROVAL
      };
    } else {
      return [];
    }

    return this.requestRepository.find({
      where: whereConditions,
      relations: ['requester', 'teamLead', 'equipment'],
      order: { requestedAt: 'ASC' }
    });
  }

  /**
   * Fulfill a request (alias for fulfillRequest)
   */
  async fulfill(id: string, fulfillmentData: FulfillRequestDto, admin: User): Promise<Request> {
    return this.fulfillRequest(id, fulfillmentData, admin);
  }

  /**
   * Cancel a request
   */
  async cancel(id: string, cancellationData: { reason: string }, user: User): Promise<Request> {
    const request = await this.findById(id, user);

    // Only allow cancellation if request is not already fulfilled or canceled
    if ([RequestStatus.FULFILLED, RequestStatus.CANCELLED].includes(request.status)) {
      throw new BadRequestException('Cannot cancel a request that is already fulfilled or cancelled');
    }

    // Only the requester or admin can cancel
    if (request.requesterId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the requester or admin can cancel a request');
    }

    await this.requestRepository.update(id, {
      status: RequestStatus.CANCELLED,
      notes: request.notes ? `${request.notes}\n\nCANCELLED: ${cancellationData.reason}` : `CANCELLED: ${cancellationData.reason}`,
      teamLeadReviewedAt: new Date()
    });

    return this.findById(id, user);
  }

  /**
   * Get request analytics
   */
  async getAnalytics(dateRange: { startDate?: Date; endDate?: Date }, user: User): Promise<any> {
    // Basic analytics implementation
    const queryBuilder = this.requestRepository.createQueryBuilder('request');

    if (dateRange.startDate) {
      queryBuilder.andWhere('request.requestedAt >= :startDate', { startDate: dateRange.startDate });
    }

    if (dateRange.endDate) {
      queryBuilder.andWhere('request.requestedAt <= :endDate', { endDate: dateRange.endDate });
    }

    // Apply role-based filtering
    if (user.role === UserRole.EMPLOYEE) {
      queryBuilder.andWhere('request.requesterId = :userId', { userId: user.id });
    } else if (user.role === UserRole.TEAM_LEAD) {
      queryBuilder.andWhere('(request.requesterId = :userId OR request.teamLeadId = :userId)', { userId: user.id });
    }

    const [requests, total] = await queryBuilder.getManyAndCount();

    // Calculate analytics
    const statusCounts = requests.reduce((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const equipmentTypeCounts = requests.reduce((acc, request) => {
      acc[request.equipmentType] = (acc[request.equipmentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgProcessingTime = requests.length > 0
      ? requests.reduce((sum, req) => sum + req.processingTimeInHours, 0) / requests.length
      : 0;

    return {
      total,
      statusBreakdown: statusCounts,
      equipmentTypeBreakdown: equipmentTypeCounts,
      averageProcessingTimeHours: avgProcessingTime,
      periodStart: dateRange.startDate,
      periodEnd: dateRange.endDate,
    };
  }

  /**
   * Check if user can access a request
   */
  private canAccessRequest(request: Request, user: User): boolean {
    // Admins can access all requests
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Team leads can access their team member requests
    if (user.role === UserRole.TEAM_LEAD && request.teamLeadId === user.id) {
      return true;
    }

    // Users can access their own requests
    if (request.requesterId === user.id) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can modify a request
   */
  private canModifyRequest(request: Request, user: User): boolean {
    // Admins can modify any request
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Team leads can modify their team member requests (when amendable)
    if (user.role === UserRole.TEAM_LEAD && request.teamLeadId === user.id) {
      return true;
    }

    // Users can modify their own requests
    if (request.requesterId === user.id) {
      return true;
    }

    return false;
  }

  /**
   * Simulate notification sending (would integrate with email service)
   */
  private simulateNotification(email: string, type: string, requestId: string): void {
    // In a real implementation, this would send actual emails
    console.log(`📧 [SIMULATION] Sending ${type} notification to ${email} for request ${requestId}`);
  }
}