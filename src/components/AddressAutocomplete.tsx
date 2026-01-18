import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Digite o endereço...',
  className,
  icon
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch predictions when input changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!inputValue || inputValue.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('smart-transport', {
          body: {
            action: 'autocomplete',
            input: inputValue
          }
        });

        if (error) throw error;

        if (data?.success && data?.predictions) {
          setPredictions(data.predictions);
          setShowDropdown(data.predictions.length > 0 && isFocused);
        }
      } catch (err) {
        console.error('Autocomplete error:', err);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue, isFocused]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (prediction: Prediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setPredictions([]);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Don't update parent immediately - only on selection or blur
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding dropdown to allow click on prediction
    setTimeout(() => {
      setShowDropdown(false);
      // Update parent with current value if different
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, 200);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setPredictions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            if (predictions.length > 0) {
              setShowDropdown(true);
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "transition-all",
            icon && "pl-10",
            inputValue && "pr-16"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && predictions.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {predictions.map((prediction, index) => (
              <motion.button
                key={prediction.place_id}
                type="button"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSelect(prediction)}
                className={cn(
                  "w-full px-3 py-2.5 text-left flex items-start gap-3 hover:bg-muted/50 transition-colors",
                  index !== predictions.length - 1 && "border-b border-border/50"
                )}
              >
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {prediction.structured_formatting.main_text}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {prediction.structured_formatting.secondary_text}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}