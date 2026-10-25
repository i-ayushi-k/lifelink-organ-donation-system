import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  try {
    const queries = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM donors"),
      pool.query("SELECT COUNT(*)::int AS count FROM organs"),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM organs WHERE status = 'AVAILABLE'"
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM recipients WHERE medical_status = 'ACTIVE'"
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM waiting_list WHERE status = 'WAITING'"
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM allocations WHERE status = 'ACTIVE'"
      ),
      pool.query(`
        SELECT
          o.organ_id,
          o.organ_type,
          o.blood_group,
          o.status,
          h.name AS hospital_name,
          d.full_name AS donor_name
        FROM organs o
        JOIN hospitals h ON h.hospital_id = o.hospital_id
        JOIN donors d ON d.donor_id = o.donor_id
        ORDER BY o.organ_id DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          r.recipient_id,
          r.full_name,
          r.required_organ,
          r.blood_group,
          r.medical_priority,
          r.medical_status,
          h.name AS hospital_name
        FROM recipients r
        JOIN hospitals h ON h.hospital_id = r.hospital_id
        ORDER BY r.medical_priority DESC, r.registered_at ASC
        LIMIT 5
      `),
    ]);

    return NextResponse.json({
      counts: {
        donors: queries[0].rows[0].count,
        organs: queries[1].rows[0].count,
        availableOrgans: queries[2].rows[0].count,
        activeRecipients: queries[3].rows[0].count,
        waitingRecipients: queries[4].rows[0].count,
        activeAllocations: queries[5].rows[0].count,
      },
      recentOrgans: queries[6].rows,
      priorityRecipients: queries[7].rows,
    });
  } catch (error) {
    console.error("Dashboard API failed:", error.message);

    return NextResponse.json(
      { error: "Unable to load dashboard data." },
      { status: 500 }
    );
  }
}
