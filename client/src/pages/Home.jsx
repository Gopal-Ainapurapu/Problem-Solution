import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();
  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 16 }}>
      <h1>LocalLens</h1>
      {user ? (
        <>
          <p>Signed in as {user.name} ({user.role})</p>
          <button onClick={logout}>Log out</button>
        </>
      ) : (
        <p><Link to="/login">Log in</Link> or <Link to="/register">Register</Link></p>
      )}
    </div>
  );
}