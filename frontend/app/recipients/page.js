
"use client";

import { useEffect, useState } from "react";

const initialForm = {
  full_name: "",
  age: "",
  blood_group: "",
  required_organ: "",
  medical_priority: "3",
  hospital_id: "",
};

function formatLabel(value = "") {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);

    try {
      const [recipientResponse, hospitalResponse] = await Promise.all([
        fetch("/api/recipients"),
        fetch("/api/hospitals"),
      ]);

      const [recipientData, hospitalData] = await Promise.all([
        recipientResponse.json(),
        hospitalResponse.json(),
      ]);

      if (!recipientResponse.ok) {
        throw new Error(recipientData.error || "Unable to load recipients.");
      }

      if (!hospitalResponse.ok) {
        throw new Error(hospitalData.error || "Unable to load hospitals.");
      }

      setRecipients(recipientData.recipients || []);
      setHospitals(hospitalData.hospitals || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to register recipient.");
      }

      setMessage(
        `${result.recipient.full_name} was registered and added to the demo waiting list.`
      );
      setForm(initialForm);
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
          <h1>Recipient Management</h1>
          <p>Register recipients and view their demo waiting-list status.</p>
        </div>

        <a className="back-link" href="/">
          ← Dashboard
        </a>
      </header>

      <section className="module-card">
        <div className="module-card-heading">
          <div>
            <h2>Register a recipient</h2>
            <p>
              A new recipient is automatically added to the demo waiting list.
            </p>
          </div>

          <span className="module-count">{recipients.length} records</span>
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form className="donor-form" onSubmit={handleSubmit}>
          <label>
            Full name *
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={updateField}
              minLength={2}
              maxLength={120}
              placeholder="Enter recipient name"
              required
            />
          </label>

          <label>
            Age *
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={updateField}
              min="1"
              max="120"
              step="1"
              placeholder="Age"
              required
            />
          </label>

          <label>
            Blood group *
            <select
              name="blood_group"
              value={form.blood_group}
              onChange={updateField}
              required
            >
              <option value="">Select blood group</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                (group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Required organ *
            <select
              name="required_organ"
              value={form.required_organ}
              onChange={updateField}
              required
            >
              <option value="">Select organ</option>
              {["KIDNEY", "LIVER", "HEART", "LUNG", "PANCREAS", "CORNEA"].map(
                (organ) => (
                  <option key={organ} value={organ}>
                    {formatLabel(organ)}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Demo medical priority (1–5) *
            <select
              name="medical_priority"
              value={form.medical_priority}
              onChange={updateField}
              required
            >
              <option value="1">1 — Lowest demo priority</option>
              <option value="2">2</option>
              <option value="3">3 — Standard demo value</option>
              <option value="4">4</option>
              <option value="5">5 — Highest demo priority</option>
            </select>
          </label>

          <label>
            Hospital *
            <select
              name="hospital_id"
              value={form.hospital_id}
              onChange={updateField}
              required
            >
              <option value="">Select hospital</option>
              {hospitals.map((hospital) => (
                <option key={hospital.hospital_id} value={hospital.hospital_id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </label>

          <div className="form-note">
            This is a fictional educational demo. The priority score is for
            demonstrating database ordering only and must not be used for real
            medical decisions or organ allocation.
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setForm(initialForm);
                setError("");
                setMessage("");
              }}
            >
              Clear form
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? "Registering…" : "Register recipient"}
            </button>
          </div>
        </form>
      </section>

      <section className="module-card">
        <div className="module-card-heading">
          <div>
            <h2>Registered recipients</h2>
            <p>Ordered by demo priority, with active recipients first.</p>
          </div>

          <button className="secondary-button" onClick={loadData}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="module-empty">Loading recipients…</p>
        ) : recipients.length === 0 ? (
          <p className="module-empty">No recipients have been registered yet.</p>
        ) : (
          <div className="module-table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Recipient</th>
                  <th>Age</th>
                  <th>Blood group</th>
                  <th>Required organ</th>
                  <th>Priority</th>
                  <th>Hospital</th>
                  <th>Waiting status</th>
                </tr>
              </thead>

              <tbody>
                {recipients.map((recipient) => (
                  <tr key={recipient.recipient_id}>
                    <td>#{recipient.recipient_id}</td>
                    <td>{recipient.full_name}</td>
                    <td>{recipient.age}</td>
                    <td>
                      <span className="blood-tag">{recipient.blood_group}</span>
                    </td>
                    <td>{formatLabel(recipient.required_organ)}</td>
                    <td>
                      <span className="priority-value">
                        {recipient.medical_priority}/5
                      </span>
                    </td>
                    <td>{recipient.hospital_name}</td>
                    <td>
                      <span
                        className={`status-tag ${(recipient.waiting_status || recipient.medical_status).toLowerCase()}`}
                      >
                        {formatLabel(
                          recipient.waiting_status || recipient.medical_status
                        )}
                      </span>
                    </td>
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
