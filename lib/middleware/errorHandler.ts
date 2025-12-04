import * as Sentry from "@sentry/node";
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const globalErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const traceId = (req as any).traceId;

    // 1. Send to Sentry (The Cloud)
    Sentry.captureException(err, {
        extra: { traceId, body: req.body, query: req.query }
    });

    // 2. Log to Console (The Terminal)
    logger.error({
        type: 'APP_ERROR',
        traceId,
        error: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path
    }, '💥 UNHANDLED ERROR CAUGHT');

    // 3. Reply to User (Don't hang!)
    // Check if headers were already sent (fixes ERR_CONTENT_LENGTH_MISMATCH)
    if (!res.headersSent) {
        res.status(err.status || 500).json({
            error: "Internal Server Error",
            // Only show the Trace ID to the user, not the stack trace!
            referenceId: traceId
        });
    }
};
