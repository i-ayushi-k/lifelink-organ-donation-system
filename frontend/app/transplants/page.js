
"use client";

import { useCallback, useEffect, useState } from "react";

const initialForm = {
  allocation_id: "",
  hospital_id: "",
  transplant_date: new Date().toISOString().slice(0, 10),
  outcome: "SCHEDULED",
  notes: "",
};

export default function TransplantsPage() {
  const [transplants, setTransplants] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [transplantsResponse, allocationsResponse, hospitalsResponse] =
        await Promise.all([
          fetch("/api/transplants"),
          fetch("/api/allocations"),
          fetch("/api/hospitals"),
        ]);

      const [transplantsData, allocationsData, hospitalsData] =
        await Promise.all([
          transplantsResponse.json(),
          allocationsResponse.json(),
          hospitalsResponse.json(),
        ]);

      if (!transplantsResponse.ok) {
        throw new Error(
          transplantsData.error || "Unable to load transplant records."
        );
      }

      if (!allocationsResponse.ok) {
        throw new Error(
          allocationsData.error || "Unable to load allocations."
        );
      }

      if (!hospitalsResponse.ok) {
        throw new Error(
          hospitalsData.error || "Unable to load hospitals."
        );
      }

      setTransplants(transplantsData.transplants || []);
      setAllocations(
        (allocationsData.allocations || []).filter(
          (allocation) => allocation.status === "ACTIVE"
        )
      );
      setHospitals(hospitalsData.hospitals || []);
    } catch (err) {
      setError(err.message || "Something went wrong while loading data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/transplants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          allocation_id: Number(form.allocation_id),
          hospital_id: Number(form.hospital_id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to record transplant.");
      }

      setMessage(data.message || "Transplant record created.");
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString("en-IN");
  }

  return (
    <main className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">LIFELINK / TRANSPLANTS</p>
          <h1>Transplant Records</h1>
          <p className="module-description">
            Record and track transplant outcomes linked to allocations.
          </p>
        </div>

        <button className="secondary-button" onClick={loadData}>
          Refresh records
        </button>
      </div>

      <div className="module-stats">
        <div className="module-stat-card">
          <span>Total records</span>
          <strong>{transplants.length}</strong>
        </div>

        <div className="module-stat-card">
          <span>Successful</span>
          <strong>
            {transplants.filter((item) => item.outcome === "SUCCESSFUL").length}
          </strong>
        </div>

        <div className="module-stat-card">
          <span>Scheduled</span>
          <strong>
            {transplants.filter((item) => item.outcome === "SCHEDULED").length}
          </strong>
        </div>

        <div className="module-stat-card">
          <span>Active allocations</span>
          <strong>{allocations.length}</strong>
        </div>
      </div>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <h2>Record a transplant</h2>
            <p>Choose an active allocation and enter the record details.</p>
          </div>
        </div>

        <form className="module-form" onSubmit={handleSubmit}>
          <label>
            Active allocation
            <select
              name="allocation_id"
              value={form.allocation_id}
              onChange={updateField}
              required
            >
              <option value="">Select an allocation</option>
              {allocations.map((allocation) => (
                <option
                  key={allocation.allocation_id}
                  value={allocation.allocation_id}
                >
                  #{allocation.allocation_id} — {allocation.organ_type} for{" "}
                  {allocation.recipient_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hospital
            <select
              name="hospital_id"
              value={form.hospital_id}
              onChange={updateField}
              required
            >
              <option value="">Select a hospital</option>
              {hospitals.map((hospital) => (
                <option key={hospital.hospital_id} value={hospital.hospital_id}>
                  {hospital.name} — {hospital.city}
                </option>
              ))}
            </select>
          </label>

          <label>
            Transplant date
            <input
              type="date"
              name="transplant_date"
              value={form.transplant_date}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Outcome
            <select
              name="outcome"
              value={form.outcome}
              onChange={updateField}
              required
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="UNSUCCESSFUL">Unsuccessful</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>

          <label className="full-width-field">
            Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              placeholder="Optional record notes"
              rows={3}
              maxLength={2000}
            />
          </label>

          <div className="full-width-field">
            <p className="form-hint">
              Educational simulation only. This form does not determine
              clinical eligibility or authorize a real transplant.
            </p>

            <button
              type="submit"
              className="primary-button"
              disabled={saving || allocations.length === 0}
            >
              {saving ? "Saving..." : "Save transplant record"}
            </button>

            {allocations.length === 0 && (
              <p className="form-hint">
                No active allocations are available to record.
              </p>
            )}
          </div>
        </form>

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
      </section>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <h2>Transplant history</h2>
            <p>Records stored in the PostgreSQL database.</p>
          </div>
          <span className="record-count">{transplants.length} records</span>
        </div>

        {loading ? (
          <p className="empty-state">Loading transplant records...</p>
        ) : transplants.length === 0 ? (
          <p className="empty-state">
            No transplant records yet. Create one using the form above.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Recipient</th>
                  <th>Organ</th>
                  <th>Hospital</th>
                  <th>Date</th>
                  <th>Outcome</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {transplants.map((item) => (
                  <tr key={item.transplant_id}>
                    <td>#{item.transplant_id}</td>
                    <td>{item.recipient_name}</td>
                    <td>{item.organ_type}</td>
                    <td>{item.hospital_name}</td>
                    <td>{formatDate(item.transplant_date)}</td>
                    <td>
                      <span
                        className={`status-badge status-${item.outcome?.toLowerCase()}`}
                      >
                        {item.outcome}
                      </span>
                    </td>
                    <td>{item.notes || "—"}</td>
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
