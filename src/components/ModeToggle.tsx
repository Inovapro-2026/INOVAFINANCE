import { motion } from 'framer-motion';
import { Wallet, RefreshCw } from 'lucide-react';
import { useAppMode } from '@/contexts/AppModeContext';
import { cn } from '@/lib/utils';

export function ModeToggle() {
  const { mode, setMode } = useAppMode();

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2">
      <div className="flex items-center bg-muted/50 rounded-full p-1 backdrop-blur-sm">
        <button
          onClick={() => setMode('financas')}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            mode === 'financas' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {mode === 'financas' && (
            <motion.div
              layoutId="modeIndicator"
              className="absolute inset-0 bg-primary rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Wallet className="w-4 h-4" />
            Finanças
          </span>
        </button>

        <button
          onClick={() => setMode('rotinas')}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            mode === 'rotinas' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {mode === 'rotinas' && (
            <motion.div
              layoutId="modeIndicator"
              className="absolute inset-0 bg-primary rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Rotinas
          </span>
        </button>
      </div>
    </div>
  );
}
