import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      login();
    }
  }, [user, isLoading, login, navigate]);

  return (
    <>
      <SEO title="Sign in • FeraSetu" noindex />
      <div className="min-h-screen bg-[#060818]" />
    </>
  );
}
