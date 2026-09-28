import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, loadAuth, saveAuth, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

/** Holds two independent sessions: the customer (`user`) and the admin (`admin`). */
export function AuthProvider({ children }) {
  const [sessions, setSessions] = useState(() => ({ user: loadAuth('user'), admin: loadAuth('admin') }));
  // True right after the customer clicks "Log out", so route guards send them home instead of
  // to the login page. An expired session (401) leaves it false, so they are asked to log in.
  const [userLoggedOut, setUserLoggedOut] = useState(false);

  const setSession = useCallback((kind, auth) => {
    saveAuth(kind, auth);
    setSessions((prev) => ({ ...prev, [kind]: auth }));
  }, []);

  const logout = useCallback(
    (kind = 'user', { manual = false } = {}) => {
      if (kind === 'user') setUserLoggedOut(manual);
      setSession(kind, null);
    },
    [setSession]
  );

  useEffect(() => setUnauthorizedHandler((kind) => logout(kind)), [logout]);

  const login = useCallback(
    async (email, password, { admin = false } = {}) => {
      const { data } = await api.post(admin ? '/admin/login' : '/auth/login', { email, password });
      setSession(admin ? 'admin' : 'user', { token: data.token, user: data.user });
      if (!admin) setUserLoggedOut(false);
      return data.user;
    },
    [setSession]
  );

  const updateUser = useCallback(
    (user) => setSession('user', { ...loadAuth('user'), user }),
    [setSession]
  );

  const value = useMemo(
    () => ({
      user: sessions.user?.user ?? null,
      admin: sessions.admin?.user ?? null,
      userLoggedOut,
      login,
      logout,
      updateUser,
    }),
    [sessions, userLoggedOut, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
