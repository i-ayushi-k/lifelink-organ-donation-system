
"use client";

import { useCallback, useEffect, useState } from "react";

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHospitals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/hospitals");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load hospitals.");
      }

      setHospitals(data.hospitals || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  return (
    <main className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">LIFELINK / HOSPITALS</p>
          <h1>Hospital Directory</h1>
          <p className="module-description">
            View the hospitals registered in the organ donation system.
          </p>
        </div>

        <button className="secondary-button" onClick={loadHospitals}>
          Refresh hospitals
        </button>
      </div>

      <div className="module-stats">
        <div className="module-stat-card">
          <span>Registered hospitals</span>
          <strong>{hospitals.length}</strong>
        </div>

        <div className="module-stat-card">
          <span>Cities represented</span>
          <strong>
            {new Set(hospitals.map((hospital) => hospital.city).filter(Boolean))
              .size}
          </strong>
        </div>
      </div>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <h2>Registered hospitals</h2>
            <p>Hospital information stored in PostgreSQL.</p>
          </div>

          <span className="record-count">{hospitals.length} records</span>
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Loading hospitals...</p>
        ) : hospitals.length === 0 ? (
          <p className="empty-state">No hospitals have been registered yet.</p>
        ) : (
          <div className="hospital-grid">
            {hospitals.map((hospital) => (
              <article className="hospital-card" key={hospital.hospital_id}>
                <div className="hospital-card-top">
                  <div className="hospital-icon">H</div>
                  <span className="record-count">
                    ID #{hospital.hospital_id}
                  </span>
                </div>

                <h3>{hospital.name}</h3>

                <p className="hospital-location">
                  {hospital.city || "City not specified"}
                </p>

                <div className="hospital-detail">
                  <span>Address</span>
                  <p>{hospital.address || "Not provided"}</p>
                </div>

                <div className="hospital-detail">
                  <span>Contact</span>
                  <p>{hospital.contact_number || "Not provided"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
