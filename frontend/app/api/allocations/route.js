
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { writeAuditLog } from "@/lib/audit";

const validBloodGroups = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
];

// Simplified ABO compatibility for this educational demo only.
// This does not establish clinical transplant compatibility.
function demoBloodGroupCompatible(donorGroup, recipientGroup) {
  if (
    !validBloodGroups.includes(donorGroup) ||
    !validBloodGroups.includes(recipientGroup)
  ) {
    return false;
  }

  const donorABO = donorGroup.replace(/[+-]/g, "");
  const recipientABO = recipientGroup.replace(/[+-]/g, "");

  const compatibleRecipients = {
    O: ["O", "A", "B", "AB"],
    A: ["A", "AB"],
    B: ["B", "AB"],
    AB: ["AB"],
  };

  return compatibleRecipients[donorABO]?.includes(recipientABO) ?? false;
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        a.allocation_id,
        a.organ_id,
        a.recipient_id,
        a.status,
        a.compatibility_notes,
        a.allocated_at,
        o.organ_type,
        o.blood_group AS donor_blood_group,
        r.full_name AS recipient_name,
        r.blood_group AS recipient_blood_group,
        r.medical_priority,
        h.name AS hospital_name
      FROM allocations a
      JOIN organs o ON o.organ_id = a.organ_id
      JOIN recipients r ON r.recipient_id = a.recipient_id
      JOIN hospitals h ON h.hospital_id = r.hospital_id
      ORDER BY a.allocated_at DESC, a.allocation_id DESC
    `);

    return NextResponse.json({ allocations: result.rows });
  } catch (error) {
    console.error("Fetch allocations failed:", error.message);

    return NextResponse.json(
      { error: "Unable to fetch allocation records." },
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

  const organId = Number(body.organ_id);
  const recipientId = Number(body.recipient_id);

  if (
    !Number.isInteger(organId) || organId < 1 ||
    !Number.isInteger(recipientId) || recipientId < 1
  ) {
    return NextResponse.json(
      { error: "Select a valid organ and recipient." },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const organResult = await client.query(
      `SELECT
         o.organ_id,
         o.organ_type,
         o.blood_group,
         o.status,
         d.consent_status
       FROM organs o
       JOIN donors d ON d.donor_id = o.donor_id
       WHERE o.organ_id = $1
       FOR UPDATE OF o, d`,
      [organId]
    );

    if (organResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "The selected organ does not exist." },
        { status: 404 }
      );
    }

    const organ = organResult.rows[0];

    if (organ.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "This organ is not available for allocation." },
        { status: 409 }
      );
    }

    if (organ.consent_status !== "CONSENTED") {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "Recorded donor consent is required." },
        { status: 409 }
      );
    }

    const recipientResult = await client.query(
      `SELECT
         recipient_id,
         blood_group,
         required_organ,
         medical_status,
         medical_priority
       FROM recipients
       WHERE recipient_id = $1
       FOR UPDATE`,
      [recipientId]
    );

    if (recipientResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "The selected recipient does not exist." },
        { status: 404 }
      );
    }

    const recipient = recipientResult.rows[0];

    if (recipient.medical_status !== "ACTIVE") {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "The recipient is not active." },
        { status: 409 }
      );
    }

    if (organ.organ_type !== recipient.required_organ) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "The organ type does not match the recipient's requirement." },
        { status: 400 }
      );
    }

    if (
      !demoBloodGroupCompatible(organ.blood_group, recipient.blood_group)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "The blood groups fail the demo ABO compatibility check." },
        { status: 400 }
      );
    }

    const waitingResult = await client.query(
      `SELECT waiting_list_id
       FROM waiting_list
       WHERE recipient_id = $1
         AND organ_type = $2
         AND status = 'WAITING'
       FOR UPDATE`,
      [recipientId, organ.organ_type]
    );

    if (waitingResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "The recipient has no matching active waiting-list entry." },
        { status: 409 }
      );
    }

    const notes =
      "Educational demo checks passed: recorded consent, available organ, " +
      "active recipient, organ type and simplified ABO rule. " +
      "Clinical eligibility is NOT verified.";

    const allocationResult = await client.query(
      `INSERT INTO allocations
         (organ_id, recipient_id, status, compatibility_notes)
       VALUES ($1, $2, 'ACTIVE', $3)
       RETURNING *`,
      [organId, recipientId, notes]
    );

    await client.query(
      `UPDATE organs
       SET status = 'ALLOCATED'
       WHERE organ_id = $1`,
      [organId]
    );

    await client.query(
      `UPDATE waiting_list
       SET status = 'MATCHED'
       WHERE waiting_list_id = $1`,
      [waitingResult.rows[0].waiting_list_id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    await writeAuditLog({
      action: "ALLOCATION_CREATED",
      entity: "allocation",
      recordId: allocationResult.rows[0].allocation_id,
      description: "A demo organ allocation was created.",
      metadata: {
        organId,
        recipientId,
        organType: organ.organ_type,
      },
    });

    return NextResponse.json(
      {
        message: "Demo allocation created successfully.",
        allocation: allocationResult.rows[0],
        warning:
          "Educational simulation only. This does not establish clinical compatibility or authorize a real transplant.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Create allocation failed:", error.message);

    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This organ already has an active allocation." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Unable to create the allocation." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
