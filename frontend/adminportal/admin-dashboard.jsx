// src/pages/admin/AdminDashboard.jsx
// Protected admin dashboard.
// Shows two action cards: Create a Module, Edit a Module.
// Each card navigates to its respective route (blank pages for now).

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAdminAuth } from "./admin-auth-context";
import {
  getAdminStats,
  fetchModulesPublic,
  mockGetAdminStats,
  mockFetchModulesPublic,
} from "./admin-api";
const API_URL = import.meta.env.VITE_API_URL || '/api';

const USE_MOCK = false;

const ACTIONS = [
  {
    key: "create",
    path: "/admin/modules/create",
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    iconBg: "bg-indigo-500/15 text-indigo-400",
    border: "hover:border-indigo-500/60",
    title: "Create a Module",
    description:
      "Add a new course module with chapters, markdown content, and YouTube video links.",
    badge: "New",
    badgeColor: "bg-indigo-900/60 text-indigo-300 border border-indigo-700",
  },
  {
    key: "edit",
    path: "/admin/modules/edit",
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
    iconBg: "bg-emerald-500/15 text-emerald-400",
    border: "hover:border-emerald-500/60",
    title: "Edit a Module",
    description:
      "Update existing modules — modify chapters, fix markdown, swap video links, or manage quizzes.",
    badge: "Manage",
    badgeColor: "bg-emerald-900/60 text-emerald-300 border border-emerald-700",
  },
  {
    key: "delete",
    path: "/admin/modules/delete",
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h14"
        />
      </svg>
    ),
    iconBg: "bg-red-500/15 text-red-400",
    border: "hover:border-red-500/60",
    title: "Delete a Module",
    description:
      "Select an existing module from the admin list and remove it from the portal.",
    badge: "Danger",
    badgeColor: "bg-red-900/60 text-red-300 border border-red-700",
  },
  {
    key: "users",
    path: "/admin/users",
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    iconBg: "bg-amber-500/15 text-amber-400",
    border: "hover:border-amber-500/60",
    title: "User Info & Progress",
    description:
      "View registered users, see which modules they are working on, completed days, and their quiz scores.",
    badge: "Users",
    badgeColor: "bg-amber-900/60 text-amber-300 border border-amber-700",
  },
  {
    key: "notifications",
    path: "/admin/notifications",
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
    iconBg: "bg-indigo-500/15 text-indigo-400",
    border: "hover:border-indigo-500/60",
    title: "Manage Notifications",
    description:
      "Send custom updates, system announcements, or meet links to the user dashboard.",
    badge: "Alerts",
    badgeColor: "bg-indigo-900/60 text-indigo-300 border border-indigo-700",
  },
];

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: "—",
    totalModules: "—",
    activeQuizzes: "—",
  });

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        const statsCaller = USE_MOCK ? mockGetAdminStats : getAdminStats;
        const modulesCaller = USE_MOCK ? mockFetchModulesPublic : fetchModulesPublic;

        const [statsData, modulesData] = await Promise.all([
          statsCaller().catch(() => ({ totalUsers: "—" })),
          modulesCaller().catch(() => []),
        ]);

        if (active) {
          setStats({
            totalUsers: statsData?.totalUsers !== undefined ? statsData.totalUsers : "—",
            totalModules: Array.isArray(modulesData) ? modulesData.length : "—",
            // Use activeQuizzes from admin stats — it filters out quizzes from deleted modules
            activeQuizzes: statsData?.activeQuizzes !== undefined ? statsData.activeQuizzes : "—",
          });
        }
      } catch (err) {
        // Silent error
      }
    }

    loadStats();

    const interval = setInterval(loadStats, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`/hackstack/api/auth/logout`, { method: "POST" });
    } catch (err) {
      // Silent error
    }
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow shadow-indigo-900/50">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">
                Hackstack Admin
              </h1>
              <p className="text-gray-300 text-xs">
                Signed in as{" "}
                <span className="text-gray-200">{admin?.username}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-950/40"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>

        {/* ── Welcome ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Dashboard
          </h2>
          <p className="text-gray-300 text-sm mt-1">
            Manage course content for the Hackstack portal.
          </p>
        </motion.div>

        {/* ── Action Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTIONS.filter(a => a.key !== "delete" || admin?.canDelete).map((action, i) => (
            <motion.button
              key={action.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              onClick={() => navigate(action.path)}
              className={`group text-left w-full bg-gray-900 border border-gray-800 ${action.border}
                rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer`}
            >
              {/* Icon + Badge row */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.iconBg}`}
                >
                  {action.icon}
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${action.badgeColor}`}
                >
                  {action.badge}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-lg mb-1.5 group-hover:text-indigo-300 transition-colors">
                {action.title}
              </h3>

              {/* Description */}
              <p className="text-gray-300 text-sm leading-relaxed">
                {action.description}
              </p>

              {/* Arrow */}
              <div className="flex items-center gap-1 mt-5 text-gray-300 group-hover:text-indigo-400 transition-colors text-sm font-medium">
                Go to page
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </motion.button>
          ))}
        </div>

        {/* ── Quick info strip ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-3 divide-x divide-gray-800 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
        >
          {[
            { label: "Total Users", value: stats.totalUsers, note: "from /api/admin/stats" },
            { label: "Total Modules", value: stats.totalModules, note: "from /api/modules" },
            { label: "Active Quizzes", value: stats.activeQuizzes, note: "from /api/admin/stats" },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-4 text-center">
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-300 mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{stat.note}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
