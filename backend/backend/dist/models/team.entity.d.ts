import { User } from './user.entity';
export declare class Team {
    id: string;
    name: string;
    leadId: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    lead: User;
    members: User[];
    get teamEquipment(): any[];
}
