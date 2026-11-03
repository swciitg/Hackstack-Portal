import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../src/components/ui/alert-dialog";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { deleteAdminModule, listAdminModules } from "./admin-api";
import { useAdminAuth } from "./admin-auth-context";

const getModuleSummary = (moduleDoc) => {
  const chapters = Array.isArray(moduleDoc?.chapters) ? moduleDoc.chapters : [];
  const dayCount = chapters.reduce((count, chapter) => {
    const days = Array.isArray(chapter?.days) ? chapter.days.length : 0;
    return count + days;
  }, 0);

  return {
    week: moduleDoc?.week ?? "—",
    chapters: chapters.length,
    days: dayCount,
  };
};

export default function DeleteModule() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (admin && !admin.canDelete) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [admin, navigate]);

  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadModules() {
      setLoading(true);
      setError("");
      try {
        const moduleList = await listAdminModules();
        if (!active) return;

        setModules(moduleList);
        setSelectedModuleId(moduleList[0]?._id || "");
      } catch (err) {
        if (active) setError(err.message || "Failed to load modules.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadModules();

    return () => {
      active = false;
    };
  }, []);

  const selectedModule = useMemo(
    () => modules.find((moduleDoc) => moduleDoc._id === selectedModuleId),
    [modules, selectedModuleId],
  );

  const handleDelete = async () => {
  if (!selectedModule) {
    toast.error("Please select a module before deleting.");
    return;
  }

  setDeleting(true);
  setError("");

  try {
    const deletedTitle = selectedModule.title;

    await deleteAdminModule(selectedModule._id);

    const remainingModules = modules.filter(
      (moduleDoc) => moduleDoc._id !== selectedModule._id,
    );

    setModules(remainingModules);
    setSelectedModuleId(remainingModules[0]?._id || "");

    setIsDeleteDialogOpen(false);
    toast.success(`"${deletedTitle}" deleted successfully.`);
  } catch (err) {
    toast.error(err.message || "Failed to delete module.");
  } finally {
    setDeleting(false);
  }
};

  const summary = selectedModule ? getModuleSummary(selectedModule) : null;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
              Hackstack Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Delete a Module</h1>
            <p className="mt-1 text-sm text-gray-400">
              Select the module you want to remove from the portal, then confirm the deletion.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="rounded-lg border border-gray-800 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-700 hover:bg-gray-900"
          >
            Back to Dashboard
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-gray-800 bg-gray-900/80 p-6 shadow-2xl shadow-black/20"
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-200">Choose module</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Pick the module from the list below. The selected module will be permanently deleted.
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Module to delete
                </span>
                <select
                  value={selectedModuleId}
                  onChange={(event) => {
                    setSelectedModuleId(event.target.value);
                    setSuccess("");
                    setError("");
                  }}
                  disabled={loading || deleting || modules.length === 0}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {modules.length === 0 ? (
                    <option value="">No modules available</option>
                  ) : null}
                  {modules.map((moduleDoc) => (
                    <option key={moduleDoc._id} value={moduleDoc._id}>
                      {moduleDoc.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={loading || deleting || !selectedModule}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete Module
              </button>

                <button
                  type="button"
                  onClick={() => navigate("/admin/dashboard")}
                  className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:border-gray-600 hover:bg-gray-900"
                >
                  Cancel
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-gray-500">Loading modules...</p>
              ) : null}

              {!loading && modules.length === 0 ? (
                <p className="text-sm text-gray-500">No modules are available to delete.</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Selected module
              </p>

              {selectedModule ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedModule.title}</h2>
                    <p className="mt-1 text-sm text-gray-400">/{selectedModule.slug}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Week", value: summary.week },
                      { label: "Chapters", value: summary.chapters },
                      { label: "Days", value: summary.days },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-4 text-center">
                        <p className="text-lg font-bold text-white">{item.value}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    This action is permanent. The module will be removed from the admin list and the live portal.
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-gray-800 px-4 py-10 text-center text-sm text-gray-500">
                  Select a module to preview its details before deletion.
                </div>
              )}
            </div>
          </div>
        </motion.div>
                <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent  className="max-w-lg rounded-2xl border border-gray-700 bg-gray-900 text-white shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-bold text-white">
                Delete {selectedModule?.title}?
              </AlertDialogTitle>

              <AlertDialogDescription className="text-sm leading-relaxed text-gray-300">
                This action cannot be undone. Deleting this module will permanently remove it, along with all associated progress, registrations, quizzes, and leaderboard entries. Users' total scores will also be reduced by the quiz points earned in this module.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}
  className="border-gray-700 bg-gray-950 text-gray-200 hover:bg-gray-800 hover:text-white">
                Cancel
              </AlertDialogCancel>

 <button
    type="button"
    onClick={handleDelete}
    disabled={deleting}
    className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {deleting ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Deleting...
      </>
    ) : (
      "Delete Module"
    )}
  </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}