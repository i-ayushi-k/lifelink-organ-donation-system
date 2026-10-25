
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const database = client.db(
      process.env.MONGODB_DB || "organ_donation_docs"
    );

    const logs = await database
      .collection("audit_logs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      count: logs.length,
      logs: logs.map((log) => ({
        id: log._id.toString(),
        action: log.action,
        entity: log.entity,
        recordId: log.recordId,
        description: log.description,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch audit logs failed:", error.message);

    return NextResponse.json(
      { error: "Unable to fetch audit logs from MongoDB." },
      { status: 500 }
    );
  }
}
