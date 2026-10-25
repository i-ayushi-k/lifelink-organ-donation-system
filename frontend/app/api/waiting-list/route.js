
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        w.waiting_list_id,
        w.recipient_id,
        w.organ_type,
        w.priority_score,
        w.status AS waiting_status,
        w.joined_at,
        r.full_name AS recipient_name,
        r.age,
        r.blood_group,
        r.medical_priority,
        r.medical_status,
        h.name AS hospital_name
      FROM waiting_list w
      JOIN recipients r ON r.recipient_id = w.recipient_id
      JOIN hospitals h ON h.hospital_id = r.hospital_id
      ORDER BY
        CASE WHEN w.status = 'WAITING' THEN 0 ELSE 1 END,
        w.priority_score DESC,
        w.joined_at ASC
    `);

    return NextResponse.json({ waitingList: result.rows });
  } catch (error) {
    console.error("Fetch waiting list failed:", error.message);
    return NextResponse.json(
      { error: "Unable to fetch waiting-list records." },
      { status: 500 }
    );
  }
}
