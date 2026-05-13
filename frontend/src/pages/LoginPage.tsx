import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff, ShoppingBag } from 'lucide-react';
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
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff7f3 0%, #f0f7ff 50%, #f0fff8 100%)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={32} color="#FF6B35" />
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#FF6B35' }}>FeraSetu</span>
          </Link>
          <p style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>Your shop’s digital bridge</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
          padding: '40px 36px',
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '6px' }}>
            Welcome back 👋
          </h1>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px' }}>
            Sign in to your store dashboard
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email or Username */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '6px' }}>
                Email or Username
              </label>
              <input
                type="text"
                className="input"
                placeholder="you@example.com or username"
                style={{ width: '100%', boxSizing: 'border-box' }}
                {...register('emailOrUsername', {
                  required: 'Email or username is required',
                })}
              />
              {errors.emailOrUsername && (
                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{errors.emailOrUsername.message}</p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Enter your password"
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: '44px' }}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Minimum 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#888',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: 700, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                  }} />
                  Signing in...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <LogIn size={18} /> Sign In
                </span>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#666' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#FF6B35', fontWeight: 600, textDecoration: 'none' }}>
              Create one free →
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#aaa' }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
