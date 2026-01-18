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
  const previousPageType = useRef<string | null>(null);

  const speakGreeting = useCallback(async () => {
    // Check global voice setting
    if (!isVoiceEnabled()) {
      console.log('[IsaGreeting] Voice is globally disabled');
      return;
    }

    if (!enabled || !userId || isProcessing.current) return;
    
    // Reset hasSpoken when page type changes
    if (previousPageType.current !== pageType) {
      hasSpoken.current = false;
      previousPageType.current = pageType;
    }

    if (hasSpoken.current) return;

    // Check if this tab was already greeted in this session
    if (wasTabGreeted(pageType)) {
      console.log(`[IsaGreeting] Tab ${pageType} already greeted this session`);
      hasSpoken.current = true;
      return;
    }

    // Wait if any voice is currently playing
    if (isVoicePlaying()) {
      console.log(`[IsaGreeting] Another voice is playing, waiting...`);
      return;
    }
    
    console.log(`[IsaGreeting] Starting greeting for ${pageType}`);

    isProcessing.current = true;


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

          // Find biggest expense
          const biggestPayment = scheduledPayments
            .filter(p => p.isActive)
            .sort((a, b) => b.amount - a.amount)[0];
          const biggestExpense = biggestPayment 
            ? { name: biggestPayment.name, amount: biggestPayment.amount }
            : null;

          const daysUntilSalary = salaryInfo?.salaryDay
            ? calculateDaysUntilDay(salaryInfo.salaryDay)
            : null;

          // Calculate predicted balance (simplified)
          const totalIncome = (salaryInfo?.salaryAmount || 0) + (salaryInfo?.advanceAmount || 0);
          const predictedBalance = totalIncome - monthlyPayments;
          
          // Savings suggestion (10% of predicted balance if positive)
          const savingsAmount = predictedBalance > 0 ? Math.floor(predictedBalance * 0.1) : 0;

          message = generatePlannerGreeting(
            monthlyPayments,
            daysUntilSalary,
            predictedBalance,
            biggestExpense,
            savingsAmount
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
        await isaSpeak(message, pageType);
        markTabGreeted(pageType);
        hasSpoken.current = true;
      }
    } catch (error) {
      console.error('[IsaGreeting] Page greeting error:', error);
    }
  };

  useEffect(() => {
    // Delay to ensure page is loaded and no other audio is playing
    const timer = setTimeout(() => {
      speakGreeting();
    }, 800);

    return () => clearTimeout(timer);
  }, [speakGreeting]);

  return {
    speakGreeting,
    speakCustomMessage: async (message: string) => {
      await isaSpeak(message, pageType);
    }
  };
}
