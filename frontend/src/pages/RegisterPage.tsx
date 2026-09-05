import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

export default function RegisterPage() {
  const { register, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      register();
    }
  }, [user, isLoading, register, navigate]);

  return (
    <>
      <SEO title="Create Your Store • FeraSetu" noindex />
      <div className="min-h-screen bg-[#060818]" />
    </>
  );
}

