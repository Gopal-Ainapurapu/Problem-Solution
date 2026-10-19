
import { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  const save = ({ token, user }) => {
    if (!token || !user) {
      throw new Error('The server did not return a valid authenticated session.');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const updateUser = (updatedUser) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;

      const mergedUser = { ...currentUser, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      return mergedUser;
    });
  };

  // Step 1: Request login OTP.
  const login = async (email, password, channel) => {
    const response = await api.post('/auth/login', {
      email,
      password,
      channel,
    });

    return response.data;
  };

  // Step 2: Verify login OTP and save the session.
  const verifyLogin = async (email, code, channel) => {
    const response = await api.post('/auth/verify-login', {
      email,
      code,
      channel,
    });

    save(response.data);
    return response.data;
  };

  // Step 1: Register and request OTP.
  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);
    return response.data;
  };

  // Step 2: Verify registration OTP and save the session.
  const verifyRegistration = async (email, code, channel) => {
    const response = await api.post('/auth/verify-registration', {
      email,
      code,
      channel,
    });

    save(response.data);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        verifyLogin,
        register,
        verifyRegistration,
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
