import "dotenv/config";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Testing database connection...");
        const result = await db.execute(sql`SELECT NOW()`);
        console.log("Connection successful:", result[0]);
        process.exit(0);
    } catch (error) {
        console.error("Connection failed:", error);
        process.exit(1);
    }
}

main();
