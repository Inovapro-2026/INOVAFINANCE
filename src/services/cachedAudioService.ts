// Cached Audio Service - Pre-downloads common phrases to save API tokens
// Uses IndexedDB for persistent storage

import { playAudioExclusively, stopAllAudio } from './audioManager';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Database name and store
const DB_NAME = 'inova-audio-cache';
const STORE_NAME = 'audio-phrases';
const DB_VERSION = 1;

// Common phrases to pre-download
export const COMMON_PHRASES = {
  // Greetings
  'bom_dia': 'Bom dia!',
  'boa_tarde': 'Boa tarde!',
  'boa_noite': 'Boa noite!',
  
  // Confirmations
  'rotina_adicionada': 'Rotina adicionada.',
  'lembrete_salvo': 'Lembrete salvo.',
  'agenda_criada': 'Agenda criada com sucesso.',
  'ok_formulario': 'Ok, complete os detalhes no formulário.',
  
  // Status
  'sem_rotinas_hoje': 'Você não tem rotinas para hoje.',
  'sem_lembretes_hoje': 'Você não tem lembretes para hoje.',
  'sem_lembretes_amanha': 'Você não tem lembretes para amanhã.',
  'todas_rotinas_completas': 'Parabéns! Você completou todas as rotinas de hoje!',
  'nenhum_item_manha': 'Você não tem nada agendado para a manhã.',
  'nenhum_item_tarde': 'Você não tem nada agendado para a tarde.',
  
  // Errors
  'erro_processar': 'Ocorreu um erro ao processar.',
  'so_agenda_rotinas': 'Posso te ajudar apenas com agenda e rotinas.',
  'diga_comando': 'Diga me lembre de ou agendar para criar lembretes e rotinas.',
  
  // Actions
  'microfone_ativado': 'Microfone ativado.',
  'ouvindo': 'Estou ouvindo.',
  'processando': 'Processando.',
} as const;

type PhraseKey = keyof typeof COMMON_PHRASES;

// IndexedDB operations
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

async function getCachedAudio(key: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.audioBlob : null);
      };
    });
  } catch (error) {
    console.error('Error getting cached audio:', error);
    return null;
  }
}

async function setCachedAudio(key: string, audioBlob: Blob): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, audioBlob, timestamp: Date.now() });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Error setting cached audio:', error);
  }
}

// Generate audio for a phrase using ElevenLabs
async function generateAudio(text: string): Promise<Blob | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.error('Failed to generate audio:', response.status);
      return null;
    }

    return await response.blob();
  } catch (error) {
    console.error('Error generating audio:', error);
    return null;
  }
}

// Play a cached phrase or generate it
export async function playCachedPhrase(phraseKey: PhraseKey): Promise<boolean> {
  const text = COMMON_PHRASES[phraseKey];
  if (!text) {
    console.error('Unknown phrase key:', phraseKey);
    return false;
  }

  try {
    // Check cache first
    let audioBlob = await getCachedAudio(phraseKey);
    
    if (!audioBlob) {
      console.log('Generating audio for:', phraseKey);
      audioBlob = await generateAudio(text);
      
      if (audioBlob) {
        // Cache for next time
        await setCachedAudio(phraseKey, audioBlob);
      }
    } else {
      console.log('Using cached audio for:', phraseKey);
    }

    if (!audioBlob) {
      return false;
    }

    // Play the audio
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    audio.onerror = () => URL.revokeObjectURL(audioUrl);
    
    await playAudioExclusively(audio);
    return true;
  } catch (error) {
    console.error('Error playing cached phrase:', error);
    return false;
  }
}

// Pre-download all common phrases in background
export async function preloadCommonPhrases(): Promise<void> {
  console.log('Starting to preload common phrases...');
  
  const keys = Object.keys(COMMON_PHRASES) as PhraseKey[];
  let downloaded = 0;
  let cached = 0;

  for (const key of keys) {
    // Check if already cached
    const existing = await getCachedAudio(key);
    if (existing) {
      cached++;
      continue;
    }

    // Generate and cache
    const text = COMMON_PHRASES[key];
    const audioBlob = await generateAudio(text);
    
    if (audioBlob) {
      await setCachedAudio(key, audioBlob);
      downloaded++;
      console.log(`Cached phrase: ${key}`);
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`Preload complete: ${downloaded} downloaded, ${cached} already cached`);
}

// Check if a phrase is cached
export async function isPhraseCached(phraseKey: PhraseKey): Promise<boolean> {
  const cached = await getCachedAudio(phraseKey);
  return cached !== null;
}

// Get cache statistics
export async function getCacheStats(): Promise<{ total: number; cached: number }> {
  const keys = Object.keys(COMMON_PHRASES) as PhraseKey[];
  let cachedCount = 0;

  for (const key of keys) {
    const cached = await getCachedAudio(key);
    if (cached) cachedCount++;
  }

  return {
    total: keys.length,
    cached: cachedCount,
  };
}

// Clear all cached audio
export async function clearAudioCache(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Audio cache cleared');
        resolve();
      };
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}
