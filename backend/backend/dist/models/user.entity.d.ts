import { Team } from './team.entity';
import { Equipment } from './equipment.entity';
import { Subscription } from './subscription.entity';
import { Request } from './request.entity';
export declare enum UserRole {
    EMPLOYEE = "Employee",
    TEAM_LEAD = "TeamLead",
    ADMIN = "Admin"
}
export declare class User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    teamId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    team: Team;
    assignedEquipment: Equipment[];
    subscriptions: Subscription[];
    requests: Request[];
    teamLeadRequests: Request[];
    adminRequests: Request[];
}
