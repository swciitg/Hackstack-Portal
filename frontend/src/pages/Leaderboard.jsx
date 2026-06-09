import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModules } from '../context/ModulesContext';
import { leaderboardService } from '../services/leaderboardService';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Globe from 'lucide-react/dist/esm/icons/globe';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import './leaderboard.css';

const LEADERBOARD_REFRESH_INTERVAL_MS = 30000;

function Leaderboard() {
  const { user } = useAuth();
  const { modules, loading: modulesLoading } = useModules();
  
  const [selectedScope, setSelectedScope] = useState('global'); // 'global' or module._id
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeScopeTitle = selectedScope === 'global' 
    ? 'Central Standings' 
    : (modules.find(m => m.id === selectedScope)?.title || 'Module Standings');

  const activeScopeDesc = selectedScope === 'global'
    ? 'Overall points accumulated by active students across all modules.'
    : `Points earned by students in the ${activeScopeTitle} module quizzes.`;

  const loadLeaderboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setError('');
    try {
      let data = [];
      if (selectedScope === 'global') {
        data = await leaderboardService.getGlobalLeaderboard();
      } else {
        data = await leaderboardService.getModuleLeaderboard(selectedScope);
      }
      
      // Filter non-zero score entries just in case, but backend should already filter it
      const nonZeroEntries = data.filter(entry => entry.totalPoints > 0);
      setLeaderboardData(nonZeroEntries);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard standings.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [selectedScope]);

  useEffect(() => {
    loadLeaderboard();

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        loadLeaderboard({ silent: true });
      }
    }, LEADERBOARD_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadLeaderboard]);

  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <div className="rank-badge rank-1" title="1st Place">
          🥇
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="rank-badge rank-2" title="2nd Place">
          🥈
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="rank-badge rank-3" title="3rd Place">
          🥉
        </div>
      );
    }
    return <span className="rank-text">#{rank}</span>;
  };

  const renderSkeletons = () => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <div key={idx} className="leaderboard-skeleton-row">
        <div className="skeleton-pulse skeleton-badge" />
        <div className="leaderboard-user-col">
          <div className="skeleton-pulse skeleton-avatar" />
          <div className="skeleton-pulse skeleton-text" />
        </div>
        <div className="skeleton-pulse skeleton-score" />
      </div>
    ));
  };

  return (
    <div className="leaderboard-shell">
      <div className="leaderboard-grid-layout">
        {/* Left Side: Scope Switcher */}
        <aside className="leaderboard-scope-panel">
          <h3>Leaderboards</h3>
          <div className="leaderboard-scope-list">
            <button
              onClick={() => setSelectedScope('global')}
              className={`leaderboard-scope-btn ${selectedScope === 'global' ? 'is-active' : ''}`}
            >
              <span className="leaderboard-scope-icon">
                <Globe size={16} />
              </span>
              <span>Central Standings</span>
            </button>

            {modulesLoading ? (
              <div style={{ paddingLeft: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                Loading modules...
              </div>
            ) : (
              modules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setSelectedScope(mod.id)}
                  className={`leaderboard-scope-btn ${selectedScope === mod.id ? 'is-active' : ''}`}
                >
                  <span className="leaderboard-scope-icon">
                    <BookOpen size={16} />
                  </span>
                  <span>{mod.title}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Side: Standings */}
        <main className="leaderboard-standings-card">
          <header className="leaderboard-standings-header">
            <div className="leaderboard-standings-header-title">
              <h2>{activeScopeTitle}</h2>
              <p>{activeScopeDesc}</p>
            </div>
            {!loading && !error && leaderboardData.length > 0 && (
              <div className="leaderboard-entries-count">
                {leaderboardData.length} active {leaderboardData.length === 1 ? 'student' : 'students'}
              </div>
            )}
          </header>

          {error && (
            <div style={{ padding: '1.5rem' }}>
              <div className="modules-alert modules-alert-danger">{error}</div>
            </div>
          )}

          {!error && (
            <div className="leaderboard-list">
              {loading ? (
                renderSkeletons()
              ) : leaderboardData.length === 0 ? (
                <div className="leaderboard-empty-state">
                  <div className="leaderboard-empty-icon">
                    <Trophy size={48} />
                  </div>
                  <h3>No scores yet</h3>
                  <p>
                    No students have scored points in this leaderboard category. 
                    Be the first to complete a quiz and claim the top spot!
                  </p>
                </div>
              ) : (
                leaderboardData.map((entry) => {
                  const isSelf = user && (entry.userId === user._id || entry.userId === user.id);
                  return (
                    <div 
                      key={entry._id || entry.userId} 
                      className={`leaderboard-row ${isSelf ? 'is-current-user' : ''}`}
                    >
                      <div className="leaderboard-rank-col">
                        {renderRankBadge(entry.rank)}
                      </div>
                      
                      <div className="leaderboard-user-col">
                        {entry.avatarUrl ? (
                          <img 
                            src={entry.avatarUrl} 
                            alt={`${entry.username || 'user'}'s avatar`} 
                            className="leaderboard-avatar"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'grid';
                            }}
                          />
                        ) : null}
                        <div 
                          className="leaderboard-avatar-fallback"
                          style={{ display: entry.avatarUrl ? 'none' : 'grid' }}
                        >
                          {(entry.username || 'S').slice(0, 1).toUpperCase()}
                        </div>
                        <span className="leaderboard-username">
                          {entry.username || 'Anonymous Student'}
                        </span>
                      </div>

                      <div className="leaderboard-score-col">
                        <span className="leaderboard-points">
                          {entry.totalPoints}
                        </span>
                        <span className="leaderboard-points-label">
                          Points
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Leaderboard;
