import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  try {
    const [waitingResult, allocationResult, waitingTimeResult, transplantResult] =
      await Promise.all([
        pool.query(`
          SELECT organ_type, waiting_count, matched_count,
                 transplanted_count, removed_count, total_entries
          FROM vw_waiting_list_counts
          ORDER BY organ_type
        `),
        pool.query(`SELECT * FROM vw_allocation_statistics`),
        pool.query(`
          SELECT organ_type, allocated_cases, average_wait_days
          FROM vw_average_waiting_time
          ORDER BY organ_type
        `),
        pool.query(`SELECT * FROM vw_transplant_outcomes`),
      ]);

    return NextResponse.json({
      waitingList: waitingResult.rows,
      allocations: allocationResult.rows[0] ?? null,
      averageWaitingTime: waitingTimeResult.rows,
      transplantOutcomes: transplantResult.rows[0] ?? null,
    });
  } catch (error) {
    console.error("Analytics query failed:", error.message);
    return NextResponse.json(
      {
        error:
          "Unable to load analytics. Apply database/analytics_views.sql and verify the PostgreSQL connection.",
      },
      { status: 500 }
    );
  }
}
