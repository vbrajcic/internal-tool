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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
const aws_sdk_1 = require("aws-sdk");
let EmailService = EmailService_1 = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.initializeTransporter();
    }
    initializeTransporter() {
        const emailProvider = this.configService.get('EMAIL_PROVIDER', 'ses');
        if (emailProvider === 'ses') {
            const ses = new aws_sdk_1.SES({
                accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
                region: this.configService.get('AWS_SES_REGION', 'us-east-1'),
            });
            this.transporter = nodemailer.createTransporter({
                SES: { ses, aws: { SES: aws_sdk_1.SES } },
            });
        }
        else {
            this.transporter = nodemailer.createTransporter({
                host: this.configService.get('SMTP_HOST'),
                port: this.configService.get('SMTP_PORT', 587),
                secure: this.configService.get('SMTP_SECURE', false),
                auth: {
                    user: this.configService.get('SMTP_USER'),
                    pass: this.configService.get('SMTP_PASS'),
                },
            });
        }
    }
    async sendEmail(options) {
        try {
            const emailData = {
                from: this.configService.get('EMAIL_FROM', 'noreply@company.com'),
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                text: options.text,
                html: options.html || this.getTemplateHtml(options.template, options.templateData),
            };
            this.logger.log(`Sending email to: ${emailData.to}, Subject: ${emailData.subject}`);
            const result = await this.transporter.sendMail(emailData);
            this.logger.log(`Email sent successfully. Message ID: ${result.messageId}`);
        }
        catch (error) {
            this.logger.error('Failed to send email:', error);
            throw new Error(`Email sending failed: ${error.message}`);
        }
    }
    getTemplateHtml(template, data = {}) {
        const templates = {
            requestSubmitted: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Equipment Request Submitted</h2>
          <p>Hello ${data.teamLeadName},</p>
          <p>A new equipment request has been submitted by <strong>${data.requesterName}</strong> and requires your review.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Request Details:</h3>
            <p><strong>Equipment Type:</strong> ${data.equipmentType}</p>
            <p><strong>Justification:</strong> ${data.justification}</p>
            ${data.specifications ? `<p><strong>Specifications:</strong> ${data.specifications}</p>` : ''}
          </div>

          <p>Please review this request at your earliest convenience.</p>
          <p><a href="${data.reviewUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Request</a></p>

          <p>Best regards,<br>Asset Management System</p>
        </div>
      `,
            requestApproved: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Equipment Request Approved</h2>
          <p>Hello ${data.requesterName},</p>
          <p>Your equipment request has been <strong>approved</strong>.</p>

          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Approved Request:</h3>
            <p><strong>Equipment Type:</strong> ${data.equipmentType}</p>
            <p><strong>Status:</strong> ${data.status}</p>
          </div>

          <p>You will be notified when the equipment has been ordered and assigned to you.</p>

          <p>Best regards,<br>Asset Management System</p>
        </div>
      `,
            requestRejected: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Equipment Request Rejected</h2>
          <p>Hello ${data.requesterName},</p>
          <p>Unfortunately, your equipment request has been <strong>rejected</strong>.</p>

          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Rejected Request:</h3>
            <p><strong>Equipment Type:</strong> ${data.equipmentType}</p>
            ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ''}
          </div>

          <p>If you have questions about this decision, please contact your team lead or administrator.</p>

          <p>Best regards,<br>Asset Management System</p>
        </div>
      `,
            equipmentTransferred: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Equipment Transfer Notification</h2>
          <p>Hello ${data.userName},</p>
          <p>Equipment has been ${data.transferType.toLowerCase()} to you.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Equipment Details:</h3>
            <p><strong>Equipment:</strong> ${data.equipmentBrand} ${data.equipmentModel}</p>
            <p><strong>Serial Number:</strong> ${data.serialNumber}</p>
            <p><strong>Type:</strong> ${data.equipmentType}</p>
            <p><strong>Transfer Reason:</strong> ${data.reason}</p>
          </div>

          <p>Please confirm receipt of this equipment when you receive it.</p>

          <p>Best regards,<br>Asset Management System</p>
        </div>
      `,
            subscriptionReminder: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Subscription Renewal Reminder</h2>
          <p>Hello ${data.ownerName},</p>
          <p>Your subscription <strong>${data.subscriptionName}</strong> is due for renewal.</p>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Subscription Details:</h3>
            <p><strong>Service:</strong> ${data.subscriptionName}</p>
            <p><strong>Renewal Date:</strong> ${data.renewalDate}</p>
            <p><strong>Price:</strong> $${data.price} (${data.billingFrequency})</p>
            <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
          </div>

          <p>Please ensure the renewal payment is processed on time to avoid service interruption.</p>

          <p>Best regards,<br>Asset Management System</p>
        </div>
      `,
        };
        return templates[template] || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Notification</h2>
        <p>You have received a notification from the Asset Management System.</p>
        <p>Best regards,<br>Asset Management System</p>
      </div>
    `;
    }
    async sendRequestNotification(type, data) {
        const subjects = {
            submitted: 'New Equipment Request Awaiting Review',
            approved: 'Equipment Request Approved',
            rejected: 'Equipment Request Rejected',
        };
        await this.sendEmail({
            to: data.email,
            subject: subjects[type],
            template: `request${type.charAt(0).toUpperCase() + type.slice(1)}`,
            templateData: data,
        });
    }
    async sendTransferNotification(data) {
        await this.sendEmail({
            to: data.email,
            subject: 'Equipment Transfer Notification',
            template: 'equipmentTransferred',
            templateData: data,
        });
    }
    async sendSubscriptionReminder(data) {
        await this.sendEmail({
            to: data.email,
            subject: `Subscription Renewal Reminder - ${data.subscriptionName}`,
            template: 'subscriptionReminder',
            templateData: data,
        });
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map