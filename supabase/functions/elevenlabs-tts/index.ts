import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brazilian Portuguese female voice from ElevenLabs
// Using "Camila" voice - natural Brazilian Portuguese female
const BRAZILIAN_FEMALE_VOICE_ID = "cgSgspJ2msm6clMCkdW9"; // Jessica - good for Brazilian Portuguese

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

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
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

    // Call ElevenLabs API with Brazilian Portuguese female voice
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${BRAZILIAN_FEMALE_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2', // Best for Portuguese
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate speech', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
