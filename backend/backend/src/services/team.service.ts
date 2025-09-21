import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Team } from '../models/team.entity';
import { User, UserRole } from '../models/user.entity';
import { Equipment } from '../models/equipment.entity';

export interface CreateTeamDto {
  name: string;
  leadId: string;
  description?: string;
}

export interface UpdateTeamDto {
  name?: string;
  leadId?: string;
  description?: string;
}

export interface TeamFilters {
  leadId?: string;
  hasLead?: boolean;
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
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  /**
   * Create a new team with lead assignment validation
   */
  async create(teamData: CreateTeamDto, currentUser?: User): Promise<Team> {
    // Validate team name uniqueness
    const existingTeam = await this.teamRepository.findOne({
      where: { name: teamData.name }
    });

    if (existingTeam) {
      throw new ConflictException('Team with this name already exists');
    }

    // Validate team lead exists and has appropriate role
    const teamLead = await this.userRepository.findOne({
      where: { id: teamData.leadId, isActive: true }
    });

    if (!teamLead) {
      throw new BadRequestException('Team lead not found or inactive');
    }

    // Validate team lead has appropriate role (TeamLead or Admin)
    if (teamLead.role !== UserRole.TEAM_LEAD && teamLead.role !== UserRole.ADMIN) {
      throw new BadRequestException('Team lead must have TeamLead or Admin role');
    }

    // Create new team
    const team = this.teamRepository.create({
      name: teamData.name,
      leadId: teamData.leadId,
      description: teamData.description,
    });

    const savedTeam = await this.teamRepository.save(team);

    // Load relations for response
    return this.findById(savedTeam.id);
  }

  /**
   * Get all teams with filtering and pagination
   */
  async findAll(
    filters: TeamFilters = {},
    pagination: PaginationOptions = {},
    currentUser?: User
  ): Promise<PaginatedResult<Team>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const whereConditions: FindOptionsWhere<Team> = {};

    // Apply filters
    if (filters.leadId) {
      whereConditions.leadId = filters.leadId;
    }

    // Role-based filtering for team visibility
    if (currentUser?.role === UserRole.TEAM_LEAD) {
      // Team leads can only see their own team in list view
      whereConditions.leadId = currentUser.id;
    }

    const queryBuilder = this.teamRepository.createQueryBuilder('team')
      .leftJoinAndSelect('team.lead', 'lead')
      .leftJoinAndSelect('team.members', 'members')
      .skip(skip)
      .take(limit)
      .orderBy('team.createdAt', 'DESC');

    // Apply where conditions
    if (Object.keys(whereConditions).length > 0) {
      Object.entries(whereConditions).forEach(([key, value], index) => {
        if (index === 0) {
          queryBuilder.where(`team.${key} = :${key}`, { [key]: value });
        } else {
          queryBuilder.andWhere(`team.${key} = :${key}`, { [key]: value });
        }
      });
    }

    const [teams, total] = await queryBuilder.getManyAndCount();

    return {
      items: teams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get team by ID with members and equipment
   */
  async findById(id: string, currentUser?: User): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['lead', 'members', 'members.assignedEquipment'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Enforce team visibility for team leads
    if (currentUser?.role === UserRole.TEAM_LEAD && team.leadId !== currentUser.id) {
      throw new ForbiddenException('Access denied: You can only view your own team details');
    }

    return team;
  }

  /**
   * Update team details with validation
   */
  async update(id: string, updateData: UpdateTeamDto, currentUser?: User): Promise<Team> {
    const team = await this.findById(id);

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== team.name) {
      const existingTeam = await this.teamRepository.findOne({
        where: { name: updateData.name }
      });

      if (existingTeam) {
        throw new ConflictException('Team with this name already exists');
      }
    }

    // Validate new team lead if leadId is being updated
    if (updateData.leadId && updateData.leadId !== team.leadId) {
      const newLead = await this.userRepository.findOne({
        where: { id: updateData.leadId, isActive: true }
      });

      if (!newLead) {
        throw new BadRequestException('New team lead not found or inactive');
      }

      // Validate new team lead has appropriate role
      if (newLead.role !== UserRole.TEAM_LEAD && newLead.role !== UserRole.ADMIN) {
        throw new BadRequestException('Team lead must have TeamLead or Admin role');
      }
    }

    // Update team
    await this.teamRepository.update(id, {
      ...updateData,
      updatedAt: new Date(),
    });

    // Return updated team with relations
    return this.findById(id);
  }

  /**
   * Delete team with member reassignment validation
   */
  async delete(id: string): Promise<void> {
    const team = await this.findById(id);

    // Check if team has active members
    const activeMembers = await this.userRepository.count({
      where: {
        teamId: id,
        isActive: true
      }
    });

    if (activeMembers > 0) {
      throw new BadRequestException('Cannot delete team with active members. Please reassign members first.');
    }

    // Delete the team
    await this.teamRepository.delete(id);
  }

