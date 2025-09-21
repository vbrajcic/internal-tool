import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Invoice } from '../models/invoice.entity';
import { Subscription } from '../models/subscription.entity';
import { User, UserRole } from '../models/user.entity';
import { S3Service } from './s3.service';

export interface CreateInvoiceDto {
  subscriptionId: string;
  fileBuffer: Buffer;
  fileName: string;
  amount?: number;
  invoiceDate?: Date;
  description?: string;
}

export interface UpdateInvoiceDto {
  amount?: number;
  invoiceDate?: Date;
  description?: string;
}

export interface VerifyInvoiceDto {
  amount?: number;
  invoiceDate?: Date;
  description?: string;
  notes?: string;
}

export interface InvoiceUploadMetadata {
  fileName: string;
  fileSize: number;
  contentType: string;
  amount?: number;
  invoiceDate?: Date;
  description?: string;
}

export interface InvoiceStats {
  totalInvoices: number;
  verifiedInvoices: number;
  unverifiedInvoices: number;
  totalAmount: number;
  averageAmount: number;
  invoicesThisMonth: number;
  pendingVerification: number;
  overdueVerification: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
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

@Injectable()
export class InvoiceService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = ['application/pdf'];
  private readonly VERIFICATION_DEADLINE_DAYS = 7;

  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private s3Service: S3Service,
  ) {}

  /**
   * Create invoice from uploaded file data
   */
  async create(createInvoiceDto: CreateInvoiceDto, uploader: User): Promise<Invoice> {
    // Create a mock file object from the buffer data
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: createInvoiceDto.fileName,
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: createInvoiceDto.fileBuffer.length,
      buffer: createInvoiceDto.fileBuffer,
      destination: '',
      filename: createInvoiceDto.fileName,
      path: '',
      stream: null as any,
    };

    const metadata: InvoiceUploadMetadata = {
      fileName: createInvoiceDto.fileName,
      fileSize: createInvoiceDto.fileBuffer.length,
      contentType: 'application/pdf',
      amount: createInvoiceDto.amount,
      invoiceDate: createInvoiceDto.invoiceDate,
      description: createInvoiceDto.description,
    };

    return this.uploadInvoice(
      createInvoiceDto.subscriptionId,
      mockFile,
      metadata,
      uploader
    );
  }

  /**
   * Upload invoice file to S3 and create invoice record
   */
  async uploadInvoice(
    subscriptionId: string,
    file: Express.Multer.File,
    metadata: InvoiceUploadMetadata,
    uploader: User
  ): Promise<Invoice> {
    // Validate subscription exists and user has access
    const subscription = await this.validateSubscriptionAccess(subscriptionId, uploader);

    // Validate file
    this.validateFile(file);

    // Validate metadata
    this.validateInvoiceMetadata(metadata);

    try {
      // Generate S3 key with proper naming convention
      const s3Key = this.generateS3Key(subscriptionId, file.originalname);

      // Upload to S3
      const uploadResult = await this.s3Service.uploadFile(file, s3Key);

      // Create invoice record
      const invoice = this.invoiceRepository.create({
        subscriptionId,
        fileName: file.originalname,
        filePath: uploadResult.Key,
        uploadedById: uploader.id,
        amount: metadata.amount,
        invoiceDate: metadata.invoiceDate,
        description: metadata.description,
        isVerified: false,
      });

      const savedInvoice = await this.invoiceRepository.save(invoice);

      // Return with relations
      return await this.invoiceRepository.findOne({
        where: { id: savedInvoice.id },
        relations: ['subscription', 'uploadedBy', 'verifiedBy']
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload invoice: ${error.message}`
      );
    }
  }

  /**
   * Get invoices for a subscription with role-based access control
   */
  async findBySubscription(
    subscriptionId: string,
    pagination: PaginationOptions,
    user: User
  ): Promise<PaginatedResult<Invoice>> {
    // Validate subscription exists and user has access
    await this.validateSubscriptionAccess(subscriptionId, user);

    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const [items, total] = await this.invoiceRepository.findAndCount({
      where: { subscriptionId },
      relations: ['uploadedBy', 'verifiedBy'],
      order: { uploadedAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get invoice by ID with access control
   */
  async findById(id: string, user: User): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['subscription', 'uploadedBy', 'verifiedBy']
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Validate access to subscription
    await this.validateSubscriptionAccess(invoice.subscriptionId, user);

    return invoice;
  }

  /**
   * Verify invoice (admin only)
   */
  async verifyInvoice(
    id: string,
    verificationData: VerifyInvoiceDto,
    verifier: User
  ): Promise<Invoice> {
    // Only admins can verify invoices
    if (verifier.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can verify invoices');
    }

    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['subscription', 'uploadedBy', 'verifiedBy']
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.isVerified) {
      throw new BadRequestException('Invoice is already verified');
    }

    // Update invoice with verification data
    if (verificationData.amount !== undefined) {
      invoice.updateAmount(verificationData.amount);
    }

    if (verificationData.invoiceDate) {
      invoice.updateInvoiceDate(verificationData.invoiceDate);
    }

    if (verificationData.description) {
      invoice.description = verificationData.description;
    }

    // Mark as verified
    invoice.verify(verifier.id, verificationData.amount, verificationData.invoiceDate);

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Unverify invoice (admin only)
   */
  async unverifyInvoice(id: string, user: User): Promise<Invoice> {
    // Only admins can unverify invoices
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can unverify invoices');
    }

    const invoice = await this.findById(id, user);

    if (!invoice.isVerified) {
      throw new BadRequestException('Invoice is not verified');
    }

    invoice.unverify();

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Generate secure download URL for invoice file
   */
  async downloadInvoice(id: string, user: User): Promise<string> {
    const invoice = await this.findById(id, user);

    try {
      return await this.s3Service.getFileUrl(invoice.filePath);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to generate download URL: ${error.message}`
      );
    }
  }

  /**
   * Update invoice metadata
   */
  async updateInvoice(
    id: string,
    updateData: UpdateInvoiceDto,
    user: User
  ): Promise<Invoice> {
    const invoice = await this.findById(id, user);

    // Check permissions - only uploader or admin can update
    if (user.role !== UserRole.ADMIN && invoice.uploadedById !== user.id) {
      throw new ForbiddenException('You can only update invoices you uploaded');
    }

    // Prevent updates to verified invoices unless admin
    if (invoice.isVerified && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Cannot update verified invoices');
    }

    // Validate and apply updates
    if (updateData.amount !== undefined) {
      invoice.updateAmount(updateData.amount);
    }

    if (updateData.invoiceDate) {
      invoice.updateInvoiceDate(updateData.invoiceDate);
    }

    if (updateData.description !== undefined) {
      invoice.description = updateData.description;
    }

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Delete invoice with S3 cleanup
   */
  async deleteInvoice(id: string, user: User): Promise<void> {
    const invoice = await this.findById(id, user);

    // Check permissions - only uploader or admin can delete
    if (user.role !== UserRole.ADMIN && invoice.uploadedById !== user.id) {
      throw new ForbiddenException('You can only delete invoices you uploaded');
    }

    // Prevent deletion of verified invoices unless admin
    if (invoice.isVerified && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Cannot delete verified invoices');
    }

    try {
      // Delete from S3 first
      await this.s3Service.deleteFile(invoice.filePath);

      // Then delete from database
      await this.invoiceRepository.remove(invoice);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete invoice: ${error.message}`
      );
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(): Promise<InvoiceStats> {
    const allInvoices = await this.invoiceRepository.find({
      relations: ['subscription']
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const verified = allInvoices.filter(i => i.isVerified);
    const unverified = allInvoices.filter(i => !i.isVerified);
    const thisMonth = allInvoices.filter(i => {
      const uploadDate = new Date(i.uploadedAt);
      return uploadDate.getMonth() === currentMonth && uploadDate.getFullYear() === currentYear;
    });

    const pendingVerification = unverified.filter(i => !i.isOverdue);
    const overdueVerification = unverified.filter(i => i.isOverdue);

    const totalAmount = verified
      .filter(i => i.amount)
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const averageAmount = verified.length > 0
      ? totalAmount / verified.filter(i => i.amount).length
      : 0;

    return {
      totalInvoices: allInvoices.length,
      verifiedInvoices: verified.length,
      unverifiedInvoices: unverified.length,
      totalAmount,
      averageAmount,
      invoicesThisMonth: thisMonth.length,
      pendingVerification: pendingVerification.length,
      overdueVerification: overdueVerification.length,
    };
  }

  /**
   * Get invoices requiring verification (admin view)
   */
  async getInvoicesForVerification(user: User): Promise<Invoice[]> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can view invoices for verification');
    }

    return await this.invoiceRepository.find({
      where: { isVerified: false },
      relations: ['subscription', 'uploadedBy'],
      order: { uploadedAt: 'ASC' } // Oldest first for verification queue
    });
  }

  /**
   * Get overdue invoices for verification
   */
  async getOverdueInvoices(user: User): Promise<Invoice[]> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can view overdue invoices');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.VERIFICATION_DEADLINE_DAYS);

    return await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.subscription', 'subscription')
      .leftJoinAndSelect('invoice.uploadedBy', 'uploadedBy')
      .where('invoice.isVerified = :isVerified', { isVerified: false })
      .andWhere('invoice.uploadedAt <= :cutoffDate', { cutoffDate })
      .orderBy('invoice.uploadedAt', 'ASC')
      .getMany();
  }

  /**
   * Bulk verify invoices (admin only)
   */
  async bulkVerifyInvoices(
    invoiceIds: string[],
    verifier: User
  ): Promise<Invoice[]> {
    if (verifier.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can bulk verify invoices');
    }

    if (invoiceIds.length === 0) {
      throw new BadRequestException('No invoice IDs provided');
    }

    if (invoiceIds.length > 50) {
      throw new BadRequestException('Cannot verify more than 50 invoices at once');
    }

    const invoices = await this.invoiceRepository.findByIds(invoiceIds);

    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException('Some invoices were not found');
    }

    const alreadyVerified = invoices.filter(i => i.isVerified);
    if (alreadyVerified.length > 0) {
      throw new BadRequestException(
        `Cannot verify already verified invoices: ${alreadyVerified.map(i => i.id).join(', ')}`
      );
    }

    // Verify all invoices
    invoices.forEach(invoice => {
      invoice.verify(verifier.id);
    });

    return await this.invoiceRepository.save(invoices);
  }

  /**
   * Extract metadata from uploaded file (placeholder for future PDF parsing)
   */
  private extractFileMetadata(file: Express.Multer.File): Partial<InvoiceUploadMetadata> {
    // TODO: Implement PDF parsing to extract amount, date, etc.
    // For now, return empty metadata
    return {
      fileName: file.originalname,
      fileSize: file.size,
      contentType: file.mimetype
    };
  }

  /**
   * Generate S3 key with proper naming convention
   */
  private generateS3Key(subscriptionId: string, originalFileName: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `subscriptions/${subscriptionId}/invoices/${timestamp}-${randomSuffix}-${cleanFileName}`;
  }

  /**
   * Validate file upload requirements
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Only PDF files are allowed. Received: ${file.mimetype}`
      );
    }

    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('File must have .pdf extension');
    }
  }

  /**
   * Validate invoice metadata
   */
  private validateInvoiceMetadata(metadata: InvoiceUploadMetadata): void {
    if (metadata.amount !== undefined) {
      if (metadata.amount <= 0) {
        throw new BadRequestException('Invoice amount must be positive');
      }

      if (metadata.amount > 1000000) {
        throw new BadRequestException('Invoice amount is unreasonably large');
      }
    }

    if (metadata.invoiceDate) {
      const now = new Date();
      const invoiceDate = new Date(metadata.invoiceDate);

      if (invoiceDate > now) {
        throw new BadRequestException('Invoice date cannot be in the future');
      }

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(now.getFullYear() - 2);

      if (invoiceDate < twoYearsAgo) {
        throw new BadRequestException('Invoice date cannot be older than 2 years');
      }
    }

    if (metadata.description && metadata.description.length > 1000) {
      throw new BadRequestException('Description cannot exceed 1000 characters');
    }
  }

  /**
   * Validate subscription access based on user role
   */
  private async validateSubscriptionAccess(subscriptionId: string, user: User): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['owner', 'owner.team']
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Admin can access all subscriptions
    if (user.role === UserRole.ADMIN) {
      return subscription;
    }

    // Owner can access their own subscription
    if (subscription.ownerId === user.id) {
      return subscription;
    }

    // Team lead can access team member subscriptions
    if (user.role === UserRole.TEAM_LEAD) {
      const owner = await this.userRepository.findOne({
        where: { id: subscription.ownerId },
        relations: ['team']
      });

      if (owner?.team && owner.team.leadId === user.id) {
        return subscription;
      }
    }

    throw new ForbiddenException('Access denied to this subscription');
  }

  /**
   * Get user's own invoices (all subscriptions owned by user)
   */
  async getMyInvoices(user: User): Promise<Invoice[]> {
    const userSubscriptions = await this.subscriptionRepository.find({
      where: { ownerId: user.id },
      select: ['id']
    });

    if (userSubscriptions.length === 0) {
      return [];
    }

    const subscriptionIds = userSubscriptions.map(s => s.id);

    return await this.invoiceRepository.find({
      where: { subscriptionId: In(subscriptionIds) },
      relations: ['subscription', 'uploadedBy', 'verifiedBy'],
      order: { uploadedAt: 'DESC' }
    });
  }

  /**
   * Search invoices with filters
   */
  async searchInvoices(
    filters: {
      subscriptionId?: string;
      isVerified?: boolean;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
    },
    user: User
  ): Promise<Invoice[]> {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.subscription', 'subscription')
      .leftJoinAndSelect('invoice.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('invoice.verifiedBy', 'verifiedBy');

    // Apply role-based filtering
    if (user.role === UserRole.EMPLOYEE) {
      queryBuilder.andWhere('subscription.ownerId = :userId', { userId: user.id });
    } else if (user.role === UserRole.TEAM_LEAD) {
      // Team lead can see team member invoices
      const teamMembers = await this.userRepository.find({
        where: { teamId: user.teamId },
        select: ['id']
      });
      const memberIds = teamMembers.map(m => m.id);
      queryBuilder.andWhere('subscription.ownerId IN (:...memberIds)', { memberIds });
    }
    // Admin can see all invoices (no additional filtering)

    // Apply filters
    if (filters.subscriptionId) {
      queryBuilder.andWhere('invoice.subscriptionId = :subscriptionId', {
        subscriptionId: filters.subscriptionId
      });
    }

    if (filters.isVerified !== undefined) {
      queryBuilder.andWhere('invoice.isVerified = :isVerified', {
        isVerified: filters.isVerified
      });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('invoice.uploadedAt >= :startDate', {
        startDate: filters.startDate
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('invoice.uploadedAt <= :endDate', {
        endDate: filters.endDate
      });
    }

    if (filters.minAmount !== undefined) {
      queryBuilder.andWhere('invoice.amount >= :minAmount', {
        minAmount: filters.minAmount
      });
    }

    if (filters.maxAmount !== undefined) {
      queryBuilder.andWhere('invoice.amount <= :maxAmount', {
        maxAmount: filters.maxAmount
      });
    }

    return await queryBuilder
      .orderBy('invoice.uploadedAt', 'DESC')
      .getMany();
  }
}