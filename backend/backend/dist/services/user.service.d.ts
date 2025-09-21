import { Repository } from 'typeorm';
import { User, UserRole } from '../models/user.entity';
import { Team } from '../models/team.entity';
import { Equipment } from '../models/equipment.entity';
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
export declare class UserService {
    private readonly userRepository;
    private readonly teamRepository;
    private readonly equipmentRepository;
    constructor(userRepository: Repository<User>, teamRepository: Repository<Team>, equipmentRepository: Repository<Equipment>);
    create(userData: CreateUserDto): Promise<User>;
    findAll(filters?: UserFilters, pagination?: PaginationOptions): Promise<PaginatedResult<User>>;
    findById(id: string): Promise<User>;
    update(id: string, updateData: UpdateUserDto, currentUser: User): Promise<User>;
    deactivate(id: string, deactivationData: DeactivateUserDto, currentUser: User): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findByTeam(teamId: string): Promise<User[]>;
    private validateEmail;
    private canModifyUser;
    getUserStats(): Promise<{
        total: number;
        active: number;
        inactive: number;
        byRole: Record<UserRole, number>;
    }>;
}
