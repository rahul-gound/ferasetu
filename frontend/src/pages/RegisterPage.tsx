import { SignUp } from '@clerk/react';
import { Link } from 'react-router-dom';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: 24,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  logoContainer: {
    marginBottom: 24,
    display: 'flex',
    justifyContent: 'center',
  },
};

export default function RegisterPage() {
  return (
    <div style={styles.page}>
      <SEO title="Start Free Trial" noindex />
      <div style={styles.logoContainer}>
        <Link to="/">
          <img src="/logo.png" alt="FeraSetu Logo" style={{ height: 48, width: 'auto' }} />
        </Link>
      </div>
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            headerTitle: 'Apni dukaan shuru karo',
            headerSubtitle: 'Build your independent digital business today.',
          }
        }}
      />
    </div>
  );
}