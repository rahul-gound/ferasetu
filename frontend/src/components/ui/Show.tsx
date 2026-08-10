import { useAuth } from '@clerk/react';
import type { ReactNode } from 'react';

interface ShowProps {
  when: 'signed-in' | 'signed-out';
  children: ReactNode;
}

export function Show({ when, children }: ShowProps) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null; // or loading spinner
  }

  if (when === 'signed-in' && isSignedIn) {
    return <>{children}</>;
  }

  if (when === 'signed-out' && !isSignedIn) {
    return <>{children}</>;
  }

  return null;
}
