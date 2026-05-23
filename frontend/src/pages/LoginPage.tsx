import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginForm {
  emailOrUsername: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.emailOrUsername, data.password);
      toast.success('Logged in successfully!');
      navigate(redirect);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Login failed. Please check your credentials.';
      toast.error(msg);
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
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes authFadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .auth-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          font-size: 14px;
          color: #fff;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.25); }
        .auth-input:focus {
          border-color: rgba(255,107,53,0.5);
          box-shadow: 0 0 0 3px rgba(255,107,53,0.08);
        }
        .auth-card {
          animation: authFadeUp 0.6s cubic-bezier(0.2,0.8,0.2,1) forwards;
        }
      `}</style>

      {/* Background orbs */}
      <div style={{ position: 'absolute', top: -100, left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,107,53,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, right: '20%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div className="auth-card" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(255,107,53,0.35)',
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, fontStyle: 'italic' }}>F</span>
            </div>
            <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>
              Fera<span style={{ color: '#ff6b35' }}>Setu</span>
            </span>
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: 8, fontSize: 13, fontWeight: 500 }}>Your shop's digital bridge</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 28,
          padding: '40px 36px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.03em' }}>
            Welcome back 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32, fontWeight: 500 }}>
            Sign in to your store dashboard
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 8, letterSpacing: '0.01em' }}>
                Email or Username
              </label>
              <input
                type="text"
                className="auth-input"
                placeholder="you@example.com or username"
                {...register('emailOrUsername', { required: 'Email or username is required' })}
              />
              {errors.emailOrUsername && (
                <p style={{ color: '#f87171', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{errors.emailOrUsername.message}</p>
              )}
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 8, letterSpacing: '0.01em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter your password"
                  style={{ paddingRight: 48 }}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Minimum 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: '#f87171', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', fontSize: 15, fontWeight: 800,
                background: loading ? 'rgba(255,107,53,0.5)' : 'linear-gradient(135deg,#ff6b35,#e55a24)',
                color: '#fff', border: 'none', borderRadius: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 8px 30px rgba(255,107,53,0.35)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(255,107,53,0.5)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 30px rgba(255,107,53,0.35)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}>
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Signing in...
                </>
              ) : (
                <><LogIn size={17} /> Sign In</>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#ff6b35', fontWeight: 700, textDecoration: 'none' }}>
              Create one free →
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
