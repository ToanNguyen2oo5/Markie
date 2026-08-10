import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import LandingPage from './pages/LandingPage';
import { NewsFeedPage } from './pages/NewsFeedPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/feed" element={<NewsFeedPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default App;
