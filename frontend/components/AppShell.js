
"use client";

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

export default function AppShell({ children }) {
  const pathname = usePathname();

  // Keep the existing dashboard layout unchanged.
  // The shared sidebar will appear on all other pages.
  if (pathname === "/") {
    return children;
  }

  const currentPage =
    navigation.find((item) => item.href === pathname)?.label || "LifeLink";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">♥</span>
          <span>LifeLink</span>
        </Link>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator" />
          <div>
            <div className="sidebar-footer-title">System Online</div>
            <div className="sidebar-footer-subtitle">
              Organ allocation platform
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">LifeLink / Workspace</div>
            <h1 className="topbar-title">{currentPage}</h1>
          </div>

          <div className="topbar-status">
            <span className="status-indicator" />
            <span>Connected</span>
          </div>
        </header>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}
