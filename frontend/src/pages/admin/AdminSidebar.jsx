import React from "react";
import { NavLink } from "react-router-dom";
import jumpstartIcon from "../../assets/jumpstart-icon.png";
import { company } from "../../config/company";
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  CreditCard,
  BarChart3,
  Settings,
} from "lucide-react";

const AdminSidebar = ({ isOpen, onClose }) => {
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/admin/dashboard" },
    { icon: <FileText size={20} />, label: "Test Submissions", path: "/admin/testsubmissions" },
    { icon: <CheckSquare size={20} />, label: "Published Results", path: "/admin/publishedresults" },
    { icon: <Users size={20} />, label: "Users", path: "/admin/usermanagement" },
    { icon: <CreditCard size={20} />, label: "Payments", path: "/admin/payments" },
    { icon: <BarChart3 size={20} />, label: "Analytics", path: "/admin/analytics" },
    { icon: <Settings size={20} />, label: "Settings", path: "/admin/settings" },
  ];

  // Auto-close on link click is a mobile-only behaviour — on mobile the
  // sidebar slides over the content (with a dimmed overlay), so we want
  // it to dismiss once the admin picks a destination. On desktop (lg+)
  // the rail is persistent, and closing it on every nav click was a bug
  // — admins would land on a page with no nav visible. We gate the close
  // behind a viewport-width check that matches the Tailwind `lg`
  // breakpoint (1024px) so the two paths stay in sync.
  const handleNavClick = () => {
    if (typeof window === "undefined" || !onClose) return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      onClose();
    }
  };

  return (
    <>
      {/* ── Mobile overlay ── clicking outside closes the sidebar */}
      {isOpen && (
        <div
          className="report-print-hidden fixed inset-0 z-10 bg-black/30 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`report-print-hidden fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-20
        transition-all duration-300
        ${isOpen ? "w-20" : "w-0 overflow-hidden -translate-x-full"}`}
      >
        <div className="flex flex-col items-center py-6">
          {/* Logo — icon-only mark for the collapsed (w-20) sidebar rail. */}
          <img
            src={jumpstartIcon}
            alt={company.brandName}
            width="187"
            height="187"
            className="w-10 h-10 mb-10"
          />

          {/* Navigation */}
          <nav className="flex flex-col gap-6">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `group relative p-2 rounded-lg transition-colors flex items-center justify-center
                ${
                  isActive
                    ? "bg-[#14b8a61a] text-[#14b8a6]"
                    : "text-gray-400 hover:text-gray-600"
                }`
                }
              >
                {item.icon}
                <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#0F1729] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 md:flex">
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
