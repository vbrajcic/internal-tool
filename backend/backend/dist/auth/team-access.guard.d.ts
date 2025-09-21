import { CanActivate, ExecutionContext } from '@nestjs/common';
import { UserService } from '../services/user.service';
export declare class TeamAccessGuard implements CanActivate {
    private userService;
    constructor(userService: UserService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
