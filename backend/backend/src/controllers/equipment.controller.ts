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
  EquipmentService,
  CreateEquipmentDto,
  UpdateEquipmentDto,
  EquipmentFilters,
  PaginationOptions,
  InitiateTransferDto,
  EquipmentWithMobileOptimization
} from '../services/equipment.service';
import { Equipment, EquipmentType, EquipmentStatus, ClassificationTag, Condition } from '../models/equipment.entity';
import { Transfer } from '../models/transfer.entity';
import { User, UserRole } from '../models/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('equipment')
@ApiBearerAuth()
@Controller('api/equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiOperation({
    summary: 'List equipment',
    description: 'Get equipment list with filtering and pagination'
  })
  @ApiQuery({ name: 'status', enum: EquipmentStatus, required: false })
  @ApiQuery({ name: 'type', enum: EquipmentType, required: false })
  @ApiQuery({ name: 'ownerId', type: 'string', required: false })
  @ApiQuery({ name: 'page', type: 'number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Equipment list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        equipment: {
          type: 'array',
          items: { $ref: '#/components/schemas/Equipment' }
        },
        pagination: { $ref: '#/components/schemas/Pagination' }
      }
    }
  })
  async getEquipment(
    @Query('status') status: EquipmentStatus,
    @Query('type') type: EquipmentType,
    @Query('ownerId', new ParseUUIDPipe({ optional: true })) ownerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Req() req: any,
  ) {
    const currentUser: User = req.user;

    const filters: EquipmentFilters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (ownerId) filters.currentOwnerId = ownerId;

    // Role-based filtering
    if (currentUser.role === UserRole.EMPLOYEE) {
      // Employees can only see their own equipment
      filters.currentOwnerId = currentUser.id;
    } else if (currentUser.role === UserRole.TEAM_LEAD) {
      // Team leads can see their team's equipment
      // This would require a more complex query involving team members
      // For now, allow all access and implement team filtering in service
    }

    const pagination: PaginationOptions = { page, limit };
    const result = await this.equipmentService.findAll(filters, pagination, currentUser);

    return {
      equipment: result.items,
      pagination: result.pagination,
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Register new equipment',
    description: 'Create new equipment record with QR code generation'
  })
  @ApiBody({
    description: 'Equipment creation data',
    schema: {
      type: 'object',
      required: ['serialNumber', 'brand', 'model', 'type', 'purchaseDate', 'classificationTag'],
      properties: {
        serialNumber: { type: 'string' },
        brand: { type: 'string' },
        model: { type: 'string' },
        type: { enum: Object.values(EquipmentType) },
        purchaseDate: { type: 'string', format: 'date' },
        classificationTag: { enum: Object.values(ClassificationTag) },
        condition: { enum: Object.values(Condition), default: 'New' },
        notes: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Equipment registered successfully',
    type: Equipment
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 409, description: 'Serial number already exists' })
  async createEquipment(
    @Body(ValidationPipe) createEquipmentDto: CreateEquipmentDto,
    @Req() req: any,
  ): Promise<Equipment> {
    const currentUser: User = req.user;
    return this.equipmentService.create(createEquipmentDto, currentUser);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get equipment details',
    description: 'Retrieve equipment with transfer history and current owner'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Equipment details retrieved',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/Equipment' },
        {
          type: 'object',
          properties: {
            currentOwner: { $ref: '#/components/schemas/UserSummary' },
            transferHistory: {
              type: 'array',
              items: { $ref: '#/components/schemas/Transfer' }
            }
          }
        }
      ]
    }
  })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async getEquipmentById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<Equipment> {
    const currentUser: User = req.user;
    return this.equipmentService.findById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update equipment',
    description: 'Update equipment information and status'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Equipment update data',
    schema: {
      type: 'object',
      properties: {
        brand: { type: 'string' },
        model: { type: 'string' },
        status: { enum: Object.values(EquipmentStatus) },
        condition: { enum: Object.values(Condition) },
        notes: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Equipment updated successfully',
    type: Equipment
  })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async updateEquipment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateEquipmentDto: UpdateEquipmentDto,
    @Req() req: any,
  ): Promise<Equipment> {
    const currentUser: User = req.user;
    return this.equipmentService.update(id, updateEquipmentDto, currentUser);
  }

  @Post(':id/transfer')
  @ApiOperation({
    summary: 'Transfer equipment ownership',
    description: 'Initiate equipment transfer with confirmation workflow'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Transfer request data',
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        toUserId: { type: 'string', nullable: true },
        reason: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer initiated successfully',
    type: Transfer
  })
  @ApiResponse({ status: 400, description: 'Invalid transfer request' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async transferEquipment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) transferDto: InitiateTransferDto,
    @Req() req: any,
  ): Promise<Transfer> {
    const currentUser: User = req.user;
    return this.equipmentService.initiateTransfer(id, transferDto, currentUser);
  }

  @Get('qr/:qrCode')
  @ApiOperation({
    summary: 'Get equipment by QR code',
    description: 'Retrieve equipment information using QR code scan for mobile interface'
  })
  @ApiParam({ name: 'qrCode', type: 'string', description: 'QR code identifier' })
  @ApiResponse({
    status: 200,
    description: 'Equipment found by QR code',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/Equipment' },
        {
          type: 'object',
          properties: {
            mobileOptimized: { type: 'boolean' },
            availableActions: {
              type: 'array',
              items: { type: 'string' }
            },
            canReportCondition: { type: 'boolean' },
            scanLogged: { type: 'boolean' },
            scanTimestamp: { type: 'string', format: 'date-time' },
            responseTime: { type: 'number', description: 'Response time in milliseconds' }
          }
        }
      ]
    }
  })
  @ApiResponse({ status: 404, description: 'QR code not found' })
  async getEquipmentByQRCode(
    @Param('qrCode') qrCode: string,
    @Req() req: any,
  ): Promise<EquipmentWithMobileOptimization> {
    const startTime = Date.now();
    const currentUser: User = req.user;

    try {
      const equipment = await this.equipmentService.findByQRCode(qrCode, currentUser);
      const responseTime = Date.now() - startTime;

      // Log QR scan for analytics and performance monitoring
      await this.equipmentService.logQRScan(equipment.id, currentUser.id, responseTime);

      // Optimize response for mobile interface
      const mobileOptimizedEquipment: EquipmentWithMobileOptimization = {
        ...equipment,
        mobileOptimized: true,
        availableActions: this.getAvailableActions(equipment, currentUser),
        canReportCondition: this.canReportCondition(equipment, currentUser),
        scanLogged: true,
        scanTimestamp: new Date(),
        responseTime,
      };

      // Performance requirement: <2 seconds
      if (responseTime > 2000) {
        console.warn(`QR scan exceeded 2s performance requirement: ${responseTime}ms`);
      }

      return mobileOptimizedEquipment;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log failed scan attempt
      await this.equipmentService.logQRScanFailure(qrCode, currentUser.id, responseTime, error.message);

      throw error;
    }
  }

  @Post(':id/condition')
  @ApiOperation({
    summary: 'Report equipment condition',
    description: 'Update equipment condition from mobile interface'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Condition report data',
    schema: {
      type: 'object',
      required: ['condition'],
      properties: {
        condition: { enum: Object.values(Condition) },
        notes: { type: 'string', description: 'Optional condition notes' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Condition updated successfully',
    type: Equipment
  })
  async reportCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() conditionData: { condition: Condition; notes?: string },
    @Req() req: any,
  ): Promise<Equipment> {
    const currentUser: User = req.user;

    const updateDto: UpdateEquipmentDto = {
      condition: conditionData.condition,
      notes: conditionData.notes,
    };

    return this.equipmentService.update(id, updateDto, currentUser);
  }

  @Get(':id/qr-image')
  @ApiOperation({
    summary: 'Generate QR code image',
    description: 'Generate QR code image for equipment printing'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'QR code image generated',
    schema: {
      type: 'object',
      properties: {
        qrCodeDataUrl: { type: 'string', description: 'Base64 data URL of QR code image' },
        qrCode: { type: 'string', description: 'QR code text value' }
      }
    }
  })
  async generateQRCodeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const currentUser: User = req.user;
    return this.equipmentService.generateQRCodeImage(id, currentUser);
  }

  // Helper methods for mobile optimization

  private getAvailableActions(equipment: Equipment | EquipmentWithMobileOptimization, user: User): string[] {
    const actions: string[] = ['view', 'report_condition'];

    // Equipment owners can transfer their equipment
    if (equipment.currentOwnerId === user.id) {
      actions.push('transfer');
    }

    // Admins can perform all actions
    if (user.role === UserRole.ADMIN) {
      actions.push('edit', 'transfer', 'decommission');
    }

    // Team leads can transfer equipment within their team
    if (user.role === UserRole.TEAM_LEAD &&
        equipment.currentOwner?.teamId === user.teamId) {
      actions.push('transfer');
    }

    return actions;
  }

  private canReportCondition(equipment: Equipment | EquipmentWithMobileOptimization, user: User): boolean {
    // Equipment owners can always report condition
    if (equipment.currentOwnerId === user.id) {
      return true;
    }

    // Admins can report condition on any equipment
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Team leads can report condition on their team's equipment
    if (user.role === UserRole.TEAM_LEAD &&
        equipment.currentOwner?.teamId === user.teamId) {
      return true;
    }

    return false;
  }
}