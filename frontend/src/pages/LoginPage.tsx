import { SignIn } from '@clerk/react';
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

export default function LoginPage() {
  return (
    <div style={styles.page}>
      <div style={styles.logoContainer}>
        <Link to="/">
          <img src="/logo.png" alt="FeraSetu Logo" style={{ height: 48, width: 'auto' }} />
        </Link>
      </div>
      <SEO title="Sign In" noindex />
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/register"
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            headerTitle: 'Welcome back',
            headerSubtitle: 'Sign in to manage your FeraSetu shop.',
          }
        }}
      />
    </div>
  );
}
