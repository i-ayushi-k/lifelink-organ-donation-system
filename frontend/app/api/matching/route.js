
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

const validBloodGroups = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
];

// Simplified ABO compatibility for this educational demo only.
// This is not a clinical transplant compatibility algorithm.
function demoBloodGroupCompatible(donorGroup, recipientGroup) {
  const validGroups = new Set(validBloodGroups);

  if (
    !validGroups.has(donorGroup) ||
    !validGroups.has(recipientGroup)
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

  return compatibleRecipients[donorABO]?.includes(recipientABO)
    ?? false;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const organId = Number(searchParams.get("organ_id"));

    if (
      !Number.isInteger(organId) ||
      organId < 1 ||
      !searchParams.has("organ_id")
    ) {
      return NextResponse.json(
        { error: "Provide a valid organ_id." },
        { status: 400 }
      );
    }

    // Check that the organ is available and donor consent is recorded.
    const organResult = await pool.query(
      `SELECT
         o.organ_id,
         o.organ_type,
         o.blood_group,
         o.status,
         d.consent_status,
         h.name AS hospital_name
       FROM organs o
       JOIN donors d ON d.donor_id = o.donor_id
       JOIN hospitals h ON h.hospital_id = o.hospital_id
       WHERE o.organ_id = $1`,
      [organId]
    );

    if (organResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Organ not found." },
        { status: 404 }
      );
    }

    const organ = organResult.rows[0];

    if (
      organ.status !== "AVAILABLE" ||
      organ.consent_status !== "CONSENTED"
    ) {
      return NextResponse.json(
        {
          error:
            "Matching requires an available organ with recorded donor consent.",
        },
        { status: 409 }
      );
    }

    // Only active recipients with a waiting-list entry for this
    // organ type are considered.
    const candidatesResult = await pool.query(
      `SELECT
         r.recipient_id,
         r.full_name,
         r.age,
         r.blood_group,
         r.required_organ,
         r.medical_priority,
         r.medical_status,
         r.hospital_id,
         h.name AS hospital_name,
         w.waiting_list_id,
         w.priority_score,
         w.joined_at
       FROM recipients r
       JOIN waiting_list w
         ON w.recipient_id = r.recipient_id
        AND w.organ_type = r.required_organ
       JOIN hospitals h
         ON h.hospital_id = r.hospital_id
       WHERE r.required_organ = $1
         AND r.medical_status = 'ACTIVE'
         AND w.status = 'WAITING'
       ORDER BY
         w.priority_score DESC,
         r.medical_priority DESC,
         w.joined_at ASC,
         r.registered_at ASC`,
      [organ.organ_type]
    );

    // Apply the project's simplified blood-group rule.
    const matches = candidatesResult.rows
      .filter((recipient) =>
        demoBloodGroupCompatible(
          organ.blood_group,
          recipient.blood_group
        )
      )
      .map((recipient, index) => ({
        ...recipient,
        rank: index + 1,
        compatibility: "Passed demo ABO check",
      }));

    return NextResponse.json({
      organ,
      total_matches: matches.length,
      matches,
      rules: [
        "Organ must be available.",
        "Donor consent must be recorded.",
        "Recipient must be active and on the waiting list.",
        "Required organ type must match.",
        "Simplified ABO compatibility must pass.",
        "Candidates are ranked by waiting-list priority, medical priority, and waiting time.",
      ],
      warning:
        "Educational simulation only. These results are not clinical recommendations or authorization for transplantation.",
    });
  } catch (error) {
    console.error("Automatic matching failed:", error.message);

    return NextResponse.json(
      { error: "Unable to find matching recipients." },
      { status: 500 }
    );
  }
}
