/**
 * Voice Queue Service - Centralized voice management for INOVAFINANCE
 * 
 * RULES:
 * ❌ Nunca permitir duas vozes simultâneas
 * ✅ Sempre executar speechSynthesis.cancel() antes de qualquer nova fala
 * ✅ Usar fila de reprodução de voz (speech queue)
 * ✅ Cada áudio deve terminar antes do próximo iniciar
 * ✅ Falas curtas (máx. 2 frases)
 * ✅ Volume baixo e fala natural para economia de tokens
 */

import { stopAllAudio, isAudioPlaying } from './audioManager';

// Storage keys for voice flags
const INTRO_PLAYED_KEY = 'inovafinance_intro_played';
const LOGIN_AUDIO_SESSION_KEY = 'inovafinance_login_audio_session';
const TAB_GREETED_SESSION_KEY = 'inovafinance_tab_greeted';
const DAILY_GREETING_KEY = 'inovafinance_daily_greeting';

// Voice queue
let voiceQueue: Array<{
  text: string;
  priority: number;
  callback?: () => void;
}> = [];
let isProcessingQueue = false;

// Default voice settings for economy
export const VOICE_SETTINGS = {
  volume: 0.7,
  rate: 0.95,
  pitch: 1.0
};

/**
 * Check if intro was already played on this device
 */
export function wasIntroPlayed(): boolean {
  return localStorage.getItem(INTRO_PLAYED_KEY) === 'true';
}

/**
 * Mark intro as played on this device
 */
export function markIntroPlayed(): void {
  localStorage.setItem(INTRO_PLAYED_KEY, 'true');
  console.log('[VoiceQueue] Intro marked as played');
}

/**
 * Check if login audio was already played this session
 */
export function wasLoginAudioPlayed(): boolean {
  return sessionStorage.getItem(LOGIN_AUDIO_SESSION_KEY) === 'true';
}

/**
 * Mark login audio as played for this session
 */
export function markLoginAudioPlayed(): void {
  sessionStorage.setItem(LOGIN_AUDIO_SESSION_KEY, 'true');
  console.log('[VoiceQueue] Login audio marked as played');
}

/**
 * Check if a specific tab was already greeted this session
 */
export function wasTabGreetedSession(tabName: string): boolean {
  const greeted = sessionStorage.getItem(TAB_GREETED_SESSION_KEY);
  if (!greeted) return false;
  try {
    const tabs = JSON.parse(greeted) as string[];
    return tabs.includes(tabName);
  } catch {
    return false;
  }
}

/**
 * Mark a tab as greeted for this session
 */
export function markTabGreetedSession(tabName: string): void {
  const greeted = sessionStorage.getItem(TAB_GREETED_SESSION_KEY);
  let tabs: string[] = [];
  try {
    tabs = greeted ? JSON.parse(greeted) : [];
  } catch {
    tabs = [];
  }
  if (!tabs.includes(tabName)) {
    tabs.push(tabName);
    sessionStorage.setItem(TAB_GREETED_SESSION_KEY, JSON.stringify(tabs));
    console.log(`[VoiceQueue] Tab ${tabName} marked as greeted`);
  }
}

/**
 * Clear all tab greetings (used when voice is re-enabled)
 */
export function clearTabGreetings(): void {
  sessionStorage.removeItem(TAB_GREETED_SESSION_KEY);
  console.log('[VoiceQueue] Tab greetings cleared');
}

/**
 * Check if today's greeting was already spoken
 */
export function wasDailyGreetingSpoken(): boolean {
  const lastGreeting = localStorage.getItem(DAILY_GREETING_KEY);
  const today = new Date().toDateString();
  return lastGreeting === today;
}

/**
 * Mark daily greeting as spoken
 */
export function markDailyGreetingSpoken(): void {
  const today = new Date().toDateString();
  localStorage.setItem(DAILY_GREETING_KEY, today);
  console.log('[VoiceQueue] Daily greeting marked as spoken');
}

/**
 * Stop all audio immediately and clear the queue
 */
export function stopAllVoice(): void {
  // Stop any current audio
  stopAllAudio();
  
  // Cancel any speech synthesis
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  
  // Clear the queue
  voiceQueue = [];
  isProcessingQueue = false;
  
  console.log('[VoiceQueue] All voice stopped and queue cleared');
}

/**
 * Add text to the voice queue
 */
export function queueVoice(
  text: string, 
  priority: number = 0,
  callback?: () => void
): void {
  voiceQueue.push({ text, priority, callback });
  voiceQueue.sort((a, b) => b.priority - a.priority);
  console.log(`[VoiceQueue] Added to queue (priority ${priority}): ${text.substring(0, 50)}...`);
  
  if (!isProcessingQueue) {
    processQueue();
  }
}

/**
 * Process the voice queue
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue || voiceQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (voiceQueue.length > 0) {
    const item = voiceQueue.shift();
    if (!item) continue;
    
    // Wait for any current audio to finish
    while (isAudioPlaying()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Small pause between messages
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Speak the text
    await speakImmediate(item.text);
    
    // Execute callback if provided
    if (item.callback) {
      item.callback();
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Speak text immediately using native speech synthesis
 * This is the low-level function that actually produces sound
 */
function speakImmediate(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.warn('[VoiceQueue] Speech synthesis not supported');
      resolve();
      return;
    }
    
    // Always cancel before speaking
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.volume = VOICE_SETTINGS.volume;
    utterance.rate = VOICE_SETTINGS.rate;
    utterance.pitch = VOICE_SETTINGS.pitch;
    
    // Try to get a Brazilian Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => 
      v.lang.includes('pt-BR') || v.lang.includes('pt_BR')
    );
    if (ptVoice) {
      utterance.voice = ptVoice;
    }
    
    utterance.onend = () => {
      console.log(`[VoiceQueue] Finished speaking: ${text.substring(0, 30)}...`);
      resolve();
    };
    
    utterance.onerror = (e) => {
      console.error('[VoiceQueue] Speech error:', e);
      resolve();
    };
    
    window.speechSynthesis.speak(utterance);
    console.log(`[VoiceQueue] Speaking: ${text.substring(0, 50)}...`);
  });
}

/**
 * Speak text with exclusive control - stops everything else first
 */
export async function speakExclusive(text: string): Promise<void> {
  // Stop everything first
  stopAllVoice();
  
  // Small delay to ensure cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Speak immediately
  await speakImmediate(text);
}

/**
 * Check if any voice is currently playing
 */
export function isVoicePlaying(): boolean {
  return isAudioPlaying() || 
         (window.speechSynthesis && window.speechSynthesis.speaking) ||
         isProcessingQueue;
}

/**
 * Reset intro flag (for testing purposes only)
 */
export function resetIntroFlag(): void {
  localStorage.removeItem(INTRO_PLAYED_KEY);
  console.log('[VoiceQueue] Intro flag reset');
}
