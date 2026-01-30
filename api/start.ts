/**
 * Single entry for both Vercel (serverless) and local run.
 * - Vercel: export the app; they invoke it per request (VERCEL=1).
 * - Local: call app.listen() so "npm start" / node dist/server.mjs works.
 */
import app from "./index";

const port = Number(process.env.PORT) || 3000;
if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`);
  });
}

export default app;
