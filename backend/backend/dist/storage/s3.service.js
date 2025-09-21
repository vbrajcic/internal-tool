"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var S3Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const AWS = require("aws-sdk");
let S3Service = S3Service_1 = class S3Service {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(S3Service_1.name);
        this.s3 = new AWS.S3({
            accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
            secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
            region: configService.get('AWS_REGION', 'us-east-1'),
        });
        this.bucketName = configService.get('AWS_S3_BUCKET_NAME', 'asset-management-invoices');
    }
    async uploadFile(file, key) {
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
        }
        catch (error) {
            this.logger.error(`Failed to upload file ${key}:`, error);
            throw new Error(`File upload failed: ${error.message}`);
        }
    }
    async getFileUrl(key, expiresIn = 3600) {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: key,
                Expires: expiresIn,
            };
            return this.s3.getSignedUrl('getObject', params);
        }
        catch (error) {
            this.logger.error(`Failed to get signed URL for ${key}:`, error);
            throw new Error(`Failed to generate file URL: ${error.message}`);
        }
    }
    async deleteFile(key) {
        try {
            const deleteParams = {
                Bucket: this.bucketName,
                Key: key,
            };
            this.logger.log(`Deleting file from S3: ${key}`);
            const result = await this.s3.deleteObject(deleteParams).promise();
            this.logger.log(`File deleted successfully: ${key}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to delete file ${key}:`, error);
            throw new Error(`File deletion failed: ${error.message}`);
        }
    }
    async fileExists(key) {
        try {
            await this.s3.headObject({
                Bucket: this.bucketName,
                Key: key,
            }).promise();
            return true;
        }
        catch (error) {
            if (error.code === 'NotFound') {
                return false;
            }
            throw error;
        }
    }
    async getFileMetadata(key) {
        try {
            return await this.s3.headObject({
                Bucket: this.bucketName,
                Key: key,
            }).promise();
        }
        catch (error) {
            this.logger.error(`Failed to get metadata for ${key}:`, error);
            throw new Error(`Failed to get file metadata: ${error.message}`);
        }
    }
};
exports.S3Service = S3Service;
exports.S3Service = S3Service = S3Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3Service);
//# sourceMappingURL=s3.service.js.map