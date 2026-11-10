import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DockSide = 'left' | 'right';

interface AiAssistantContextType {
  isOpen: boolean;
  dockSide: DockSide;
  initialPrompt: string;
  contextHint?: string;
  openAssistant: (prompt?: string, contextHint?: string) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  setDockSide: (side: DockSide) => void;
  toggleDockSide: () => void;
}

const AiAssistantContext = createContext<AiAssistantContextType | undefined>(undefined);

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dockSide, setDockSideState] = useState<DockSide>(() => {
    try {
      const saved = localStorage.getItem('ferasetu_ai_dock_side');
      return saved === 'left' ? 'left' : 'right';
    } catch {
      return 'right';
    }
  });
  const [initialPrompt, setInitialPrompt] = useState('');
  const [contextHint, setContextHint] = useState<string | undefined>(undefined);

  const setDockSide = useCallback((side: DockSide) => {
    setDockSideState(side);
    try {
      localStorage.setItem('ferasetu_ai_dock_side', side);
    } catch {
      // storage unavailable
    }
  }, []);

  const toggleDockSide = useCallback(() => {
    setDockSide(dockSide === 'left' ? 'right' : 'left');
  }, [dockSide, setDockSide]);

  const openAssistant = useCallback((prompt?: string, hint?: string) => {
    if (prompt) setInitialPrompt(prompt);
    if (hint) setContextHint(hint);
    setIsOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
    setInitialPrompt('');
  }, []);

  const toggleAssistant = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <AiAssistantContext.Provider
      value={{
        isOpen,
        dockSide,
        initialPrompt,
        contextHint,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        setDockSide,
        toggleDockSide,
      }}
    >
      {children}
    </AiAssistantContext.Provider>
  );
}

export function useAiAssistant() {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error('useAiAssistant must be used within an AiAssistantProvider');
  }
  return context;
}
