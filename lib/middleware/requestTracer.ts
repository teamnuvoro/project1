import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export const requestTracer = (req: Request, res: Response, next: NextFunction) => {
    // 1. Generate a Trace ID
    const traceId = uuidv4();

    // 2. Attach it to the request object so other files can use it
    (req as any).traceId = traceId;

    // 3. Attach it to the response headers (so the Frontend sees it too!)
    res.setHeader('X-Trace-ID', traceId);

    // 4. Log the Start
    logger.info({
        type: 'REQUEST_START',
        traceId,
        method: req.method,
        url: req.url,
        userId: (req as any).session?.userId || 'anonymous'
    }, `Incoming ${req.method} ${req.url}`);

    // 5. Log the End (Response Time)
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            type: 'REQUEST_END',
            traceId,
            status: res.statusCode,
            duration: `${duration}ms`
        }, `Completed ${req.method} ${req.url}`);
    });

    next();
};
