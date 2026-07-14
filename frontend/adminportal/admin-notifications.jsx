import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "./admin-auth-context";
import {
  getAdminNotifications,
  createAdminNotification,
  toggleAdminNotification,
  deleteAdminNotification,
} from "./admin-api";

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const newNotif = await createAdminNotification({ content: content.trim(), active: true });
      setNotifications((prev) => [newNotif, ...prev]);
      setContent("");
      setSuccess("Notification published successfully!");
    } catch (err) {
      setError(err.message || "Failed to create notification.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    setError("");
    setSuccess("");
    try {
      const updated = await toggleAdminNotification(id, { active: !currentActive });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? updated : n))
      );
      setSuccess(`Notification is now ${!currentActive ? "active" : "inactive"}.`);
    } catch (err) {
      setError(err.message || "Failed to toggle notification status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;

    setError("");
    setSuccess("");
    try {
      await deleteAdminNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setSuccess("Notification deleted successfully.");
    } catch (err) {
      setError(err.message || "Failed to delete notification.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 text-white">
      <div className="max-w-4xl mx-auto">
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-500/30 cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="text-right">
            <h1 className="text-white font-bold text-lg leading-tight">Admin Portal</h1>
            <p className="text-gray-400 text-xs">System Announcements</p>
          </div>
        </div>

        {/* ── Header Section ─────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Manage Notifications
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Send global updates and alerts directly to the user dashboard.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        {/* ── Create Notification Form ────────────────────────────────── */}
        <section className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Create Announcement</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Notification content (Markdown supported)
              </span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="e.g. 🚀 Reminder: Module 2 project submission deadline is tonight at 11:59 PM. Make sure to commit and submit your links."
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-900 disabled:text-indigo-200 cursor-pointer"
              >
                {submitting ? "Publishing..." : "Publish Notification"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Existing Announcements ──────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Past Announcements</h3>
          
          <AnimatePresence mode="wait">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading announcements...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No announcements published yet.</div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <motion.div
                    key={notif._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`border rounded-xl p-4 transition-all duration-200 ${
                      notif.active
                        ? "border-indigo-500/30 bg-indigo-950/10 hover:border-indigo-500/50"
                        : "border-gray-800 bg-gray-950/40"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className={`text-sm leading-relaxed ${notif.active ? "text-white" : "text-gray-400"}`}>
                          {notif.content}
                        </p>
                        <span className="text-[10px] text-gray-500 block mt-2 font-mono">
                          Published: {new Date(notif.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 self-end sm:self-start">
                        {/* Toggle Active Switch */}
                        <button
                          onClick={() => handleToggleActive(notif._id, notif.active)}
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer border transition-colors ${
                            notif.active
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900"
                              : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
                          }`}
                        >
                          {notif.active ? "Active" : "Inactive"}
                        </button>

                        {/* Delete Button */}
                        {(admin?.canDelete === true) && (
                          <button
                            onClick={() => handleDelete(notif._id)}
                            className="text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer border bg-red-950/60 text-red-300 border-red-800 hover:bg-red-900 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
