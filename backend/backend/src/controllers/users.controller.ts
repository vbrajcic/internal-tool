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
  ParseBoolPipe,
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
import { UserService, CreateUserDto, UpdateUserDto, DeactivateUserDto, UserFilters, PaginationOptions } from '../services/user.service';
import { TeamService, CreateTeamDto, UpdateTeamDto, TeamFilters } from '../services/team.service';
import { User, UserRole } from '../models/user.entity';
import { Team } from '../models/team.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users-teams')
@ApiBearerAuth()
@Controller('api')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly userService: UserService,
    private readonly teamService: TeamService,
  ) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  @Get('users')
  @ApiOperation({
    summary: 'List users',
    description: 'Get users with filtering and role-based visibility'
  })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  @ApiQuery({ name: 'teamId', type: 'string', required: false })
  @ApiQuery({ name: 'isActive', type: 'boolean', required: false })
  @ApiQuery({ name: 'page', type: 'number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { $ref: '#/components/schemas/User' }
        },
        pagination: { $ref: '#/components/schemas/Pagination' }
      }
    }
  })
  async getUsers(
    @Req() req: any,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query("role") role?: UserRole,
    @Query("teamId", new ParseUUIDPipe({ optional: true })) teamId?: string,
    @Query("isActive", new ParseBoolPipe({ optional: true })) isActive?: boolean,  ) {
    const currentUser: User = req.user;

    // Role-based filtering
    const filters: UserFilters = {};
    if (role) filters.role = role;
    if (teamId) filters.teamId = teamId;
    if (isActive !== undefined) filters.isActive = isActive;

    // Team leads can only see their team members
    if (currentUser.role === UserRole.TEAM_LEAD) {
      filters.teamId = currentUser.teamId;
    }

    const pagination: PaginationOptions = { page, limit };
    const result = await this.userService.findAll(filters, pagination);

    return {
      users: result.items,
      pagination: result.pagination,
    };
  }

  @Post('users')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Invite new user',
    description: 'Create new user invitation with role assignment'
  })
  @ApiBody({
    description: 'User creation data',
    schema: {
      type: 'object',
      required: ['email', 'firstName', 'lastName', 'role'],
      properties: {
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { enum: Object.values(UserRole) },
        teamId: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'User invitation sent successfully',
    type: User
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
    @Req() req: any,
  ): Promise<User> {
    return this.userService.create(createUserDto);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get user details',
    description: 'Retrieve user with assigned equipment and subscriptions'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved',
    type: User
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<User> {
    const currentUser: User = req.user;
    const user = await this.userService.findById(id);

    // Authorization check
    if (currentUser.role === UserRole.EMPLOYEE && currentUser.id !== id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    if (currentUser.role === UserRole.TEAM_LEAD &&
        currentUser.teamId !== user.teamId &&
        currentUser.id !== id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return user;
  }

  @Put('users/:id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user profile and role assignment'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'User update data',
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { enum: Object.values(UserRole) },
        teamId: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: User
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
    @Req() req: any,
  ): Promise<User> {
    const currentUser: User = req.user;
    return this.userService.update(id, updateUserDto, currentUser);
  }

  @Post('users/:id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Deactivate user (preserve audit trail)',
    description: 'Deactivate user and handle equipment transfer'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Deactivation data',
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string' },
        transferEquipmentTo: { type: 'string', nullable: true }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
    type: User
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) deactivateDto: DeactivateUserDto,
    @Req() req: any,
  ): Promise<User> {
    const currentUser: User = req.user;
    return this.userService.deactivate(id, deactivateDto, currentUser);
  }

  // ============================================================================
  // TEAM ENDPOINTS
  // ============================================================================

  @Get('teams')
  @ApiOperation({
    summary: 'List teams',
    description: 'Get all teams with lead information'
  })
  @ApiResponse({
    status: 200,
    description: 'Teams retrieved successfully',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/Team' }
    }
  })
  async getTeams(@Req() req: any): Promise<Team[]> {
    const currentUser: User = req.user;

    // Role-based filtering can be applied here if needed
    const filters: TeamFilters = {};

    const result = await this.teamService.findAll(filters);
    return result.items;
  }

  @Post('teams')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create team',
    description: 'Create new team with lead assignment'
  })
  @ApiBody({
    description: 'Team creation data',
    schema: {
      type: 'object',
      required: ['name', 'leadId'],
      properties: {
        name: { type: 'string' },
        leadId: { type: 'string' },
        description: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
    type: Team
  })
  async createTeam(
    @Body(ValidationPipe) createTeamDto: CreateTeamDto,
    @Req() req: any,
  ): Promise<Team> {
    const currentUser: User = req.user;
    return this.teamService.create(createTeamDto, currentUser);
  }

  @Get('teams/:id')
  @ApiOperation({
    summary: 'Get team details',
    description: 'Retrieve team with members and equipment'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Team details retrieved',
    type: Team
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getTeamById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<Team> {
    const currentUser: User = req.user;
    const team = await this.teamService.findById(id);

    // Authorization check for team leads
    if (currentUser.role === UserRole.TEAM_LEAD && currentUser.teamId !== id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return team;
  }

  @Put('teams/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update team',
    description: 'Update team information and lead assignment'
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({
    description: 'Team update data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        leadId: { type: 'string' },
        description: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Team updated successfully',
    type: Team
  })
  async updateTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateTeamDto: UpdateTeamDto,
    @Req() req: any,
  ): Promise<Team> {
    const currentUser: User = req.user;
    return this.teamService.update(id, updateTeamDto, currentUser);
  }
}