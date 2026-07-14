// src/pages/admin/AdminLogin.jsx
// Admin-only login page. Separate from the GitHub OAuth user login.
// On success → redirects to /admin/dashboard

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAdminAuth } from "./admin-auth-context";
import { adminLogin, mockAdminLogin } from "./admin-api";

const USE_MOCK = false;

export default function AdminLogin() {
  const { login, admin } = useAdminAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState("");

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (admin) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    async function checkAuth() {
      if (USE_MOCK) {
        setChecking(false);
        return;
      }
      try {
        const res = await fetch(`/hackstack/api/auth/admin-check`);
        const data = await res.json();

        if (data.authorized) {
          login(data.user, data.token);
          navigate("/admin/dashboard", { replace: true });
        } else if (data.loginRequired) {
          localStorage.setItem("admin_login_redirect", "true");
          window.location.assign("/hackstack/api/auth/google");
        } else if (data.forbidden) {
          localStorage.removeItem("jwt");
          localStorage.removeItem("adminUser");
          window.location.assign("/hackstack/login");
        } else {
          setChecking(false);
        }
      } catch (err) {
        setChecking(false);
      }
    }

    checkAuth();
  }, [admin, login, navigate]);

  const handleSwitchAccount = async () => {
    setChecking(true);
    try {
      await fetch(`/hackstack/api/auth/logout`, { method: "POST" });
      localStorage.setItem("admin_login_redirect", "true");
      window.location.assign("/hackstack/api/auth/google");
    } catch (err) {
      setChecking(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError("Both fields are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const caller = USE_MOCK ? mockAdminLogin : adminLogin;
      const { token, user } = await caller(form);
      login(user, token);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      // If the backend says the Google account isn't whitelisted → go to user login
      if (err.forbidden) {
        setError("Access denied. Your Google account is not on the admin whitelist.");
        setTimeout(() => {
          window.location.assign("/hackstack/login");
        }, 2500);
        return;
      }
      // No Google session yet → trigger OAuth then retry
      if (err.loginRequired) {
        localStorage.setItem("admin_login_redirect", "true");
        window.location.assign("/hackstack/api/auth/google");
        return;
      }
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-gray-400 text-sm tracking-wide animate-pulse">Checking administrator permissions...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-950/40 border border-red-850 text-red-400 mb-5 shadow-lg shadow-red-900/10">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mb-2">
            Access Denied
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            {deniedMessage}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSwitchAccount}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg py-2.5 transition-colors shadow-lg shadow-indigo-900/30"
            >
              Switch Google Account
            </button>
            <button
              onClick={() => window.location.assign("/hackstack/")}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold text-sm rounded-lg py-2.5 transition-all"
            >
              Return to User Portal
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-full max-w-sm"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-900/40">
            <svg
              className="w-7 h-7 text-white"
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
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Hackstack Admin
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Restricted access — admins only
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="admin"
                autoComplete="username"
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3.5 py-2.5
                  placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3.5 py-2.5 pr-10
                    placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-3 py-2.5"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed
                text-white font-semibold text-sm rounded-lg py-2.5 mt-2 transition-colors shadow-lg shadow-indigo-900/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Verifying…
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>

        {/* Mock hint — remove in production */}
        {USE_MOCK && (
          <p className="text-center text-xs text-gray-600 mt-4">
            Mock mode: use{" "}
            <span className="text-gray-400">admin / hackstack123</span>
          </p>
        )}
      </motion.div>
    </div>
  );
}
