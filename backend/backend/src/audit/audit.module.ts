import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';

@Module({
  providers: [
    {
      provide: 'MONGODB_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get('MONGODB_URI', 'mongodb://localhost:27017');
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 2,
        });

        try {
          await client.connect();
          console.log('Connected to MongoDB for audit logging');

          const db = client.db(configService.get('MONGODB_DB_NAME', 'asset_management_audit'));

          // Create indexes for better performance
          await db.collection('audit_logs').createIndex({
            entityType: 1,
            entityId: 1,
            timestamp: -1
          });
          await db.collection('audit_logs').createIndex({
            userId: 1,
            timestamp: -1
          });

          return db;
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