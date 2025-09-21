export declare class HealthController {
    check(): {
        status: string;
        timestamp: string;
        service: string;
        version: string;
    };
    root(): {
        message: string;
        status: string;
        endpoints: string[];
        timestamp: string;
    };
}
