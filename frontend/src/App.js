import React, { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import ExplorePage from './pages/ExplorePage';
import SettingsPage from './pages/SettingsPage';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }

    // Apply saved theme
    const savedTheme = localStorage.getItem('app-theme') || 'blue';
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (selectedTheme) => {
    const root = document.documentElement;
    
    if (selectedTheme === 'red') {
      root.style.setProperty('--theme-primary', '#DC2626');
      root.style.setProperty('--theme-primary-light', '#EF4444');
      root.style.setProperty('--theme-primary-dark', '#991B1B');
      root.style.setProperty('--theme-secondary', '#7F1D1D');
      root.style.setProperty('--theme-accent', '#FCA5A5');
    } else {
      root.style.setProperty('--theme-primary', '#2563EB');
      root.style.setProperty('--theme-primary-light', '#3B82F6');
      root.style.setProperty('--theme-primary-dark', '#1E40AF');
      root.style.setProperty('--theme-secondary', '#1E3A8A');
      root.style.setProperty('--theme-accent', '#93C5FD');
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-400"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser: fetchCurrentUser }}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/home" /> : <LandingPage />} />
            <Route path="/auth" element={user ? <Navigate to="/home" /> : <AuthPage />} />
            <Route path="/home" element={user ? <HomePage /> : <Navigate to="/" />} />
            <Route path="/profile/:userId" element={user ? <ProfilePage /> : <Navigate to="/" />} />
            <Route path="/messages" element={user ? <MessagesPage /> : <Navigate to="/" />} />
            <Route path="/explore" element={user ? <ExplorePage /> : <Navigate to="/" />} />
            <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </div>
    </AuthContext.Provider>
  );
}

export default App;
