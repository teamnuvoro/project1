import pino from 'pino';

// Pro Tip: In Dev, make it pretty. In Prod, keep it JSON (faster).
const transport = process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined;

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport,
    base: {
        pid: false, // We don't need process ID usually
    },
    // Automatically redact sensitive info
    redact: ['req.headers.authorization', 'req.body.password'],
});
