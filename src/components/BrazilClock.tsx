import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrazilClockProps {
  className?: string;
}

export function BrazilClock({ className }: BrazilClockProps) {
  const [time, setTime] = useState(new Date());
  const [clockType, setClockType] = useState<'analog' | 'digital'>('digital');

  useEffect(() => {
    const timer = setInterval(() => {
      // Get Brasilia time (UTC-3)
      const now = new Date();
      const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      setTime(brasiliaTime);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Format date in Portuguese
  const dateStr = time.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });

  // Capitalize first letter
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  // Analog clock calculations
  const hourRotation = (hours % 12) * 30 + minutes * 0.5;
  const minuteRotation = minutes * 6 + seconds * 0.1;
  const secondRotation = seconds * 6;

  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border/50", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Relógio
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={clockType === 'digital' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs px-2 h-7"
              onClick={() => setClockType('digital')}
            >
              Digital
            </Button>
            <Button
              variant={clockType === 'analog' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs px-2 h-7"
              onClick={() => setClockType('analog')}
            >
              Analógico
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {clockType === 'digital' ? (
          <motion.div
            key="digital"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="text-4xl font-bold font-mono text-primary">
              {String(hours).padStart(2, '0')}
              <span className="animate-pulse">:</span>
              {String(minutes).padStart(2, '0')}
              <span className="text-2xl text-muted-foreground">
                :{String(seconds).padStart(2, '0')}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="analog"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-32 h-32"
          >
            {/* Clock face */}
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 bg-card">
              {/* Hour markers */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-3 bg-foreground/50 left-1/2 -translate-x-1/2"
                  style={{
                    transform: `rotate(${i * 30}deg) translateX(-50%)`,
                    transformOrigin: '50% 64px',
                    top: '4px'
                  }}
                />
              ))}
              
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />
              
              {/* Hour hand */}
              <motion.div
                className="absolute left-1/2 bottom-1/2 w-1.5 h-8 bg-foreground rounded-full origin-bottom"
                style={{
                  marginLeft: '-3px',
                  transform: `rotate(${hourRotation}deg)`
                }}
                animate={{ rotate: hourRotation }}
                transition={{ type: 'spring', stiffness: 50 }}
              />
              
              {/* Minute hand */}
              <motion.div
                className="absolute left-1/2 bottom-1/2 w-1 h-12 bg-primary rounded-full origin-bottom"
                style={{
                  marginLeft: '-2px',
                  transform: `rotate(${minuteRotation}deg)`
                }}
                animate={{ rotate: minuteRotation }}
                transition={{ type: 'spring', stiffness: 50 }}
              />
              
              {/* Second hand */}
              <motion.div
                className="absolute left-1/2 bottom-1/2 w-0.5 h-14 bg-red-500 rounded-full origin-bottom"
                style={{
                  marginLeft: '-1px',
                  transform: `rotate(${secondRotation}deg)`
                }}
              />
            </div>
          </motion.div>
        )}
        
        {/* Date */}
        <div className="text-sm text-muted-foreground text-center">
          {formattedDate}
        </div>
        <div className="text-xs text-muted-foreground/70">
          Horário de Brasília
        </div>
      </CardContent>
    </Card>
  );
}
