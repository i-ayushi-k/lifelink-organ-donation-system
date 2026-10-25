import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT hospital_id, name, city
      FROM hospitals
      ORDER BY name
    `);

    return NextResponse.json({ hospitals: result.rows });
  } catch (error) {
    console.error("Fetch hospitals failed:", error.message);
    return NextResponse.json(
      { error: "Unable to fetch hospitals." },
      { status: 500 }
    );
  }
}