  /**
   * Assign team lead with role validation
   */
  async setLead(teamId: string, leadId: string): Promise<Team> {
    const team = await this.findById(teamId);

    // Validate new team lead
    const newLead = await this.userRepository.findOne({
      where: { id: leadId, isActive: true }
    });

    if (!newLead) {
      throw new BadRequestException('Team lead not found or inactive');
    }

    // Validate team lead has appropriate role
    if (newLead.role !== UserRole.TEAM_LEAD && newLead.role !== UserRole.ADMIN) {
      throw new BadRequestException('Team lead must have TeamLead or Admin role');
    }

    // Update team lead
    await this.teamRepository.update(teamId, {
      leadId,
      updatedAt: new Date(),
    });

    return this.findById(teamId);
  }

  /**
   * Get team members with equipment information
   */
  async getMembers(teamId: string, currentUser?: User): Promise<User[]> {
    // Verify team exists and user has access
    await this.findById(teamId, currentUser);

    return this.userRepository.find({
      where: {
        teamId,
        isActive: true
      },
      relations: ['assignedEquipment'],
      order: {
        firstName: 'ASC',
        lastName: 'ASC',
      },
    });
  }

  /**
   * Get teams by lead ID
   */
  async findByLead(leadId: string): Promise<Team[]> {
    return this.teamRepository.find({
      where: { leadId },
      relations: ['members', 'lead'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Check if user can access team information
   */
  private canAccessTeam(currentUser: User, team: Team): boolean {
    // Admins can access any team
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    // Team leads can only access their own team
    if (currentUser.role === UserRole.TEAM_LEAD) {
      return team.leadId === currentUser.id;
    }

    // Employees can view team information if they're part of the team
    return currentUser.teamId === team.id;
  }

  /**
   * Get team statistics for admin dashboard
   */
  async getTeamStats(): Promise<{
    total: number;
    withLeads: number;
    withoutLeads: number;
    avgMembersPerTeam: number;
    memberDistribution: { teamName: string; memberCount: number }[];
  }> {
    const [total, withLeads, memberStats] = await Promise.all([
      this.teamRepository.count(),
      this.teamRepository
        .createQueryBuilder('team')
        .where('team.leadId IS NOT NULL')
        .getCount(),
      this.teamRepository
        .createQueryBuilder('team')
        .leftJoin('team.members', 'member', 'member.isActive = :isActive', { isActive: true })
        .select('team.name', 'teamName')
        .addSelect('COUNT(member.id)', 'memberCount')
        .groupBy('team.id')
        .addGroupBy('team.name')
        .orderBy('COUNT(member.id)', 'DESC')
        .getRawMany(),
    ]);

    const totalMembers = memberStats.reduce((sum, stat) => sum + parseInt(stat.memberCount), 0);
    const avgMembersPerTeam = total > 0 ? totalMembers / total : 0;

    return {
      total,
      withLeads,
      withoutLeads: total - withLeads,
      avgMembersPerTeam: Math.round(avgMembersPerTeam * 100) / 100,
      memberDistribution: memberStats.map(stat => ({
        teamName: stat.teamName,
        memberCount: parseInt(stat.memberCount)
      })),
    };
  }

  /**
   * Validate team name format
   */
  private validateTeamName(name: string): boolean {
    return name && name.trim().length >= 2 && name.trim().length <= 100;
  }

  /**
   * Get team equipment through members
   */
  async getTeamEquipment(teamId: string, currentUser?: User): Promise<Equipment[]> {
    // Verify team exists and user has access
    await this.findById(teamId, currentUser);

    const members = await this.getMembers(teamId, currentUser);

    if (members.length === 0) {
      return [];
    }

    const memberIds = members.map(member => member.id);

    if (memberIds.length === 0) {
      return [];
    }

    return this.equipmentRepository
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.currentOwner', 'owner')
      .where('equipment.currentOwnerId IN (:...memberIds)', { memberIds })
      .orderBy('equipment.name', 'ASC')
      .getMany();
  }

  /**
   * Reassign team members to another team
   */
  async reassignMembers(fromTeamId: string, toTeamId: string): Promise<void> {
    // Validate both teams exist
    const [fromTeam, toTeam] = await Promise.all([
      this.findById(fromTeamId),
      this.findById(toTeamId),
    ]);

    // Update all active members from old team to new team
    await this.userRepository.update(
      {
        teamId: fromTeamId,
        isActive: true
      },
      {
        teamId: toTeamId,
        updatedAt: new Date(),
      }
    );
  }
}