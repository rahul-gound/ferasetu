import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    padding: 32,
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
  },
  h1: {
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--text)',
    marginBottom: 4,
  },
  p: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 24,
    fontWeight: 500,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 12,
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'all 0.2s ease',
  },
  inputFocus: {
    borderColor: 'var(--primary)',
    boxShadow: '0 0 0 2px rgba(0,82,255,0.15)',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 12,
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    appearance: 'none' as const,
  },
  btnPrimary: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 500,
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  btnSecondary: {
    width: '100%',
    padding: '11px 16px',
    fontSize: 13,
    fontWeight: 500,
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s ease',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border)',
  },
  dividerText: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  error: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: 600,
  },
  otpInput: {
    width: 44,
    height: 48,
    textAlign: 'center' as const,
    fontSize: 20,
    fontWeight: 800,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
  },
  otpInputFocus: {
    borderColor: 'var(--primary)',
    boxShadow: '0 0 0 2px rgba(0,82,255,0.15)',
  },
};

export default function RegisterPage() {
  const { sendOTP, verifyOTP, createAccountAfterOTP, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<RegisterForm | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [legalModal, setLegalModal] = useState<{ open: boolean; type: 'privacy' | 'terms' }>({ open: false, type: 'terms' });
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { preferredLanguage: 'en', email: searchParams.get('email') || '', agreedToTerms: false },
  });

  const selectedLang = watch('preferredLanguage');
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    if (step === 1) otpRefs.current[0]?.focus();
  }, [step]);

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
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
      toast.success('OTP sent! Check your email.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.join('').length !== 6) { setOtpError('Enter complete 6-digit OTP'); return; }
    if (!formData) return;
    setLoading(true);
    setOtpError('');
    try {
      const verified = await verifyOTP(formData.email, otp.join(''));
      if (!verified) {
        setOtpError('Invalid OTP');
        return;
      }
      await createAccountAfterOTP(formData);
      setStep(2);
      setTimeout(() => navigate(redirect), 2000);
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const focusStyle = { ...styles.input, borderColor: 'var(--primary)', boxShadow: '0 0 0 2px rgba(0,82,255,0.15)' };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontStyle: 'italic' }}>F</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>
              Fera<span style={{ color: 'var(--primary)' }}>Setu</span>
            </span>
          </Link>
        </div>

        {step === 0 && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <h1 style={styles.h1}>Create your store</h1>
            <p style={styles.p}>Beta Plan · Free for everyone</p>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Name *</label>
                <input style={styles.input} placeholder="Rahul Sharma"
                  {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })}
                  onFocus={e => { e.target.style.borderColor = focusStyle.borderColor; e.target.style.boxShadow = focusStyle.boxShadow; }}
                  onBlur={e => { e.target.style.borderColor = styles.input.borderColor; e.target.style.boxShadow = 'none'; }} />
                {errors.name && <p style={styles.error}>{errors.name.message}</p>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Business <span style={{ color: 'var(--text-muted)' }}>(opt)</span></label>
                <input style={styles.input} placeholder="My Store"
                  {...register('businessName')}
                  onFocus={e => { e.target.style.borderColor = focusStyle.borderColor; e.target.style.boxShadow = focusStyle.boxShadow; }}
                  onBlur={e => { e.target.style.borderColor = styles.input.borderColor; e.target.style.boxShadow = 'none'; }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Email *</label>
              <input type="email" style={styles.input} placeholder="rahul@example.com"
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
                onFocus={e => { e.target.style.borderColor = focusStyle.borderColor; e.target.style.boxShadow = focusStyle.boxShadow; }}
                onBlur={e => { e.target.style.borderColor = styles.input.borderColor; e.target.style.boxShadow = 'none'; }} />
              {errors.email && <p style={styles.error}>{errors.email.message}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} style={{ ...styles.input, paddingRight: 40 }} placeholder="Min 8 characters"
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
                  onFocus={e => { e.target.style.borderColor = focusStyle.borderColor; e.target.style.boxShadow = focusStyle.boxShadow; }}
                  onBlur={e => { e.target.style.borderColor = styles.input.borderColor; e.target.style.boxShadow = 'none'; }} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
                }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={styles.error}>{errors.password.message}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Phone <span style={{ color: 'var(--text-muted)' }}>(opt)</span></label>
              <input type="tel" style={styles.input} placeholder="+91 98765 43210"
                {...register('phone', { pattern: { value: /^[+]?[\d\s-]{7,15}$/, message: 'Invalid phone number' } })}
                onFocus={e => { e.target.style.borderColor = focusStyle.borderColor; e.target.style.boxShadow = focusStyle.boxShadow; }}
                onBlur={e => { e.target.style.borderColor = styles.input.borderColor; e.target.style.boxShadow = 'none'; }} />
              {errors.phone && <p style={styles.error}>{errors.phone.message}</p>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Language</label>
              <select style={styles.select} {...register('preferredLanguage')}
                onFocus={e => { e.target.style.borderColor = styles.inputFocus.borderColor; e.target.style.boxShadow = styles.inputFocus.boxShadow; }}
                onBlur={e => { e.target.style.borderColor = styles.select.borderColor; e.target.style.boxShadow = 'none'; }}
                onChange={e => { setValue('preferredLanguage', e.target.value); }}>
                <option value="en">English</option>
                <option value="hi">Hindi — हिन्दी</option>
                <option value="bn">Bengali — বাংলা</option>
                <option value="te">Telugu — తెలుగు</option>
                <option value="mr">Marathi — मराठी</option>
                <option value="ta">Tamil — தமிழ்</option>
                <option value="gu">Gujarati — ગુજરાતી</option>
                <option value="kn">Kannada — ಕನ್ನಡ</option>
                <option value="ml">Malayalam — മലയാളം</option>
                <option value="pa">Punjabi — ਪੰਜਾਬੀ</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <input type="checkbox" id="agreedToTerms" style={{ marginTop: 3, accentColor: 'var(--primary)', width: 14, height: 14 }}
                  {...register('agreedToTerms', { required: 'You must agree to the terms' })} />
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  <label htmlFor="agreedToTerms" style={{ cursor: 'pointer' }}>
                    I agree to the{' '}
                  </label>
                  <button type="button" onClick={() => setLegalModal({ open: true, type: 'terms' })}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, padding: 0, cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontFamily: 'inherit' }}>
                    Terms
                  </button>{' '}and{' '}
                  <button type="button" onClick={() => setLegalModal({ open: true, type: 'privacy' })}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, padding: 0, cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontFamily: 'inherit' }}>
                    Privacy Policy
                  </button>
                </div>
              </div>
              {errors.agreedToTerms && <p style={styles.error}>{errors.agreedToTerms.message}</p>}
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.btnPrimary, ...(loading ? styles.btnDisabled : {}) }}>
              {loading ? <span>Creating...</span> : <><UserPlus size={16} /> Create My Store</>}
            </button>

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
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </form>
        )}

        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => { setStep(0); setOtp(['', '', '', '', '', '']); setOtpError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: 20, fontFamily: 'inherit' }}>
              <ArrowLeft size={14} /> Back
            </button>

            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(0,82,255,0.1)', border: '1px solid rgba(0,82,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <h1 style={styles.h1}>Verify your email</h1>
            <p style={{ ...styles.p, marginBottom: 8 }}>Enter the 6-digit code sent to</p>
            <p style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 700, marginBottom: 24 }}>{formData?.email}</p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
              {otp.map((digit, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1}
                  aria-label={`OTP digit ${i + 1}`}
                  value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  style={{ ...styles.otpInput, borderColor: otpError ? '#EF4444' : 'var(--border)' }}
                  onFocus={e => { e.target.style.borderColor = styles.otpInputFocus.borderColor; e.target.style.boxShadow = styles.otpInputFocus.boxShadow; }}
                  onBlur={e => { e.target.style.borderColor = otpError ? '#EF4444' : 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
              ))}
            </div>

            {otpError && <p style={{ ...styles.error, marginBottom: 12 }}>{otpError}</p>}

            <button type="button" onClick={handleVerifyOTP}
              disabled={loading || otp.join('').length !== 6}
              style={{ ...styles.btnPrimary, marginTop: 16, ...(loading || otp.join('').length !== 6 ? styles.btnDisabled : {}) }}>
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>

            <button type="button" onClick={async () => {
              if (!formData || resending) return;
              setResending(true);
              try {
                await sendOTP(formData.email);
                toast.success('OTP resent!');
              } catch (err: any) {
                toast.error(err.response?.data?.error || 'Failed to resend OTP');
              } finally {
                setResending(false);
              }
            }}
              disabled={resending} style={{ background: 'none', border: 'none', cursor: resending ? 'not-allowed' : 'pointer', color: '#64748b', fontSize: 13, marginTop: 16, fontFamily: 'inherit' }}>
              Didn't get it? <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Resend</span>
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h1 style={{ ...styles.h1, fontSize: 20 }}>Verified!</h1>
            <p style={{ color: '#34d399', fontSize: 14, fontWeight: 600 }}>Account created successfully.</p>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>Redirecting to your dashboard...</p>
          </div>
        )}
      </div>

      <LegalModal isOpen={legalModal.open} type={legalModal.type} onClose={() => setLegalModal(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
