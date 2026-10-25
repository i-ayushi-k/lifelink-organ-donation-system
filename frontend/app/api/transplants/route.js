
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { writeAuditLog } from "@/lib/audit";

const validOutcomes = [
  "SCHEDULED",
  "SUCCESSFUL",
  "UNSUCCESSFUL",
  "CANCELLED",
];

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        t.transplant_id,
        t.allocation_id,
        t.transplant_date,
        t.hospital_id,
        t.outcome,
        t.notes,
        t.created_at,
        a.organ_id,
        a.recipient_id,
        o.organ_type,
        r.full_name AS recipient_name,
        h.name AS hospital_name
      FROM transplants t
      JOIN allocations a
        ON a.allocation_id = t.allocation_id
      JOIN organs o
        ON o.organ_id = a.organ_id
      JOIN recipients r
        ON r.recipient_id = a.recipient_id
      JOIN hospitals h
        ON h.hospital_id = t.hospital_id
      ORDER BY t.created_at DESC, t.transplant_id DESC
    `);

    return NextResponse.json({
      transplants: result.rows,
    });
  } catch (error) {
    console.error("Fetch transplants failed:", error.message);

    return NextResponse.json(
      { error: "Unable to fetch transplant records." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const allocationId = Number(body.allocation_id);
  const hospitalId = Number(body.hospital_id);
  const outcome = String(body.outcome || "").toUpperCase();
  const transplantDate = body.transplant_date;
  const notes =
    typeof body.notes === "string" ? body.notes.trim() : null;

  if (
    !Number.isInteger(allocationId) ||
    allocationId < 1 ||
    !Number.isInteger(hospitalId) ||
    hospitalId < 1
  ) {
    return NextResponse.json(
      { error: "Select a valid allocation and hospital." },
      { status: 400 }
    );
  }

  if (!validOutcomes.includes(outcome)) {
    return NextResponse.json(
      { error: "Select a valid transplant outcome." },
      { status: 400 }
    );
  }

  if (
    transplantDate &&
    !/^\d{4}-\d{2}-\d{2}$/.test(transplantDate)
  ) {
    return NextResponse.json(
      { error: "Transplant date must use YYYY-MM-DD format." },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const allocationResult = await client.query(
      `SELECT
         a.allocation_id,
         a.organ_id,
         a.recipient_id,
         a.status AS allocation_status,
         o.status AS organ_status,
         r.medical_status AS recipient_status
       FROM allocations a
       JOIN organs o ON o.organ_id = a.organ_id
       JOIN recipients r ON r.recipient_id = a.recipient_id
       WHERE a.allocation_id = $1
       FOR UPDATE OF a, o, r`,
      [allocationId]
    );

    if (allocationResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { error: "The selected allocation does not exist." },
        { status: 404 }
      );
    }

    const allocation = allocationResult.rows[0];

    if (allocation.allocation_status !== "ACTIVE") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { error: "Only active allocations can be processed." },
        { status: 409 }
      );
    }

    if (allocation.organ_status !== "ALLOCATED") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { error: "The allocated organ is not in the expected status." },
        { status: 409 }
      );
    }

    if (allocation.recipient_status !== "ACTIVE") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { error: "The recipient is not active." },
        { status: 409 }
      );
    }

    const hospitalResult = await client.query(
      "SELECT hospital_id FROM hospitals WHERE hospital_id = $1",
      [hospitalId]
    );

    if (hospitalResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { error: "The selected hospital does not exist." },
        { status: 404 }
      );
    }

    const dateValue =
      transplantDate || new Date().toISOString().slice(0, 10);

    const transplantResult = await client.query(
      `INSERT INTO transplants
         (allocation_id, transplant_date, hospital_id, outcome, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [allocationId, dateValue, hospitalId, outcome, notes]
    );

    if (outcome === "SUCCESSFUL") {
      await client.query(
        `UPDATE allocations
         SET status = 'COMPLETED'
         WHERE allocation_id = $1`,
        [allocationId]
      );

      await client.query(
        `UPDATE organs
         SET status = 'TRANSPLANTED'
         WHERE organ_id = $1`,
        [allocation.organ_id]
      );

      await client.query(
        `UPDATE recipients
         SET medical_status = 'TRANSPLANTED'
         WHERE recipient_id = $1`,
        [allocation.recipient_id]
      );

      await client.query(
        `UPDATE waiting_list
         SET status = 'TRANSPLANTED'
         WHERE recipient_id = $1
           AND organ_type = (
             SELECT organ_type
             FROM organs
             WHERE organ_id = $2
           )
           AND status IN ('WAITING', 'MATCHED')`,
        [allocation.recipient_id, allocation.organ_id]
      );
    } else if (outcome === "CANCELLED") {
      await client.query(
        `UPDATE allocations
         SET status = 'CANCELLED'
         WHERE allocation_id = $1`,
        [allocationId]
      );

      await client.query(
        `UPDATE organs
         SET status = 'UNAVAILABLE'
         WHERE organ_id = $1`,
        [allocation.organ_id]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    // Log only after PostgreSQL successfully commits.
    await writeAuditLog({
      action: "TRANSPLANT_RECORD_CREATED",
      entity: "transplant",
      recordId: transplantResult.rows[0].transplant_id,
      description: "A transplant record was created.",
      metadata: {
        outcome,
        allocationId,
        hospitalId,
      },
    });

    return NextResponse.json(
      {
        message: "Transplant record created successfully.",
        transplant: transplantResult.rows[0],
        warning:
          "LifeLink is an educational database simulation, not a clinical allocation or transplant decision system.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Create transplant failed:", error.message);

    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "A transplant record already exists for this allocation.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Unable to create the transplant record." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
