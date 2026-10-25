
"use client";

import { useEffect, useMemo, useState } from "react";

const organTypes = ["KIDNEY", "LIVER", "HEART", "LUNG", "PANCREAS", "CORNEA"];
const statuses = ["WAITING", "MATCHED", "REMOVED", "TRANSPLANTED"];

function formatLabel(value = "") {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function WaitingListPage() {
  const [entries, setEntries] = useState([]);
  const [organFilter, setOrganFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEntries() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/waiting-list");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load the waiting list.");
      }

      setEntries(data.waitingList || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const organMatches =
          organFilter === "ALL" || entry.organ_type === organFilter;
        const statusMatches =
          statusFilter === "ALL" || entry.waiting_status === statusFilter;

        return organMatches && statusMatches;
      }),
    [entries, organFilter, statusFilter]
  );

  const waitingCount = entries.filter(
    (entry) => entry.waiting_status === "WAITING"
  ).length;

  const matchedCount = entries.filter(
    (entry) => entry.waiting_status === "MATCHED"
  ).length;

  const transplantedCount = entries.filter(
    (entry) => entry.waiting_status === "TRANSPLANTED"
  ).length;

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <p className="module-eyebrow">LIFELINK / WORKSPACE</p>
          <h1>Organ Waiting List</h1>
          <p>Review demo waiting-list entries and their recorded priority.</p>
        </div>

        <a className="back-link" href="/">
          ← Dashboard
        </a>
      </header>

      <section className="module-stats">
        <article className="module-stat-card">
          <span>Waiting</span>
          <strong>{waitingCount}</strong>
        </article>
        <article className="module-stat-card">
          <span>Matched</span>
          <strong>{matchedCount}</strong>
        </article>
        <article className="module-stat-card">
          <span>Transplanted</span>
          <strong>{transplantedCount}</strong>
        </article>
        <article className="module-stat-card">
          <span>Total entries</span>
          <strong>{entries.length}</strong>
        </article>
      </section>

      <section className="module-card">
        <div className="module-card-heading">
          <div>
            <h2>Waiting-list records</h2>
            <p>Waiting entries appear first, followed by demo priority score.</p>
          </div>

          <button className="secondary-button" onClick={loadEntries}>
            Refresh
          </button>
        </div>

        <div className="waiting-filters">
          <label>
            Filter by organ
            <select
              value={organFilter}
              onChange={(event) => setOrganFilter(event.target.value)}
            >
              <option value="ALL">All organs</option>
              {organTypes.map((organ) => (
                <option key={organ} value={organ}>
                  {formatLabel(organ)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Filter by status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <div className="filter-result">
            Showing <strong>{filteredEntries.length}</strong> of {entries.length}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <p className="module-empty">Loading waiting-list entries…</p>
        ) : filteredEntries.length === 0 ? (
          <p className="module-empty">No entries match the selected filters.</p>
        ) : (
          <div className="module-table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>Queue ID</th>
                  <th>Recipient</th>
                  <th>Required organ</th>
                  <th>Blood group</th>
                  <th>Hospital</th>
                  <th>Demo priority</th>
                  <th>Recipient status</th>
                  <th>Queue status</th>
                </tr>
              </thead>

              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.waiting_list_id}>
                    <td>#{entry.waiting_list_id}</td>
                    <td>
                      <strong>{entry.recipient_name}</strong>
                      <div className="table-subtext">
                        Age {entry.age} · Recipient #{entry.recipient_id}
                      </div>
                    </td>
                    <td>{formatLabel(entry.organ_type)}</td>
                    <td>
                      <span className="blood-tag">{entry.blood_group}</span>
                    </td>
                    <td>{entry.hospital_name}</td>
                    <td>
                      <span className="priority-value">
                        {entry.priority_score}/5
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-tag ${entry.medical_status.toLowerCase()}`}
                      >
                        {formatLabel(entry.medical_status)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-tag ${entry.waiting_status.toLowerCase()}`}
                      >
                        {formatLabel(entry.waiting_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="form-note">
          This is an educational database demonstration. Queue priority is a
          sample field, not a validated medical ranking or real-world organ
          allocation decision.
        </div>
      </section>
    </main>
  );
}
