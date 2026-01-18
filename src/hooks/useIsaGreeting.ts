// INOVA Greeting Hook - Manages voice greetings for each page
// RULES:
// - Each tab has ONE specific voice that plays ONCE per session
// - No overlapping voices
// - Short messages only (max 2 sentences)

import { useEffect, useRef, useCallback } from 'react';
import {
  isaSpeak,
  isFirstAccessToday,
  markGreetedToday,
  wasTabGreeted,
  markTabGreeted,
  generateFirstAccessGreeting,
  generateHomeGreeting,
  generatePlannerGreeting,
  generateCardGreeting,
  generateProfileGreeting,
  calculateDaysUntilDay,
  isVoiceEnabled
} from '@/services/isaVoiceService';
import { stopAllVoice, isVoicePlaying } from '@/services/voiceQueueService';
import { calculateBalance, getTransactions, getGoals } from '@/lib/db';
import {
  getScheduledPayments,
  getUserSalaryInfo,
  calculateMonthlySummary
} from '@/lib/plannerDb';

export type PageType = 'dashboard' | 'planner' | 'card' | 'goals' | 'ai' | 'other';

interface UseIsaGreetingOptions {
  pageType: PageType;
  userId: number;
  userName: string;
  initialBalance: number;
  enabled?: boolean;
  creditLimit?: number;
  creditUsed?: number;
  creditDueDay?: number;
}

export function useIsaGreeting({
  pageType,
  userId,
  userName,
  initialBalance,
  enabled = true,
  creditLimit = 0,
  creditUsed = 0,
  creditDueDay = 5
}: UseIsaGreetingOptions) {
  const hasSpoken = useRef(false);
  const isProcessing = useRef(false);

  // Reset hasSpoken when component mounts (new page)
  useEffect(() => {
    hasSpoken.current = false;
    isProcessing.current = false;
    console.log(`[IsaGreeting] Mounted for ${pageType}, resetting state`);
  }, [pageType]);

  const speakGreeting = useCallback(async () => {
    // Check global voice setting
    if (!isVoiceEnabled()) {
      console.log('[IsaGreeting] Voice is globally disabled');
      return;
    }

    if (!enabled || !userId) {
      console.log('[IsaGreeting] Not enabled or no userId');
      return;
    }
    
    if (isProcessing.current) {
      console.log('[IsaGreeting] Already processing');
      return;
    }

    if (hasSpoken.current) {
      console.log('[IsaGreeting] Already spoken on this page');
      return;
    }

    // Wait if any voice is currently playing
    if (isVoicePlaying()) {
      console.log(`[IsaGreeting] Another voice is playing, waiting...`);
      return;
    }
    
    console.log(`[IsaGreeting] Starting greeting for ${pageType}`);
    isProcessing.current = true;

    try {
      const isFirstAccess = isFirstAccessToday();

      // For first access of the day, give special greeting (only on dashboard)
      if (isFirstAccess && pageType === 'dashboard') {
        const greeting = generateFirstAccessGreeting(userName);
        await isaSpeak(greeting, pageType);
        markGreetedToday();
        markTabGreeted(pageType);
        hasSpoken.current = true;

        // After first greeting, continue with financial info
        await speakPageSpecificGreeting();
      } else {
        // Normal page-specific greeting
        await speakPageSpecificGreeting();
      }
    } catch (error) {
      console.error('[IsaGreeting] Error:', error);
    } finally {
      isProcessing.current = false;
    }
  }, [pageType, userId, userName, enabled, initialBalance, creditLimit, creditUsed, creditDueDay]);

  const speakPageSpecificGreeting = async () => {
    // Stop any playing audio before starting
    stopAllVoice();
    
    try {
      let message = '';

      switch (pageType) {
        case 'dashboard': {
          const [balanceData, transactions, salaryInfo] = await Promise.all([
            calculateBalance(userId, initialBalance),
            getTransactions(userId),
            getUserSalaryInfo(userId)
          ]);

          // Calculate monthly income and expenses
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          
          const monthlyTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
          });
          
          const monthlyIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
          
          const monthlyExpenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

          message = generateHomeGreeting(
            userName,
            initialBalance,
            monthlyIncome,
            monthlyExpenses
          );
          break;
        }

        case 'planner': {
          const [salaryInfo, scheduledPayments] = await Promise.all([
            getUserSalaryInfo(userId),
            getScheduledPayments(userId)
          ]);

          // Calculate monthly payments total
          const monthlyPayments = scheduledPayments
            .filter(p => p.isActive)
            .reduce((sum, p) => sum + p.amount, 0);

          // Find biggest expense (by category or name)
          const biggestPayment = scheduledPayments
            .filter(p => p.isActive)
            .sort((a, b) => b.amount - a.amount)[0];
          const biggestExpense = biggestPayment 
            ? { name: biggestPayment.category || biggestPayment.name, amount: biggestPayment.amount }
            : null;

          // Salary info
          const salaryAmount = salaryInfo?.salaryAmount || 0;
          const salaryDay = salaryInfo?.salaryDay || 5;
          const daysUntilSalary = salaryInfo?.salaryDay
            ? calculateDaysUntilDay(salaryInfo.salaryDay)
            : 0;

          // Calculate predicted balance
          const totalIncome = salaryAmount + (salaryInfo?.advanceAmount || 0);
          const predictedBalance = totalIncome - monthlyPayments;

          message = generatePlannerGreeting(
            salaryAmount,
            salaryDay,
            daysUntilSalary,
            monthlyPayments,
            predictedBalance,
            biggestExpense
          );
          break;
        }

        case 'card': {
          const dueDay = creditDueDay;
          const today = new Date();
          let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
          if (today.getDate() > dueDay) {
            dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
          }
          const diffTime = dueDate.getTime() - today.getTime();
          const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          message = generateCardGreeting(creditLimit, creditUsed, dueDay, daysUntilDue);
          break;
        }

        case 'goals': {
          const goals = await getGoals(userId);
          message = generateProfileGreeting(goals.length);
          break;
        }

        default:
          return; // Don't speak on other pages
      }

      if (message) {
        console.log(`[IsaGreeting] Speaking for ${pageType}:`, message.substring(0, 50) + '...');
        await isaSpeak(message, pageType);
        hasSpoken.current = true;
      }
    } catch (error) {
      console.error('[IsaGreeting] Page greeting error:', error);
    }
  };

  useEffect(() => {
    // Delay to ensure page is loaded and data is available
    console.log(`[IsaGreeting] Effect triggered for ${pageType}, waiting 1.5s...`);
    const timer = setTimeout(() => {
      console.log(`[IsaGreeting] Timer fired, calling speakGreeting for ${pageType}`);
      speakGreeting();
    }, 1500);

    return () => {
      clearTimeout(timer);
      console.log(`[IsaGreeting] Cleanup for ${pageType}`);
    };
  }, [pageType, userId, enabled]);

  return {
    speakGreeting,
    speakCustomMessage: async (message: string) => {
      await isaSpeak(message, pageType);
    }
  };
}
