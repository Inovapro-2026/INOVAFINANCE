import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  Bus, 
  Navigation, 
  Bell, 
  BellOff,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Route,
  ArrowRight,
  Home as HomeIcon,
  Building2,
  Loader2,
  Search,
  MapPinned,
  Locate,
  Volume2,
  VolumeX,
  Info,
  Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isaSpeak } from '@/services/isaVoiceService';
import { useIsaGreeting } from '@/hooks/useIsaGreeting';
import { ModeToggle } from '@/components/ModeToggle';
import { BrazilClock } from '@/components/BrazilClock';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import * as gtfs from '@/services/gtfsService';

interface TransportRoutine {
  id: string;
  user_matricula: number;
  endereco_casa: string;
  endereco_trabalho: string;
  horario_trabalho: string;
  tempo_ate_ponto: number;
  linha_onibus: string | null;
  modo_transporte: string;
  ativo: boolean;
}

interface BusLine {
  codigoLinha: number | string;
  letreiro: string;
  sentido: string;
  sentidoCodigo?: number;
  terminalPrincipal: string;
  terminalSecundario: string;
}

interface BusStop {
  codigoParada: number | string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  distancia?: number;
}

interface BusPrediction {
  prefixo: string;
  acessivel: boolean;
  previsaoMinutos: number;
  previsaoHorario: string;
  latitude: number;
  longitude: number;
}

interface LinePrediction {
  codigoLinha: number;
  letreiro: string;
  sentido: string;
  destino: string;
  veiculos: BusPrediction[];
}

interface RouteConfig {
  linhaOnibus: BusLine | null;
  paradaOrigem: BusStop | null;
  paradaDestino: BusStop | null;
}

