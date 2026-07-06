import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { AIConsentModal } from '../components/ai/AIConsentModal';

interface AIConsentContextType {
  hasAiConsent: boolean;
  /** Resolves true if the user already has (or just gave) consent, false if they declined. */
  requestAiConsent: () => Promise<boolean>;
}

const AIConsentContext = createContext<AIConsentContextType | null>(null);

export function AIConsentProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const resolverRef = useRef<((granted: boolean) => void) | null>(null);

  const hasAiConsent = profile?.ai_consent === true;

  function requestAiConsent(): Promise<boolean> {
    if (hasAiConsent) return Promise.resolve(true);
    setModalOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }

  async function handleAgree() {
    setModalOpen(false);
    await updateProfile({ ai_consent: true });
    resolverRef.current?.(true);
    resolverRef.current = null;
  }

  function handleDecline() {
    setModalOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }

  return (
    <AIConsentContext.Provider value={{ hasAiConsent, requestAiConsent }}>
      {children}
      <AIConsentModal open={modalOpen} onAgree={handleAgree} onDecline={handleDecline} />
    </AIConsentContext.Provider>
  );
}

export function useAIConsent() {
  const ctx = useContext(AIConsentContext);
  if (!ctx) throw new Error('useAIConsent must be inside AIConsentProvider');
  return ctx;
}
