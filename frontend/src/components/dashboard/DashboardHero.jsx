import { ArrowRight, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import "./dashboard.css";

export function DashboardHero({ username, summary }) {
  return (
    <header className="dashboard-hero">
      <div className="dashboard-hero-copy">
        <span className="dashboard-pill">
          learning cockpit
        </span>

        <h2 className="dashboard-hero-title">
          Hi {username}, your momentum is looking good.
        </h2>

        <p className="dashboard-hero-text">
          Stay on top of active modules, recent quiz points, and the number of
          learning days you have already finished.
        </p>

        <div className="dashboard-hero-actions">
          <Link to="/modules" className="dashboard-primary-link">
            Open modules
            <ArrowRight size={16} />
          </Link>
          <a href="#dashboard-modules" className="dashboard-secondary-link">
            Review progress
          </a>
        </div>
      </div>

      <div className="dashboard-hero-panel">
        <div className="dashboard-hero-panel-top">
          <div>
            <span>Completion snapshot</span>
            <strong>{summary.averageCompletion} %</strong>
          </div>
          <div className="dashboard-hero-medal">
            <Trophy size={18} />
          </div>
        </div>

        <div className="dashboard-hero-panel-grid">
          <HeroMetric label="Active modules" value={summary.registeredModules} />
          <HeroMetric label="Modules done" value={summary.completedModules} />
          <HeroMetric label="Quiz attempts" value={summary.totalQuizAttempts} />
          <HeroMetric label="Days complete" value={summary.completedDays} />
        </div>
      </div>
    </header>
  );
}

function HeroMetric({ label, value }) {
  return (
    <div className="dashboard-hero-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
