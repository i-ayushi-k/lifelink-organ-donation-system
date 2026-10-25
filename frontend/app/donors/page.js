
"use client";

import { useEffect, useState } from "react";

const initialForm = {
  full_name: "",
  age: "",
  gender: "",
  blood_group: "",
  hospital_id: "",
  consent_status: "PENDING",
};

export default function DonorsPage() {
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
      const [donorsResponse, hospitalsResponse] = await Promise.all([
        fetch("/api/donors"),
        fetch("/api/hospitals"),
      ]);

      const donorsData = await donorsResponse.json();
      const hospitalsData = await hospitalsResponse.json();

      if (!donorsResponse.ok) {
        throw new Error(donorsData.error || "Unable to load donors.");
      }

      if (!hospitalsResponse.ok) {
        throw new Error(hospitalsData.error || "Unable to load hospitals.");
      }

      setDonors(donorsData.donors || []);
      setHospitals(hospitalsData.hospitals || []);
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
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Donor registration failed.");
      }

      setMessage("Donor registered successfully.");
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
          <h1>Donor Management</h1>
          <p>Register donors and review consent and hospital details.</p>
        </div>
        <a className="back-link" href="/">← Dashboard</a>
      </header>

      <section className="module-card">
        <div className="module-card-heading">
          <div>
            <h2>Register a donor</h2>
            <p>Enter the donor details below.</p>
          </div>
          <span className="module-count">{donors.length} records</span>
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form className="donor-form" onSubmit={handleSubmit}>
          <label>
            Full name *
            <input
              name="full_name"
              value={form.full_name}
              onChange={updateField}
              maxLength={150}
              required
              placeholder="Enter full name"
            />
          </label>

          <label>
            Age
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={updateField}
              min="0"
              max="120"
              placeholder="Enter age"
            />
          </label>

          <label>
            Gender
            <select name="gender" value={form.gender} onChange={updateField}>
              <option value="">Select gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
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
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
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

          <label>
            Consent status *
            <select
              name="consent_status"
              value={form.consent_status}
              onChange={updateField}
              required
            >
              <option value="PENDING">Pending verification</option>
              <option value="CONSENTED">Consented</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </label>

          <div className="form-note">
            Demo application: consent status is a sample record and must be
            verified through appropriate real-world procedures.
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={() => setForm(initialForm)}>
              Clear form
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Registering…" : "Register donor"}
            </button>
          </div>
        </form>
      </section>

      <section className="module-card">
        <div className="module-card-heading">
          <div>
            <h2>Registered donors</h2>
            <p>Records retrieved from PostgreSQL.</p>
          </div>
          <button className="secondary-button" onClick={loadData}>Refresh</button>
        </div>

        {loading ? (
          <p className="module-empty">Loading donor records…</p>
        ) : donors.length === 0 ? (
          <p className="module-empty">No donors found.</p>
        ) : (
          <div className="module-table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Donor</th>
                  <th>Age</th>
                  <th>Blood group</th>
                  <th>Hospital</th>
                  <th>Consent</th>
                  <th>Organs</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((donor) => (
                  <tr key={donor.donor_id}>
                    <td>#{donor.donor_id}</td>
                    <td>{donor.full_name}</td>
                    <td>{donor.age ?? "—"}</td>
                    <td><span className="blood-tag">{donor.blood_group}</span></td>
                    <td>{donor.hospital_name}</td>
                    <td>
                      <span className={`status-tag ${donor.consent_status.toLowerCase()}`}>
                        {donor.consent_status}
                      </span>
                    </td>
                    <td>{donor.organ_count}</td>
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
