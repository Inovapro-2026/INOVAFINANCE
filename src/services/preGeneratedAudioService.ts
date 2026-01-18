// Serviço para reproduzir áudios pré-gerados com ElevenLabs
// Usa áudios salvos no Supabase Storage para reduzir custos e latência

import { supabase } from '@/integrations/supabase/client';
import { playAudioExclusively, stopAllAudio, isGlobalAudioPlaying } from './audioManager';
import { AUDIO_MAP, getAudioPath } from '@/data/audioCatalog';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Cache de URLs de áudio
const audioUrlCache = new Map<string, string>();

// Cache de elementos de áudio para reutilização
const audioElementCache = new Map<string, HTMLAudioElement>();

/**
 * Obter URL pública do áudio pré-gerado
 */
export function getPreGeneratedAudioUrl(phraseId: string): string | null {
  // Verificar cache
  if (audioUrlCache.has(phraseId)) {
    return audioUrlCache.get(phraseId)!;
  }

  const path = getAudioPath(phraseId);
  if (!path) return null;

  const url = `${SUPABASE_URL}/storage/v1/object/public/audio-cache/${path}`;
  audioUrlCache.set(phraseId, url);
  return url;
}

/**
 * Reproduzir áudio pré-gerado por ID
 */
export async function playPreGeneratedAudio(phraseId: string): Promise<void> {
  const url = getPreGeneratedAudioUrl(phraseId);
  if (!url) {
    console.warn('Audio não encontrado para:', phraseId);
    return;
  }

  stopAllAudio();

  try {
    // Reutilizar elemento de áudio do cache se existir
    let audio = audioElementCache.get(phraseId);
    
    if (!audio) {
      audio = new Audio(url);
      audio.preload = 'auto';
      audioElementCache.set(phraseId, audio);
    } else {
      audio.currentTime = 0;
    }

    await playAudioExclusively(audio);
  } catch (error) {
    console.error('Erro ao reproduzir áudio pré-gerado:', error);
  }
}

/**
 * Verificar se um áudio pré-gerado existe no storage
 */
export async function checkAudioExists(phraseId: string): Promise<boolean> {
  const path = getAudioPath(phraseId);
  if (!path) return false;

  const { data, error } = await supabase.storage
    .from('audio-cache')
    .list(path.split('/')[0], {
      search: path.split('/')[1],
    });

  if (error) {
    console.error('Erro ao verificar áudio:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Pré-carregar áudios frequentes
 */
export function preloadCommonAudios(phraseIds: string[]): void {
  phraseIds.forEach(id => {
    const url = getPreGeneratedAudioUrl(id);
    if (url) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      audioElementCache.set(id, audio);
    }
  });
}

/**
 * Gerar áudio com ElevenLabs e salvar no storage
 */
export async function generateAndSaveAudio(
  phraseId: string, 
  text: string, 
  category: string
): Promise<string | null> {
  try {
    const fileName = `${category}/${phraseId}.mp3`;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        text,
        saveToStorage: true,
        fileName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao gerar áudio: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.audioUrl) {
      audioUrlCache.set(phraseId, data.audioUrl);
      return data.audioUrl;
    }

    return null;
  } catch (error) {
    console.error('Erro ao gerar e salvar áudio:', error);
    return null;
  }
}

/**
 * Reproduzir áudio ElevenLabs em tempo real (para textos dinâmicos)
 */
export async function speakWithElevenLabsRealtime(text: string): Promise<void> {
  if (!text || text.trim() === '') return;

  stopAllAudio();

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };

    await playAudioExclusively(audio);
  } catch (error) {
    console.error('Erro ElevenLabs TTS:', error);
  }
}

/**
 * Parar qualquer áudio em reprodução
 */
export function stopAudio(): void {
  stopAllAudio();
}

/**
 * Verificar se está reproduzindo áudio
 */
export function isPlaying(): boolean {
  return isGlobalAudioPlaying();
}

// IDs de áudios mais usados para pré-carregar
export const COMMON_AUDIO_IDS = [
  'saudacao_bom_dia',
  'saudacao_boa_tarde', 
  'saudacao_boa_noite',
  'saudacao_intro',
  'feedback_saldo_disponivel',
  'feedback_hoje_gastou',
  'feedback_sem_gastos',
  'notif_sem_pagamento',
  'saudacao_clique_microfone',
];
