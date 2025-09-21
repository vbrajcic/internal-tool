import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';

@Module({
  providers: [
    {
      provide: 'MONGODB_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get('MONGODB_URI', 'mongodb://localhost:27017');
        const client = new MongoClient(uri);

        try {
          await client.connect();
          console.log('Connected to MongoDB for audit logging');
          return client.db(configService.get('MONGODB_DB_NAME', 'asset_management_audit'));
        } catch (error) {
          console.error('Failed to connect to MongoDB:', error);
          throw error;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['MONGODB_CONNECTION'],
})
export class AuditModule {}