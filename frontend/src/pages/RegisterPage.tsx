import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { UserPlus, Eye, EyeOff, ShoppingBag, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SUPPORTED_LANGUAGES } from '../utils/languages';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  phone?: string;
  businessName?: string;
  preferredLanguage: string;
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { preferredLanguage: 'en' },
  });

  const selectedLang = watch('preferredLanguage');
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang);

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await registerUser(data);
      toast.success('Store created! Welcome to Fera 🎉');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block' as const, fontSize: '13px', fontWeight: 600 as const, color: '#444', marginBottom: '6px' };
  const errorStyle = { color: '#EF4444', fontSize: '12px', marginTop: '4px' };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff7f3 0%, #f0f7ff 50%, #f0fff8 100%)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={32} color="#FF6B35" />
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#FF6B35' }}>Fera</span>
          </Link>
          <p style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>Start your free online store</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
          padding: '36px',
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', marginBottom: '6px' }}>
            Create your store 🛒
          </h1>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
            Free forever · No credit card needed
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Full Name *</label>
              <input
                className="input" style={inputStyle}
                placeholder="Rahul Sharma"
                {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Minimum 2 characters' } })}
              />
              {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email" className="input" style={inputStyle}
                placeholder="rahul@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
                })}
              />
              {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input" style={{ ...inputStyle, paddingRight: '44px' }}
                  placeholder="Minimum 6 characters"
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
              {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Phone Number <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="tel" className="input" style={inputStyle}
                placeholder="+91 98765 43210"
                {...register('phone', {
                  pattern: { value: /^[+]?[\d\s-]{7,15}$/, message: 'Invalid phone number' },
                })}
              />
              {errors.phone && <p style={errorStyle}>{errors.phone.message}</p>}
            </div>

            {/* Business Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Business Name <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
              <input
                className="input" style={inputStyle}
                placeholder="Sharma General Store"
                {...register('businessName')}
              />
            </div>

            {/* Language selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Preferred Language</label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setLangOpen(v => !v)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    background: '#fff', cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '14px', color: '#1a1a2e',
                  }}
                >
                  <span>{currentLang?.name} — {currentLang?.nativeName}</span>
                  <ChevronDown size={16} color="#888" />
                </button>

                {langOpen && (
                  <div style={{
                    position: 'absolute', top: '44px', left: 0, right: 0,
                    background: '#fff', border: '1px solid var(--border)',
                    borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 200, maxHeight: '240px', overflowY: 'auto',
                  }}>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => { setValue('preferredLanguage', lang.code); setLangOpen(false); }}
                        style={{
                          width: '100%', padding: '9px 14px', display: 'flex',
                          justifyContent: 'space-between', alignItems: 'center',
                          border: 'none', cursor: 'pointer', fontSize: '13px',
                          background: lang.code === selectedLang ? 'rgba(255,107,53,0.08)' : 'none',
                          color: lang.code === selectedLang ? '#FF6B35' : '#1a1a2e',
                        }}
                      >
                        <span>{lang.name}</span>
                        <span style={{ color: '#888' }}>{lang.nativeName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                  Creating your store...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <UserPlus size={18} /> Create Free Store
                </span>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#FF6B35', fontWeight: 600, textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
