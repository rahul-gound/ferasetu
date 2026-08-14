import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      navigate('/dashboard');
    } else if (!hasAttempted.current) {
      hasAttempted.current = true;
      login();
    }
  }, [login, user, isLoading, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Redirecting to secure login...</p>
      </div>
    </div>
  );
}
