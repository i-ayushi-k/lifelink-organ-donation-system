import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const validOrganTypes = ["KIDNEY", "LIVER", "HEART", "LUNG", "PANCREAS", "CORNEA"];

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        r.recipient_id,
        r.full_name,
        r.age,
        r.blood_group,
        r.required_organ,
        r.medical_priority,
        r.medical_status,
        r.registered_at,
        r.hospital_id,
        h.name AS hospital_name,
        w.waiting_list_id,
        w.priority_score,
        w.status AS waiting_status
      FROM recipients r
      JOIN hospitals h ON h.hospital_id = r.hospital_id
      LEFT JOIN waiting_list w
        ON w.recipient_id = r.recipient_id
        AND w.organ_type = r.required_organ
      ORDER BY
        CASE WHEN r.medical_status = 'ACTIVE' THEN 0 ELSE 1 END,
        r.medical_priority DESC,
        r.registered_at ASC
    `);

    return NextResponse.json({ recipients: result.rows });
  } catch (error) {
    console.error("Fetch recipients failed:", error.message);
    return NextResponse.json(
      { error: "Unable to fetch recipient records." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const client = await pool.connect();

  try {
    const body = await request.json();

    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const age = Number(body.age);
    const bloodGroup = body.blood_group;
    const requiredOrgan = body.required_organ;
    const medicalPriority = Number(body.medical_priority);
    const hospitalId = Number(body.hospital_id);

    if (fullName.length < 2 || fullName.length > 120) {
      return NextResponse.json(
        { error: "Enter a name between 2 and 120 characters." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(age) || age < 1 || age > 120) {
      return NextResponse.json(
        { error: "Age must be a whole number between 1 and 120." },
        { status: 400 }
      );
    }

    if (!validBloodGroups.includes(bloodGroup)) {
      return NextResponse.json(
        { error: "Select a valid blood group." },
        { status: 400 }
      );
    }

    if (!validOrganTypes.includes(requiredOrgan)) {
      return NextResponse.json(
        { error: "Select a valid required organ." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(medicalPriority) || medicalPriority < 1 || medicalPriority > 5) {
      return NextResponse.json(
        { error: "Priority must be between 1 and 5." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(hospitalId) || hospitalId < 1) {
      return NextResponse.json(
        { error: "Select a valid hospital." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const hospitalResult = await client.query(
      "SELECT hospital_id FROM hospitals WHERE hospital_id = $1",
      [hospitalId]
    );

    if (hospitalResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "The selected hospital does not exist." },
        { status: 400 }
      );
    }

    const recipientResult = await client.query(
      `INSERT INTO recipients
        (full_name, age, blood_group, required_organ,
         medical_priority, medical_status, hospital_id)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)
       RETURNING *`,
      [fullName, age, bloodGroup, requiredOrgan, medicalPriority, hospitalId]
    );

    const recipient = recipientResult.rows[0];

    await client.query(
      `INSERT INTO waiting_list
        (recipient_id, organ_type, priority_score, status)
       VALUES ($1, $2, $3, 'WAITING')
       ON CONFLICT (recipient_id, organ_type) DO NOTHING`,
      [recipient.recipient_id, requiredOrgan, medicalPriority]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Recipient registered and added to the waiting list.",
        recipient,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create recipient failed:", error.message);

    return NextResponse.json(
      { error: "Unable to register the recipient." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
