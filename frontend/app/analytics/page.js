"use client";

import { useCallback, useEffect, useState } from "react";

function number(value) {
  return Number(value ?? 0).toLocaleString();
}

function percent(value) {
  return value === null || value === undefined ? "N/A" : `${Number(value).toFixed(2)}%`;
}

function label(value = "") {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analytics", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load analytics.");
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const allocations = data?.allocations;
  const outcomes = data?.transplantOutcomes;

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <p className="module-eyebrow">LIFELINK / REPORTS</p>
          <h1>Matching &amp; Allocation Analytics</h1>
          <p>Database-backed summaries of waiting lists, allocation outcomes, and waiting time.</p>
        </div>
        <div className="form-actions">
          <a className="back-link" href="/">← Dashboard</a>
          <button className="secondary-button" type="button" onClick={loadAnalytics} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh reports"}
          </button>
        </div>
      </header>

      <div className="form-note">
        <strong>How to read these metrics:</strong> allocation completion rate means completed allocations divided by all allocation records. Transplant success rate uses only transplants marked SUCCESSFUL or UNSUCCESSFUL. Average waiting time is calculated from waiting-list join date to allocation date for records that can be joined reliably.
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading && !data ? <p className="module-empty">Loading analytics…</p> : null}

      {data && (
        <>
          <section className="analytics-metric-grid">
            <article className="module-card analytics-metric">
              <p className="module-eyebrow">Total allocations</p>
              <h2>{number(allocations?.total_allocations)}</h2>
              <p>All recorded allocation records</p>
            </article>
            <article className="module-card analytics-metric">
              <p className="module-eyebrow">Active allocations</p>
              <h2>{number(allocations?.active_allocations)}</h2>
              <p>Currently active records</p>
            </article>
            <article className="module-card analytics-metric">
              <p className="module-eyebrow">Allocation completion rate</p>
              <h2>{percent(allocations?.allocation_completion_rate_percent)}</h2>
              <p>{number(allocations?.completed_allocations)} completed</p>
            </article>
            <article className="module-card analytics-metric">
              <p className="module-eyebrow">Observed transplant success</p>
              <h2>{percent(outcomes?.observed_success_rate_percent)}</h2>
              <p>Excludes scheduled transplants</p>
            </article>
          </section>

          <section className="module-card">
            <div className="module-card-heading">
              <div>
                <h2>Waiting-list counts by organ</h2>
                <p>Counts are grouped by organ type using SQL aggregation.</p>
              </div>
            </div>
            {data.waitingList.length === 0 ? (
              <p className="module-empty">No waiting-list entries found.</p>
            ) : (
              <div className="module-table-wrap">
                <table className="module-table">
                  <thead><tr><th>Organ type</th><th>Waiting</th><th>Matched</th><th>Transplanted</th><th>Removed</th><th>Total entries</th></tr></thead>
                  <tbody>{data.waitingList.map((row) => (
                    <tr key={row.organ_type}>
                      <td>{label(row.organ_type)}</td><td>{number(row.waiting_count)}</td><td>{number(row.matched_count)}</td><td>{number(row.transplanted_count)}</td><td>{number(row.removed_count)}</td><td>{number(row.total_entries)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="module-card">
            <div className="module-card-heading"><div><h2>Average waiting time</h2><p>Elapsed days from waiting-list registration to allocation, grouped by organ.</p></div></div>
            {data.averageWaitingTime.length === 0 ? (
              <p className="module-empty">No matching waiting-list and allocation records are available to calculate waiting time yet.</p>
            ) : (
              <div className="module-table-wrap">
                <table className="module-table">
                  <thead><tr><th>Organ type</th><th>Cases included</th><th>Average wait (days)</th></tr></thead>
                  <tbody>{data.averageWaitingTime.map((row) => (
                    <tr key={row.organ_type}><td>{label(row.organ_type)}</td><td>{number(row.allocated_cases)}</td><td>{Number(row.average_wait_days).toFixed(2)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="module-card">
            <div className="module-card-heading"><div><h2>Allocation and transplant outcomes</h2><p>Breakdown of allocation statuses and recorded transplant outcomes.</p></div></div>
            <div className="module-table-wrap">
              <table className="module-table">
                <thead><tr><th>Category</th><th>Count</th></tr></thead>
                <tbody>
                  <tr><td>Active allocations</td><td>{number(allocations?.active_allocations)}</td></tr>
                  <tr><td>Completed allocations</td><td>{number(allocations?.completed_allocations)}</td></tr>
                  <tr><td>Cancelled allocations</td><td>{number(allocations?.cancelled_allocations)}</td></tr>
                  <tr><td>Total transplant records</td><td>{number(outcomes?.total_transplants)}</td></tr>
                  <tr><td>Successful transplants</td><td>{number(outcomes?.successful_transplants)}</td></tr>
                  <tr><td>Unsuccessful transplants</td><td>{number(outcomes?.unsuccessful_transplants)}</td></tr>
                  <tr><td>Scheduled transplants</td><td>{number(outcomes?.scheduled_transplants)}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <p className="form-note">This page reports database records for an educational demo. These metrics do not evaluate clinical suitability or real-world transplant performance.</p>
    </main>
  );
}
