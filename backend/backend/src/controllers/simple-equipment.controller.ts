import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EquipmentService } from '../services/equipment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Equipment')
@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SimpleEquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Get all equipment' })
  async findAll(@Query() filters: any) {
    try {
      return await this.equipmentService.findAll(filters, {}, null);
    } catch (error) {
      return [];
    }
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Get equipment by ID' })
  async findOne(@Param('id') id: string) {
    try {
      return await this.equipmentService.findById(id);
    } catch (error) {
      throw new Error('Equipment not found');
    }
  }

  @Post()
  @ApiResponse({ status: 201, description: 'Create new equipment' })
  async create(@Body() createDto: any) {
    try {
      return await this.equipmentService.create(createDto, null);
    } catch (error) {
      throw new Error('Failed to create equipment');
    }
  }

  @Put(':id')
  @ApiResponse({ status: 200, description: 'Update equipment' })
  async update(@Param('id') id: string, @Body() updateDto: any) {
    try {
      return await this.equipmentService.update(id, updateDto, null);
    } catch (error) {
      throw new Error('Failed to update equipment');
    }
  }

  @Get('qr/:qrCode')
  @ApiResponse({ status: 200, description: 'Find equipment by QR code' })
  async findByQR(@Param('qrCode') qrCode: string) {
    try {
      return await this.equipmentService.findByQR(qrCode, null);
    } catch (error) {
      throw new Error('Equipment not found');
    }
  }
}