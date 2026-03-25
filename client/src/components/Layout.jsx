import { Link } from 'react-router-dom';
import { FiPlus, FiLogOut } from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, authEnabled, logout } = useAuth();

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
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
