import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import SEO from '../components/SEO';

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register({ name, email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign up failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060818] p-6 font-sans text-white">
      <SEO title="Start Free Trial" noindex />
      
      <div className="mb-8">
        <Link to="/">
          <img src="/logo.webp" alt="FeraSetu Logo" fetchpriority="high" width="192" height="48" className="h-12 w-auto" />
        </Link>
      </div>

      <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 font-outfit">Create your shop</h1>
          <p className="text-white/60">Start your free trial today. No credit card required.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button 
          onClick={handleGoogleLogin}
          className="w-full mb-6 flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign up with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-white/40 text-sm font-medium">or email</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Full Name</label>
            <input 
              type="text" 
              required 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#FF6B35] focus:outline-none focus:ring-1 focus:ring-[#FF6B35] transition-all text-white placeholder-white/30"
              placeholder="Rajesh Kumar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Email address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#FF6B35] focus:outline-none focus:ring-1 focus:ring-[#FF6B35] transition-all text-white placeholder-white/30"
              placeholder="you@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
            <input 
              type="password" 
              required 
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#FF6B35] focus:outline-none focus:ring-1 focus:ring-[#FF6B35] transition-all text-white placeholder-white/30"
              placeholder="At least 8 characters"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3.5 mt-2 rounded-xl bg-[#FF6B35] text-white font-bold hover:bg-[#e55a24] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B35]/20"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <p className="mt-8 text-center text-white/60 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#FF6B35] font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}