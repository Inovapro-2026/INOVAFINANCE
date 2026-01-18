// INOVA Voice Service - Intelligent System Assistant for INOVAFINANCE
// Uses ElevenLabs for main pages, native browser voice for secondary pages

import { speakWithElevenLabs } from './elevenlabsTtsService';
import { speakNative } from './nativeTtsService';
import { stopAllAudio } from './audioManager';
import { 
  stopAllVoice, 
  wasTabGreetedSession, 
  markTabGreetedSession,
  clearTabGreetings,
  wasDailyGreetingSpoken,
  markDailyGreetingSpoken
} from './voiceQueueService';

const ISA_VOICE_ENABLED_KEY = 'isa_voice_enabled';

// Main pages that use ElevenLabs (premium voice)
const PREMIUM_VOICE_PAGES = ['dashboard', 'planner', 'card', 'goals', 'ai'];

/**
 * Check if ISA voice is enabled
 */
export function isVoiceEnabled(): boolean {
  const stored = localStorage.getItem(ISA_VOICE_ENABLED_KEY);
  // Default to true if not set
  return stored === null ? true : stored === 'true';
}

/**
 * Set ISA voice enabled/disabled
 */
export function setVoiceEnabled(enabled: boolean): void {
  localStorage.setItem(ISA_VOICE_ENABLED_KEY, enabled.toString());
  // Clear greeted tabs when voice is enabled so greetings can play again
  if (enabled) {
    clearTabGreetings();
    console.log('ISA: Voice enabled, cleared greeted tabs for fresh greetings');
  }
}

/**
 * Convert currency value to natural Brazilian Portuguese speech
 * Examples:
 * - 10.50 → "dez reais e cinquenta centavos"
 * - 2000 → "dois mil reais"
 * - 150.00 → "cento e cinquenta reais"
 * - 0.99 → "noventa e nove centavos"
 */
export function currencyToSpeech(value: number): string {
  if (value === 0) return 'zero reais';

  const absValue = Math.abs(value);
  const reais = Math.floor(absValue);
  const centavos = Math.round((absValue - reais) * 100);

  let result = '';

  // Handle reais
  if (reais > 0) {
    result = numberToWords(reais);
    result += reais === 1 ? ' real' : ' reais';
  }

  // Handle centavos
  if (centavos > 0) {
    if (reais > 0) {
      result += ' e ';
    }
    result += numberToWords(centavos);
    result += centavos === 1 ? ' centavo' : ' centavos';
  }

  return value < 0 ? `menos ${result}` : result;
}

/**
 * Convert number to Portuguese words
 */
function numberToWords(num: number): string {
  if (num === 0) return 'zero';

  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    let result = millions === 1 ? 'um milhão' : `${numberToWords(millions)} milhões`;
    if (remainder > 0) {
      result += remainder < 100 ? ' e ' : ' ';
      result += numberToWords(remainder);
    }
    return result;
  }

  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    let result = thousands === 1 ? 'mil' : `${numberToWords(thousands)} mil`;
    if (remainder > 0) {
      result += remainder < 100 ? ' e ' : ' ';
      result += numberToWords(remainder);
    }
    return result;
  }

  if (num >= 100) {
    if (num === 100) return 'cem';
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    let result = hundreds[h];
    if (remainder > 0) {
      result += ' e ' + numberToWords(remainder);
    }
    return result;
  }

  if (num >= 20) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    let result = tens[t];
    if (u > 0) {
      result += ' e ' + units[u];
    }
    return result;
  }

  if (num >= 10) {
    return teens[num - 10];
  }

  return units[num];
}

/**
 * Check if this is the first access of the day (uses centralized service)
 */
export function isFirstAccessToday(): boolean {
  return !wasDailyGreetingSpoken();
}

/**
 * Mark today as greeted (uses centralized service)
 */
export function markGreetedToday(): void {
  markDailyGreetingSpoken();
}

/**
 * Check if a specific tab was already greeted in this session (uses centralized service)
 */
export function wasTabGreeted(tabName: string): boolean {
  return wasTabGreetedSession(tabName);
}

/**
 * Mark a tab as greeted for this session (uses centralized service)
 */
export function markTabGreeted(tabName: string): void {
  markTabGreetedSession(tabName);
}

/**
 * Get time-based greeting
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Speak with ISA - automatically selects ElevenLabs or native voice based on context
 * IMPORTANT: Always stops any current audio before speaking
 * @param text - Text to speak
 * @param pageType - The page type to determine voice engine
 * @param forceNative - Force use of native voice
 */
