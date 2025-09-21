import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('User-Agent') || '';
    const startTime = Date.now();

    // Log request
    this.logger.log(`${method} ${originalUrl} - ${ip} - ${userAgent}`);

    // Override the end method to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      const responseTime = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('Content-Length') || '-';

      // Log response
      const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'log';
      const logger = new Logger('HTTP');
      logger[logLevel](
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms - ${ip}`
      );

      // Call the original end method
      originalEnd.call(this, chunk, encoding, cb);
    };

    next();
  }
}