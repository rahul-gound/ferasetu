import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/admin/login`, { username, password });
      localStorage.setItem('admin_token', res.data.token);
      toast.success('Welcome Admin');
      navigate('/admin/dashboard');
    } catch (err: any) {
      if (err.response?.status === 502) {
        toast.error('Server is starting up or unreachable. Please try again in 5 seconds.');
      } else {
        toast.error(err.response?.data?.error || 'Login failed. Check backend status.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', background: '#FF6B35', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 16px' }}>
            <Lock size={32} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B' }}>Admin Login</h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>Secure access for Fera administrators</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94A3B8' }} />
              <input
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94A3B8' }} />
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none' }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '14px', borderRadius: '12px', background: '#1E293B', color: '#fff', fontWeight: 700, fontSize: '16px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
