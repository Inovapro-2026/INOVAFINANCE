import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPTRANS_API_TOKEN = Deno.env.get('SPTRANS_API_TOKEN');
const SPTRANS_BASE_URL = 'https://api.olhovivo.sptrans.com.br/v2.1';

// Store session cookies globally (per request context)
let sessionCookies: string[] = [];

interface SPTransRequest {
  action: 'authenticate' | 'buscar-linhas' | 'buscar-paradas' | 'paradas-proximas' | 'previsao-parada' | 'previsao-linha' | 'posicao-veiculos';
  termo?: string;
  codigoLinha?: number;
  codigoParada?: number;
  lat?: number;
  lng?: number;
  raio?: number;
}

async function authenticate(): Promise<boolean> {
  if (!SPTRANS_API_TOKEN) {
    console.error('SPTRANS_API_TOKEN is missing');
    throw new Error('Token SPTrans não configurado (SPTRANS_API_TOKEN)');
  }

  const token = SPTRANS_API_TOKEN.trim();
  console.log('Authenticating with SPTrans API... token length:', token.length);

  const url = `${SPTRANS_BASE_URL}/Login/Autenticar?token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: 'POST',
    // SPTrans login uses querystring token + cookie session; body is empty.
    headers: {
      // Some deployments are picky with headers in server-to-server calls.
      'Accept': '*/*',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Content-Length': '0',
      'User-Agent': 'Mozilla/5.0 (compatible; LovableEdge/1.0)',
    },
  });

  // Capture session cookies (Deno provides getSetCookie; fallback to raw header)
  const setCookieHeaders = (response.headers as any).getSetCookie?.() as string[] | undefined;
  const rawSetCookie = response.headers.get('set-cookie');

  const cookies = (setCookieHeaders && setCookieHeaders.length > 0)
    ? setCookieHeaders
    : (rawSetCookie ? [rawSetCookie] : []);

  if (cookies.length > 0) {
    sessionCookies = cookies
      .flatMap((h) => h.split(/,(?=[^;]+?=)/g))
      .map((cookie) => cookie.split(';')[0].trim())
      .filter(Boolean);
    console.log('Session cookies captured:', sessionCookies.length, sessionCookies);
  } else {
    console.warn('No Set-Cookie header returned from SPTrans login');
  }

  const bodyText = (await response.text()).trim();
  console.log('Authentication status:', response.status, 'body:', bodyText);

  // According to SPTrans docs, the response is boolean true/false.
  // If this returns false consistently, the token is invalid/not activated in DevPlace.
  return response.ok && bodyText.toLowerCase() === 'true';
}

function getCookieHeader(): string {
  return sessionCookies.join('; ');
}

async function makeAuthenticatedRequest(endpoint: string): Promise<any> {
  // Always authenticate first (SPTrans cookie-based session)
  const isAuthenticated = await authenticate();

  if (!isAuthenticated) {
    console.error('Failed to authenticate with SPTrans');
    throw new Error('Falha na autenticação com a API SPTrans');
  }

  const url = `${SPTRANS_BASE_URL}${endpoint}`;
  console.log('Making authenticated request to:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Cookie': getCookieHeader(),
    },
  });

  if (!response.ok) {
    const errText = (await response.text()).slice(0, 500);
    console.error('SPTrans API error:', response.status, response.statusText, errText);
    throw new Error(`Erro na API SPTrans: ${response.status}`);
  }

  const data = await response.json();
  console.log('SPTrans response received, data length:', JSON.stringify(data).length);

  return data;
}

// Buscar linhas por termo (número ou nome)
async function buscarLinhas(termo: string) {
  const data = await makeAuthenticatedRequest(`/Linha/Buscar?termosBusca=${encodeURIComponent(termo)}`);
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Map response to a cleaner format
  return data.map((linha: any) => ({
    codigoLinha: linha.cl,
    circular: linha.lc,
    letreiro: `${linha.lt}-${linha.tl}`,
    sentido: linha.sl === 1 ? 'Terminal Principal' : 'Terminal Secundário',
    sentidoCodigo: linha.sl,
    tipo: linha.tp,
    terminalPrincipal: linha.tp,
    terminalSecundario: linha.ts,
  }));
}

// Buscar paradas por termo
async function buscarParadas(termo: string) {
  const data = await makeAuthenticatedRequest(`/Parada/Buscar?termosBusca=${encodeURIComponent(termo)}`);
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map((parada: any) => ({
    codigoParada: parada.cp,
    nome: parada.np,
    endereco: parada.ed,
    latitude: parada.py,
    longitude: parada.px,
  }));
}

// Buscar paradas próximas por coordenadas
async function buscarParadasProximas(lat: number, lng: number, raio: number = 500) {
  // SPTrans doesn't have a direct "nearby stops" endpoint
  // We need to use Buscar with coordinates or search by line stops
  // For now, we'll search stops and filter by distance client-side
  // Or use the Parada/BuscarParadasPorLinha endpoint after getting lines
  
  // Alternative: Use the Posicao endpoint to get all bus positions and infer stops
  // For a robust solution, we'll search for common São Paulo stops
  const data = await makeAuthenticatedRequest(`/Parada/Buscar?termosBusca=*`);
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Filter by distance (Haversine formula)
  const paradasProximas = data
    .map((parada: any) => {
      const distance = calculateDistance(lat, lng, parada.py, parada.px);
      return {
        codigoParada: parada.cp,
        nome: parada.np,
        endereco: parada.ed,
        latitude: parada.py,
        longitude: parada.px,
        distancia: Math.round(distance),
      };
    })
    .filter((p: any) => p.distancia <= raio)
    .sort((a: any, b: any) => a.distancia - b.distancia)
    .slice(0, 20);
  
  return paradasProximas;
}

// Buscar paradas de uma linha específica
async function buscarParadasPorLinha(codigoLinha: number) {
  const data = await makeAuthenticatedRequest(`/Parada/BuscarParadasPorLinha?codigoLinha=${codigoLinha}`);
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map((parada: any) => ({
    codigoParada: parada.cp,
    nome: parada.np,
    endereco: parada.ed,
    latitude: parada.py,
    longitude: parada.px,
  }));
}

// Previsão de chegada em uma parada
async function getPrevisaoParada(codigoParada: number) {
  const data = await makeAuthenticatedRequest(`/Previsao/Parada?codigoParada=${codigoParada}`);
  
  if (!data || !data.p) {
    return { parada: null, linhas: [] };
  }
  
  const parada = data.p;
  const linhas = (parada.l || []).map((linha: any) => ({
    codigoLinha: linha.cl,
    letreiro: `${linha.lt}-${linha.sl === 1 ? 'TP' : 'TS'}`,
    sentido: linha.sl === 1 ? 'Terminal Principal' : 'Terminal Secundário',
    destino: linha.sl === 1 ? linha.tp : linha.ts,
    veiculos: (linha.vs || []).map((v: any) => ({
      prefixo: v.p,
      acessivel: v.a,
      previsaoMinutos: Math.max(0, Math.round((new Date(v.t).getTime() - Date.now()) / 60000)),
      previsaoHorario: v.t,
      latitude: v.py,
      longitude: v.px,
    })).sort((a: any, b: any) => a.previsaoMinutos - b.previsaoMinutos),
  }));
  
  return {
    parada: {
      codigoParada: parada.cp,
      nome: parada.np,
      latitude: parada.py,
      longitude: parada.px,
    },
    linhas,
  };
}

// Previsão de chegada por linha
async function getPrevisaoLinha(codigoParada: number, codigoLinha: number) {
  const data = await makeAuthenticatedRequest(`/Previsao/Linha?codigoParada=${codigoParada}&codigoLinha=${codigoLinha}`);
  
  if (!data || !data.p) {
    return { parada: null, veiculos: [] };
  }
  
  const parada = data.p;
  const linha = parada.l?.[0];
  
  if (!linha) {
    return { 
      parada: {
        codigoParada: parada.cp,
        nome: parada.np,
      },
      veiculos: [] 
    };
  }
  
  return {
    parada: {
      codigoParada: parada.cp,
      nome: parada.np,
    },
    linha: {
      codigoLinha: linha.cl,
      letreiro: `${linha.lt}-${linha.sl === 1 ? 'TP' : 'TS'}`,
      destino: linha.sl === 1 ? linha.tp : linha.ts,
    },
    veiculos: (linha.vs || []).map((v: any) => ({
      prefixo: v.p,
      acessivel: v.a,
      previsaoMinutos: Math.max(0, Math.round((new Date(v.t).getTime() - Date.now()) / 60000)),
      previsaoHorario: v.t,
      latitude: v.py,
      longitude: v.px,
    })).sort((a: any, b: any) => a.previsaoMinutos - b.previsaoMinutos),
  };
}

// Posição dos veículos de uma linha
async function getPosicaoVeiculos(codigoLinha: number) {
  const data = await makeAuthenticatedRequest(`/Posicao/Linha?codigoLinha=${codigoLinha}`);
  
  if (!data || !data.vs) {
    return [];
  }
  
  return data.vs.map((v: any) => ({
    prefixo: v.p,
    acessivel: v.a,
    latitude: v.py,
    longitude: v.px,
    horarioAtualizacao: v.ta,
  }));
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Generate smart alert message based on prediction
function generateSmartAlert(
  previsaoMinutos: number, 
  tempoAtePonto: number, 
  horarioTrabalho: string,
  nomeUsuario: string = 'usuário'
): { 
  status: 'early' | 'onTime' | 'hurry' | 'late' | 'waiting';
  message: string;
  recommendation: string;
  shouldLeaveNow: boolean;
} {
  const now = new Date();
  const [horaTrabalho, minTrabalho] = horarioTrabalho.split(':').map(Number);
  const trabalhoHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate(), horaTrabalho, minTrabalho);
  
  const tempoTotal = previsaoMinutos + tempoAtePonto;
  const margemSeguranca = 5; // 5 minutos de margem
  
  // If no bus prediction available
  if (previsaoMinutos < 0 || previsaoMinutos > 60) {
    return {
      status: 'waiting',
      message: 'Aguardando informações do ônibus...',
      recommendation: 'Verifique novamente em alguns minutos.',
      shouldLeaveNow: false,
    };
  }
  
  // Calculate ideal departure
  if (previsaoMinutos <= tempoAtePonto) {
    // Bus arriving before user can reach stop
    return {
      status: 'late',
      message: `🚌 O ônibus chega em ${previsaoMinutos} minuto${previsaoMinutos !== 1 ? 's' : ''}.`,
      recommendation: `${nomeUsuario}, você precisa de ${tempoAtePonto} minutos até o ponto. Aguarde o próximo ônibus.`,
      shouldLeaveNow: false,
    };
  }
  
  const tempoRestante = previsaoMinutos - tempoAtePonto;
  
  if (tempoRestante <= 2) {
    return {
      status: 'hurry',
      message: `⚡ Ônibus chegando em ${previsaoMinutos} minutos!`,
      recommendation: `${nomeUsuario}, saia AGORA! Você tem apenas ${tempoRestante} minuto${tempoRestante !== 1 ? 's' : ''} de margem.`,
      shouldLeaveNow: true,
    };
  }
  
  if (tempoRestante <= 5) {
    return {
      status: 'onTime',
      message: `✅ Ônibus chegando em ${previsaoMinutos} minutos.`,
      recommendation: `${nomeUsuario}, hora de sair! Você chegará com ${tempoRestante} minutos de folga.`,
      shouldLeaveNow: true,
    };
  }
  
  return {
    status: 'early',
    message: `🕐 Próximo ônibus em ${previsaoMinutos} minutos.`,
    recommendation: `${nomeUsuario}, você pode sair em ${tempoRestante - margemSeguranca} minutos.`,
    shouldLeaveNow: false,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body: SPTransRequest = await req.json();
    console.log('SPTrans API request:', body.action, body);
    
    let result: any;
    
    switch (body.action) {
      case 'authenticate':
        const isAuth = await authenticate();
        result = { success: isAuth, authenticated: isAuth };
        break;
        
      case 'buscar-linhas':
        if (!body.termo) {
          throw new Error('Termo de busca é obrigatório');
        }
        const linhas = await buscarLinhas(body.termo);
        result = { success: true, linhas };
        break;
        
      case 'buscar-paradas':
        if (!body.termo) {
          throw new Error('Termo de busca é obrigatório');
        }
        const paradas = await buscarParadas(body.termo);
        result = { success: true, paradas };
        break;
        
      case 'paradas-proximas':
        if (!body.lat || !body.lng) {
          throw new Error('Latitude e longitude são obrigatórios');
        }
        // If we have a line code, get stops for that line
        if (body.codigoLinha) {
          const paradasLinha = await buscarParadasPorLinha(body.codigoLinha);
          // Filter by distance
          const paradasFiltradas = paradasLinha
            .map((p: any) => ({
              ...p,
              distancia: Math.round(calculateDistance(body.lat!, body.lng!, p.latitude, p.longitude)),
            }))
            .filter((p: any) => p.distancia <= (body.raio || 1000))
            .sort((a: any, b: any) => a.distancia - b.distancia);
          result = { success: true, paradas: paradasFiltradas };
        } else {
          const paradasProximas = await buscarParadasProximas(body.lat, body.lng, body.raio || 500);
          result = { success: true, paradas: paradasProximas };
        }
        break;
        
      case 'previsao-parada':
        if (!body.codigoParada) {
          throw new Error('Código da parada é obrigatório');
        }
        if (body.codigoLinha) {
          const previsaoLinha = await getPrevisaoLinha(body.codigoParada, body.codigoLinha);
          result = { success: true, ...previsaoLinha };
        } else {
          const previsao = await getPrevisaoParada(body.codigoParada);
          result = { success: true, ...previsao };
        }
        break;
        
      case 'previsao-linha':
        if (!body.codigoParada || !body.codigoLinha) {
          throw new Error('Código da parada e da linha são obrigatórios');
        }
        const previsaoLinhaResult = await getPrevisaoLinha(body.codigoParada, body.codigoLinha);
        result = { success: true, ...previsaoLinhaResult };
        break;
        
      case 'posicao-veiculos':
        if (!body.codigoLinha) {
          throw new Error('Código da linha é obrigatório');
        }
        const veiculos = await getPosicaoVeiculos(body.codigoLinha);
        result = { success: true, veiculos };
        break;
        
      default:
        throw new Error(`Ação desconhecida: ${body.action}`);
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('SPTrans API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    const status = errorMessage.includes('Falha na autenticação') ? 401 : 500;
    const hint = status === 401
      ? 'O endpoint /Login/Autenticar retornou "false". Isso geralmente indica token inválido ou não ativado no DevPlace SPTrans.'
      : undefined;

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      hint,
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
