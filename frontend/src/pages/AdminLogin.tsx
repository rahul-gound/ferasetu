import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, ShieldCheck, ArrowRight, Home } from 'lucide-react';
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
      toast.success('Access Granted. Welcome back, Chief.');
      navigate('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid credentials or unauthorized access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#090c1a',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .login-card { animation: fadeIn 0.6s ease-out both; }
        .input-focus:focus-within { border-color: #ff6b35 !important; box-shadow: 0 0 0 4px rgba(255,107,53,0.1) !important; }
      `}</style>

      <div className="login-card" style={{ 
        width: '100%', 
        maxWidth: '440px', 
        padding: '20px'
      }}>
        {/* Home Button */}
        <Link to="/" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 8, 
          color: 'rgba(255,255,255,0.4)', 
          textDecoration: 'none', 
          fontSize: '13px', 
          fontWeight: 600, 
          marginBottom: '32px',
          transition: 'color 0.2s'
        }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
          <Home size={16} /> Back to Platform
        </Link>

        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '32px',
          padding: '48px 40px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.4)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: 'linear-gradient(135deg, #ff6b35 0%, #e55a24 100%)', 
              borderRadius: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#fff', 
              margin: '0 auto 24px',
              boxShadow: '0 12px 32px rgba(255,107,53,0.3)'
            }}>
              <ShieldCheck size={32} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              Command Center
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', fontWeight: 500 }}>
              Restricted access for platform administrators
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="input-focus" style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '16px',
              padding: '4px',
              transition: 'all 0.2s'
            }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={18} style={{ position: 'absolute', left: '16px', color: 'rgba(255,255,255,0.2)' }} />
                <input
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Username"
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px 14px 48px', 
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div className="input-focus" style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '16px',
              padding: '4px',
              transition: 'all 0.2s'
            }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', color: 'rgba(255,255,255,0.2)' }} />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Secret Key"
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px 14px 48px', 
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ 
                marginTop: '8px',
                padding: '16px', 
                borderRadius: '16px', 
                background: '#fff', 
                color: '#090c1a', 
                fontWeight: 800, 
                fontSize: '15px', 
                border: 'none', 
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { if(!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? 'Verifying...' : 'Access Command Center'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Integrity Level: High
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
