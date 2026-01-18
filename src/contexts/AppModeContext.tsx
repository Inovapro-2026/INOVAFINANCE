import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AppMode = 'financas' | 'rotinas';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = 'inova_app_mode';

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('financas');

  useEffect(() => {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY) as AppMode;
    if (savedMode && (savedMode === 'financas' || savedMode === 'rotinas')) {
      setModeState(savedMode);
    }
  }, []);

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'financas' ? 'rotinas' : 'financas';
    setMode(newMode);
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}
