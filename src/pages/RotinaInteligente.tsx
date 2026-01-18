import { useState, useEffect, useCallback } from 'react';
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
  Play,
  Pause,
  Train,
  Car,
  Footprints,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Route,
  ArrowRight,
  Home as HomeIcon,
  Building2,
  Loader2
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
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
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

interface RouteStatus {
  duration: string;
  durationValue: number;
  distance: string;
  departureTime: string | null;
  arrivalTime: string | null;
  idealDepartureTime: string;
  shouldLeaveNow: boolean;
  minutesUntilDeparture: number;
  status: 'early' | 'onTime' | 'hurry' | 'late';
  recommendation: string;
  transitDetails?: {
    lineName: string;
    vehicleType: string;
    departureStop: string;
    arrivalStop: string;
    departureTime: string;
    numStops: number;
    lineColor?: string;
  };
  steps?: Array<{
    instruction: string;
    distance: string;
    duration: string;
    travelMode: string;
  }>;
}

export default function RotinaInteligente() {
  const { user } = useAuth();
  const [routine, setRoutine] = useState<TransportRoutine | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  
  // Config form state
  const [enderecoCasa, setEnderecoCasa] = useState('');
  const [enderecoTrabalho, setEnderecoTrabalho] = useState('');
  const [horarioTrabalho, setHorarioTrabalho] = useState('08:30');
  const [tempoAtePonto, setTempoAtePonto] = useState(10);
  const [modoTransporte, setModoTransporte] = useState('transit');

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
      setEnderecoCasa(data.endereco_casa);
      setEnderecoTrabalho(data.endereco_trabalho);
      setHorarioTrabalho(data.horario_trabalho);
      setTempoAtePonto(data.tempo_ate_ponto);
      setModoTransporte(data.modo_transporte);
    }
  }, [user]);

  useEffect(() => {
    loadRoutine();
  }, [loadRoutine]);

  // Get route status
  const fetchRouteStatus = useCallback(async () => {
    if (!routine) return;
    
    setIsRefreshing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('smart-transport', {
        body: {
          action: 'status',
          origin: routine.endereco_casa,
          destination: routine.endereco_trabalho,
          mode: routine.modo_transporte,
          arrivalTime: routine.horario_trabalho
        }
      });
      
      if (error) throw error;
      
      if (data.success && data.status) {
        setRouteStatus(data.status);
        
        // Check if we should alert
        if (alertsEnabled && data.status.shouldLeaveNow) {
          const now = Date.now();
          // Only alert every 5 minutes
          if (now - lastAlertTime > 5 * 60 * 1000) {
            setLastAlertTime(now);
            await isaSpeak(data.status.recommendation, 'rotina-inteligente');
            toast.warning('⏰ Hora de sair!', {
              description: data.status.recommendation
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching route status:', err);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsRefreshing(false);
    }
  }, [routine, alertsEnabled, lastAlertTime]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (routine) {
      fetchRouteStatus();
      const interval = setInterval(fetchRouteStatus, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [routine, fetchRouteStatus]);

  // Save routine
  const handleSaveRoutine = async () => {
    if (!user) return;
    if (!enderecoCasa.trim() || !enderecoTrabalho.trim()) {
      toast.error('Preencha os endereços');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Verify addresses with geocoding
      const { data: geoData } = await supabase.functions.invoke('smart-transport', {
        body: { action: 'geocode', address: enderecoCasa }
      });
      
      if (!geoData?.success || !geoData?.location) {
        toast.error('Endereço de casa não encontrado');
        setIsLoading(false);
        return;
      }
      
      const { data: geoData2 } = await supabase.functions.invoke('smart-transport', {
        body: { action: 'geocode', address: enderecoTrabalho }
      });
      
      if (!geoData2?.success || !geoData2?.location) {
        toast.error('Endereço do trabalho não encontrado');
        setIsLoading(false);
        return;
      }
      
      // Save to database
      if (routine) {
        // Update existing
        const { error } = await supabase
          .from('rotinas_transporte')
          .update({
            endereco_casa: enderecoCasa,
            endereco_trabalho: enderecoTrabalho,
            horario_trabalho: horarioTrabalho,
            tempo_ate_ponto: tempoAtePonto,
            modo_transporte: modoTransporte,
            updated_at: new Date().toISOString()
          })
          .eq('id', routine.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('rotinas_transporte')
          .insert({
            user_matricula: user.userId,
            endereco_casa: enderecoCasa,
            endereco_trabalho: enderecoTrabalho,
            horario_trabalho: horarioTrabalho,
            tempo_ate_ponto: tempoAtePonto,
            modo_transporte: modoTransporte
          });
        
        if (error) throw error;
      }
      
      toast.success('Rotina salva com sucesso!');
      await isaSpeak('Rotina de transporte configurada! Vou te avisar quando for hora de sair.', 'rotina-inteligente');
      setShowConfig(false);
      await loadRoutine();
    } catch (err) {
      console.error('Error saving routine:', err);
      toast.error('Erro ao salvar rotina');
    } finally {
      setIsLoading(false);
    }
  };

  // Open in Google Maps
  const openInMaps = () => {
    if (!routine) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(routine.endereco_casa)}&destination=${encodeURIComponent(routine.endereco_trabalho)}&travelmode=${routine.modo_transporte}`;
    window.open(url, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'early': return 'bg-emerald-500';
      case 'onTime': return 'bg-blue-500';
      case 'hurry': return 'bg-amber-500';
      case 'late': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'early': return 'Tranquilo';
      case 'onTime': return 'No horário';
      case 'hurry': return 'Atenção!';
      case 'late': return 'Atrasado';
      default: return 'Desconhecido';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'transit': return Bus;
      case 'driving': return Car;
      case 'walking': return Footprints;
      default: return Bus;
    }
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
              <p className="text-xs text-muted-foreground">Transporte em tempo real</p>
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
        {!routine && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Configure sua rotina</h2>
            <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
              Defina seu trajeto casa-trabalho e receba alertas inteligentes sobre quando sair
            </p>
            <Button onClick={() => setShowConfig(true)} size="lg" className="gap-2">
              <Settings className="w-5 h-5" />
              Configurar Rotina
            </Button>
          </motion.div>
        )}

        {/* Route Status Card */}
        {routine && routeStatus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl">
              {/* Status Header */}
              <div className={cn(
                "p-4 text-white",
                getStatusColor(routeStatus.status)
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {routeStatus.status === 'late' && <AlertTriangle className="w-6 h-6 animate-pulse" />}
                    {routeStatus.status === 'hurry' && <Timer className="w-6 h-6 animate-bounce" />}
                    {routeStatus.status === 'onTime' && <Clock className="w-6 h-6" />}
                    {routeStatus.status === 'early' && <CheckCircle2 className="w-6 h-6" />}
                    <div>
                      <p className="text-lg font-bold">{getStatusLabel(routeStatus.status)}</p>
                      <p className="text-sm opacity-90">{routeStatus.recommendation}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {routeStatus.minutesUntilDeparture > 0 
                      ? `${routeStatus.minutesUntilDeparture} min`
                      : 'Agora!'}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Time Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Hora ideal de saída</p>
                    <p className="text-2xl font-bold text-primary">{routeStatus.idealDepartureTime}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Chegada prevista</p>
                    <p className="text-2xl font-bold">{routine.horario_trabalho}</p>
                  </div>
                </div>

                {/* Route Details */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Route className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{routeStatus.distance}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-500" />
                    <span className="font-medium">{routeStatus.duration}</span>
                  </div>
                </div>

                {/* Transit Details */}
                {routeStatus.transitDetails && (
                  <div className="p-3 border border-border rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      {routeStatus.transitDetails.vehicleType === 'SUBWAY' ? (
                        <Train className="w-5 h-5" style={{ color: routeStatus.transitDetails.lineColor }} />
                      ) : (
                        <Bus className="w-5 h-5" style={{ color: routeStatus.transitDetails.lineColor }} />
                      )}
                      <span className="font-bold" style={{ color: routeStatus.transitDetails.lineColor }}>
                        {routeStatus.transitDetails.lineName}
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        {routeStatus.transitDetails.numStops} paradas
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span>{routeStatus.transitDetails.departureStop}</span>
                      <ArrowRight className="w-4 h-4 mx-2" />
                      <span>{routeStatus.transitDetails.arrivalStop}</span>
                    </div>
                    {routeStatus.transitDetails.departureTime && (
                      <p className="text-sm">
                        Próximo: <span className="font-medium text-primary">{routeStatus.transitDetails.departureTime}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={fetchRouteStatus}
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
                    onClick={openInMaps}
                  >
                    <Navigation className="w-4 h-4" />
                    Abrir Rota
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Info Cards */}
        {routine && (
          <div className="grid grid-cols-2 gap-4">
            {/* Home */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 to-green-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HomeIcon className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium text-sm">Casa</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {routine.endereco_casa}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Work */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-sm">Trabalho</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {routine.endereco_trabalho}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Settings */}
        {routine && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {alertsEnabled ? (
                      <Bell className="w-5 h-5 text-primary" />
                    ) : (
                      <BellOff className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">Alertas Automáticos</p>
                      <p className="text-xs text-muted-foreground">
                        ISA avisa quando for hora de sair
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={alertsEnabled} 
                    onCheckedChange={setAlertsEnabled}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={() => setShowConfig(true)}
                  >
                    <Settings className="w-4 h-4" />
                    Editar Rotina
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Route Steps */}
        {routeStatus?.steps && routeStatus.steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Route className="w-5 h-5 text-primary" />
                  Passo a passo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {routeStatus.steps.slice(0, 5).map((step, index) => {
                  const ModeIcon = step.travelMode === 'TRANSIT' ? Bus 
                    : step.travelMode === 'WALKING' ? Footprints : Car;
                  
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ModeIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{step.instruction}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.distance} • {step.duration}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configurar Rotina
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <HomeIcon className="w-4 h-4" />
                Endereço de Casa
              </Label>
              <AddressAutocomplete
                value={enderecoCasa}
                onChange={setEnderecoCasa}
                placeholder="Digite seu endereço de casa..."
                icon={<HomeIcon className="w-4 h-4" />}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Endereço do Trabalho
              </Label>
              <AddressAutocomplete
                value={enderecoTrabalho}
                onChange={setEnderecoTrabalho}
                placeholder="Digite o endereço do trabalho..."
                icon={<Building2 className="w-4 h-4" />}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Horário de Chegada
                </Label>
                <Input
                  type="time"
                  value={horarioTrabalho}
                  onChange={(e) => setHorarioTrabalho(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Footprints className="w-4 h-4" />
                  Tempo até o ponto
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={tempoAtePonto}
                    onChange={(e) => setTempoAtePonto(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Modo de Transporte</Label>
              <Select value={modoTransporte} onValueChange={setModoTransporte}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transit">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4" />
                      Transporte Público
                    </div>
                  </SelectItem>
                  <SelectItem value="driving">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Carro
                    </div>
                  </SelectItem>
                  <SelectItem value="walking">
                    <div className="flex items-center gap-2">
                      <Footprints className="w-4 h-4" />
                      A pé
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleSaveRoutine} 
              className="w-full gap-2"
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
        </DialogContent>
      </Dialog>
    </div>
  );
}