import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody
} from '@nestjs/swagger';
import {
  RequestService,
  CreateRequestDto,
  UpdateRequestDto,
  RequestFilters,
  PaginationOptions,
  TeamLeadReviewDto,
  AdminReviewDto,
  FulfillRequestDto
} from '../services/request.service';
import { Request, RequestStatus, EquipmentType } from '../models/request.entity';
import { User, UserRole } from '../models/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('requests')
@ApiBearerAuth()
@Controller('api/requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestService: RequestService) {}

  @Get()
  @ApiOperation({
    summary: 'List equipment requests',
    description: 'Get equipment requests with role-based filtering and pagination'
  })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  @ApiQuery({ name: 'equipmentType', enum: EquipmentType, required: false })
  @ApiQuery({ name: 'requesterId', type: 'string', required: false })
  @ApiQuery({ name: 'teamLeadId', type: 'string', required: false })
  @ApiQuery({ name: 'page', type: 'number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Requests retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        requests: {
          type: 'array',
          items: { $ref: '#/components/schemas/Request' }
        },
        pagination: { $ref: '#/components/schemas/Pagination' }
      }
    }
  })
  async getRequests(
    @Query('status') status: RequestStatus,
    @Query('equipmentType') equipmentType: EquipmentType,
    @Query('requesterId', new ParseUUIDPipe({ optional: true })) requesterId: string,
    @Query('teamLeadId', new ParseUUIDPipe({ optional: true })) teamLeadId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: any,
  ) {
    const currentUser: User = req.user;

    const filters: RequestFilters = {};
    if (status) filters.status = status;
    if (equipmentType) filters.equipmentType = equipmentType;
    if (requesterId) filters.requesterId = requesterId;
    if (teamLeadId) filters.teamLeadId = teamLeadId;

    // Role-based filtering
    if (currentUser.role === UserRole.EMPLOYEE) {
      // Employees can only see their own requests
      filters.requesterId = currentUser.id;
    } else if (currentUser.role === UserRole.TEAM_LEAD) {
      // Team leads can see their team's requests or requests assigned to them
      filters.teamLeadId = currentUser.id;
    }

    const pagination: PaginationOptions = { page, limit };
    const result = await this.requestService.findAll(filters, pagination, currentUser);

    return {
      requests: result.items,
      pagination: result.pagination,
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Submit equipment request',
    description: 'Create new equipment request that enters approval workflow'
  })
  @ApiBody({
    description: 'Equipment request data',
    schema: {
      type: 'object',
      required: ['equipmentType', 'justification'],
      properties: {
        equipmentType: { enum: Object.values(EquipmentType) },
        justification: { type: 'string' },
        specifications: { type: 'string', description: 'Optional specific requirements' }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Request submitted successfully',
    type: Request
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createRequest(
    @Body(ValidationPipe) createRequestDto: CreateRequestDto,
    @Req() req: any,
  ): Promise<Request> {
    const currentUser: User = req.user;
    return this.requestService.create(createRequestDto, currentUser);
  }

  @Get('my-requests')
  @ApiOperation({
    summary: 'Get current user requests',
    description: 'Retrieve all requests submitted by the current user'
  })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  @ApiQuery({ name: 'page', type: 'number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'User requests retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        requests: {
          type: 'array',
          items: { $ref: '#/components/schemas/Request' }
        },
        pagination: { $ref: '#/components/schemas/Pagination' }
      }
    }
  })
  async getMyRequests(
    @Query('status') status: RequestStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: any,
  ) {
    const currentUser: User = req.user;

    const filters: RequestFilters = {
      requesterId: currentUser.id
    };
    if (status) filters.status = status;

    const pagination: PaginationOptions = { page, limit };
    const result = await this.requestService.findAll(filters, pagination, currentUser);

    return {
      requests: result.items,
      pagination: result.pagination,
    };
  }

  @Get('pending-approvals')
  @Roles(UserRole.TEAM_LEAD, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get pending approval requests',
    description: 'Retrieve requests pending approval based on user role'
  })
  @ApiQuery({ name: 'page', type: 'number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Pending requests retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        requests: {
          type: 'array',
          items: { $ref: '#/components/schemas/Request' }
        },
        pagination: { $ref: '#/components/schemas/Pagination' }
      }
    }
  })
  async getPendingApprovals(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: any,
  ) {
    const currentUser: User = req.user;
    const pagination: PaginationOptions = { page, limit };

    const requests = await this.requestService.getPendingApprovals(currentUser);

    // Apply manual pagination since the service method doesn't support it
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRequests = requests.slice(startIndex, endIndex);

    return {
      requests: paginatedRequests,
      pagination: {
        page,
        limit,
        total: requests.length,
        totalPages: Math.ceil(requests.length / limit),
      },
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get request details',
    description: 'Retrieve detailed request information with approval history'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Request details retrieved',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/Request' },
        {
          type: 'object',
          properties: {
            requester: { $ref: '#/components/schemas/UserSummary' },
            teamLead: { $ref: '#/components/schemas/UserSummary' },
            admin: { $ref: '#/components/schemas/UserSummary' },
            equipment: { $ref: '#/components/schemas/EquipmentSummary' }
          }
        }
      ]
    }
  })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getRequestById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<Request> {
    const currentUser: User = req.user;
    return this.requestService.findById(id, currentUser);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update request',
    description: 'Update request details (only by requester and before approval)'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Request update data',
    schema: {
      type: 'object',
      properties: {
        equipmentType: { enum: Object.values(EquipmentType) },
        justification: { type: 'string' },
        specifications: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Request updated successfully',
    type: Request
  })
  @ApiResponse({ status: 400, description: 'Request cannot be modified' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async updateRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateRequestDto: UpdateRequestDto,
    @Req() req: any,
  ): Promise<Request> {
    const currentUser: User = req.user;
    return this.requestService.update(id, updateRequestDto, currentUser);
  }

  @Post(':id/team-lead-review')
  @Roles(UserRole.TEAM_LEAD, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Team lead review',
    description: 'Review request as team lead (first approval stage)'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Team lead review data',
    schema: {
      type: 'object',
      required: ['decision'],
      properties: {
        decision: {
          enum: ['Approved', 'Rejected'],
          description: 'Team lead decision'
        },
        notes: {
          type: 'string',
          description: 'Optional review notes'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Team lead review completed',
    type: Request
  })
  @ApiResponse({ status: 400, description: 'Invalid review or request state' })
  @ApiResponse({ status: 403, description: 'Not authorized to review this request' })
  async teamLeadReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) reviewDto: TeamLeadReviewDto,
    @Req() req: any,
  ): Promise<Request> {
    const currentUser: User = req.user;
    return this.requestService.teamLeadReview(id, reviewDto, currentUser);
  }

  @Post(':id/admin-review')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Admin review',
    description: 'Review request as admin (final approval stage)'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Admin review data',
    schema: {
      type: 'object',
      required: ['decision'],
      properties: {
        decision: {
          enum: ['Approved', 'Rejected'],
          description: 'Admin decision'
        },
        notes: {
          type: 'string',
          description: 'Optional review notes'
        },
        budgetApproval: {
          type: 'boolean',
          description: 'Budget approval flag for expensive equipment'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Admin review completed',
    type: Request
  })
  @ApiResponse({ status: 400, description: 'Invalid review or request state' })
  async adminReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) reviewDto: AdminReviewDto,
    @Req() req: any,
  ): Promise<Request> {
    const currentUser: User = req.user;
    return this.requestService.adminReview(id, reviewDto, currentUser);
  }

  @Post(':id/fulfill')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Fulfill equipment request',
    description: 'Complete request by assigning specific equipment to requester'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Fulfillment data',
    schema: {
      type: 'object',
      required: ['equipmentId'],
      properties: {
        equipmentId: {
          type: 'string',
          format: 'uuid',
          description: 'ID of equipment to assign'
        },
        fulfillmentNotes: {
          type: 'string',
          description: 'Optional fulfillment notes'
        },
        deliveryInstructions: {
          type: 'string',
          description: 'Equipment delivery or pickup instructions'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Request fulfilled successfully',
    type: Request
  })
  @ApiResponse({ status: 400, description: 'Invalid fulfillment data or request state' })
  @ApiResponse({ status: 404, description: 'Request or equipment not found' })
  async fulfillRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) fulfillDto: FulfillRequestDto,
    @Req() req: any,
  ): Promise<Request> {
    const currentUser: User = req.user;
    return this.requestService.fulfill(id, fulfillDto, currentUser);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel equipment request',
    description: 'Cancel request (by requester or admin)'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Cancellation data',
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for cancellation'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Request cancelled successfully',
    type: Request
  })
  @ApiResponse({ status: 400, description: 'Request cannot be cancelled' })
  async cancelRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancellationData: { reason: string },
    @Req() req: any,
  ): Promise<Request> {
    const currentUser: User = req.user;
    return this.requestService.cancel(id, cancellationData, currentUser);
  }

  @Get('analytics/summary')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEAD)
  @ApiOperation({
    summary: 'Get request analytics',
    description: 'Retrieve request workflow analytics and statistics'
  })
  @ApiQuery({ name: 'startDate', type: 'string', required: false })
  @ApiQuery({ name: 'endDate', type: 'string', required: false })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved',
    schema: {
      type: 'object',
      properties: {
        totalRequests: { type: 'number' },
        requestsByStatus: {
          type: 'object',
          additionalProperties: { type: 'number' }
        },
        requestsByType: {
          type: 'object',
          additionalProperties: { type: 'number' }
        },
        averageApprovalTime: {
          type: 'object',
          properties: {
            teamLeadReview: { type: 'number', description: 'Average days for team lead review' },
            adminReview: { type: 'number', description: 'Average days for admin review' },
            fulfillment: { type: 'number', description: 'Average days for fulfillment' }
          }
        },
        approvalRates: {
          type: 'object',
          properties: {
            teamLeadApprovalRate: { type: 'number' },
            adminApprovalRate: { type: 'number' },
            overallApprovalRate: { type: 'number' }
          }
        },
        topRequesters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              userName: { type: 'string' },
              requestCount: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async getRequestAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    const currentUser: User = req.user;

    const dateRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.requestService.getAnalytics(dateRange, currentUser);
  }
}