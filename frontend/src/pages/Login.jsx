import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";

const loginStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&display=swap');

  .login-root *, .login-root *::before, .login-root *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .login-root {
    --bg-deep: #0a0f1a;
    --bg-mid: #0d1b2e;
    --star-color: #4dd9ff;
    --cloud-color: #0f2a4a;
    --card-bg: #f4f6fb;
    --card-border: #c8d4e8;
    --accent: #00c2ff;
    --accent-dark: #0090cc;
    --text-dark: #1a2340;
    --text-muted: #6b7a99;
    --btn-google-bg: #fff;
    --input-border: #c8d4e8;
    --input-focus: #00c2ff;
    --pixel: 'Press Start 2P', monospace;
    --vt: 'VT323', monospace;

    min-height: 100vh;
    background: var(--bg-deep);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: var(--pixel);
    overflow: hidden;
    position: relative;
  }

  .login-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .login-clouds {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100vh;
    min-height: 250px;
    z-index: 1;
    pointer-events: none;
    background-repeat: repeat-x;
    background-position: bottom center;
    background-size: contain;
    image-rendering: pixelated;
  }

  .login-mascot-wrap {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
    animation: loginFloatY 3s ease-in-out infinite;
  }

  @keyframes loginFloatY {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-8px); }
  }

  .login-mascot {
    width: 72px;
    height: 72px;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .login-speech-bubble {
    background: #fff;
    border: 2px solid #c8d4e8;
    border-radius: 4px;
    padding: 12px 16px;
    font-family: 'VT323', monospace;
    font-size: 1.35rem;
    color: #1a2340;
    line-height: 1.4;
    max-width: 220px;
    position: relative;
    box-shadow: 3px 3px 0 #c8d4e8;
  }

  .login-speech-bubble::before {
    content: '';
    position: absolute;
    left: -14px; top: 18px;
    border: 7px solid transparent;
    border-right-color: #c8d4e8;
  }

  .login-speech-bubble::after {
    content: '';
    position: absolute;
    left: -11px; top: 19px;
    border: 6px solid transparent;
    border-right-color: #fff;
  }

  .login-card {
    position: relative;
    z-index: 10;
    background: #f4f6fb;
    border: 2px solid #c8d4e8;
    border-radius: 6px;
    padding: 36px 40px 32px;
    width: 420px;
    box-shadow: 6px 6px 0 #b0bdd4, 0 0 40px rgba(0,194,255,0.08);
    animation: loginFadeUp 0.5s ease both;
    color-scheme: light;
  }

  @keyframes loginFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .login-ascii-logo {
    position: relative;
    z-index: 10;
    margin-bottom: 20px;
    text-align: center;
  }

  .login-ascii-logo pre {
    font-family: 'Courier New', monospace;
    font-size: clamp(4px, 1vw, 7.5px);
    line-height: 1.2;
    color: #00c2ff;
    text-shadow: 0 0 8px rgba(0,194,255,0.6), 0 0 20px rgba(0,194,255,0.3);
    letter-spacing: 0;
    white-space: pre;
    display: inline-block;
  }

  .login-google-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #fff;
    border: 2px solid #dadce0;
    border-radius: 4px;
    padding: 16px 20px;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.6rem;
    color: #3c4043;
    cursor: pointer;
    box-shadow: 4px 4px 0 #b0bdd4, 0 0 16px rgba(0,194,255,0.1);
    transition: transform 0.1s, box-shadow 0.1s, background 0.15s;
    letter-spacing: 1px;
    margin-bottom: 20px;
  }

  .login-google-btn:hover {
    background: #f8f9fa;
    transform: translate(-1px, -1px);
    box-shadow: 5px 5px 0 #b0bdd4, 0 0 20px rgba(0,194,255,0.2);
  }

  .login-google-btn:active {
    transform: translate(3px, 3px);
    box-shadow: 1px 1px 0 #b0bdd4;
  }

  .login-card-footer {
    text-align: center;
    font-family: 'VT323', monospace;
    font-size: 1rem;
    color: #6b7a99;
    line-height: 1.7;
  }

  .login-sparkle {
    position: fixed;
    width: 8px;
    height: 8px;
    background: #4dd9ff;
    z-index: 2;
    animation: loginSparkleAnim 4s ease-in-out infinite;
  }

  @keyframes loginSparkleAnim {
    0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
    50%       { opacity: 1;   transform: scale(1.4) rotate(45deg); }
  }

  .login-sparkle::before, .login-sparkle::after {
    content: '';
    position: absolute;
    background: #4dd9ff;
  }

  .login-sparkle::before { width: 2px; height: 16px; top: -4px; left: 3px; }
  .login-sparkle::after  { width: 16px; height: 2px; top: 3px; left: -4px; }
