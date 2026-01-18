import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brazilian Portuguese female voice from ElevenLabs
// Using "Jessica" voice - natural Brazilian Portuguese female
const BRAZILIAN_FEMALE_VOICE_ID = "cgSgspJ2msm6clMCkdW9";

// API key rotation - uses 5 keys and rotates when one fails
const API_KEYS = [
  Deno.env.get('ELEVENLABS_API_KEY_1'),
  Deno.env.get('ELEVENLABS_API_KEY_2'),
  Deno.env.get('ELEVENLABS_API_KEY_3'),
  Deno.env.get('ELEVENLABS_API_KEY_4'),
  Deno.env.get('ELEVENLABS_API_KEY_5'),
].filter(Boolean) as string[];

// Track which key to use next (in-memory, resets on function restart)
let currentKeyIndex = 0;

function getNextApiKey(): string | null {
  if (API_KEYS.length === 0) return null;
  
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}

async function tryGenerateWithKey(apiKey: string, cleanText: string): Promise<Response | null> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${BRAZILIAN_FEMALE_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.4,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    // If quota exceeded or unauthorized, return null to try next key
    if (response.status === 401 || response.status === 429) {
      console.log('ElevenLabs: API key exhausted or unauthorized, trying next...');
      return null;
    }

    return response;
  } catch (error) {
    console.error('ElevenLabs: Error with key:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, saveToStorage, fileName } = await req.json();

    if (!text || text.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (API_KEYS.length === 0) {
      console.error('ELEVENLABS_API_KEY not configured (checked keys 1-5)');
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean text
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      .replace(/\*\*/g, '')
      .replace(/💸|💰|📊|📈|📉|📅|📌|🏆|😤|😒|🤡|😱|😭|🔥|💀|🎉|🙏|💪|💵|🚨|😐|💔|😩|🌪️|☕|🍕|🏥|🚲|🌉|😰|🎊|💳|🙄|👀|✍️|🤔|😅/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) {
      return new Response(
        JSON.stringify({ error: 'No valid text after cleaning' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('ElevenLabs TTS Request:', cleanText.substring(0, 100) + '...');
    console.log(`Available API keys: ${API_KEYS.length}, starting with index: ${currentKeyIndex}`);

    // Try each API key until one works
    let response: Response | null = null;
    let triedKeys = 0;
    const startIndex = currentKeyIndex;

    while (triedKeys < API_KEYS.length) {
      const apiKey = getNextApiKey();
      if (!apiKey) break;

      console.log(`Trying API key ${(startIndex + triedKeys) % API_KEYS.length + 1}...`);
      response = await tryGenerateWithKey(apiKey, cleanText);
      
      if (response && response.ok) {
        console.log(`Success with API key ${(startIndex + triedKeys) % API_KEYS.length + 1}`);
        break;
      }
      
      triedKeys++;
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'All API keys exhausted';
      console.error('ElevenLabs API error:', errorText);

      // IMPORTANT: Avoid returning 500 here because the client treats it as a hard runtime error.
      // Returning 204 allows the frontend to gracefully fallback to Gemini/native voice.
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('ElevenLabs TTS Success - audio size:', audioBuffer.byteLength);

    // If saveToStorage is requested, save to Supabase Storage
    if (saveToStorage && fileName) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-cache')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from('audio-cache')
          .getPublicUrl(fileName);

        console.log('Audio saved to storage:', urlData.publicUrl);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            audioUrl: urlData.publicUrl,
            fileName: fileName 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return audio as binary for immediate playback
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
