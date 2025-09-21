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
  Res,
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes
} from '@nestjs/swagger';
import {
  SubscriptionService,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionFilters,
  PaginationOptions,
  SubscriptionExportFormat
} from '../services/subscription.service';
import {
  InvoiceService,
  CreateInvoiceDto
} from '../services/invoice.service';
import { Subscription, BillingFrequency, PaymentMethod } from '../models/subscription.entity';
import { Invoice } from '../models/invoice.entity';
import { User, UserRole } from '../models/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List subscriptions',
    description: 'Get subscriptions with filtering and pagination'
  })
  @ApiQuery({ name: 'ownerId', type: 'string', required: false })
  @ApiQuery({ name: 'isActive', type: 'boolean', required: false })
  @ApiQuery({ name: 'billingFrequency', enum: BillingFrequency, required: false })
  @ApiQuery({ name: 'paymentMethod', enum: PaymentMethod, required: false })
  @ApiQuery({ name: 'page', type: 'number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        subscriptions: {
          type: 'array',
          items: { $ref: '#/components/schemas/Subscription' }
        },
        pagination: { $ref: '#/components/schemas/Pagination' }
      }
    }
  })
  async getSubscriptions(
    @Query('ownerId', new ParseUUIDPipe({ optional: true })) ownerId: string,
    @Query('isActive') isActive: boolean,
    @Query('billingFrequency') billingFrequency: BillingFrequency,
    @Query('paymentMethod') paymentMethod: PaymentMethod,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Req() req: any,
  ) {
    const currentUser: User = req.user;

    const filters: SubscriptionFilters = {};
    if (ownerId) filters.ownerId = ownerId;
    if (isActive !== undefined) filters.isActive = isActive;
    if (billingFrequency) filters.billingFrequency = billingFrequency;
    if (paymentMethod) filters.paymentMethod = paymentMethod;

    // Role-based filtering
    if (currentUser.role === UserRole.EMPLOYEE) {
      // Employees can only see their own subscriptions
      filters.ownerId = currentUser.id;
    }

    const pagination: PaginationOptions = { page, limit };
    const result = await this.subscriptionService.findAll(filters, pagination, currentUser);

    return {
      subscriptions: result.items,
      pagination: result.pagination,
    };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEAD)
  @ApiOperation({
    summary: 'Create subscription',
    description: 'Register new software subscription with billing information'
  })
  @ApiBody({
    description: 'Subscription creation data',
    schema: {
      type: 'object',
      required: ['name', 'price', 'billingFrequency', 'paymentMethod', 'ownerId'],
      properties: {
        name: { type: 'string' },
        price: { type: 'number', format: 'decimal' },
        billingFrequency: { enum: Object.values(BillingFrequency) },
        paymentMethod: { enum: Object.values(PaymentMethod) },
        ownerId: { type: 'string' },
        ownerEmail: { type: 'string', format: 'email' },
        renewalDate: { type: 'string', format: 'date' }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
    type: Subscription
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createSubscription(
    @Body(ValidationPipe) createSubscriptionDto: CreateSubscriptionDto,
    @Req() req: any,
  ): Promise<Subscription> {
    const currentUser: User = req.user;
    return this.subscriptionService.create(createSubscriptionDto, currentUser);
  }

  @Get('export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Export subscription data',
    description: 'Export subscription and invoice data for accounting reconciliation'
  })
  @ApiQuery({
    name: 'format',
    enum: ['excel', 'csv', 'json'],
    required: false,
    description: 'Export format (default: excel)'
  })
  @ApiQuery({ name: 'startDate', type: 'string', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', type: 'string', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'includeInvoices', type: 'boolean', required: false, description: 'Include invoice data' })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    headers: {
      'Content-Disposition': {
        description: 'File download attachment',
        schema: { type: 'string' }
      },
      'Content-Type': {
        description: 'MIME type of the exported file',
        schema: { type: 'string' }
      }
    }
  })
  async exportSubscriptions(
    @Res() res: Response,
    @Req() req: any,
    @Query("format") format?: SubscriptionExportFormat,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("includeInvoices") includeInvoices?: boolean,
  ) {
    const currentUser: User = req.user;
    const exportOptions = {
      format,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      includeInvoices,
    };

    const exportResult = await this.subscriptionService.exportSubscriptions(
      format,
      { startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined },
      currentUser
    );

    // Set appropriate headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `subscriptions_export_${timestamp}.${format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', exportResult.contentType);

    res.send(exportResult.buffer);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get subscription details',
    description: 'Retrieve subscription with invoice history and owner information'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Subscription details retrieved',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/Subscription' },
        {
          type: 'object',
          properties: {
            owner: { $ref: '#/components/schemas/UserSummary' },
            invoices: {
              type: 'array',
              items: { $ref: '#/components/schemas/Invoice' }
            },
            totalSpend: { type: 'number', format: 'decimal' },
            nextRenewal: { type: 'string', format: 'date' }
          }
        }
      ]
    }
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscriptionById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<Subscription> {
    const currentUser: User = req.user;
    return this.subscriptionService.findById(id, currentUser);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update subscription',
    description: 'Update subscription information and billing details'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Subscription update data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number', format: 'decimal' },
        billingFrequency: { enum: Object.values(BillingFrequency) },
        paymentMethod: { enum: Object.values(PaymentMethod) },
        renewalDate: { type: 'string', format: 'date' },
        isActive: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
    type: Subscription
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateSubscriptionDto: UpdateSubscriptionDto,
    @Req() req: any,
  ): Promise<Subscription> {
    const currentUser: User = req.user;
    return this.subscriptionService.update(id, updateSubscriptionDto, currentUser);
  }

  @Get(':id/invoices')
  @ApiOperation({
    summary: 'Get subscription invoices',
    description: 'Retrieve all invoices for a specific subscription'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiQuery({ name: 'page', type: 'number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        invoices: {
          type: 'array',
          items: { $ref: '#/components/schemas/Invoice' }
        },
        pagination: { $ref: '#/components/schemas/Pagination' }
      }
    }
  })
  async getSubscriptionInvoices(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: any,
  ) {
    const currentUser: User = req.user;
    const pagination: PaginationOptions = { page, limit };

    const result = await this.invoiceService.findBySubscription(id, pagination, currentUser);

    return {
      invoices: result.items,
      pagination: result.pagination,
    };
  }

  @Post(':id/invoices')
  @ApiOperation({
    summary: 'Upload subscription invoice',
    description: 'Upload invoice file with automatic metadata extraction'
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Invoice upload data',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF invoice file'
        },
        amount: {
          type: 'number',
          format: 'decimal',
          description: 'Manual amount override'
        },
        invoiceDate: {
          type: 'string',
          format: 'date',
          description: 'Manual invoice date override'
        },
        description: {
          type: 'string',
          description: 'Optional invoice description'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice uploaded successfully',
    type: Invoice
  })
  @ApiResponse({ status: 400, description: 'Invalid file or subscription data' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadInvoice(
    @Param('id', ParseUUIDPipe) subscriptionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() invoiceData: {
      amount?: string;
      invoiceDate?: string;
      description?: string;
    },
    @Req() req: any,
  ): Promise<Invoice> {
    const currentUser: User = req.user;

    if (!file) {
      throw new HttpException('Invoice file is required', HttpStatus.BAD_REQUEST);
    }

    if (file.mimetype !== 'application/pdf') {
      throw new HttpException('Only PDF files are allowed', HttpStatus.BAD_REQUEST);
    }

    const createInvoiceDto: CreateInvoiceDto = {
      subscriptionId,
      fileName: file.originalname,
      fileBuffer: file.buffer,
      amount: invoiceData.amount ? parseFloat(invoiceData.amount) : undefined,
      invoiceDate: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : undefined,
      description: invoiceData.description,
    };

    return this.invoiceService.create(createInvoiceDto, currentUser);
  }

  @Get(':id/analytics')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEAD)
  @ApiOperation({
    summary: 'Get subscription analytics',
    description: 'Retrieve subscription usage and cost analytics'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved',
    schema: {
      type: 'object',
      properties: {
        totalSpend: { type: 'number', format: 'decimal' },
        monthlyAverage: { type: 'number', format: 'decimal' },
        invoiceCount: { type: 'number' },
        lastInvoiceDate: { type: 'string', format: 'date' },
        renewalInfo: {
          type: 'object',
          properties: {
            nextRenewal: { type: 'string', format: 'date' },
            daysUntilRenewal: { type: 'number' },
            renewalReminded: { type: 'boolean' }
          }
        },
        complianceStatus: {
          type: 'object',
          properties: {
            hasInvoices: { type: 'boolean' },
            invoiceCoverage: { type: 'number', description: 'Percentage of billing periods with invoices' },
            missingInvoices: { type: 'number' }
          }
        }
      }
    }
  })
  async getSubscriptionAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const currentUser: User = req.user;
    return this.subscriptionService.getAnalytics(id, currentUser);
  }

  @Post('send-reminders')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Send renewal reminders',
    description: 'Send email reminders for upcoming subscription renewals'
  })
  @ApiBody({
    description: 'Reminder configuration',
    schema: {
      type: 'object',
      properties: {
        daysBeforeRenewal: {
          type: 'number',
          default: 30,
          description: 'Send reminders for subscriptions renewing within this many days'
        },
        includeInactive: {
          type: 'boolean',
          default: false,
          description: 'Include inactive subscriptions in reminders'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Reminders sent successfully',
    schema: {
      type: 'object',
      properties: {
        remindersSent: { type: 'number' },
        subscriptionsProcessed: { type: 'number' },
        errors: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  async sendRenewalReminders(
    @Body() reminderConfig: {
      daysBeforeRenewal?: number;
      includeInactive?: boolean;
    } = {},
    @Req() req: any,
  ) {
    const currentUser: User = req.user;
    const { daysBeforeRenewal = 30, includeInactive = false } = reminderConfig;

    return this.subscriptionService.sendRenewalReminders(
      daysBeforeRenewal,
      includeInactive,
      currentUser
    );
  }
}