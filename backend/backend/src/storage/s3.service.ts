import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3: AWS.S3;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      region: configService.get('AWS_REGION', 'us-east-1'),
    });
    this.bucketName = configService.get('AWS_S3_BUCKET_NAME', 'asset-management-invoices');
  }

  async uploadFile(
    file: Express.Multer.File,
    key: string,
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    try {
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'uploaded-by': 'asset-management-system',
          'upload-date': new Date().toISOString(),
        },
      };

      this.logger.log(`Uploading file to S3: ${key}`);
      const result = await this.s3.upload(uploadParams).promise();
      this.logger.log(`File uploaded successfully: ${result.Location}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}:`, error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn,
      };

      return this.s3.getSignedUrl('getObject', params);
    } catch (error) {
      this.logger.error(`Failed to get signed URL for ${key}:`, error);
      throw new Error(`Failed to generate file URL: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<AWS.S3.DeleteObjectOutput> {
    try {
      const deleteParams = {
        Bucket: this.bucketName,
        Key: key,
      };

      this.logger.log(`Deleting file from S3: ${key}`);
      const result = await this.s3.deleteObject(deleteParams).promise();
      this.logger.log(`File deleted successfully: ${key}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      return await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
    } catch (error) {
      this.logger.error(`Failed to get metadata for ${key}:`, error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }
}