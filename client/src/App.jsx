import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import RecipePage from './pages/RecipePage';
import AddRecipePage from './pages/AddRecipePage';
import EditRecipePage from './pages/EditRecipePage';
import './App.css';

function App() {
  return (
    <Router>
      <Toaster position="top-center" toastOptions={{ style: { direction: 'rtl', fontFamily: 'Heebo' } }} />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recipe/:id" element={<RecipePage />} />
          <Route path="/add" element={<AddRecipePage />} />
          <Route path="/edit/:id" element={<EditRecipePage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
