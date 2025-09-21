import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { TeamAccessGuard } from './team-access.guard';
import { UserModule } from '../services/user.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
  ],
  providers: [JwtStrategy, RolesGuard, TeamAccessGuard],
  exports: [JwtStrategy, RolesGuard, TeamAccessGuard],
})
export class AuthModule {}