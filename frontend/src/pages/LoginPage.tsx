import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#1e293b',
    borderRadius: 16,
    padding: 32,
    border: '1px solid #334155',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    fontSize: 14,
    color: '#f1f5f9',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputFocus: {
    borderColor: '#ff6b35',
    boxShadow: '0 0 0 2px rgba(255,107,53,0.15)',
  },
  btnPrimary: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 700,
    background: '#ff6b35',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 0.15s',
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  btnSecondary: {
    width: '100%',
    padding: '11px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  },
  dividerLine: { flex: 1, height: 1, background: '#334155' },
  dividerText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  error: { color: '#f87171', fontSize: 11, marginTop: 4, fontWeight: 600 },
};

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
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

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#ff6b35';
    e.target.style.boxShadow = '0 0 0 2px rgba(255,107,53,0.15)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#334155';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontStyle: 'italic' }}>F</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
              Fera<span style={{ color: '#ff6b35' }}>Setu</span>
            </span>
          </Link>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>Welcome back</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, fontWeight: 500 }}>Sign in to your store dashboard</p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Email</label>
            <input type="email" style={styles.input} placeholder="you@example.com"
              {...register('email', { required: 'Email is required' })}
              onFocus={handleFocus} onBlur={handleBlur} />
            {errors.email && <p style={styles.error}>{errors.email.message}</p>}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} style={{ ...styles.input, paddingRight: 40 }} placeholder="Enter your password"
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                onFocus={handleFocus} onBlur={handleBlur} />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p style={styles.error}>{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading} style={{ ...styles.btnPrimary, ...(loading ? styles.btnDisabled : {}) }}>
            {loading ? 'Signing in...' : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>OR</span>
          <div style={styles.dividerLine} />
        </div>

        <button type="button" onClick={loginWithGoogle} style={styles.btnSecondary}>
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#ff6b35', fontWeight: 700, textDecoration: 'none' }}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}
