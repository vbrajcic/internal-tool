import { Repository } from 'typeorm';
import { Team } from '../models/team.entity';
import { User } from '../models/user.entity';
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
export declare class TeamService {
    private readonly teamRepository;
    private readonly userRepository;
    private readonly equipmentRepository;
    constructor(teamRepository: Repository<Team>, userRepository: Repository<User>, equipmentRepository: Repository<Equipment>);
    create(teamData: CreateTeamDto, currentUser?: User): Promise<Team>;
    findAll(filters?: TeamFilters, pagination?: PaginationOptions, currentUser?: User): Promise<PaginatedResult<Team>>;
    findById(id: string, currentUser?: User): Promise<Team>;
    update(id: string, updateData: UpdateTeamDto, currentUser?: User): Promise<Team>;
    delete(id: string): Promise<void>;
    setLead(teamId: string, leadId: string): Promise<Team>;
    getMembers(teamId: string, currentUser?: User): Promise<User[]>;
    findByLead(leadId: string): Promise<Team[]>;
    private canAccessTeam;
    getTeamStats(): Promise<{
        total: number;
        withLeads: number;
        withoutLeads: number;
        avgMembersPerTeam: number;
        memberDistribution: {
            teamName: string;
            memberCount: number;
        }[];
    }>;
    private validateTeamName;
    getTeamEquipment(teamId: string, currentUser?: User): Promise<Equipment[]>;
    reassignMembers(fromTeamId: string, toTeamId: string): Promise<void>;
}
