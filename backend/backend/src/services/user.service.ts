import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOptionsWhere, Not, IsNull } from 'typeorm';
import { User, UserRole } from '../models/user.entity';
import { Team } from '../models/team.entity';
import { Equipment, EquipmentStatus } from '../models/equipment.entity';

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  teamId?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  teamId?: string;
}

export interface DeactivateUserDto {
  reason: string;
  transferEquipmentTo?: string;
}

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  teamId?: string;
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

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  /**
   * Create a new user with email validation and team assignment
   */
  async create(userData: CreateUserDto): Promise<User> {
    // Validate email uniqueness
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate team exists if teamId provided
    if (userData.teamId) {
      const team = await this.teamRepository.findOne({
        where: { id: userData.teamId }
      });

      if (!team) {
        throw new BadRequestException('Team not found');
      }
    }

    // Create new user
    const user = this.userRepository.create({
      ...userData,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Load relations for response
    return this.findById(savedUser.id);
  }

  /**
   * Get all users with role-based filtering and pagination
   */
  async findAll(
    filters: UserFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const whereConditions: FindOptionsWhere<User> = {};

    if (filters.role) {
      whereConditions.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      whereConditions.isActive = filters.isActive;
    }

    if (filters.teamId) {
      whereConditions.teamId = filters.teamId;
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereConditions,
      relations: ['team', 'assignedEquipment'],
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID with relations
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['team', 'assignedEquipment', 'subscriptions'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile and roles with authorization checks
   */
  async update(id: string, updateData: UpdateUserDto, currentUser: User): Promise<User> {
    const user = await this.findById(id);

    // Role change authorization check
    if (updateData.role && updateData.role !== user.role) {
      if (currentUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only administrators can change user roles');
      }
    }

    // Validate team assignment if provided
    if (updateData.teamId && updateData.teamId !== user.teamId) {
      const team = await this.teamRepository.findOne({
        where: { id: updateData.teamId }
      });

      if (!team) {
        throw new BadRequestException('Team not found');
      }
    }

    // Update user
    await this.userRepository.update(id, updateData);

    // Return updated user with relations
    return this.findById(id);
  }

  /**
   * Deactivate user with equipment transfer logic
   */
  async deactivate(id: string, deactivationData: DeactivateUserDto, currentUser: User): Promise<User> {
    // Only admins can deactivate users
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can deactivate users');
    }

    const user = await this.findById(id);

    // Check if user is already inactive
    if (!user.isActive) {
      throw new BadRequestException('User is already inactive');
    }

    // Validate equipment transfer target if provided
    if (deactivationData.transferEquipmentTo) {
      const transferTarget = await this.userRepository.findOne({
        where: {
          id: deactivationData.transferEquipmentTo,
          isActive: true
        }
      });

      if (!transferTarget) {
        throw new BadRequestException('Equipment transfer target user not found or inactive');
      }
    }

    // Handle equipment transfer
    const userEquipment = await this.equipmentRepository.find({
      where: { currentOwnerId: id }
    });

    if (userEquipment.length > 0) {
      if (deactivationData.transferEquipmentTo) {
        // Transfer equipment to specified user
        await this.equipmentRepository.update(
          { currentOwnerId: id },
          { currentOwnerId: deactivationData.transferEquipmentTo }
        );
      } else {
        // Return equipment to pool (no owner)
        await this.equipmentRepository.update(
          { currentOwnerId: id },
          {
            currentOwnerId: null,
            status: EquipmentStatus.AVAILABLE
          }
        );
      }
    }

    // Deactivate user
    await this.userRepository.update(id, {
      isActive: false,
      updatedAt: new Date(),
    });

    // Return updated user
    const updatedUser = await this.findById(id);

    // Add equipment transfer info to response
    (updatedUser as any).equipmentTransferred = userEquipment.length > 0;

    return updatedUser;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['team', 'assignedEquipment'],
    });
  }

  /**
   * Find user by Auth0 ID (auth_id)
   */
  async findByAuthId(authId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { authId: authId },
      relations: ['team', 'assignedEquipment'],
    });
  }

  /**
   * Check if user is a team lead for a specific team
   */
  async isTeamLead(userId: string, teamId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.TEAM_LEAD, teamId, isActive: true }
    });
    return !!user;
  }

  /**
   * Find one user (alias for findById for compatibility)
   */
  async findOne(id: string): Promise<User> {
    return this.findById(id);
  }

  /**
   * Get team members by team ID
   */
  async findByTeam(teamId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        teamId,
        isActive: true
      },
      relations: ['team', 'assignedEquipment'],
      order: {
        firstName: 'ASC',
      },
    });
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if user can modify another user
   */
  private canModifyUser(currentUser: User, targetUser: User): boolean {
    // Admins can modify anyone
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    // Team leads can modify their team members (except other team leads/admins)
    if (currentUser.role === UserRole.TEAM_LEAD) {
      return (
        targetUser.teamId === currentUser.teamId &&
        targetUser.role === UserRole.EMPLOYEE
      );
    }

    // Users can only modify themselves (basic profile info)
    return currentUser.id === targetUser.id;
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  }> {
    const [total, active, roleStats] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.role')
        .getRawMany(),
    ]);

    const byRole = {
      [UserRole.EMPLOYEE]: 0,
      [UserRole.TEAM_LEAD]: 0,
      [UserRole.ADMIN]: 0,
    };

    roleStats.forEach(stat => {
      byRole[stat.role as UserRole] = parseInt(stat.count);
    });

    return {
      total,
      active,
      inactive: total - active,
      byRole,
    };
  }
}