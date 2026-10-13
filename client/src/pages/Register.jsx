import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
console.log('Registration request body:', req.body);
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 360, margin: '40px auto', display: 'grid', gap: 12, padding: 16 }}>
      <h2>Register</h2>
      <input placeholder="Name" value={form.name} onChange={set('name')} required />
      <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
      <input type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={set('password')} minLength={8} required />
      <select value={form.role} onChange={set('role')}>
        <option value="citizen">Citizen</option>
        <option value="volunteer">Volunteer</option>
      </select>
      <button type="submit">Create account</button>
      <p>Have an account? <Link to="/login">Log in</Link></p>
    </form>
  );
}