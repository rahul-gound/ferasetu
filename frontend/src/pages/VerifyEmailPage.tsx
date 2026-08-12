import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, MailCheck, AlertCircle } from 'lucide-react';
import SEO from '../components/SEO';

export default function VerifyEmailPage() {
  const { user, sendVerificationEmail, verifyOTP, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  // Appwrite sends userId and secret in the verification URL
  const userId = searchParams.get('userId');
  const secret = searchParams.get('secret');

  useEffect(() => {
    // If the user lands here with userId and secret from an email link, verify them automatically
    if (userId && secret && status === 'idle') {
      verifyLink(userId, secret);
    } else if (user?.is_verified) {
      // If already verified, go to dashboard
      navigate('/dashboard');
    }
  }, [userId, secret, user, status]);

  const verifyLink = async (uId: string, s: string) => {
    setStatus('verifying');
    try {
      const success = await verifyOTP(uId, s);
      if (success) {
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setStatus('error');
        setError('Verification link is invalid or has expired.');
      }
    } catch (err) {
      setStatus('error');
      setError('An error occurred during verification.');
    }
  };

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      await sendVerificationEmail(user.email);
      alert('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060818] p-6 text-white font-sans">
      <SEO title="Verify Email" noindex />

      <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl text-center">
        {status === 'verifying' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[#FF6B35]/20 flex items-center justify-center mx-auto mb-6">
              <Loader2 size={32} className="text-[#FF6B35] animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verifying your email</h1>
            <p className="text-white/60">Please wait while we confirm your email address...</p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <MailCheck size={32} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
            <p className="text-white/60">Taking you to your dashboard...</p>
          </>
        ) : status === 'error' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
            <p className="text-red-400/80 mb-8">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium mb-3"
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
              <MailCheck size={32} className="text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 font-outfit">Check your email</h1>
            <p className="text-white/60 mb-8 leading-relaxed">
              We sent a verification link to <strong>{user?.email}</strong>. 
              Please click the link in the email to activate your account.
            </p>

            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3.5 mb-4 rounded-xl bg-[#FF6B35] text-white font-bold hover:bg-[#e55a24] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {resending ? <Loader2 size={20} className="animate-spin" /> : 'Resend Verification Email'}
            </button>

            <button
              onClick={() => logout()}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium text-white/80"
            >
              Sign in with a different account
            </button>
          </>
        )}
      </div>
    </div>
  );
}