export default function RotinaInteligente() {
  const { user } = useAuth();
  const [routine, setRoutine] = useState<TransportRoutine | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  
  // SPTrans/GTFS data
  const [predictions, setPredictions] = useState<LinePrediction[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<LinePrediction | null>(null);
  const [nextBusMinutes, setNextBusMinutes] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<'gtfs' | 'api' | null>(null);
  const [gtfsLoading, setGtfsLoading] = useState(false);
  
  // Config state
  const [configStep, setConfigStep] = useState<'linha' | 'parada' | 'horario'>('linha');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<BusLine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLine, setSelectedLine] = useState<BusLine | null>(null);
  const [lineStops, setLineStops] = useState<BusStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
  const [horarioTrabalho, setHorarioTrabalho] = useState('08:30');
  const [tempoAtePonto, setTempoAtePonto] = useState(10);
  
  // Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyStops, setNearbyStops] = useState<BusStop[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  
  // Refs for interval
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ISA greeting
  useIsaGreeting({
    pageType: 'transporte',
    userId: user?.userId || 0,
    userName: user?.fullName || '',
    initialBalance: 0,
    enabled: !!user
  });

  // Load routine from database
  const loadRoutine = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('rotinas_transporte')
      .select('*')
      .eq('user_matricula', user.userId)
      .eq('ativo', true)
      .maybeSingle();
    
    if (error) {
      console.error('Error loading routine:', error);
      return;
    }
    
    if (data) {
      setRoutine(data as TransportRoutine);
      setHorarioTrabalho(data.horario_trabalho);
      setTempoAtePonto(data.tempo_ate_ponto);
      
      // Parse line info if available
      if (data.linha_onibus) {
        try {
          const lineData = JSON.parse(data.linha_onibus);
          if (lineData.linha) setSelectedLine(lineData.linha);
          if (lineData.parada) setSelectedStop(lineData.parada);
        } catch (e) {
          console.log('Could not parse line data');
        }
      }
    }
  }, [user]);

  useEffect(() => {
    loadRoutine();
  }, [loadRoutine]);

  // Get bus predictions (GTFS-based)
  const fetchPredictions = useCallback(async () => {
    if (!selectedStop) return;
    
    setIsRefreshing(true);
    
    try {
      // Use GTFS data (local, works without external API)
      const stopId = String(selectedStop.codigoParada);
      const routeId = selectedLine ? String(selectedLine.codigoLinha) : undefined;
      
      const arrivals = await gtfs.getNextArrivals(stopId, routeId);
      setDataSource('gtfs');
      
      if (arrivals.length > 0) {
        // Group by route
        const byRoute = new Map<string, typeof arrivals>();
        arrivals.forEach(a => {
          const key = a.route.route_id;
          if (!byRoute.has(key)) byRoute.set(key, []);
          byRoute.get(key)!.push(a);
        });
        
        const linePreds: LinePrediction[] = Array.from(byRoute.entries()).map(([routeId, arr]) => ({
          codigoLinha: parseInt(routeId) || 0,
          letreiro: arr[0].route.route_short_name || routeId,
          sentido: arr[0].route.route_long_name || '',
          destino: arr[0].route.route_long_name || '',
          veiculos: arr.map(a => ({
            prefixo: '',
            acessivel: false,
            previsaoMinutos: a.minutesUntil,
            previsaoHorario: a.arrivalTime,
            latitude: 0,
            longitude: 0,
          })),
        }));
        
        setPredictions(linePreds);
        
        // Select first or matching
        const matchingPred = selectedLine 
          ? linePreds.find(p => String(p.codigoLinha) === String(selectedLine.codigoLinha))
          : linePreds[0];
        
        setSelectedPrediction(matchingPred || linePreds[0] || null);
        
        if (matchingPred && matchingPred.veiculos.length > 0) {
          const nextBus = matchingPred.veiculos[0];
          setNextBusMinutes(nextBus.previsaoMinutos);
          checkAndTriggerAlert(nextBus.previsaoMinutos, matchingPred.letreiro);
        } else {
          setNextBusMinutes(arrivals[0]?.minutesUntil ?? null);
        }
      } else {
        setPredictions([]);
        setSelectedPrediction(null);
        setNextBusMinutes(null);
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
      toast.error('Erro ao buscar previsões');
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedStop, selectedLine]);

  // Check and trigger alerts
  const checkAndTriggerAlert = async (minutesToBus: number, lineName: string) => {
    if (!alertsEnabled || !routine) return;
    
    const now = Date.now();
    // Only alert every 2 minutes
    if (now - lastAlertTime < 2 * 60 * 1000) return;
    
    const tempoTotal = minutesToBus;
    const tempoNecessario = tempoAtePonto;
    const userName = user?.fullName?.split(' ')[0] || 'usuário';
    
    let message = '';
    let shouldSpeak = false;
    
    if (minutesToBus <= 0) {
      message = `${userName}, o ônibus ${lineName} está chegando no ponto agora!`;
      shouldSpeak = true;
    } else if (minutesToBus <= tempoNecessario) {
      message = `${userName}, o ônibus ${lineName} chega em ${minutesToBus} minutos. Você precisa sair agora!`;
      shouldSpeak = true;
    } else if (minutesToBus <= tempoNecessario + 3) {
      message = `${userName}, o ônibus ${lineName} chega em ${minutesToBus} minutos. Prepare-se para sair.`;
      shouldSpeak = true;
    } else if (minutesToBus <= tempoNecessario + 5) {
      message = `Seu ônibus ${lineName} está a ${minutesToBus} minutos do ponto.`;
      shouldSpeak = true;
    }
    
    if (shouldSpeak && voiceEnabled) {
      setLastAlertTime(now);
      await isaSpeak(message, 'rotina-inteligente');
      toast.info('🚌 ' + message);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (selectedStop) {
      fetchPredictions();
      refreshIntervalRef.current = setInterval(fetchPredictions, 30 * 1000);
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [selectedStop, fetchPredictions]);

  // Search bus lines (GTFS-based)
  const searchLines = async () => {
    if (!searchTerm.trim() || searchTerm.length < 2) return;
    
    setIsSearching(true);
    try {
      const routes = await gtfs.searchRoutes(searchTerm);
      
      const mapped: BusLine[] = routes.map(r => ({
        codigoLinha: r.route_id,
        letreiro: r.route_short_name || r.route_id,
        sentido: r.route_long_name || '',
        terminalPrincipal: r.route_long_name?.split(' - ')[0] || '',
        terminalSecundario: r.route_long_name?.split(' - ')[1] || '',
      }));
      
      setSearchResults(mapped);
      if (mapped.length === 0) {
        toast.info('Nenhuma linha encontrada');
      }
    } catch (err) {
      console.error('Error searching lines:', err);
      toast.error('Erro ao buscar linhas');
    } finally {
      setIsSearching(false);
    }
  };

  // Get user location and nearby stops (GTFS-based)
  const getUserLocation = async () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada');
      setIsLoadingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        try {
          // Use GTFS for nearby stops
          const nearby = await gtfs.getNearbyStops(latitude, longitude, 1000);
          
          const mapped: BusStop[] = nearby.map(s => ({
            codigoParada: s.stop_id,
            nome: s.stop_name,
            endereco: s.stop_desc || '',
            latitude: s.stop_lat,
            longitude: s.stop_lon,
            distancia: Math.round(s.distance),
          }));
          
          setNearbyStops(mapped);
          setLineStops(mapped);
        } catch (err) {
          console.error('Error getting nearby stops:', err);
          toast.error('Erro ao buscar paradas próximas');
        }
        
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Erro ao obter localização');
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Select a line and load its stops (GTFS-based)
  const handleSelectLine = async (line: BusLine) => {
    setSelectedLine(line);
    setConfigStep('parada');
    setSearchResults([]);
    
    try {
      // Get stops for this route from GTFS
      const stops = await gtfs.getStopsForRoute(String(line.codigoLinha));
      
      const mapped: BusStop[] = stops.map(s => ({
        codigoParada: s.stop_id,
        nome: s.stop_name,
        endereco: s.stop_desc || '',
        latitude: s.stop_lat,
        longitude: s.stop_lon,
      }));
      
      // If we have user location, calculate distances and sort
      if (userLocation) {
        mapped.forEach(s => {
          const R = 6371000;
          const dLat = (s.latitude - userLocation.lat) * Math.PI / 180;
          const dLon = (s.longitude - userLocation.lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(s.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          s.distancia = Math.round(R * c);
        });
        mapped.sort((a, b) => (a.distancia || 9999) - (b.distancia || 9999));
      }
      
      setLineStops(mapped);
    } catch (err) {
      console.error('Error loading stops:', err);
      toast.error('Erro ao carregar paradas');
    }
  };

  // Save routine
  const handleSaveRoutine = async () => {
    if (!user) return;
    if (!selectedLine || !selectedStop) {
      toast.error('Selecione a linha e a parada');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const routineData = {
        linha: selectedLine,
        parada: selectedStop
      };
      
      if (routine) {
        const { error } = await supabase
          .from('rotinas_transporte')
          .update({
            endereco_casa: selectedStop.endereco || selectedStop.nome,
            endereco_trabalho: `Linha ${selectedLine.letreiro}`,
            horario_trabalho: horarioTrabalho,
            tempo_ate_ponto: tempoAtePonto,
            linha_onibus: JSON.stringify(routineData),
            modo_transporte: 'transit',
            updated_at: new Date().toISOString()
          })
          .eq('id', routine.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rotinas_transporte')
          .insert({
            user_matricula: user.userId,
            endereco_casa: selectedStop.endereco || selectedStop.nome,
            endereco_trabalho: `Linha ${selectedLine.letreiro}`,
            horario_trabalho: horarioTrabalho,
            tempo_ate_ponto: tempoAtePonto,
            linha_onibus: JSON.stringify(routineData),
            modo_transporte: 'transit'
          });
        
        if (error) throw error;
      }
      
      toast.success('Rotina salva com sucesso!');
      if (voiceEnabled) {
        await isaSpeak(`Rotina configurada! Vou monitorar a linha ${selectedLine.letreiro} na parada ${selectedStop.nome}.`, 'rotina-inteligente');
      }
      setShowConfig(false);
      await loadRoutine();
      fetchPredictions();
    } catch (err) {
      console.error('Error saving routine:', err);
      toast.error('Erro ao salvar rotina');
    } finally {
      setIsLoading(false);
    }
  };

  // Get status info
  const getStatus = () => {
    if (nextBusMinutes === null) {
      return { status: 'waiting', label: 'Aguardando', color: 'bg-muted' };
    }
    
    const diff = nextBusMinutes - tempoAtePonto;
    
    if (diff < 0) {
      return { status: 'late', label: 'Perdido', color: 'bg-red-500' };
    } else if (diff <= 2) {
      return { status: 'hurry', label: 'Saia Agora!', color: 'bg-amber-500' };
    } else if (diff <= 5) {
      return { status: 'onTime', label: 'Prepare-se', color: 'bg-blue-500' };
    } else {
      return { status: 'early', label: 'Tranquilo', color: 'bg-emerald-500' };
    }
  };

  const statusInfo = getStatus();

  // Reset config
  const resetConfig = () => {
    setConfigStep('linha');
    setSearchTerm('');
    setSearchResults([]);
    setSelectedLine(null);
    setLineStops([]);
    setSelectedStop(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Faça login para acessar</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Rotina Inteligente</h1>
              <p className="text-xs text-muted-foreground">SPTrans Olho Vivo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrazilClock />
            <ModeToggle />
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* No routine configured */}
        {!selectedStop && !routine && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <Bus className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Configure sua rotina</h2>
            <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
              Escolha sua linha de ônibus e receba alertas em tempo real da SPTrans
            </p>
            <Button onClick={() => { resetConfig(); setShowConfig(true); }} size="lg" className="gap-2">
              <Settings className="w-5 h-5" />
              Configurar Rotina
            </Button>
          </motion.div>
        )}

        {/* Main Status Card */}
        {selectedStop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl">
              {/* Status Header */}
              <div className={cn("p-4 text-white", statusInfo.color)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusInfo.status === 'late' && <AlertTriangle className="w-6 h-6 animate-pulse" />}
                    {statusInfo.status === 'hurry' && <Timer className="w-6 h-6 animate-bounce" />}
                    {statusInfo.status === 'onTime' && <Clock className="w-6 h-6" />}
                    {statusInfo.status === 'early' && <CheckCircle2 className="w-6 h-6" />}
                    {statusInfo.status === 'waiting' && <Loader2 className="w-6 h-6 animate-spin" />}
                    <div>
                      <p className="text-lg font-bold">{statusInfo.label}</p>
                      <p className="text-sm opacity-90">
                        {selectedLine ? `Linha ${selectedLine.letreiro}` : 'Carregando...'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-lg px-3 py-1">
                    {nextBusMinutes !== null ? `${nextBusMinutes} min` : '...'}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Stop Info */}
                <div className="p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPinned className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Ponto de Ônibus</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedStop.nome}</p>
                  {selectedStop.endereco && (
                    <p className="text-xs text-muted-foreground">{selectedStop.endereco}</p>
                  )}
                </div>

                {/* Next buses */}
                {selectedPrediction && selectedPrediction.veiculos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Próximos ônibus:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedPrediction.veiculos.slice(0, 3).map((v, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "p-2 rounded-lg text-center",
                            i === 0 ? "bg-primary/10 border-2 border-primary" : "bg-muted/50"
                          )}
                        >
                          <p className={cn(
                            "text-xl font-bold",
                            i === 0 && "text-primary"
                          )}>
                            {v.previsaoMinutos}
                          </p>
                          <p className="text-xs text-muted-foreground">min</p>
                          {v.acessivel && (
                            <Badge variant="outline" className="text-xs mt-1">♿</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPrediction && selectedPrediction.veiculos.length === 0 && (
                  <div className="p-4 bg-amber-500/10 rounded-xl text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">Nenhum ônibus em operação</p>
                    <p className="text-xs text-muted-foreground">Aguardando dados da SPTrans...</p>
                  </div>
                )}

                {/* All lines at this stop */}
                {predictions.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Outras linhas nesta parada:</p>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {predictions.filter(p => p.codigoLinha !== selectedLine?.codigoLinha).map((pred) => (
                          <div key={pred.codigoLinha} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Bus className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{pred.letreiro}</span>
                            </div>
                            {pred.veiculos.length > 0 ? (
                              <Badge variant="outline">{pred.veiculos[0].previsaoMinutos} min</Badge>
                            ) : (
                              <Badge variant="secondary">--</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={fetchPredictions}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Atualizar
                  </Button>
                  <Button 
                    className="flex-1 gap-2 bg-gradient-to-r from-blue-500 to-cyan-500"
                    onClick={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${selectedStop.latitude},${selectedStop.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Navigation className="w-4 h-4" />
                    Ver no Mapa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Settings */}
        {selectedStop && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 space-y-4">
                {/* Voice Alerts */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {voiceEnabled ? (
                      <Volume2 className="w-5 h-5 text-primary" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">Alertas por Voz</p>
                      <p className="text-xs text-muted-foreground">
                        ISA fala quando o ônibus está chegando
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={voiceEnabled} 
                    onCheckedChange={setVoiceEnabled}
                  />
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {alertsEnabled ? (
                      <Bell className="w-5 h-5 text-primary" />
                    ) : (
                      <BellOff className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">Notificações</p>
                      <p className="text-xs text-muted-foreground">
                        Avisos automáticos
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={alertsEnabled} 
                    onCheckedChange={setAlertsEnabled}
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={() => { resetConfig(); setShowConfig(true); }}
                  >
                    <Settings className="w-4 h-4" />
                    Alterar Rotina
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    Dados GTFS
                    {dataSource === 'gtfs' && <Badge variant="outline" className="text-xs">Offline</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usando dados oficiais de transporte público (GTFS). Os horários são programados e podem variar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-primary" />
              {configStep === 'linha' && 'Escolha sua linha'}
              {configStep === 'parada' && 'Escolha o ponto'}
              {configStep === 'horario' && 'Configure horários'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            {/* Step 1: Search Line */}
            {configStep === 'linha' && (
              <>
                <div className="space-y-2">
                  <Label>Buscar linha de ônibus</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: 8000, Lapa, Terminal..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchLines()}
                    />
                    <Button onClick={searchLines} disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {searchResults.map((line) => (
                        <button
                          key={`${line.codigoLinha}-${line.sentidoCodigo}`}
                          className="w-full p-3 text-left bg-muted/50 hover:bg-muted rounded-xl transition-colors"
                          onClick={() => handleSelectLine(line)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary">{line.letreiro}</Badge>
                              <span className="text-sm font-medium">{line.sentido}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {line.terminalPrincipal} → {line.terminalSecundario}
                          </p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={getUserLocation}
                    disabled={isLoadingLocation}
                  >
                    {isLoadingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Locate className="w-4 h-4" />
                    )}
                    Usar minha localização
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Select Stop */}
            {configStep === 'parada' && (
              <>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-primary" />
                    <span className="font-medium">{selectedLine?.letreiro}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedLine?.terminalPrincipal} → {selectedLine?.terminalSecundario}
                  </p>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={getUserLocation}
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Locate className="w-4 h-4" />
                  )}
                  Buscar paradas próximas
                </Button>

                {lineStops.length > 0 && (
                  <ScrollArea className="h-52">
                    <div className="space-y-2">
                      {lineStops.map((stop) => (
                        <button
                          key={stop.codigoParada}
                          className={cn(
                            "w-full p-3 text-left rounded-xl transition-colors",
                            selectedStop?.codigoParada === stop.codigoParada
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 hover:bg-muted"
                          )}
                          onClick={() => setSelectedStop(stop)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{stop.nome}</span>
                            {stop.distancia && (
                              <Badge variant="outline" className={selectedStop?.codigoParada === stop.codigoParada ? "border-primary-foreground/50" : ""}>
                                {stop.distancia}m
                              </Badge>
                            )}
                          </div>
                          {stop.endereco && (
                            <p className={cn(
                              "text-xs mt-1",
                              selectedStop?.codigoParada === stop.codigoParada 
                                ? "text-primary-foreground/80" 
                                : "text-muted-foreground"
                            )}>
                              {stop.endereco}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setConfigStep('linha')}>
                    Voltar
                  </Button>
                  <Button 
                    className="flex-1"
                    disabled={!selectedStop}
                    onClick={() => setConfigStep('horario')}
                  >
                    Continuar
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Configure Times */}
            {configStep === 'horario' && (
              <>
                <div className="p-3 bg-primary/10 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-primary" />
                    <span className="font-medium">{selectedLine?.letreiro}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPinned className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{selectedStop?.nome}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Horário de chegada no trabalho
                    </Label>
                    <Input
                      type="time"
                      value={horarioTrabalho}
                      onChange={(e) => setHorarioTrabalho(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Tempo até o ponto (minutos)
                    </Label>
                    <Select 
                      value={tempoAtePonto.toString()} 
                      onValueChange={(v) => setTempoAtePonto(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="20">20 minutos</SelectItem>
                        <SelectItem value="25">25 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setConfigStep('parada')}>
                    Voltar
                  </Button>
                  <Button 
                    className="flex-1 gap-2"
                    onClick={handleSaveRoutine}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Salvar Rotina
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
