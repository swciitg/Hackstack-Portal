import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useModules } from "../context/ModulesContext";
import "./modules.css";

function ModuleCatalog() {
  const {
    modules,
    loading,
    error,
    registeredModuleIds,
    registerModule,
    unregisterModule,
    getProgressForModule,
    getQuizzesForModule,
  } = useModules();

  const [actionError, setActionError] = useState("");
  const [pendingId, setPendingId] = useState("");

  const learningSummary = useMemo(() => {
    const totalDays = modules.reduce((sum, module) => sum + module.dayCount, 0);
    const enrolledModules = modules.filter((module) =>
      registeredModuleIds.includes(module.id)
    );
    const enrolledTotalDays = enrolledModules.reduce(
      (sum, module) => sum + module.dayCount,
      0
    );
    const completedDays = enrolledModules.reduce((sum, module) => {
      const progress = getProgressForModule(module.id);
      return sum + (progress?.completedDays?.length || 0);
    }, 0);
    const registeredCount = enrolledModules.length;
    const completionPercent =
      registeredCount > 0 && enrolledTotalDays > 0
        ? Math.round((completedDays / enrolledTotalDays) * 100)
        : 0;

    return {
      totalStacks: modules.length,
      totalDays,
      registeredCount,
      completedDays,
      completionPercent,
    };
  }, [getProgressForModule, modules, registeredModuleIds]);

  const handleRegister = async (moduleId) => {
    setActionError("");
    setPendingId(moduleId);
    try {
      await registerModule(moduleId);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setPendingId("");
    }
  };

  const handleUnregister = async (moduleId) => {
    setActionError("");
    setPendingId(moduleId);
    try {
      await unregisterModule(moduleId);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setPendingId("");
    }
  };

  if (loading) {
    return (
      <div className="modules-shell">
        <div className="modules-panel modules-empty-state">Loading modules...</div>
      </div>
    );
  }

  return (
    <div className="modules-shell">
      <header className="modules-hero">
        <span className="modules-pill">
          {learningSummary.totalStacks} stacks · build something real
        </span>
        <h2>Your Learning Path</h2>
        <p>
          Register stack by stack, move at your own pace, complete each daily
          task, and earn points through quizzes.
        </p>
      </header>

      {error ? <div className="modules-alert modules-alert-danger">{error}</div> : null}
      {actionError ? (
        <div className="modules-alert modules-alert-danger">{actionError}</div>
      ) : null}

      {modules.length === 0 ? (
        <div className="modules-panel modules-empty-state">
          No modules have been published yet.
        </div>
      ) : (
        <>
          <div className="modules-grid">
            {modules.map((module) => {
              const isRegistered = registeredModuleIds.includes(module.id);
              const progress = getProgressForModule(module.id);
              const quizzes = getQuizzesForModule(module.id);
              const completedDays = progress?.completedDays?.length || 0;
              const completionPercent =
                module.dayCount > 0
                  ? Math.round((completedDays / module.dayCount) * 100)
                  : 0;
              const videoCount = module.days.reduce(
                (count, day) => count + (day.videoUrls?.length || (day.videoUrl ? 1 : 0)),
                0,
              );
              const outcomes =
                module.learningOutcomes.length > 0
                  ? module.learningOutcomes
                  : module.days.slice(0, 4).map((day) => day.title);

              return (
                <article
                  key={module.id}
                  className="module-card"
                  style={{
                    "--module-banner": module.theme.banner,
                    "--module-button": module.theme.button,
                    "--module-accent": module.theme.accent,
                    "--module-accent-soft": module.theme.accentSoft,
                    "--module-accent-border": module.theme.accentBorder,
                    "--module-dot": module.theme.dot,
                    "--module-shadow": module.theme.bannerShadow,
                  }}
                >
                  <div className="module-card-banner">
                    <div>
                      <span className="module-badge">Module {module.week}</span>
                      <div className="module-card-heading">
                        <div className="module-card-icon">
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <small>{module.difficulty || "Guided stack"}</small>
                          <h3>{module.title}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="module-card-percent">
                      {completionPercent === 100 ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700 }}>
                          <CheckCircle2 size={14} /> Done
                        </span>
                      ) : (
                        `${completionPercent}%`
                      )}
                    </div>
                  </div>

                  <div className="module-card-body">
                    <div className="module-chip-row">
                      <span>{module.dayCount} days</span>
                      <span>{module.dayCount} quizzes available</span>
                      <span>{videoCount} videos included</span>
                      <span>
                        {isRegistered ? `${completedDays} days done` : "Not enrolled"}
                      </span>
                    </div>

                    {completionPercent === 100 ? (
                      <div className="module-completed-strip">
                        <CheckCircle2 size={15} />
                        All days completed — module finished!
                      </div>
                    ) : (
                      <div className="module-progress">
                        <div style={{ width: `${completionPercent}%` }} />
                      </div>
                    )}

                    <div className="module-card-actions">
                      {isRegistered ? (
                        <Link
                          to={`/modules/${module.slug}`}
                          className="module-primary-button"
                        >
                          {completionPercent === 100 ? "Review module" : completedDays > 0 ? "Resume" : "Start"}
                          <ArrowRight size={15} />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="module-primary-button"
                          disabled={pendingId === module.id}
                          onClick={() => handleRegister(module.id)}
                        >
                          Register for this stack
                        </button>
                      )}
                    </div>

                    <details className="module-outcomes">
                      <summary>
                        <span>What you&apos;ll learn</span>
                        <ChevronDown size={14} />
                      </summary>
                      <ul>
                        {outcomes.map((outcome) => (
                          <li key={outcome} className="outcome-item">
                            <span className="outcome-icon-wrapper">
                              <CheckCircle2 className="outcome-icon" />
                            </span>
                            <span className="outcome-text">{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>

          <section className="modules-summary">
            <div className="modules-summary-stack">
              <span className="modules-summary-orb" />
              <span className="modules-summary-orb is-second" />
              <span className="modules-summary-orb is-third" />
              <div>
                <strong>Complete any module to earn your Hackstack certificate</strong>
                <p>
                  {learningSummary.registeredCount} of {learningSummary.totalStacks}{" "}
                  stacks enrolled · {learningSummary.completedDays} days complete
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default ModuleCatalog;
