import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SimpleEquipmentController } from './controllers/simple-equipment.controller';
import { EquipmentService } from './services/equipment.service';
import { EquipmentModule } from './services/equipment.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    EquipmentModule,
  ],
  controllers: [SimpleEquipmentController, HealthController],
  providers: [],
})
export class AppModule {}