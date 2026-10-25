import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import mongoClientPromise from "@/lib/mongodb";

export async function GET() {
  const results = {
    postgres: "disconnected",
    mongodb: "disconnected",
  };

  try {
    const dbResult = await pool.query("SELECT NOW() AS current_time");
    results.postgres = "connected";
    results.postgresTime = dbResult.rows[0].current_time;
  } catch (error) {
    console.error("PostgreSQL health check failed:", error.message);
  }

  try {
    const client = await mongoClientPromise;
    await client.db(process.env.MONGODB_DB).command({ ping: 1 });
    results.mongodb = "connected";
  } catch (error) {
    console.error("MongoDB health check failed:", error.message);
  }

  const healthy =
    results.postgres === "connected" &&
    results.mongodb === "connected";

  return NextResponse.json(results, {
    status: healthy ? 200 : 503,
  });
}
