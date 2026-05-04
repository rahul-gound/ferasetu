import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { UserPlus, Eye, EyeOff, ShoppingBag, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SUPPORTED_LANGUAGES } from '../utils/languages';
import LegalModal from '../components/LegalModal';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  phone?: string;
  businessName?: string;
  preferredLanguage: string;
  agreedToTerms: boolean;
}

export default function RegisterPage() {
  const { register: performRegister, sendOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [step, setStep] = useState(0); // 0: Form, 1: OTP
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [legalModal, setLegalModal] = useState<{ open: boolean, type: 'privacy' | 'terms' }>({ open: false, type: 'terms' });
  const [resendTimer, setResendTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { 
      preferredLanguage: 'en',
      email: searchParams.get('email') || '',
      agreedToTerms: false,
    },
  });

  const selectedLang = watch('preferredLanguage');
  const emailValue = watch('email');
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang);

  const onSubmit = async (data: RegisterForm) => {
    setSendingOtp(true);
    try {
      await sendOtp(data.email);
      toast.success('OTP sent successfully! 📧');
      setStep(1);
      setResendTimer(30);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendAttempts >= 3) {
      toast.error('Too many attempts. Please wait.');
      return;
    }
    
    setSendingOtp(true);
    try {
      await api.post('/auth/resend-otp', { email: emailValue });
      toast.success('New code sent! 🚀');
      setResendTimer(30 + (resendAttempts * 30)); // Progressive backoff
      setResendAttempts(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resend. Try again later.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const formData = watch();
      await performRegister({ ...formData, otp });
      setStep(2); // Success state
      setTimeout(() => navigate(redirect), 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification failed. Please check your code.');
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
          <p style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>Start your 7-day Premium trial</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
          padding: '36px',
        }}>
          {step === 0 ? (
            <>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', marginBottom: '6px' }}>
                Create your store 🛒
              </h1>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                7-day trial · No credit card needed
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
                      placeholder="Minimum 8 characters"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Minimum 8 characters' },
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
                <div style={{ marginBottom: '20px' }}>
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

                {/* Legal Terms Checkbox */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      {...register('agreedToTerms', { required: 'You must agree to the terms' })}
                    />
                    <span style={{ fontSize: '13px', color: '#666', lineHeight: 1.5 }}>
                      I agree to the {' '}
                      <button 
                        type="button" 
                        onClick={() => setLegalModal({ open: true, type: 'terms' })}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Terms & Conditions
                      </button>
                      {' '} and {' '}
                      <button 
                        type="button" 
                        onClick={() => setLegalModal({ open: true, type: 'privacy' })}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Privacy Policy
                      </button>
                    </span>
                  </label>
                  {errors.agreedToTerms && <p style={errorStyle}>{errors.agreedToTerms.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={sendingOtp}
                  style={{
                    width: '100%', padding: '14px', fontSize: '16px', fontWeight: 800,
                    opacity: sendingOtp ? 0.7 : 1, background: '#FF6B35', color: '#fff',
                    border: 'none', borderRadius: '12px', cursor: sendingOtp ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(255, 107, 53, 0.3)', transition: 'all 0.2s',
                    transform: sendingOtp ? 'scale(0.98)' : 'scale(1)', marginTop: '8px'
                  }}
                >
                  {sendingOtp ? 'Sending OTP...' : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <UserPlus size={18} /> Create Your Store
                    </span>
                  )}
                </button>
              </form>
            </>
          ) : step === 1 ? (
            <>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', marginBottom: '6px' }}>
                Verify your email 📧
              </h1>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                We've sent a 6-digit code to <strong>{emailValue}</strong>
              </p>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Enter 6-digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="input"
                  placeholder="000000"
                  style={{ ...inputStyle, textAlign: 'center', letterSpacing: '8px', fontSize: '24px', fontWeight: 700 }}
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={loading}
                style={{
                  width: '100%', padding: '14px', fontSize: '16px', fontWeight: 800,
                  opacity: loading ? 0.7 : 1, background: '#FF6B35', color: '#fff',
                  border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 107, 53, 0.3)', transition: 'all 0.2s',
                  transform: loading ? 'scale(0.98)' : 'scale(1)', marginTop: '8px'
                }}
              >
                {loading ? 'Verifying...' : 'Verify & Create Store'}
              </button>

              <button
                onClick={() => setStep(0)}
                style={{
                  width: '100%', background: 'none', border: 'none', color: '#888',
                  marginTop: '16px', cursor: 'pointer', fontSize: '14px',
                }}
              >
                ← Back to edit details
              </button>

              <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                  Didn't receive the code?
                </p>
                <button
                  type="button"
                  disabled={resendTimer > 0 || sendingOtp}
                  onClick={handleResendOtp}
                  style={{
                    background: 'none', border: 'none', color: resendTimer > 0 ? '#cbd5e1' : '#FF6B35',
                    fontWeight: 700, cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', fontSize: '14px'
                  }}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code now'}
                </button>
                {resendAttempts > 0 && (
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Attempt {resendAttempts} of 3
                  </p>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ 
                width: '80px', height: '80px', background: '#f0fff4', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                border: '4px solid #bcf0da', animation: 'scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#065f46', marginBottom: '8px' }}>
                Verified! 🎉
              </h1>
              <p style={{ color: '#047857', fontSize: '15px', fontWeight: 500 }}>
                Account created successfully.
              </p>
              <p style={{ color: '#64748b', fontSize: '13px', marginTop: '12px' }}>
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {step !== 2 && (
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#FF6B35', fontWeight: 600, textDecoration: 'none' }}>
                Sign in →
              </Link>
            </p>
          )}
        </div>
      </div>

      <LegalModal 
        isOpen={legalModal.open} 
        type={legalModal.type} 
        onClose={() => setLegalModal(prev => ({ ...prev, open: false }))} 
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleUp { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
