import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { UserRole } from './roles.guard';

@Injectable()
export class TeamAccessGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin users have access to all teams
    if (user.roles?.includes(UserRole.ADMIN)) {
      return true;
    }

    // Get the target user ID from request parameters
    const targetUserId = request.params.userId || request.params.id;
    const teamId = request.params.teamId;

    if (!targetUserId && !teamId) {
      return true; // No specific team access check needed
    }

    try {
      const currentUser = await this.userService.findByAuthId(user.userId);

      if (!currentUser) {
        throw new ForbiddenException('User not found');
      }

      // Team leads can access their own team members
      if (user.roles?.includes(UserRole.TEAM_LEAD)) {
        if (teamId) {
          // Check if the team lead manages this team
          const isTeamLead = await this.userService.isTeamLead(currentUser.id, teamId);
          if (isTeamLead) {
            return true;
          }
        }

        if (targetUserId) {
          // Check if the target user is in the team lead's team
          const targetUser = await this.userService.findOne(targetUserId);
          if (targetUser && targetUser.teamId === currentUser.teamId) {
            return true;
          }
        }
      }

      // Employees can only access their own data
      if (targetUserId === currentUser.id) {
        return true;
      }

      throw new ForbiddenException('Access denied to this team resource');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Access validation failed');
    }
  }
}