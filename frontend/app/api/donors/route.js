import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        d.donor_id,
        d.full_name,
        d.age,
        d.gender,
        d.blood_group,
        d.consent_status,
        d.created_at,
        h.name AS hospital_name,
        COUNT(o.organ_id)::int AS organ_count
      FROM donors d
      JOIN hospitals h ON h.hospital_id = d.hospital_id
      LEFT JOIN organs o ON o.donor_id = d.donor_id
      GROUP BY d.donor_id, h.name
      ORDER BY d.donor_id DESC
    `);

    return NextResponse.json({ donors: result.rows });
  } catch (error) {
    console.error("Fetch donors failed:", error.message);
    return NextResponse.json(
      { error: "Unable to fetch donor records." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      full_name,
      age,
      gender,
      blood_group,
      hospital_id,
      consent_status,
    } = body;

    const validBloodGroups = [
      "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
    ];

    if (
      typeof full_name !== "string" ||
      !full_name.trim() ||
      full_name.trim().length > 150
    ) {
      return NextResponse.json(
        { error: "Enter a valid donor name (maximum 150 characters)." },
        { status: 400 }
      );
    }

    if (
      age !== "" &&
      age !== null &&
      age !== undefined &&
      (!Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 120)
    ) {
      return NextResponse.json(
        { error: "Age must be between 0 and 120." },
        { status: 400 }
      );
    }

    if (!validBloodGroups.includes(blood_group)) {
      return NextResponse.json(
        { error: "Select a valid blood group." },
        { status: 400 }
      );
    }

    const parsedHospitalId = Number(hospital_id);

    if (!Number.isInteger(parsedHospitalId) || parsedHospitalId < 1) {
      return NextResponse.json(
        { error: "Select a valid hospital." },
        { status: 400 }
      );
    }

    const allowedConsentStatuses = ["PENDING", "CONSENTED", "WITHDRAWN"];

    if (
      consent_status &&
      !allowedConsentStatuses.includes(consent_status)
    ) {
      return NextResponse.json(
        { error: "Invalid consent status." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const hospital = await client.query(
      "SELECT hospital_id FROM hospitals WHERE hospital_id = $1",
      [parsedHospitalId]
    );

    if (hospital.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "The selected hospital does not exist." },
        { status: 400 }
      );
    }

    const result = await client.query(
      `INSERT INTO donors
        (full_name, age, gender, blood_group, hospital_id, consent_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING donor_id, full_name, age, gender, blood_group,
                 hospital_id, consent_status, created_at`,
      [
        full_name.trim(),
        age === "" || age === null || age === undefined ? null : Number(age),
        gender || null,
        blood_group,
        parsedHospitalId,
        consent_status || "PENDING",
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      { message: "Donor registered successfully.", donor: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Register donor failed:", error.message);

    return NextResponse.json(
      { error: "Unable to register donor. Please check the submitted details." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
