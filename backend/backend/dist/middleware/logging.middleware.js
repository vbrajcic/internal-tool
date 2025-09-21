"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingMiddleware = void 0;
const common_1 = require("@nestjs/common");
let LoggingMiddleware = class LoggingMiddleware {
    constructor() {
        this.logger = new common_1.Logger('HTTP');
    }
    use(req, res, next) {
        const { method, originalUrl, ip } = req;
        const userAgent = req.get('User-Agent') || '';
        const startTime = Date.now();
        this.logger.log(`${method} ${originalUrl} - ${ip} - ${userAgent}`);
        const originalEnd = res.end;
        res.end = function (chunk, encoding, cb) {
            const responseTime = Date.now() - startTime;
            const { statusCode } = res;
            const contentLength = res.get('Content-Length') || '-';
            const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'log';
            const logger = new common_1.Logger('HTTP');
            logger[logLevel](`${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms - ${ip}`);
            originalEnd.call(this, chunk, encoding, cb);
        };
        next();
    }
};
exports.LoggingMiddleware = LoggingMiddleware;
exports.LoggingMiddleware = LoggingMiddleware = __decorate([
    (0, common_1.Injectable)()
], LoggingMiddleware);
//# sourceMappingURL=logging.middleware.js.map