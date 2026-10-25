
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        localStorage.removeItem('user');
        return null;
      }

      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  });

  const [loading, setLoading] = useState(
    () => Boolean(localStorage.getItem('token'))
  );

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setLoading(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const token = localStorage.getItem('token');

    if (!token) {
      return undefined;
    }

    const checkSession = async () => {
      try {
        const response = await api.get('/users/me');

        if (!ignore && response.data?.user) {
          setUser(response.data.user);
          localStorage.setItem(
            'user',
            JSON.stringify(response.data.user)
          );
        }
      } catch (error) {
        if (!ignore && error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      ignore = true;
    };
  }, []);

  const save = ({ token, user: authenticatedUser }) => {
    if (!token || !authenticatedUser) {
      throw new Error(
        'The server did not return a valid authenticated session.'
      );
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(authenticatedUser));

    setUser(authenticatedUser);
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email: email.trim(),
      password,
    });

    save(response.data);
    return response.data;
  };

  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);

    save(response.data);
    return response.data;
  };

  const updateUser = (updatedUser) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;

      const mergedUser = { ...currentUser, ...updatedUser };

      localStorage.setItem('user', JSON.stringify(mergedUser));

      return mergedUser;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
