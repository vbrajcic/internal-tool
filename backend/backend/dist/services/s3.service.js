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
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const AWS = require("aws-sdk");
let S3Service = class S3Service {
    constructor(configService) {
        this.configService = configService;
        this.s3 = new AWS.S3({
            accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
            secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
            region: configService.get('AWS_REGION', 'us-east-1'),
        });
        this.bucketName = configService.get('AWS_S3_BUCKET_NAME', 'asset-management-invoices');
    }
    async uploadFile(file, key) {
        const uploadParams = {
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ServerSideEncryption: 'AES256',
        };
        return this.s3.upload(uploadParams).promise();
    }
    async getFileUrl(key) {
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Expires: 3600,
        };
        return this.s3.getSignedUrl('getObject', params);
    }
    async deleteFile(key) {
        const deleteParams = {
            Bucket: this.bucketName,
            Key: key,
        };
        return this.s3.deleteObject(deleteParams).promise();
    }
};
exports.S3Service = S3Service;
exports.S3Service = S3Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3Service);
//# sourceMappingURL=s3.service.js.map