`;

export default function Login() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // Check for an existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        await apiClient.get("/auth/me");
        navigate("/dashboard", { replace: true });
      } catch {
        // No session — stay on login page
      }
    };
    checkExistingSession();
  }, [navigate]);

  // Canvas starfield
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let stars = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const initStars = () => {
      stars = Array.from({ length: 300 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.75,
        r: Math.random() < 0.15 ? 2 : 1,
        alpha: 0.3 + Math.random() * 0.7,
        speed: 0.003 + Math.random() * 0.006,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.3 ? "#4dd9ff" : "#ffffff",
      }));
    };
    initStars();

    const onResize = () => { resize(); initStars(); };
    window.addEventListener("resize", onResize);

    let t = 0;
    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.016;
      for (const s of stars) {
        const a = s.alpha * (0.7 + 0.3 * Math.sin(t * s.speed * 60 + s.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.color;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.r * 2, s.r * 2);
        if (s.r > 1) {
          ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) + s.r - 1, s.r * 2 + 4, 2);
          ctx.fillRect(Math.round(s.x) + s.r - 1, Math.round(s.y) - 2, 2, s.r * 2 + 4);
        }
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(drawStars);
    };
    drawStars();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleGoogleLogin = () => {
    // window.location.href = "/hackstack/api/auth/google";
    window.location.href = "http://localhost:5000/auth/google";
  };

  return (
    <>
      <style>{loginStyles}</style>
      <div className="login-root">
        <canvas ref={canvasRef} className="login-canvas" />

        {/* Pixel sparkles */}
        <div className="login-sparkle" style={{ top: "12%", left: "9%", animationDelay: "0s" }} />
        <div className="login-sparkle" style={{ top: "20%", right: "10%", animationDelay: "1.2s" }} />
        <div className="login-sparkle" style={{ top: "55%", right: "6%", animationDelay: "0.6s" }} />
        <div className="login-sparkle" style={{ top: "35%", left: "5%", animationDelay: "2s" }} />

        {/* Clouds */}
        <div
          className="login-clouds"
          style={{ backgroundImage: `url('${import.meta.env.BASE_URL}background.png')` }}
        />

        {/* ASCII Logo */}
        <div className="login-ascii-logo">
          <pre>{`██╗  ██╗ █████╗  ██████╗██╗  ██╗███████╗████████╗ █████╗  ██████╗██╗  ██╗
██║  ██║██╔══██╗██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
███████║███████║██║     █████╔╝ ███████╗   ██║   ███████║██║     █████╔╝
██╔══██║██╔══██║██║     ██╔═██╗ ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
██║  ██║██║  ██║╚██████╗██║  ██╗███████║   ██║   ██║  ██║╚██████╗██║  ██╗
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝`}</pre>
        </div>

        {/* Mascot + speech bubble */}
        <div className="login-mascot-wrap">
          <svg
            className="login-mascot"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            style={{ imageRendering: "pixelated" }}
          >
            <rect x="8" y="8" width="48" height="36" rx="3" fill="#d0d8e8" />
            <rect x="10" y="10" width="44" height="32" rx="2" fill="#1a2a4a" />
            <rect x="12" y="12" width="40" height="28" fill="#0d1e36" />
            <rect x="18" y="18" width="8" height="8" fill="#00c2ff" rx="1" />
            <rect x="38" y="18" width="8" height="8" fill="#00c2ff" rx="1" />
            <rect x="21" y="22" width="2" height="2" fill="#fff" />
            <rect x="41" y="22" width="2" height="2" fill="#fff" />
            <rect x="22" y="32" width="20" height="3" fill="#00c2ff" rx="1" />
            <rect x="20" y="30" width="4" height="3" fill="#00c2ff" rx="1" />
            <rect x="40" y="30" width="4" height="3" fill="#00c2ff" rx="1" />
            <rect x="28" y="44" width="8" height="6" fill="#b0bdd4" />
            <rect x="20" y="50" width="24" height="4" fill="#c8d4e8" rx="1" />
            <rect x="16" y="56" width="4" height="2" fill="#8899bb" rx="1" />
            <rect x="22" y="56" width="4" height="2" fill="#8899bb" rx="1" />
            <rect x="28" y="56" width="8" height="2" fill="#8899bb" rx="1" />
            <rect x="38" y="56" width="4" height="2" fill="#8899bb" rx="1" />
            <rect x="44" y="56" width="4" height="2" fill="#8899bb" rx="1" />
          </svg>
          <div className="login-speech-bubble">
            Authenticate to access your dashboard :)
          </div>
        </div>

        {/* Login card */}
        <div className="login-card">
          <button
            id="google-login-btn"
            className="login-google-btn"
            onClick={handleGoogleLogin}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="login-card-footer">
            <span>🔒</span> Powered by Student Web Committee, IIT Guwahati
            <br />2026-2027
          </div>
        </div>
      </div>
    </>
  );
}
