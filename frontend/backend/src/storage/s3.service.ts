import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3Service {
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
    const uploadParams = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256',
    };

    return this.s3.upload(uploadParams).promise();
  }

  async getFileUrl(key: string): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: 3600, // URL expires in 1 hour
    };

    return this.s3.getSignedUrl('getObject', params);
  }

  async deleteFile(key: string): Promise<AWS.S3.DeleteObjectOutput> {
    const deleteParams = {
      Bucket: this.bucketName,
      Key: key,
    };

    return this.s3.deleteObject(deleteParams).promise();
  }
}