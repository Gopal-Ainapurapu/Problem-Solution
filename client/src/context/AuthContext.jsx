
import { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('user') || 'null')
  );

  const save = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  // Update the logged-in user's data throughout the app.
  const updateUser = (updatedUser) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;

      const mergedUser = {
        ...currentUser,
        ...updatedUser,
      };

      localStorage.setItem('user', JSON.stringify(mergedUser));

      return mergedUser;
    });
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });

    save(response.data);
  };

  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);

    save(response.data);
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
