import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState(null);

  // Load saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('recipes_user');
    const savedToken = localStorage.getItem('recipes_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  // Fetch Google Client ID from backend
  useEffect(() => {
    fetch('/api/auth/client-id')
      .then(res => res.json())
      .then(data => {
        if (data.clientId) setClientId(data.clientId);
      })
      .catch(() => {});
  }, []);

  const login = useCallback(async (credential) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) throw new Error('Login failed');

    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('recipes_user', JSON.stringify(data.user));
    localStorage.setItem('recipes_token', data.token);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('recipes_user');
    localStorage.removeItem('recipes_token');
    // Revoke Google session
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, clientId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
