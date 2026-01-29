/**
 * Vercel serverless entry: export the Express app so each /api/* request
 * is passed to it. Do NOT call app.listen() — Vercel invokes this handler per request.
 */
import app from "./index";

export default app;
