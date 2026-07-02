import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { UserPlus, Eye, EyeOff, ChevronDown, ArrowLeft } from 'lucide-react';
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
  const { register: performRegister, sendOTP, verifyOTP, createAccountAfterOTP, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<RegisterForm | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [legalModal, setLegalModal] = useState<{ open: boolean, type: 'privacy' | 'terms' }>({ open: false, type: 'terms' });
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: {
      preferredLanguage: 'en',
      email: searchParams.get('email') || '',
      agreedToTerms: false,
    },
  });

  const selectedLang = watch('preferredLanguage');
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang);

  useEffect(() => {
    if (step === 1) {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError('');
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await sendOTP(data.email);
      setFormData(data);
      setStep(1);
      toast.success('OTP sent to your email!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }
    if (!formData) return;
    setLoading(true);
    setOtpError('');
    try {
      const isValid = await verifyOTP(formData.email, otpCode);
      if (isValid) {
        await createAccountAfterOTP(formData);
        setStep(2);
        setTimeout(() => navigate(redirect), 2000);
      } else {
        setOtpError('Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.error || err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!formData) return;
    setLoading(true);
    try {
      await sendOTP(formData.email);
      toast.success('OTP resent to your email!');
    } catch (err: any) {
      toast.error('Failed to resend OTP.');
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
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleUp { from { transform:scale(0.5); opacity:0; } to { transform:scale(1); opacity:1; } }
        @keyframes authFadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .auth-input {
          width: 100%;
          padding: 11px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
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
        .auth-card { animation: authFadeUp 0.6s cubic-bezier(0.2,0.8,0.2,1) forwards; }
        .auth-label {
          display: block; font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,0.45); margin-bottom: 7px; letter-spacing: 0.02em;
        }
        .auth-error { color: #f87171; font-size: 12px; margin-top: 5px; font-weight: 600; }
      `}</style>

      {/* Background orbs */}
      <div style={{ position: 'absolute', top: -100, left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,107,53,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, right: '20%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div className="auth-card" style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13,
              background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(255,107,53,0.35)',
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, fontStyle: 'italic' }}>F</span>
            </div>
            <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>
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
          padding: '36px 34px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        }}>
          {step === 0 && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.03em' }}>Create your store 🛒</h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 28, fontWeight: 500 }}>Beta Plan · Free for everyone · No credit card needed</p>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
                  <div>
                    <label className="auth-label">Full Name *</label>
                    <input className="auth-input" placeholder="Rahul Sharma"
                      {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })} />
                    {errors.name && <p className="auth-error">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="auth-label">Business Name <span style={{ color: 'rgba(255,255,255,0.2)' }}>(opt)</span></label>
                    <input className="auth-input" placeholder="Sharma General Store" {...register('businessName')} />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="auth-label">Email Address *</label>
                  <input type="email" className="auth-input" placeholder="rahul@example.com"
                    {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
                  {errors.email && <p className="auth-error">{errors.email.message}</p>}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="auth-label">Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} className="auth-input"
                      placeholder="Minimum 8 characters" style={{ paddingRight: 44 }}
                      {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                      display: 'flex', alignItems: 'center', transition: 'color 0.2s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p className="auth-error">{errors.password.message}</p>}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="auth-label">Phone <span style={{ color: 'rgba(255,255,255,0.2)' }}>(optional)</span></label>
                  <input type="tel" className="auth-input" placeholder="+91 98765 43210"
                    {...register('phone', { pattern: { value: /^[+]?[\d\s-]{7,15}$/, message: 'Invalid phone number' } })} />
                  {errors.phone && <p className="auth-error">{errors.phone.message}</p>}
                </div>

                {/* Language selector */}
                <div style={{ marginBottom: 20 }}>
                  <label className="auth-label">Preferred Language</label>
                  <div style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setLangOpen(v => !v)} style={{
                      width: '100%', padding: '11px 14px',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit',
                      transition: 'border-color 0.2s',
                    }}>
                      <span>{currentLang?.name} — {currentLang?.nativeName}</span>
                      <ChevronDown size={15} color="rgba(255,255,255,0.4)" />
                    </button>
                    {langOpen && (
                      <div style={{
                        position: 'absolute', top: 44, left: 0, right: 0,
                        background: '#0f1422', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        zIndex: 200, maxHeight: 220, overflowY: 'auto',
                      }}>
                        {SUPPORTED_LANGUAGES.map(lang => (
                          <button key={lang.code} type="button"
                            onClick={() => { setValue('preferredLanguage', lang.code); setLangOpen(false); }}
                            style={{
                              width: '100%', padding: '9px 14px',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              border: 'none', cursor: 'pointer', fontSize: 13,
                              background: lang.code === selectedLang ? 'rgba(255,107,53,0.12)' : 'none',
                              color: lang.code === selectedLang ? '#ff6b35' : 'rgba(255,255,255,0.6)',
                              fontFamily: 'inherit', transition: 'background 0.15s',
                            }}>
                            <span>{lang.name}</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{lang.nativeName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ marginTop: 2, cursor: 'pointer', accentColor: '#ff6b35', width: 15, height: 15 }}
                      {...register('agreedToTerms', { required: 'You must agree to the terms' })} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, fontWeight: 500 }}>
                      I agree to the{' '}
                      <button type="button" onClick={() => setLegalModal({ open: true, type: 'terms' })}
                        style={{ background: 'none', border: 'none', color: '#ff6b35', fontWeight: 700, padding: 0, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 13 }}>
                        Terms & Conditions
                      </button>{' '}and{' '}
                      <button type="button" onClick={() => setLegalModal({ open: true, type: 'privacy' })}
                        style={{ background: 'none', border: 'none', color: '#ff6b35', fontWeight: 700, padding: 0, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 13 }}>
                        Privacy Policy
                      </button>
                    </span>
                  </label>
                  {errors.agreedToTerms && <p className="auth-error">{errors.agreedToTerms.message}</p>}
                </div>

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: 14, fontSize: 15, fontWeight: 800,
                  background: loading ? 'rgba(255,107,53,0.5)' : 'linear-gradient(135deg,#ff6b35,#e55a24)',
                  color: '#fff', border: 'none', borderRadius: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 8px 30px rgba(255,107,53,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                  {loading
                    ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Creating...</>
                    : <><UserPlus size={17} /> Create Your Store</>
                  }
                </button>
              </form>

              <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <button
                type="button"
                onClick={() => loginWithGoogle()}
                style={{
                  width: '100%', padding: '12px', fontSize: 14, fontWeight: 700,
                  background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {step === 1 && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { setStep(0); setOtp(['', '', '', '', '', '']); setOtpError(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                  fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20,
                  fontFamily: 'inherit',
                }}>
                <ArrowLeft size={16} /> Back
              </button>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4, letterSpacing: '-0.03em' }}>Verify your email</h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 4, fontWeight: 500 }}>
                Enter the 6-digit code sent to
              </p>
              <p style={{ color: '#ff6b35', fontSize: 14, fontWeight: 700, marginBottom: 28 }}>
                {formData?.email}
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    style={{
                      width: 46, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 800,
                      background: 'rgba(255,255,255,0.05)', border: otpError ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, color: '#fff', outline: 'none', fontFamily: 'monospace',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(255,107,53,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,53,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = otpError ? '#f87171' : 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                ))}
              </div>

              {otpError && (
                <p style={{ color: '#f87171', fontSize: 12, fontWeight: 600, marginTop: 8, marginBottom: 16 }}>
                  {otpError}
                </p>
              )}

              <button type="button" onClick={handleVerifyOTP} disabled={loading || otp.join('').length !== 6} style={{
                width: '100%', padding: 14, fontSize: 15, fontWeight: 800,
                background: loading || otp.join('').length !== 6 ? 'rgba(255,107,53,0.3)' : 'linear-gradient(135deg,#ff6b35,#e55a24)',
                color: '#fff', border: 'none', borderRadius: 16, marginTop: 20,
                cursor: loading || otp.join('').length !== 6 ? 'not-allowed' : 'pointer',
                boxShadow: loading || otp.join('').length !== 6 ? 'none' : '0 8px 30px rgba(255,107,53,0.35)',
                transition: 'all 0.2s',
              }}>
                {loading
                  ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', marginRight: 8 }} /> Verifying...</>
                  : 'Verify & Create Account'
                }
              </button>

              <button type="button" onClick={handleResendOTP} disabled={loading} style={{
                background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 16,
                fontFamily: 'inherit', transition: 'color 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ff6b35'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; }}>
                Didn't receive the code? <span style={{ color: '#ff6b35', fontWeight: 700 }}>Resend</span>
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 80, height: 80,
                background: 'rgba(16,185,129,0.12)',
                border: '2px solid rgba(16,185,129,0.3)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'scaleUp 0.5s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: '0 12px 40px rgba(16,185,129,0.2)',
              }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.03em' }}>Verified! 🎉</h1>
              <p style={{ color: '#34d399', fontSize: 15, fontWeight: 600 }}>Account created successfully.</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 12, fontWeight: 500 }}>Redirecting to your dashboard...</p>
            </div>
          )}

          {step !== 2 && (
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#ff6b35', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
            </p>
          )}
        </div>
      </div>

      <LegalModal
        isOpen={legalModal.open}
        type={legalModal.type}
        onClose={() => setLegalModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
