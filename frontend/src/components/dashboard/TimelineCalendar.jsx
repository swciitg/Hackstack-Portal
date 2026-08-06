import { useRef, useEffect, useState } from "react";
import "./timeline.css";

// ── Timeline data extracted from the Hackstack poster ─────────────────────────
// Dates are [startDay, endDay] counted from June 1 (day 0)
// Total span: June 1 → July 12 = 41 days
const TIMELINE_START = new Date(2025, 5, 1); // June 1 2025
const TIMELINE_END   = new Date(2025, 6, 12); // July 12 2025

const MONTH_MARKERS = [
  { label: "JUNE",  date: new Date(2025, 5, 1)  },
  { label: "JULY",  date: new Date(2025, 6, 1)  },
];

const DATE_LABELS = [
  { label: "01", date: new Date(2025, 5, 1)  },
  { label: "8",  date: new Date(2025, 5, 8)  },
  { label: "14", date: new Date(2025, 5, 14) },
  { label: "22", date: new Date(2025, 5, 22) },
  { label: "28", date: new Date(2025, 5, 28) },
  { label: "01", date: new Date(2025, 6, 1)  }, // July Start Month transition
  { label: "05", date: new Date(2025, 6, 5)  },
  { label: "12", date: new Date(2025, 6, 12) },
];

const TRACKS = [
  { id: "html",    label: "HTML / CSS / JS", start: new Date(2025, 5, 1),  end: new Date(2025, 5, 14), color: "#E0E7FF" }, // Light Indigo
  { id: "product", label: "Product Pro",     start: new Date(2025, 5, 1),  end: new Date(2025, 5, 22), color: "#E0F2FE" }, // Light Sky Blue
  { id: "flutter", label: "Flutter",         start: new Date(2025, 5, 1),  end: new Date(2025, 5, 28), color: "#DBEAFE" }, // Light Blue
  { id: "uiux",    label: "UI/UX",           start: new Date(2025, 5, 8),  end: new Date(2025, 5, 28), color: "#F3E8FF" }, // Light Purple
  { id: "viscom",  label: "Vis-Com",         start: new Date(2025, 5, 14), end: new Date(2025, 5, 22), color: "#FAE8FF" }, // Light Fuchsia
  { id: "reactjs", label: "React JS",        start: new Date(2025, 5, 14), end: new Date(2025, 5, 28), color: "#ECFDF5" }, // Light Emerald
  { id: "nodejs",  label: "Node JS",         start: new Date(2025, 5, 22), end: new Date(2025, 6, 5),  color: "#FEF3C7" }, // Light Amber
  { id: "django",  label: "Django",          start: new Date(2025, 5, 22), end: new Date(2025, 6, 12), color: "#FFEDD5" }, // Light Orange
];

const TOTAL_MS = TIMELINE_END - TIMELINE_START;

function pct(date) {
  return ((date - TIMELINE_START) / TOTAL_MS) * 100;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function TimelineCalendar() {
  const today    = new Date();
  const showLine = today >= TIMELINE_START && today <= TIMELINE_END;
  const todayPct = showLine ? clamp(pct(today), 0, 100) : null;

  const [hovered, setHovered] = useState(null);
  const barRefs = useRef({});

  // Details of hovered track
  const hoveredTrack = TRACKS.find((t) => t.id === hovered);

  // Animate bars in on mount
  useEffect(() => {
    const entries = Object.values(barRefs.current);
    entries.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "scaleX(0)";
      el.style.transformOrigin = "left";
      requestAnimationFrame(() => {
        setTimeout(() => {
          el.style.transition = `opacity 420ms ease ${i * 70}ms, transform 420ms cubic-bezier(.34,1.46,.64,1) ${i * 70}ms`;
          el.style.opacity = "1";
          el.style.transform = "scaleX(1)";
        }, 80);
      });
    });
  }, []);

  return (
    <section className="tl-section" id="timeline-calendar">
      {/* ── Header ─── */}
      <div className="tl-header">
        <div className="tl-header-left">
          <span className="tl-badge">program schedule</span>
          <h2 className="tl-title">Timeline</h2>
        </div>
      </div>

      {/* ── Gantt chart ─── */}
      <div className="tl-card">
        {/* Month row */}
        <div className="tl-axis tl-axis--months">
          <div className="tl-axis-label-col" />
          <div className="tl-axis-track">
            {MONTH_MARKERS.map((m) => (
              <div
                key={m.label}
                className="tl-month-marker"
                style={{ left: `${pct(m.date)}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Date labels row */}
        <div className="tl-axis tl-axis--dates">
          <div className="tl-axis-label-col" />
          <div className="tl-axis-track">
            {DATE_LABELS.map((d) => {
              const isJulyStart = d.date.getMonth() === 6 && d.date.getDate() === 1;
              return (
                <div
                  key={d.label + d.date.getTime()}
                  className={`tl-date-marker ${isJulyStart ? "tl-date-marker--july" : ""}`}
                  style={{ left: `${pct(d.date)}%` }}
                >
                  {isJulyStart ? "JULY 01" : d.label}
                </div>
              );
            })}
            {/* Today indicator label */}
            {todayPct !== null && (
              <div className="tl-today-label" style={{ left: `${todayPct}%` }}>
                Today
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="tl-divider" />

        <div className="tl-rows">
          {/* Grid lines — scoped inside tl-rows so they don't bleed into axis */}
          <div className="tl-grid-lines" aria-hidden="true">
            {/* Subtle shading for July region to visually demarcate Month boundary */}
            <div
              className="tl-july-bg-shading"
              style={{
                left: `${pct(new Date(2025, 6, 1))}%`,
                right: 0
              }}
            />

            {DATE_LABELS.map((d) => {
              const isJulyStart = d.date.getMonth() === 6 && d.date.getDate() === 1;
              const isStartMarker = hoveredTrack && d.date.getTime() === hoveredTrack.start.getTime();
              const isEndMarker = hoveredTrack && d.date.getTime() === hoveredTrack.end.getTime();

              let lineClass = "tl-grid-line";
              if (isJulyStart) lineClass += " tl-grid-line--july-start";
              if (isStartMarker || isEndMarker) lineClass += " tl-grid-line--highlighted";

              return (
                <div
                  key={"gl-" + d.label + d.date.getTime()}
                  className={lineClass}
                  style={{ left: `${pct(d.date)}%` }}
                />
              );
            })}
            {todayPct !== null && (
              <div className="tl-today-line" style={{ left: `${todayPct}%` }} />
            )}
          </div>

          {TRACKS.map((track) => {
            const left  = pct(track.start);
            const width = pct(track.end) - left;
            const isHovered = hovered === track.id;
            return (
              <div key={track.id} className="tl-row">
                <div className="tl-row-label-col" />
                <div className="tl-row-bar-area">
                  <div
                    ref={(el) => (barRefs.current[track.id] = el)}
                    className={`tl-bar${isHovered ? " tl-bar--hovered" : ""}`}
                    style={{
                      left:            `${left}%`,
                      width:           `${width}%`,
                      background:      track.color,
                      border:          `1px solid rgba(6, 32, 51, 0.28)`,
                      boxShadow:       isHovered
                        ? `0 6px 16px rgba(0, 0, 0, 0.3)`
                        : `0 2px 6px rgba(0, 0, 0, 0.18)`,
                    }}
                    onMouseEnter={() => setHovered(track.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span className="tl-bar-label">
                      {track.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
