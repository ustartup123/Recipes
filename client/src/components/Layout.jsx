import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiLogOut, FiInfo } from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, authEnabled, logout } = useAuth();
  const [showVersion, setShowVersion] = useState(false);

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <GiCookingPot className="icon" />
            <span>המתכונים שלי</span>
          </Link>
          <div className="navbar-actions">
            <Link to="/add" className="btn btn-primary">
              <FiPlus />
              מתכון חדש
            </Link>
            {authEnabled && user && user.id !== 'anonymous' && (
              <div className="user-menu">
                {user.picture && (
                  <img src={user.picture} alt={user.name} className="user-avatar" referrerPolicy="no-referrer" />
                )}
                <button onClick={logout} className="btn-icon" title="התנתק">
                  <FiLogOut />
                </button>
              </div>
            )}
            <button onClick={() => setShowVersion(true)} className="btn-icon btn-info" title="מידע">
              <FiInfo />
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
      {showVersion && (
        <div className="version-overlay" onClick={() => setShowVersion(false)}>
          <div className="version-modal" onClick={e => e.stopPropagation()}>
            <GiCookingPot className="version-modal-icon" />
            <h3>המתכונים שלי</h3>
            <p className="version-number">גרסה {__APP_VERSION__}</p>
            <button className="btn btn-secondary" onClick={() => setShowVersion(false)}>סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}
