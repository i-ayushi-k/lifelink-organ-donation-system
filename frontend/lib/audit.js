
import clientPromise from "@/lib/mongodb";

export async function writeAuditLog({
  action,
  entity,
  recordId = null,
  description = "",
  metadata = {},
}) {
  try {
    const client = await clientPromise;
    const database = client.db(
      process.env.MONGODB_DB || "organ_donation_docs"
    );

    const collection = database.collection("audit_logs");

    await collection.insertOne({
      action,
      entity,
      recordId: recordId === null ? null : String(recordId),
      description,
      metadata,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    // Audit logging must not undo an already committed PostgreSQL operation.
    console.error("MongoDB audit logging failed:", error.message);

    return { success: false };
  }
}
