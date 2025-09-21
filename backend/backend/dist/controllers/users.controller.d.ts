import { UserService, CreateUserDto, UpdateUserDto, DeactivateUserDto } from '../services/user.service';
import { TeamService, CreateTeamDto, UpdateTeamDto } from '../services/team.service';
import { User, UserRole } from '../models/user.entity';
import { Team } from '../models/team.entity';
export declare class UsersController {
    private readonly userService;
    private readonly teamService;
    constructor(userService: UserService, teamService: TeamService);
    getUsers(role?: UserRole, teamId?: string, isActive?: boolean, page: number, limit: number, req: any): Promise<{
        users: User[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createUser(createUserDto: CreateUserDto, req: any): Promise<User>;
    getUserById(id: string, req: any): Promise<User>;
    updateUser(id: string, updateUserDto: UpdateUserDto, req: any): Promise<User>;
    deactivateUser(id: string, deactivateDto: DeactivateUserDto, req: any): Promise<User>;
    getTeams(req: any): Promise<Team[]>;
    createTeam(createTeamDto: CreateTeamDto, req: any): Promise<Team>;
    getTeamById(id: string, req: any): Promise<Team>;
    updateTeam(id: string, updateTeamDto: UpdateTeamDto, req: any): Promise<Team>;
}
