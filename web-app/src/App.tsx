import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProfileProvider } from './context/ProfileContext';
import { ToastContainer } from './components/ToastContainer';
import LandingPage from './pages/LandingPage';
import { NewsFeedPage } from './pages/NewsFeedPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ProfileProvider>
          <ToastContainer />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/feed" element={<NewsFeedPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </ProfileProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
