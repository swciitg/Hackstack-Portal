/**
 * admin-progress-editor.jsx
 * Admin tool for viewing and editing every user's full progress.
 * Gated to canDelete admins only.
 *
 * Layout:
 *  - Top tabs: "By User" | "By Module"
 *  - By User: searchable user list → select user → see all modules → click module → edit drawer
 *  - By Module: module list → select module → see all enrolled users → click user → edit drawer
 *  - Edit drawer: per-day checkboxes + quiz score inputs + module-completed toggle + save
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "./admin-auth-context";
import {
  getProgressEditorUsers,
  getProgressEditorUser,
  updateProgressEditorUserModule,
  getProgressEditorModules,
} from "./admin-api";
import Avatar from "./avatar";

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-400 gap-3 text-sm">
      <svg className="animate-spin h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Loading…
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="bg-red-900/20 border border-red-800/60 rounded-2xl p-6 text-center text-red-400 text-sm">
      <p className="font-semibold mb-1">Error</p>
      <p>{message}</p>
    </div>
  );
}

function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl flex items-center gap-2
        ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
    >
      {type === "success" ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {message}
    </motion.div>
  );
}

// ── Day Progress Row ────────────────────────────────────────────────────────
function DayProgressRow({ day, edit, toggleDay, setQuizScore, setAnswerForQuestion }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const dayId = day._id.toString();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Day row */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Completed toggle */}
        <button
          onClick={() => toggleDay(dayId)}
          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
            ${edit.completed
              ? "bg-emerald-500 border-emerald-500"
              : "border-gray-600 hover:border-gray-400"
            }`}
        >
          {edit.completed && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Day title */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${edit.completed ? "text-emerald-400" : "text-gray-300"}`}>
            {day.title}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Day {day.dayIndex + 1}
            {edit.hasQuiz && (
              <span className="ml-2 text-violet-400">• Has Quiz</span>
            )}
          </p>
        </div>

        {/* Quiz score input */}
        {edit.hasQuiz && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Score</label>
            <input
              type="number"
              min="0"
              max={edit.quizMaxScore ?? 9999}
              value={edit.quizScore}
              onChange={(e) => setQuizScore(dayId, e.target.value)}
              placeholder="—"
              className="w-16 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-2 py-1
                text-center focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            {edit.quizMaxScore != null && (
              <span className="text-[10px] text-gray-500">/ {edit.quizMaxScore}</span>
            )}
          </div>
        )}

        {/* Toggle answer editor */}
        {edit.hasQuiz && edit.quizQuestions?.length > 0 && (
          <button
            onClick={() => setShowAnswers((v) => !v)}
            className="flex-shrink-0 text-[10px] font-semibold text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-violet-900/20"
          >
            {showAnswers ? "Hide" : "Answers"}
          </button>
        )}
      </div>

      {/* Per-question answer editor */}
      {edit.hasQuiz && showAnswers && edit.quizQuestions?.length > 0 && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-3 bg-gray-900/50">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Answer Review
          </p>
          {edit.quizQuestions.map((q, qIdx) => {
            const userAns = edit.userAnswers?.[qIdx] ?? null;
            return (
              <div key={qIdx} className="space-y-1.5">
                <p className="text-xs text-gray-300 font-medium">
                  Q{qIdx + 1}: {q.question}
                  <span className="ml-2 text-[10px] text-gray-500">({q.points} pts)</span>
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = oIdx === q.correctIndex;
                    const isSelected = oIdx === userAns;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => setAnswerForQuestion(dayId, qIdx, oIdx)}
                        className={`text-left text-xs px-3 py-2 rounded-xl border transition-all
                          ${isSelected && isCorrect
                            ? "bg-emerald-900/40 border-emerald-600 text-emerald-300"
                            : isSelected && !isCorrect
                              ? "bg-red-900/40 border-red-600 text-red-300"
                              : isCorrect
                                ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-500/70"
                                : "bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500"
                          }`}
                      >
                        <span className="font-bold mr-1">{String.fromCharCode(65 + oIdx)}.</span>
                        {opt}
                        {isCorrect && (
                          <span className="ml-1 text-emerald-400">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Edit Drawer ───────────────────────────────────────────────────────────────
// Opens when admin clicks "Edit" on a user×module pair.

function EditDrawer({ userId, moduleId, moduleTitle, userName, onClose, onSaved }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Local edit state: map of dayId → { completed, quizScore, userAnswers }
  const [dayEdits, setDayEdits] = useState({});
  const [moduleCompleted, setModuleCompleted] = useState(false);

  // Load the user's full progress once
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getProgressEditorUser(userId)
      .then((data) => {
        if (!active) return;
        const modData = data.modulesProgress.find(
          (m) => m.moduleId.toString() === moduleId.toString()
        );
        if (!modData) {
          setError("Module not found in user's registered modules.");
          setLoading(false);
          return;
        }
        setDetail(modData);
        setModuleCompleted(modData.moduleCompleted || false);

        // Flatten all days into dayEdits
        const edits = {};
        for (const chapter of modData.chapters || []) {
          for (const day of chapter.days || []) {
            edits[day._id.toString()] = {
              completed: day.isCompleted,
              quizScore: day.quizScore ?? "",
              userAnswers: day.userAnswers || [],
              hasQuiz: day.hasQuiz,
              quizId: day.quizId,
              quizAttempted: day.quizAttempted,
              quizMaxScore: day.quizMaxScore,
              quizQuestions: day.quizQuestions || [],
            };
          }
        }
        setDayEdits(edits);
        setLoading(false);
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load progress.");
          setLoading(false);
        }
      });

    return () => { active = false; };
  }, [userId, moduleId]);

  const toggleDay = (dayId) => {
    setDayEdits((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], completed: !prev[dayId].completed },
    }));
  };

  const setQuizScore = (dayId, value) => {
    setDayEdits((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], quizScore: value },
    }));
  };

  const setAnswerForQuestion = (dayId, qIdx, answerIdx) => {
    setDayEdits((prev) => {
      const current = prev[dayId];
      const newAnswers = [...(current.userAnswers || [])];
      newAnswers[qIdx] = answerIdx;
      return { ...prev, [dayId]: { ...current, userAnswers: newAnswers } };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const completedDays = Object.entries(dayEdits)
        .filter(([, v]) => v.completed)
        .map(([id]) => id);

      const quizScores = Object.entries(dayEdits)
        .filter(([, v]) => v.hasQuiz && v.quizScore !== "" && v.quizScore !== null)
        .map(([dayId, v]) => ({
          dayId,
          score: Number(v.quizScore),
          userAnswers: v.userAnswers,
        }));

      const attemptedQuizIds = Object.values(dayEdits)
        .filter((v) => v.hasQuiz && v.quizAttempted && v.quizId)
        .map((v) => v.quizId.toString());

      await updateProgressEditorUserModule(userId, moduleId, {
        completedDays,
        quizScores,
        attemptedQuizIds,
        moduleCompleted,
      });

      onSaved();
    } catch (err) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 200 }}
        className="h-full w-full max-w-2xl bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-800 bg-gray-900/60 flex-shrink-0">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">
              Progress Editor
            </p>
            <h2 className="text-white font-bold text-lg leading-tight">{moduleTitle}</h2>
            <p className="text-gray-400 text-sm mt-0.5">User: <span className="text-gray-200">{userName}</span></p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800 mt-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <Spinner />
          ) : error && !detail ? (
            <ErrorBox message={error} />
          ) : detail ? (
            <>
              {/* Module Completed toggle */}
              <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
                <div>
                  <p className="text-white font-semibold text-sm">Module Completed</p>
                  <p className="text-gray-500 text-xs mt-0.5">Marks entire module as finished</p>
                </div>
                <button
                  onClick={() => setModuleCompleted((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
                    ${moduleCompleted ? "bg-emerald-500" : "bg-gray-700"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                      ${moduleCompleted ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>

              {/* Chapters → Days */}
              {(detail.chapters || []).map((chapter, chIdx) => (
                <div key={chapter._id || chIdx}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                    {chapter.title}
                  </h3>
                  <div className="space-y-3">
                    {(chapter.days || []).map((day) => {
                      const dayId = day._id.toString();
                      const edit = dayEdits[dayId] || {};
                      return (
                        <DayProgressRow
                          key={dayId}
                          day={day}
                          edit={edit}
                          toggleDay={toggleDay}
                          setQuizScore={setQuizScore}
                          setAnswerForQuestion={setAnswerForQuestion}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-800 bg-gray-900/60 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── By-User Tab ───────────────────────────────────────────────────────────────

function ByUserTab({ onEditRequest }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProgressEditorUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const selectedUser = useMemo(
    () => users.find((u) => u._id === selectedUserId) || null,
    [users, selectedUserId]
  );

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full">
      {/* User list */}
      <div className="lg:w-80 flex-shrink-0 space-y-3">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-xl pl-10 pr-4 py-2.5
              placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorBox message={error} />
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            {filtered.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUserId(user._id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all
                  ${selectedUserId === user._id
                    ? "bg-violet-900/30 border-violet-600/60 text-white"
                    : "bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-300"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user.username}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-violet-400">{user.totalScore}</p>
                    <p className="text-[9px] text-gray-500">pts</p>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-10">No users found</p>
            )}
          </div>
        )}
      </div>

      {/* User detail panel */}
      <div className="flex-1 min-w-0">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg className="w-12 h-12 mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <p className="text-sm font-medium">Select a user to view progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User header */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-center gap-4">
              <Avatar username={selectedUser.username} avatarUrl={selectedUser.avatarUrl} size="md" />
              <div className="flex-1">
                <h3 className="text-white font-bold text-base">{selectedUser.username}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{selectedUser.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedUser.college && (
                    <span className="text-[10px] bg-gray-800 text-gray-400 rounded-md px-2 py-0.5">{selectedUser.college}</span>
                  )}
                  {selectedUser.year && (
                    <span className="text-[10px] bg-gray-800 text-gray-400 rounded-md px-2 py-0.5">{selectedUser.year}</span>
                  )}
                  {selectedUser.programme && (
                    <span className="text-[10px] bg-gray-800 text-gray-400 rounded-md px-2 py-0.5">{selectedUser.programme}</span>
                  )}
                  {selectedUser.rollNumber && (
                    <span className="text-[10px] bg-gray-800 text-gray-400 rounded-md px-2 py-0.5">Roll: {selectedUser.rollNumber}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-violet-400">{selectedUser.totalScore}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Score</p>
              </div>
            </div>

            {/* Backend User Details */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Full User Metadata (Backend)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { label: "User ID (_id)", value: selectedUser._id },
                  { label: "Google ID", value: selectedUser.googleId || "—" },
                  { label: "Full Name", value: selectedUser.name || "—" },
                  { label: "Username", value: selectedUser.username || "—" },
                  { label: "Email Address", value: selectedUser.email || "—" },
                  { label: "College", value: selectedUser.college || "—" },
                  { label: "Year", value: selectedUser.year || "—" },
                  { label: "Roll Number", value: selectedUser.rollNumber || "—" },
                  { label: "Programme", value: selectedUser.programme || "—" },
                  { label: "Country Code", value: selectedUser.countryCode || "—" },
                  { label: "Mobile Number", value: selectedUser.mobileNumber || "—" },
                  { label: "Profile Completed", value: selectedUser.profileCompleted ? "✅ Yes" : "❌ No" },
                  { label: "Created At", value: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : "—" },
                  { label: "Last Updated", value: selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString() : "—" },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{item.label}</span>
                    <span className="text-white font-mono mt-0.5 break-all select-all">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Module list */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
              Registered Modules ({selectedUser.modulesProgress?.length || 0})
            </h4>
            {(!selectedUser.modulesProgress || selectedUser.modulesProgress.length === 0) ? (
              <p className="text-sm text-gray-500 italic px-1">No registered modules.</p>
            ) : (
              <div className="space-y-2.5">
                {selectedUser.modulesProgress.map((mod) => {
                  const pct = mod.totalDays > 0 ? Math.round((mod.daysCompleted / mod.totalDays) * 100) : 0;
                  return (
                    <div
                      key={mod.moduleId}
                      className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{mod.title}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{mod.slug}</p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Days</p>
                            <p className="text-sm font-bold text-amber-400">
                              {mod.daysCompleted}/{mod.totalDays}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Score</p>
                            <p className="text-sm font-bold text-emerald-400">{mod.moduleScore}</p>
                          </div>
                          {mod.moduleCompleted && (
                            <span className="text-[10px] font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 rounded-lg px-2 py-1">
                              ✓ Done
                            </span>
                          )}
                          <button
                            onClick={() =>
                              onEditRequest({
                                userId: selectedUser._id,
                                moduleId: mod.moduleId,
                                userName: selectedUser.username,
                                moduleTitle: mod.title,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                            Edit
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-violet-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1 text-right">{pct}% complete</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── By-Module Tab ─────────────────────────────────────────────────────────────

function ByModuleTab({ onEditRequest }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProgressEditorModules();
      setModules(data);
      if (data.length > 0) setSelectedModuleId(data[0].moduleId.toString());
    } catch (err) {
      setError(err.message || "Failed to load modules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedModule = useMemo(
    () => modules.find((m) => m.moduleId.toString() === selectedModuleId) || null,
    [modules, selectedModuleId]
  );

  const filteredUsers = useMemo(() => {
    if (!selectedModule) return [];
    const q = search.toLowerCase();
    return selectedModule.usersProgress.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [selectedModule, search]);

  return (
    <div className="space-y-5">
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} />
      ) : (
        <>
          {/* Module selector */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                Select Module
              </label>
              <select
                value={selectedModuleId}
                onChange={(e) => { setSelectedModuleId(e.target.value); setSearch(""); }}
                className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-xl px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer"
              >
                {modules.map((m) => (
                  <option key={m.moduleId} value={m.moduleId.toString()}>
                    {m.title} — {m.enrolledCount} enrolled
                  </option>
                ))}
              </select>
            </div>

            {/* User search */}
            <div className="sm:w-64">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                Search User
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter users…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-xl pl-10 pr-4 py-2.5
                    placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Module summary */}
          {selectedModule && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Days", value: selectedModule.totalDays, color: "text-amber-400" },
                { label: "Enrolled Users", value: selectedModule.enrolledCount, color: "text-violet-400" },
                { label: "Difficulty", value: selectedModule.difficulty || "—", color: "text-blue-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-center">
                  <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Users enrolled in this module */}
          {filteredUsers.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">
              {selectedModule?.enrolledCount === 0 ? "No users enrolled in this module." : "No users match your search."}
            </p>
          ) : (
            <div className="space-y-2.5">
              {filteredUsers.map((u) => {
                const pct = selectedModule?.totalDays > 0
                  ? Math.round((u.daysCompleted / selectedModule.totalDays) * 100)
                  : 0;
                return (
                  <div
                    key={u.userId}
                    className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar username={u.username} avatarUrl={u.avatarUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                        <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                        {/* Mini progress bar */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-gray-800 rounded-full h-1">
                            <div
                              className="bg-violet-500 h-1 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 flex-shrink-0">
                            {u.daysCompleted}/{selectedModule?.totalDays} days
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Score</p>
                          <p className="text-sm font-bold text-emerald-400">{u.moduleScore}</p>
                        </div>
                        {u.moduleCompleted && (
                          <span className="text-[10px] font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 rounded-lg px-2 py-1">
                            ✓ Done
                          </span>
                        )}
                        <button
                          onClick={() =>
                            onEditRequest({
                              userId: u.userId,
                              moduleId: selectedModule.moduleId,
                              userName: u.username,
                              moduleTitle: selectedModule.title,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminProgressEditor() {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("user");
  const [editTarget, setEditTarget] = useState(null); // { userId, moduleId, userName, moduleTitle }
  const [toast, setToast] = useState(null); // { message, type }
  const [refreshKey, setRefreshKey] = useState(0);

  // Guard: only canDelete admins
  useEffect(() => {
    if (admin && !admin.canDelete) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [admin, navigate]);

  const handleEditRequest = useCallback((target) => {
    setEditTarget(target);
  }, []);

  const handleSaved = useCallback(() => {
    setEditTarget(null);
    setRefreshKey((k) => k + 1);
    setToast({ message: "Progress updated successfully!", type: "success" });
  }, []);

  const handleEditError = useCallback((msg) => {
    setToast({ message: msg || "Save failed.", type: "error" });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-violet-400 transition-colors px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-violet-500/30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <div className="text-right">
            <h1 className="text-white font-bold text-lg leading-tight">Admin Portal</h1>
            <p className="text-gray-400 text-xs">Progress Editor</p>
          </div>
        </div>

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Progress Editor</h2>
              <p className="text-gray-400 text-sm">
                Edit user progress, completed days, quiz scores, and per-question answers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-900/40 text-red-400 border border-red-800/50">
              🔒 Requires canDelete Permission
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-violet-900/40 text-violet-400 border border-violet-800/50">
              Signed in as {admin?.username}
            </span>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-2xl p-1 mb-6 w-fit">
          {[
            { key: "user", label: "By User", icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
            )},
            { key: "module", label: "By Module", icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            )},
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${activeTab === tab.key
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${refreshKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "user" ? (
              <ByUserTab onEditRequest={handleEditRequest} />
            ) : (
              <ByModuleTab onEditRequest={handleEditRequest} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Edit drawer */}
      <AnimatePresence>
        {editTarget && (
          <EditDrawer
            key={`${editTarget.userId}-${editTarget.moduleId}`}
            userId={editTarget.userId}
            moduleId={editTarget.moduleId}
            userName={editTarget.userName}
            moduleTitle={editTarget.moduleTitle}
            onClose={() => setEditTarget(null)}
            onSaved={handleSaved}
            onError={handleEditError}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.message}
            message={toast.message}
            type={toast.type}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
