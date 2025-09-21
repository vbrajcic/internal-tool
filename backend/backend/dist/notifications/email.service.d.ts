import { ConfigService } from '@nestjs/config';
export interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    template?: string;
    templateData?: Record<string, any>;
}
export declare class EmailService {
    private configService;
    private readonly logger;
    private transporter;
    constructor(configService: ConfigService);
    private initializeTransporter;
    sendEmail(options: EmailOptions): Promise<void>;
    private getTemplateHtml;
    sendRequestNotification(type: 'submitted' | 'approved' | 'rejected', data: any): Promise<void>;
    sendTransferNotification(data: any): Promise<void>;
    sendSubscriptionReminder(data: any): Promise<void>;
}
