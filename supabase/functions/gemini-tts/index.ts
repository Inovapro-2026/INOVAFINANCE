import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Convert PCM to WAV format
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Uint8Array {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Copy PCM data
  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmData, headerSize);
  
  return wavBytes;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json().catch(() => ({ text: "" }));

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    console.log("Gemini 2.5 Flash TTS request for:", text.substring(0, 80));

    // Clean text for TTS
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
      .replace(/\*\*/g, "")
      .replace(/\n+/g, ". ")
      .trim();

    // Use Gemini 2.5 Flash Preview TTS model
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: cleanText }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Kore"
                }
              }
            }
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini TTS API error:", geminiResponse.status, errorText);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const geminiData = await geminiResponse.json();
    
    // Extract audio from Gemini response
    const audioData = geminiData?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (!audioData?.data) {
      console.error("Gemini TTS: no audio data in response", JSON.stringify(geminiData).substring(0, 500));
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Decode base64 audio
    const audioBytes = Uint8Array.from(atob(audioData.data), (c) => c.charCodeAt(0));
    const mimeType = audioData.mimeType || "audio/mp3";

    console.log("Gemini TTS raw audio size:", audioBytes.length, "type:", mimeType);

    // If the audio is PCM (L16), convert to WAV for browser playback
    if (mimeType.includes("L16") || mimeType.includes("pcm")) {
      // Extract sample rate from mimeType if available (e.g., "audio/L16;codec=pcm;rate=24000")
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
      
      console.log("Converting PCM to WAV, sample rate:", sampleRate);
      const wavBytes = pcmToWav(audioBytes, sampleRate);
      console.log("Gemini TTS WAV success, size:", wavBytes.length);

      return new Response(new Uint8Array(wavBytes).buffer as ArrayBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/wav",
        },
      });
    }

    // Return audio as-is for other formats (mp3, etc.)
    console.log("Gemini TTS success, audio size:", audioBytes.length, "type:", mimeType);

    return new Response(audioBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": mimeType,
      },
    });
  } catch (error) {
    console.error("gemini-tts unexpected error:", error);
    return new Response(null, { status: 204, headers: corsHeaders });
  }
});
