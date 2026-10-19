import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProfileProvider } from './context/ProfileContext';
import { ToastContainer } from './components/ToastContainer';
import LandingPage from './pages/LandingPage';
import { NewsFeedPage } from './pages/NewsFeedPage';
import { ProfilePage } from './pages/ProfilePage';
import { SearchPage } from './pages/SearchPage';
import { FriendsPage } from './pages/FriendsPage';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ProfileProvider>
          <ToastContainer />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/feed" element={<NewsFeedPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </ProfileProvider>
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
