
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../services/apiClient";
import "./moduleCertificate.css";

export function ModuleCertificate({ module, progressId }) {
  const { user } = useAuth();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCertificate() {
      try {
        setLoading(true);
        setError("");

        
        const response = await apiClient.get(
            `/progress/${progressId}/certificate`
        );

        const data = response.data;

        if (!data.eligible || !data.certificate) {
          throw new Error(
            data.message || "You are not eligible for this certificate."
          );
        }

        if (!cancelled) setCertificate(data.certificate);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to verify certificate.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (progressId) {
      loadCertificate();
    } else {
      setError("Progress record not found.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [progressId]);

  useEffect(() => {
    if (!certificate) return;

    const previousTitle = document.title;
    document.title = `Certificate - ${certificate.moduleTitle}`;

    return () => {
      document.title = previousTitle;
    };
  }, [certificate]);

  if (loading) {
    return <main className="certificate-page">Verifying certificate eligibility…</main>;
  }

  if (error || !certificate) {
    return (
      <main className="certificate-page">
        <p>{error || "Certificate unavailable."}</p>
        <Link to={`/modules/${module.slug}`}>Back to module</Link>
      </main>
    );
  }

  const recipientName =
    certificate.recipientName?.trim() ||
    user?.name?.trim() ||
    user?.username?.trim() ||
    "HackStack Learner";

  const formattedDate = certificate.completedAt
    ? new Date(certificate.completedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Completion date unavailable";

  return (
    <main className="certificate-page">
      <section className="certificate">
        <img
          className="certificate-logo"
          src="/hackstack/swc-logo.webp"
          alt="Student Web Committee"
        />

        <p className="certificate-org">
          STUDENT WEB COMMITTEE · IIT GUWAHATI
        </p>

        <h1>Certificate of Completion</h1>
        <p className="certificate-intro">
          This certificate is proudly presented to
        </p>

        <h2 className="certificate-recipient">{recipientName}</h2>

        <p className="certificate-intro">
          for successfully completing the learning module
        </p>

        <h3 className="certificate-module">{certificate.moduleTitle}</h3>
        <p className="certificate-week">Week {certificate.week ?? "—"}</p>
        <p className="certificate-date">Completed on {formattedDate}</p>

        <div className="certificate-footer">
          <span>SWC</span>
          <span>HACKSTACK</span>
        </div>

        <div className="certificate-actions">
          <button
            className="certificate-print"
            onClick={() => window.print()}
            type="button"
          >
            Download / Print Certificate
          </button>

          <Link
            className="certificate-back"
            to={`/modules/${certificate.moduleSlug}`}
          >
            Back to module
          </Link>
        </div>
      </section>
    </main>
  );
}
