import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = {
          type: 'postgres' as const,
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', 'password'),
          database: configService.get('DB_NAME', 'asset_management'),
          entities: [__dirname + '/../models/*.entity{.ts,.js}'],
          synchronize: configService.get('NODE_ENV') !== 'production',
          logging: configService.get('NODE_ENV') === 'development',
          ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
          retryAttempts: 3,
          retryDelay: 3000,
          maxQueryExecutionTime: 10000,
        };

        // Use DATABASE_URL if provided (Railway)
        if (configService.get('DATABASE_URL')) {
          (config as any).url = configService.get('DATABASE_URL');
        }

        return config;
      },
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}