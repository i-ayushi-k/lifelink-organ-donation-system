
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        o.organ_id,
        o.organ_type,
        o.blood_group,
        o.status,
        o.availability_date,
        o.notes,
        d.donor_id,
        d.full_name AS donor_name,
        d.consent_status,
        h.hospital_id,
        h.name AS hospital_name
      FROM organs o
      JOIN donors d ON d.donor_id = o.donor_id
      JOIN hospitals h ON h.hospital_id = o.hospital_id
      ORDER BY o.organ_id DESC
    `);

    return NextResponse.json({ organs: result.rows });
  } catch (error) {
    console.error("Fetch organs failed:", error.message);
    return NextResponse.json(
      { error: "Unable to fetch organ records." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      donor_id,
      organ_type,
      blood_group,
      hospital_id,
      notes,
    } = body;

    const validOrganTypes = [
      "KIDNEY", "LIVER", "HEART", "LUNG", "PANCREAS", "CORNEA",
    ];
    const validBloodGroups = [
      "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
    ];

    const parsedDonorId = Number(donor_id);
    const parsedHospitalId = Number(hospital_id);

    if (!Number.isInteger(parsedDonorId) || parsedDonorId < 1) {
      return NextResponse.json(
        { error: "Select a valid donor." },
        { status: 400 }
      );
    }

    if (!validOrganTypes.includes(organ_type)) {
      return NextResponse.json(
        { error: "Select a valid organ type." },
        { status: 400 }
      );
    }

    if (!validBloodGroups.includes(blood_group)) {
      return NextResponse.json(
        { error: "Select a valid blood group." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(parsedHospitalId) || parsedHospitalId < 1) {
      return NextResponse.json(
        { error: "Select a valid hospital." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const donorResult = await client.query(
      `SELECT donor_id, blood_group, consent_status
       FROM donors
       WHERE donor_id = $1
       FOR UPDATE`,
      [parsedDonorId]
    );

    if (donorResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "The selected donor does not exist." },
        { status: 400 }
      );
    }

    const donor = donorResult.rows[0];

    if (donor.consent_status !== "CONSENTED") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Organs cannot be marked available unless donor consent is recorded as CONSENTED." },
        { status: 400 }
      );
    }

    const hospitalResult = await client.query(
      "SELECT hospital_id FROM hospitals WHERE hospital_id = $1",
      [parsedHospitalId]
    );

    if (hospitalResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "The selected hospital does not exist." },
        { status: 400 }
      );
    }

    // This educational demo defaults new organ records to AVAILABLE only
    // after the donor's consent status has been checked.
    const result = await client.query(
      `INSERT INTO organs
        (donor_id, organ_type, blood_group, hospital_id, status, notes)
       VALUES ($1, $2, $3, $4, 'AVAILABLE', $5)
       RETURNING organ_id, donor_id, organ_type, blood_group,
                 hospital_id, status, availability_date, notes`,
      [
        parsedDonorId,
        organ_type,
        blood_group,
        parsedHospitalId,
        typeof notes === "string" ? notes.trim().slice(0, 2000) : null,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      { message: "Organ record created.", organ: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create organ failed:", error.message);

    return NextResponse.json(
      { error: "Unable to create the organ record." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
