
"use client";

import { useEffect, useState } from "react";

function formatLabel(value = "") {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AllocationsPage() {
  const [organs, setOrgans] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [organId, setOrganId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [organsResponse, recipientsResponse, allocationsResponse] =
        await Promise.all([
          fetch("/api/organs"),
          fetch("/api/recipients"),
          fetch("/api/allocations"),
        ]);

      const [organsData, recipientsData, allocationsData] = await Promise.all([
        organsResponse.json(),
        recipientsResponse.json(),
        allocationsResponse.json(),
      ]);

      if (!organsResponse.ok) throw new Error(organsData.error || "Could not load organs.");
      if (!recipientsResponse.ok) throw new Error(recipientsData.error || "Could not load recipients.");
      if (!allocationsResponse.ok) throw new Error(allocationsData.error || "Could not load allocations.");

      setOrgans(organsData.organs || []);
      setRecipients(recipientsData.recipients || []);
      setAllocations(allocationsData.allocations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const availableOrgans = organs.filter(
    (organ) =>
      organ.status === "AVAILABLE" &&
      organ.consent_status === "CONSENTED"
  );

  const activeRecipients = recipients.filter(
    (recipient) => recipient.medical_status === "ACTIVE"
  );

  async function createAllocation(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organ_id: Number(organId),
          recipient_id: Number(recipientId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create allocation.");
      }

      setMessage(data.message || "Demo allocation created.");
      setOrganId("");
      setRecipientId("");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <p className="module-eyebrow">LIFELINK / WORKSPACE</p>
          <h1>Organ Allocations</h1>
          <p>Review and simulate allocation records with database safeguards.</p>
        </div>
        <a className="back-link" href="/">← Dashboard</a>
      </header>

      <div className="form-note">
        <strong>Educational demo only.</strong> This interface uses simplified
        rules and is not suitable for clinical decisions or real organ allocation.
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <section className="module-card">
        <div className="module-card-heading">
          <div>
            <h2>Create a demo allocation</h2>
            <p>The API checks consent, status, organ type, demo ABO rules, and the waiting list.</p>
          </div>
          <span className="module-count">{availableOrgans.length} eligible demo records</span>
        </div>

        <form className="donor-form" onSubmit={createAllocation}>
          <label>
            Available organ *
            <select value={organId} onChange={(e) => setOrganId(e.target.value)} required>
              <option value="">Select organ</option>
              {availableOrgans.map((organ) => (
                <option key={organ.organ_id} value={organ.organ_id}>
                  #{organ.organ_id} · {formatLabel(organ.organ_type)} · {organ.blood_group} · {organ.donor_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Active recipient *
            <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} required>
              <option value="">Select recipient</option>
              {activeRecipients.map((recipient) => (
                <option key={recipient.recipient_id} value={recipient.recipient_id}>
                  #{recipient.recipient_id} · {recipient.full_name} · {formatLabel(recipient.required_organ)} · {recipient.blood_group} · Priority {recipient.medical_priority}/5
                </option>
              ))}
            </select>
          </label>

          <div className="form-note">
            The selection lists are not a clinical matching recommendation. The
            server will reject invalid combinations.
          </div>

          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setOrganId("");
                setRecipientId("");
                setError("");
                setMessage("");
              }}
            >
              Clear selection
            </button>
            <button className="primary-button" type="submit" disabled={saving || loading}>
              {saving ? "Processing…" : "Create demo allocation"}
            </button>
          </div>
        </form>
      </section>

      <section className="module-card">
        <div className="module-card-heading">
          <div>
            <h2>Allocation records</h2>
            <p>All recorded allocation attempts that succeeded.</p>
          </div>
          <button className="secondary-button" onClick={loadData}>Refresh</button>
        </div>

        {loading ? (
          <p className="module-empty">Loading allocations…</p>
        ) : allocations.length === 0 ? (
          <p className="module-empty">No demo allocations have been created yet.</p>
        ) : (
          <div className="module-table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>Allocation</th>
                  <th>Organ</th>
                  <th>Donor blood group</th>
                  <th>Recipient</th>
                  <th>Recipient blood group</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Hospital</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation) => (
                  <tr key={allocation.allocation_id}>
                    <td>#{allocation.allocation_id}</td>
                    <td>{formatLabel(allocation.organ_type)} · #{allocation.organ_id}</td>
                    <td>{allocation.donor_blood_group}</td>
                    <td>{allocation.recipient_name}</td>
                    <td>{allocation.recipient_blood_group}</td>
                    <td>{allocation.medical_priority}/5</td>
                    <td>
                      <span className={`status-tag ${allocation.status.toLowerCase()}`}>
                        {formatLabel(allocation.status)}
                      </span>
                    </td>
                    <td>{allocation.hospital_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
