import { AnimatePresence, motion } from "framer-motion";
import {
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  X,
  Hash,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

const modalStyles = `
  .profile-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(3, 6, 16, 0.72);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .profile-modal {
    position: relative;
    width: 100%;
    max-width: 480px;
    background: var(--surface-solid);
    border: 2px solid var(--line-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-chunky), 0 24px 64px rgba(0, 0, 0, 0.5);
    padding: 28px;
    overflow: hidden;
  }

  .profile-modal-accent {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 96px;
    background:
      radial-gradient(1px 1px at 22% 40%, rgba(255, 255, 255, 0.55) 50%, transparent 100%),
      linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    z-index: 0;
    border-bottom: 3px solid rgba(255, 255, 255, 0.18);
  }

  .profile-modal-content {
    position: relative;
    z-index: 1;
  }

  .profile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
  }

  .profile-header-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-pixel);
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(244, 246, 251, 0.92);
  }

  .profile-close-btn {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.12);
    border: 2px solid rgba(255, 255, 255, 0.24);
    color: rgba(244, 246, 251, 0.88);
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease, transform 180ms ease;
  }

  .profile-close-btn:hover {
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
    transform: translate(-1px, -1px);
  }

  .profile-avatar-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 24px;
  }

  .profile-avatar-ring {
    position: relative;
    margin-bottom: 12px;
  }

  .profile-avatar-img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid var(--surface-solid);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
  }

  .profile-avatar-fallback {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    border: 3px solid var(--surface-solid);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
    display: grid;
    place-items: center;
    font-family: var(--font-pixel);
    font-size: 24px;
    font-weight: 400;
    color: #062033;
  }

  .profile-active-badge {
    position: absolute;
    bottom: 2px;
    right: 2px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: linear-gradient(180deg, #ffd166 0%, #f5a623 100%);
    color: #3a2800;
    font-size: 8px;
    font-weight: 400;
    letter-spacing: 0.08em;
    font-family: var(--font-pixel);
    border: 2px solid var(--surface-solid);
  }

  .profile-name {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--text-strong);
    letter-spacing: -0.01em;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .profile-username {
    margin-top: 4px;
    font-size: 13px;
    font-weight: 500;
    color: var(--accent-strong);
  }

  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 24px;
  }

  .profile-field {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border-radius: var(--radius-sm);
    border: 2px solid var(--line);
    background: var(--surface-subtle);
    transition: border-color 180ms ease, background 180ms ease;
  }

  .profile-field:hover {
    border-color: rgba(0, 194, 255, 0.4);
    background: var(--surface);
  }

  .profile-field-icon {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: var(--accent-soft);
    border: 1px solid rgba(0, 194, 255, 0.28);
    color: var(--accent-strong);
    flex-shrink: 0;
  }

  .profile-field-label {
    display: block;
    font-size: 8px;
    font-weight: 400;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 3px;
    font-family: var(--font-pixel);
  }

  .profile-field-value {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-strong);
    font-family: var(--font-body);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
  }

  .profile-footer {
    display: flex;
    justify-content: flex-end;
  }

  .profile-close-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    background: linear-gradient(180deg, #22d3ff 0%, #009ad9 100%);
    color: #062033;
    font-family: var(--font-pixel);
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border: 2px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.42);
    transition: opacity 180ms ease, transform 180ms ease, box-shadow 180ms ease;
  }

  .profile-close-primary:hover {
    opacity: 0.95;
    transform: translate(-1px, -1px);
    box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.42);
  }

  .profile-close-primary:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.42);
  }

  @media (max-width: 480px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }
    .profile-field-value {
      max-width: 100%;
    }
  }
`;

const FIELDS = (user) => [
  { icon: Mail,           label: "Email Address",    value: user?.email || "—" },
  { icon: Phone,          label: "Mobile Number",    value: user?.countryCode && user?.mobileNumber ? `${user.countryCode} ${user.mobileNumber}` : user?.mobileNumber || "—" },
  { icon: GraduationCap,  label: "College / Institute", value: user?.college || "—" },
  { icon: Calendar,       label: "Year of Study",    value: user?.year || "—" },
  { icon: Hash,           label: "Roll Number",      value: user?.rollNumber || "—" },
  { icon: BookOpen,       label: "Programme",        value: user?.programme === "Btech" ? "B.Tech" : user?.programme === "Mtech" ? "M.Tech" : user?.programme || "—" },
];

export function ProfileModal({ isOpen, onClose, user }) {
  return (
    <>
      <style>{modalStyles}</style>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="profile-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 12, opacity: 0 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.18 }}
              className="profile-modal"
            >
              {/* Brand blue header strip */}
              <div className="profile-modal-accent" />

              <div className="profile-modal-content">
                {/* Header row */}
                <div className="profile-header">
                  <span className="profile-header-label">
                    Student Profile
                  </span>
                  <button type="button" className="profile-close-btn" onClick={onClose} aria-label="Close profile">
                    <X size={15} />
                  </button>
                </div>

                {/* Avatar */}
                <div className="profile-avatar-wrap">
                  <div className="profile-avatar-ring">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user?.name || "Avatar"}
                        className="profile-avatar-img"
                      />
                    ) : (
                      <div className="profile-avatar-fallback">
                        {(user?.username || "S").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="profile-active-badge">
                      <CheckCircle2 size={9} /> Active
                    </span>
                  </div>
                  <h3 className="profile-name">{user?.name || "Student"}</h3>
                  <p className="profile-username">@{user?.username || "student"}</p>
                </div>

                {/* Info grid */}
                <div className="profile-grid">
                  {FIELDS(user).map(({ icon: Icon, label, value }) => (
                    <div key={label} className="profile-field">
                      <div className="profile-field-icon">
                        <Icon size={14} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="profile-field-label">{label}</span>
                        <span className="profile-field-value" title={value}>{value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="profile-footer">
                  <button type="button" className="profile-close-primary" onClick={onClose}>
                    Close Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
