import { Link } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';

export default function Layout({ children }) {
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
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
