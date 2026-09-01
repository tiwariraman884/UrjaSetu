import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tasks",     label: "Tasks"     },
  { to: "/devices",   label: "Devices"   },
  { to: "/receipts",  label: "Receipts"  },
  { to: "/analytics", label: "Analytics" },
  { to: "/alerts",    label: "Alerts"    },
  { to: "/audit",     label: "Audit"     },
  { to: "/settings",  label: "Settings"  },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/dashboard" className="navbar-brand">
        Urja<span>Setu</span>
      </NavLink>
      <div className="navbar-links">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
      <div className="navbar-right">
        <span className="navbar-pill navbar-pill-network">Algorand Testnet</span>
        <span className="navbar-pill navbar-pill-sim">x402</span>
      </div>
    </nav>
  );
}
