import { motion } from 'framer-motion';
import { Wallet, RefreshCw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppMode } from '@/contexts/AppModeContext';
import { cn } from '@/lib/utils';
import { speak } from '@/services/ttsService';
import { useEffect, useRef } from 'react';

// Greetings for each mode
const MODE_GREETINGS = {
  financas: 'Modo finanças ativado. Aqui você controla seu saldo, gastos e planejamento financeiro.',
  rotinas: 'Modo rotinas ativado. Aqui você gerencia sua agenda, lembretes e rotinas diárias.',
};

export function ModeToggle() {
  const { mode, setMode } = useAppMode();
  const navigate = useNavigate();
  const location = useLocation();
  const lastModeRef = useRef(mode);
  const hasSpokenRef = useRef(false);

  // Speak greeting when mode changes (only on user interaction)
  useEffect(() => {
    if (lastModeRef.current !== mode && hasSpokenRef.current) {
      speak(MODE_GREETINGS[mode]);
    }
    lastModeRef.current = mode;
  }, [mode]);

  const handleModeChange = (newMode: 'financas' | 'rotinas') => {
    if (mode === newMode) return;
    
    hasSpokenRef.current = true;
    setMode(newMode);
    
    // Navigate to the appropriate page
    if (newMode === 'financas') {
      // Go to dashboard/home for financas
      if (location.pathname !== '/') {
        navigate('/');
      }
    } else {
      // Go to agenda for rotinas
      if (location.pathname !== '/agenda') {
        navigate('/agenda');
      }
    }
  };

  return (
    <motion.div 
      className="flex items-center justify-center gap-2 px-4 py-2"
      initial={false}
    >
      <div className="flex items-center bg-muted/50 rounded-full p-1 backdrop-blur-sm border border-border/50 shadow-sm">
        <motion.button
          onClick={() => handleModeChange('financas')}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            mode === 'financas' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          whileHover={{ scale: mode === 'financas' ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {mode === 'financas' && (
            <motion.div
              layoutId="modeIndicator"
              className="absolute inset-0 bg-primary rounded-full shadow-lg"
              initial={false}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 35,
                mass: 0.8
              }}
            />
          )}
          <motion.span 
            className="relative z-10 flex items-center gap-1.5"
            animate={{ 
              scale: mode === 'financas' ? 1 : 0.95,
              opacity: mode === 'financas' ? 1 : 0.7
            }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ rotate: mode === 'financas' ? [0, -10, 0] : 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Wallet className="w-4 h-4" />
            </motion.div>
            Finanças
          </motion.span>
        </motion.button>

        <motion.button
          onClick={() => handleModeChange('rotinas')}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            mode === 'rotinas' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          whileHover={{ scale: mode === 'rotinas' ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {mode === 'rotinas' && (
            <motion.div
              layoutId="modeIndicator"
              className="absolute inset-0 bg-primary rounded-full shadow-lg"
              initial={false}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 35,
                mass: 0.8
              }}
            />
          )}
          <motion.span 
            className="relative z-10 flex items-center gap-1.5"
            animate={{ 
              scale: mode === 'rotinas' ? 1 : 0.95,
              opacity: mode === 'rotinas' ? 1 : 0.7
            }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ rotate: mode === 'rotinas' ? 360 : 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
            Rotinas
          </motion.span>
        </motion.button>
      </div>
    </motion.div>
  );
}
