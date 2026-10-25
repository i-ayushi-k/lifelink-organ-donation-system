
"use client";

import { useEffect, useState } from "react";

const initialForm = {
  donor_id: "",
  organ_type: "",
  blood_group: "",
  hospital_id: "",
  notes: "",
};

function label(value = "") {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrgansPage() {
  const [organs, setOrgans] = useState([]);
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [organResponse, donorResponse, hospitalResponse] = await Promise.all([
        fetch("/api/organs"),
        fetch("/api/donors"),
        fetch("/api/hospitals"),
      ]);

      const [organData, donorData, hospitalData] = await Promise.all([
        organResponse.json(),
        donorResponse.json(),
        hospitalResponse.json(),
      ]);

      if (!organResponse.ok) throw new Error(organData.error || "Unable to load organs.");
      if (!donorResponse.ok) throw new Error(donorData.error || "Unable to load donors.");
      if (!hospitalResponse.ok) throw new Error(hospitalData.error || "Unable to load hospitals.");

      setOrgans(organData.organs || []);
      setDonors(donorData.donors || []);
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
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/organs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to register organ.");

      setMessage("Organ record created successfully.");
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
          <h1>Organ Inventory</h1>
          <p>Manage organ records and monitor availability.</p>
        </div>
        <a className="back-link" href="/">← Dashboard</a>
      </header>

      <section className="module-card">
        <div className="module-card-heading">
          <div>
            <h2>Register an organ</h2>
            <p>Only donors with recorded consent can be used for new organ records.</p>
          </div>
          <span className="module-count">{organs.length} records</span>
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form className="donor-form" onSubmit={handleSubmit}>
          <label>
            Donor *
            <select name="donor_id" value={form.donor_id} onChange={updateField} required>
              <option value="">Select donor</option>
              {donors.map((donor) => (
                <option key={donor.donor_id} value={donor.donor_id}>
                  {donor.full_name} — {donor.consent_status}
                </option>
              ))}
            </select>
          </label>

          <label>
            Organ type *
            <select name="organ_type" value={form.organ_type} onChange={updateField} required>
              <option value="">Select organ</option>
              {["KIDNEY", "LIVER", "HEART", "LUNG", "PANCREAS", "CORNEA"].map((organ) => (
                <option key={organ} value={organ}>{label(organ)}</option>
              ))}
            </select>
          </label>

          <label>
            Blood group *
            <select name="blood_group" value={form.blood_group} onChange={updateField} required>
              <option value="">Select blood group</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>

          <label>
            Hospital *
            <select name="hospital_id" value={form.hospital_id} onChange={updateField} required>
              <option value="">Select hospital</option>
              {hospitals.map((hospital) => (
                <option key={hospital.hospital_id} value={hospital.hospital_id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </label>

          <label className="full-width-field">
            Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              maxLength={2000}
              rows={3}
              placeholder="Optional notes for this fictional demo record"
            />
          </label>

          <div className="form-note">
            Educational demonstration only. This form does not establish clinical
            eligibility or authorize a real-world transplant.
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={() => setForm(initialForm)}>
              Clear form
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving…" : "Register organ"}
            </button>
          </div>
        </form>
      </section>

      <section className="module-card">
        <div className="module-card-heading">
          <div>
            <h2>Organ inventory</h2>
            <p>Current records from PostgreSQL.</p>
          </div>
          <button className="secondary-button" onClick={loadData}>Refresh</button>
        </div>

        {loading ? (
          <p className="module-empty">Loading organ records…</p>
        ) : (
          <div className="module-table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Organ</th>
                  <th>Blood group</th>
                  <th>Donor</th>
                  <th>Consent</th>
                  <th>Hospital</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {organs.map((organ) => (
                  <tr key={organ.organ_id}>
                    <td>#{organ.organ_id}</td>
                    <td>{label(organ.organ_type)}</td>
                    <td><span className="blood-tag">{organ.blood_group}</span></td>
                    <td>{organ.donor_name}</td>
                    <td>
                      <span className={`status-tag ${organ.consent_status.toLowerCase()}`}>
                        {label(organ.consent_status)}
                      </span>
                    </td>
                    <td>{organ.hospital_name}</td>
                    <td>
                      <span className={`status-tag ${organ.status.toLowerCase()}`}>
                        {label(organ.status)}
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
