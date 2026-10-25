
"use client";

import { useCallback, useEffect, useState } from "react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/audit-logs");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load audit logs.");
      }

      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString("en-IN");
  }

  return (
    <main className="module-page">
      <div className="module-header">
        <div>
          <p className="eyebrow">LIFELINK / SYSTEM ACTIVITY</p>
          <h1>Audit Logs</h1>
          <p className="module-description">
            Review recorded allocation and transplant events stored in MongoDB.
          </p>
        </div>

        <button className="secondary-button" onClick={loadLogs}>
          Refresh logs
        </button>
      </div>

      <div className="module-stats">
        <div className="module-stat-card">
          <span>Events retrieved</span>
          <strong>{logs.length}</strong>
        </div>

        <div className="module-stat-card">
          <span>Allocation events</span>
          <strong>
            {logs.filter((log) => log.entity === "allocation").length}
          </strong>
        </div>

        <div className="module-stat-card">
          <span>Transplant events</span>
          <strong>
            {logs.filter((log) => log.entity === "transplant").length}
          </strong>
        </div>
      </div>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <h2>Activity history</h2>
            <p>Most recent events appear first. Up to 100 records are shown.</p>
          </div>

          <span className="record-count">{logs.length} events</span>
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <p className="empty-state">
            No audit events yet. Newly created allocations and transplant
            records will appear here.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Record ID</th>
                  <th>Description</th>
                  <th>Metadata</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>
                      <span className="status-badge">
                        {log.action || "UNKNOWN"}
                      </span>
                    </td>
                    <td>{log.entity || "—"}</td>
                    <td>{log.recordId || "—"}</td>
                    <td>{log.description || "—"}</td>
                    <td>
                      <code className="audit-metadata">
                        {JSON.stringify(log.metadata || {})}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="form-hint">
        These are application event logs, not a tamper-proof security audit
        system. Access control and log integrity protections would be needed
        for production use.
      </p>
    </main>
  );
}
