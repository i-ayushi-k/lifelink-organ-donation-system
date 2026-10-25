
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Dashboard", icon: "▦", href: "/" },
  { label: "Donors", icon: "♡", href: "/donors" },
  { label: "Organs", icon: "✚", href: "/organs" },
  { label: "Recipients", icon: "♙", href: "/recipients" },
  { label: "Waiting List", icon: "☷", href: "/waiting-list" },
  { label: "Allocations", icon: "⇄", href: "/allocations" },
  { label: "Transplants", icon: "♥", href: "/transplants" },
  { label: "Hospitals", icon: "⌂", href: "/hospitals" },
  { label: "Audit Logs", icon: "◷", href: "/audit-logs" },
];

const statCards = [
  { key: "donors", label: "Registered Donors", icon: "♡", color: "blue" },
  { key: "organs", label: "Total Organs", icon: "✚", color: "purple" },
  {
    key: "availableOrgans",
    label: "Available Organs",
    icon: "✓",
    color: "green",
  },
  {
    key: "activeRecipients",
    label: "Active Recipients",
    icon: "♙",
    color: "orange",
  },
  {
    key: "waitingRecipients",
    label: "On Waiting List",
    icon: "☷",
    color: "pink",
  },
  {
    key: "activeAllocations",
    label: "Active Allocations",
    icon: "⇄",
    color: "teal",
  },
];

function formatLabel(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const pathname = usePathname();

  const activeItem =
    navigation.find((item) => item.href === pathname) || navigation[0];

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
          throw new Error("Could not load dashboard data.");
        }

        setData(await response.json());
      } catch (err) {
        setError(err.message || "Could not load dashboard data.");
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <div className="brand-icon">+</div>
          <div>
            <h1>LifeLink</h1>
            <p>ORGAN DONATION SYSTEM</p>
          </div>
        </Link>

        <div className="nav-caption">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${
                pathname === item.href ? "selected" : ""
              }`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}

              {item.label === "Waiting List" &&
                data?.counts?.waitingRecipients > 0 && (
                  <span className="nav-count">
                    {data.counts.waitingRecipients}
                  </span>
                )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <strong>System operational</strong>
            <p>PostgreSQL · MongoDB</p>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            LifeLink <span>/</span> {activeItem.label}
          </div>

          <div className="user-chip">
            <div className="avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <p>Demo workspace</p>
            </div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">ORGAN DONATION MANAGEMENT</div>
              <h2>Dashboard overview</h2>
              <p className="subtitle">
                Monitor donors, available organs, recipients, and allocation
                activity.
              </p>
            </div>

            <div className="date-chip">
              <span>●</span> Live database
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="section-heading">
            <div>
              <h3>System at a glance</h3>
              <p>Current records from your database</p>
            </div>
            <span className="small-label">DATABASE SUMMARY</span>
          </div>

          <div className="stats-grid">
            {statCards.map((card) => (
              <article className="stat-card" key={card.key}>
                <div className={`stat-icon ${card.color}`}>{card.icon}</div>
                <div className="stat-label">{card.label}</div>
                <div className="stat-number">
                  {data ? (data.counts?.[card.key] ?? 0) : "—"}
                </div>
                <div className="stat-foot">
                  <span className="tiny-dot" /> Updated from PostgreSQL
                </div>
              </article>
            ))}
          </div>

          <div className="data-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Recently registered organs</h3>
                  <p>Latest organ records and availability</p>
                </div>

                <Link className="text-button" href="/organs">
                  View all →
                </Link>
              </div>

              {data ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Organ</th>
                        <th>Blood group</th>
                        <th>Hospital</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(data.recentOrgans || []).map((organ) => (
                        <tr key={organ.organ_id}>
                          <td>
                            <div className="table-primary">
                              {formatLabel(organ.organ_type)}
                            </div>
                            <div className="table-secondary">
                              ID #{organ.organ_id}
                            </div>
                          </td>

                          <td>
                            <span className="blood-tag">
                              {organ.blood_group}
                            </span>
                          </td>

                          <td>{organ.hospital_name}</td>

                          <td>
                            <span
                              className={`status-tag ${String(
                                organ.status
                              ).toLowerCase()}`}
                            >
                              {formatLabel(organ.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="loading">Loading organ records…</div>
              )}
            </section>

            <section className="panel recipients-panel">
              <div className="panel-header">
                <div>
                  <h3>Recipient priority list</h3>
                  <p>Sorted by demo priority score</p>
                </div>

                <Link className="text-button" href="/recipients">
                  View all →
                </Link>
              </div>

              {data ? (
                <div className="recipient-list">
                  {(data.priorityRecipients || []).map((recipient) => (
                    <article
                      className="recipient-row"
                      key={recipient.recipient_id}
                    >
                      <div className="recipient-avatar">
                        {recipient.full_name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </div>

                      <div className="recipient-info">
                        <strong>{recipient.full_name}</strong>
                        <p>
                          {formatLabel(recipient.required_organ)} ·{" "}
                          {recipient.blood_group}
                        </p>
                      </div>

                      <div className="priority">
                        <span
                          className={`priority-number priority-${recipient.medical_priority}`}
                        >
                          {recipient.medical_priority}
                        </span>
                        <small>Priority</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="loading">Loading recipients…</div>
              )}

              <div className="priority-note">
                Demo scores only. Clinical allocation requires verified
                medical assessment.
              </div>
            </section>
          </div>

          <footer className="page-footer">
            <span>
              LifeLink · Intelligent Organ Donation Matching &amp; Allocation
              System
            </span>
            <span>Academic demonstration · Fictional sample data</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
