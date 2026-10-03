import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export const CURRENT_POLICY_VERSION = '2026-10-01';
const STORAGE_KEY = 'fera_consent';

export interface ConsentPreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  policy_version: string;
  updated_at: string;
}

interface ConsentContextType {
  consent: ConsentPreferences;
  hasResponded: boolean;
  isModalOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (analytics: boolean, marketing: boolean) => void;
  openPreferencesModal: () => void;
  closePreferencesModal: () => void;
}

const DEFAULT_CONSENT: ConsentPreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  policy_version: CURRENT_POLICY_VERSION,
  updated_at: new Date().toISOString(),
};

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences>(DEFAULT_CONSENT);
  const [hasResponded, setHasResponded] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Initialize consent from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ConsentPreferences;
        // Verify policy version compatibility
        if (parsed.policy_version === CURRENT_POLICY_VERSION && typeof parsed.analytics === 'boolean') {
          setConsent({
            essential: true,
            analytics: parsed.analytics,
            marketing: Boolean(parsed.marketing),
            policy_version: parsed.policy_version,
            updated_at: parsed.updated_at || new Date().toISOString(),
          });
          setHasResponded(true);
          return;
        }
      }
    } catch {
      // Ignore parse errors, treat as not responded
    }
    setHasResponded(false);
  }, []);

  const persistConsent = useCallback((newConsent: ConsentPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConsent));
    } catch {}
    setConsent(newConsent);
    setHasResponded(true);
    setIsModalOpen(false);

    // Notify other subsystems of consent change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fera_consent_updated', { detail: newConsent }));
    }
  }, []);

  const acceptAll = useCallback(() => {
    const updated: ConsentPreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      policy_version: CURRENT_POLICY_VERSION,
      updated_at: new Date().toISOString(),
    };
    persistConsent(updated);
  }, [persistConsent]);

  const rejectAll = useCallback(() => {
    const updated: ConsentPreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      policy_version: CURRENT_POLICY_VERSION,
      updated_at: new Date().toISOString(),
    };
    persistConsent(updated);
  }, [persistConsent]);

  const savePreferences = useCallback((analytics: boolean, marketing: boolean) => {
    const updated: ConsentPreferences = {
      essential: true,
      analytics,
      marketing,
      policy_version: CURRENT_POLICY_VERSION,
      updated_at: new Date().toISOString(),
    };
    persistConsent(updated);
  }, [persistConsent]);

  const openPreferencesModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closePreferencesModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <ConsentContext.Provider
      value={{
        consent,
        hasResponded,
        isModalOpen,
        acceptAll,
        rejectAll,
        savePreferences,
        openPreferencesModal,
        closePreferencesModal,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextType {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
}
