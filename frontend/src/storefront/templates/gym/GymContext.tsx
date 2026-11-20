import React, { createContext, useContext, useState, ReactNode } from 'react';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface ClassSession {
  id: string;
  name: string;
  time: string;
  duration: string;
  coach: string;
  category: 'strength' | 'conditioning' | 'combat' | 'recovery';
  spotsRemaining: number;
  level: string;
}

interface GymContextValue {
  activeDay: DayOfWeek;
  setActiveDay: (day: DayOfWeek) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  isFreePassModalOpen: boolean;
  openFreePassModal: () => void;
  closeFreePassModal: () => void;
  selectedPassPlan: string | null;
  setSelectedPassPlan: (plan: string | null) => void;
}

const GymContext = createContext<GymContextValue | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
  const [activeDay, setActiveDay] = useState<DayOfWeek>('mon');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFreePassModalOpen, setIsFreePassModalOpen] = useState(false);
  const [selectedPassPlan, setSelectedPassPlan] = useState<string | null>(null);

  const openFreePassModal = () => setIsFreePassModalOpen(true);
  const closeFreePassModal = () => setIsFreePassModalOpen(false);

  return (
    <GymContext.Provider
      value={{
        activeDay,
        setActiveDay,
        selectedCategory,
        setSelectedCategory,
        isFreePassModalOpen,
        openFreePassModal,
        closeFreePassModal,
        selectedPassPlan,
        setSelectedPassPlan,
      }}
    >
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
}
