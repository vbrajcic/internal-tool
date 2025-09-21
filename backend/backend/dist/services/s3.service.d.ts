import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
export declare class S3Service {
    private configService;
    private s3;
    private bucketName;
    constructor(configService: ConfigService);
    uploadFile(file: Express.Multer.File, key: string): Promise<AWS.S3.ManagedUpload.SendData>;
    getFileUrl(key: string): Promise<string>;
    deleteFile(key: string): Promise<AWS.S3.DeleteObjectOutput>;
}
