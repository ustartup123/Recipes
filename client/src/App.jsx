import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import RecipePage from './pages/RecipePage';
import AddRecipePage from './pages/AddRecipePage';
import EditRecipePage from './pages/EditRecipePage';
import LoginPage from './pages/LoginPage';
import './App.css';

function AppContent() {
  const { user, loading, authEnabled } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>טוען...</span>
      </div>
    );
  }

  // If auth is enabled and user not logged in, show login
  if (authEnabled && !user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipe/:id" element={<RecipePage />} />
        <Route path="/add" element={<AddRecipePage />} />
        <Route path="/edit/:id" element={<EditRecipePage />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" toastOptions={{ style: { direction: 'rtl', fontFamily: 'Heebo' } }} />
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
