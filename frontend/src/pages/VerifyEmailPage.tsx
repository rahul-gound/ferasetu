import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmailPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // WorkOS AuthKit handles verification natively in its hosted flow.
    // This route is deprecated.
    navigate('/dashboard');
  }, [navigate]);

  return null;
}