export async function isaSpeak(
  text: string,
  pageType: string = 'other',
  forceNative: boolean = false
): Promise<void> {
  // Check if voice is enabled
  if (!isVoiceEnabled()) {
    console.log('ISA: Voice is disabled');
    return;
  }

  console.log(`ISA: Attempting to speak on ${pageType}:`, text.substring(0, 50) + '...');

  // CRITICAL: Stop ALL audio/voice before speaking
  stopAllVoice();
  stopAllAudio();

  const usePremiumVoice = !forceNative && PREMIUM_VOICE_PAGES.includes(pageType.toLowerCase());

  try {
    if (usePremiumVoice) {
      console.log('ISA: Using ElevenLabs voice for:', pageType);
      await speakWithElevenLabs(text);
      console.log('ISA: ElevenLabs speech completed for:', pageType);
    } else {
      console.log('ISA: Using native browser voice for:', pageType);
      await speakNative(text);
      console.log('ISA: Native speech completed for:', pageType);
    }
  } catch (error) {
    console.error('ISA voice error:', error);
    // Fallback to native voice if ElevenLabs fails
    if (usePremiumVoice) {
      console.log('ISA: Falling back to native voice');
      try {
        await speakNative(text);
      } catch (fallbackError) {
        console.error('ISA fallback voice error:', fallbackError);
      }
    }
  }
}

/**
 * Stop ISA from speaking - uses centralized voice queue
 */
export function isaStop(): void {
  stopAllVoice();
  stopAllAudio();
}

/**
 * Generate ISA greeting message for first access
 */
export function generateFirstAccessGreeting(userName: string): string {
  const firstName = userName.split(' ')[0];
  const timeGreeting = getTimeGreeting();
  return `${timeGreeting}, ${firstName}! Sou a INOVA, suporte oficial do INOVAFINANCE. Como posso te ajudar hoje?`;
}

/**
 * Generate Dashboard/Home greeting with financial data
 * Focus: Saldo atual, quanto ganhou e quanto gastou neste mês
 */
export function generateHomeGreeting(
  userName: string,
  balance: number,
  monthlyIncome: number,
  monthlyExpenses: number
): string {
  const firstName = userName.split(' ')[0];
  const timeGreeting = getTimeGreeting();

  let message = `${timeGreeting}, ${firstName}! `;
  message += `Saldo: ${currencyToSpeech(balance)}. `;
  
  if (monthlyIncome > 0 || monthlyExpenses > 0) {
    message += `Este mês, ganhou ${currencyToSpeech(monthlyIncome)} e gastou ${currencyToSpeech(monthlyExpenses)}.`;
  }

  return message;
}

/**
 * Generate Planner tab greeting
 * Focus: Pagamentos do mês, dias p/ salário, saldo previsto, maior gasto, economia
 */
export function generatePlannerGreeting(
  monthlyPayments: number,
  daysUntilSalary: number | null,
  predictedBalance: number,
  biggestExpense: { name: string; amount: number } | null,
  savingsAmount: number
): string {
  let message = '';

  if (monthlyPayments > 0) {
    message += `Total de contas: ${currencyToSpeech(monthlyPayments)}. `;
  }

  if (daysUntilSalary !== null && daysUntilSalary > 0) {
    message += `Faltam ${daysUntilSalary} dias para o salário. `;
  } else if (daysUntilSalary === 0) {
    message += 'Hoje é dia de salário. ';
  }

  if (biggestExpense) {
    message += `Maior gasto: ${biggestExpense.name}, ${currencyToSpeech(biggestExpense.amount)}. `;
  }

  if (predictedBalance >= 0) {
    message += `Saldo previsto: ${currencyToSpeech(predictedBalance)}. `;
  }

  if (savingsAmount > 0) {
    message += `Dica: guarde ${currencyToSpeech(savingsAmount)}.`;
  }

  return message;
}

/**
 * Generate Card tab greeting
 * Focus: Limite de crédito, dia da fatura, quantos dias faltam
 */
export function generateCardGreeting(
  creditLimit: number,
  creditUsed: number,
  dueDay: number,
  daysUntilDue: number
): string {
  const available = creditLimit - creditUsed;

  let message = `Limite: ${currencyToSpeech(creditLimit)}. `;
  message += `Disponível: ${currencyToSpeech(available)}. `;
  message += `Fatura vence dia ${dueDay}. `;
  
  if (daysUntilDue === 0) {
    message += 'Vencimento hoje!';
  } else if (daysUntilDue === 1) {
    message += 'Vence amanhã.';
  } else {
    message += `Faltam ${daysUntilDue} dias.`;
  }

  return message;
}

/**
 * Generate Profile/Goals tab greeting
 */
export function generateProfileGreeting(activeGoals: number): string {
  let message = '';

  if (activeGoals > 0) {
    message = `Você tem ${activeGoals} ${activeGoals === 1 ? 'meta ativa' : 'metas ativas'} no seu perfil. `;
  } else {
    message = 'Você ainda não cadastrou metas. ';
  }

  message += 'Acesse a aba planejamento para atualizar suas metas.';

  return message;
}

/**
 * Calculate days until a specific day of the month
 */
export function calculateDaysUntilDay(targetDay: number): number {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let targetDate: Date;

  if (currentDay <= targetDay) {
    // Target is this month
    targetDate = new Date(currentYear, currentMonth, targetDay);
  } else {
    // Target is next month
    targetDate = new Date(currentYear, currentMonth + 1, targetDay);
  }

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
