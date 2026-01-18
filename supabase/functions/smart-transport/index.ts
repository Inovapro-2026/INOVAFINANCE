import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

interface RouteRequest {
  action: 'geocode' | 'directions' | 'status' | 'distance' | 'autocomplete';
  origin?: string;
  destination?: string;
  address?: string;
  input?: string;
  mode?: string;
  arrivalTime?: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

async function getPlaceAutocomplete(input: string): Promise<PlacePrediction[]> {
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:br&language=pt-BR&key=${GOOGLE_MAPS_API_KEY}`;
  
  console.log('Fetching place autocomplete...');
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 'OK' && data.predictions) {
    return data.predictions.map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      structured_formatting: {
        main_text: p.structured_formatting?.main_text || '',
        secondary_text: p.structured_formatting?.secondary_text || ''
      }
    }));
  }
  
  console.log('Autocomplete status:', data.status);
  return [];
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 'OK' && data.results.length > 0) {
    return data.results[0].geometry.location;
  }
  
  return null;
}

async function getDirections(origin: string, destination: string, mode: string = 'transit', arrivalTime?: string) {
  let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR&alternatives=true`;
  
  // Add arrival time if specified (for transit)
  if (arrivalTime && mode === 'transit') {
    const [hours, minutes] = arrivalTime.split(':').map(Number);
    const now = new Date();
    const arrival = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    // If the time has passed today, use tomorrow
    if (arrival.getTime() < now.getTime()) {
      arrival.setDate(arrival.getDate() + 1);
    }
    
    url += `&arrival_time=${Math.floor(arrival.getTime() / 1000)}`;
  }
  
  console.log('Fetching directions from Google Maps API...');
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status !== 'OK') {
    console.error('Directions API error:', data.status, data.error_message);
    return null;
  }
  
  const route = data.routes[0];
  const leg = route.legs[0];
  
  // Extract transit details
  let transitDetails = null;
  if (mode === 'transit' && leg.steps) {
    const transitStep = leg.steps.find((step: any) => step.travel_mode === 'TRANSIT');
    if (transitStep && transitStep.transit_details) {
      const td = transitStep.transit_details;
      transitDetails = {
        lineName: td.line?.short_name || td.line?.name || 'Transporte público',
        vehicleType: td.line?.vehicle?.type || 'BUS',
        vehicleIcon: td.line?.vehicle?.icon || null,
        departureStop: td.departure_stop?.name,
        arrivalStop: td.arrival_stop?.name,
        departureTime: td.departure_time?.text,
        arrivalTime: td.arrival_time?.text,
        numStops: td.num_stops,
        headsign: td.headsign,
        lineColor: td.line?.color,
        lineTextColor: td.line?.text_color
      };
    }
  }
  
  return {
    duration: leg.duration.text,
    durationValue: leg.duration.value, // in seconds
    distance: leg.distance.text,
    distanceValue: leg.distance.value, // in meters
    startAddress: leg.start_address,
    endAddress: leg.end_address,
    departureTime: leg.departure_time?.text || null,
    arrivalTime: leg.arrival_time?.text || null,
    steps: leg.steps?.map((step: any) => ({
      instruction: step.html_instructions?.replace(/<[^>]*>/g, ''),
      distance: step.distance?.text,
      duration: step.duration?.text,
      travelMode: step.travel_mode,
      transitDetails: step.transit_details ? {
        line: step.transit_details.line?.short_name || step.transit_details.line?.name,
        vehicleType: step.transit_details.line?.vehicle?.type,
        stops: step.transit_details.num_stops
      } : null
    })) || [],
    transitDetails,
    trafficCondition: route.summary || 'Normal'
  };
}

async function getDistanceMatrix(origins: string[], destinations: string[], mode: string = 'transit') {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins.map(o => encodeURIComponent(o)).join('|')}&destinations=${destinations.map(d => encodeURIComponent(d)).join('|')}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR&departure_time=now`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status !== 'OK') {
    console.error('Distance Matrix API error:', data.status);
    return null;
  }
  
  const element = data.rows[0].elements[0];
  
  return {
    distance: element.distance?.text,
    distanceValue: element.distance?.value,
    duration: element.duration?.text,
    durationValue: element.duration?.value,
    durationInTraffic: element.duration_in_traffic?.text,
    durationInTrafficValue: element.duration_in_traffic?.value,
    status: element.status
  };
}

function calculateDepartureTime(arrivalTimeStr: string, travelDurationSeconds: number, walkTimeMinutes: number = 10): { 
  idealDepartureTime: string;
  shouldLeaveNow: boolean;
  minutesUntilDeparture: number;
  status: 'early' | 'onTime' | 'hurry' | 'late';
} {
  const now = new Date();
  const [hours, minutes] = arrivalTimeStr.split(':').map(Number);
  
  const arrivalTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  
  // If arrival time has passed, assume tomorrow
  if (arrivalTime.getTime() < now.getTime()) {
    arrivalTime.setDate(arrivalTime.getDate() + 1);
  }
  
  // Calculate ideal departure time
  const totalTravelTimeMs = (travelDurationSeconds * 1000) + (walkTimeMinutes * 60 * 1000);
  const idealDepartureMs = arrivalTime.getTime() - totalTravelTimeMs;
  const idealDeparture = new Date(idealDepartureMs);
  
  const minutesUntilDeparture = Math.floor((idealDepartureMs - now.getTime()) / 60000);
  
  let status: 'early' | 'onTime' | 'hurry' | 'late';
  if (minutesUntilDeparture > 30) {
    status = 'early';
  } else if (minutesUntilDeparture > 10) {
    status = 'onTime';
  } else if (minutesUntilDeparture > 0) {
    status = 'hurry';
  } else {
    status = 'late';
  }
  
  return {
    idealDepartureTime: `${idealDeparture.getHours().toString().padStart(2, '0')}:${idealDeparture.getMinutes().toString().padStart(2, '0')}`,
    shouldLeaveNow: minutesUntilDeparture <= 5,
    minutesUntilDeparture,
    status
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RouteRequest = await req.json();
    const { action, origin, destination, address, input, mode = 'transit', arrivalTime } = body;
    
    console.log('Smart Transport request:', action, { origin, destination, address, input, mode, arrivalTime });
    
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    // Handle autocomplete first (before other actions)
    if (action === 'autocomplete') {
      if (!input || input.length < 3) {
        return new Response(JSON.stringify({ success: true, predictions: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const predictions = await getPlaceAutocomplete(input);
      return new Response(JSON.stringify({ success: true, predictions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'geocode': {
        if (!address) {
          throw new Error('Address is required for geocoding');
        }
        const location = await geocodeAddress(address);
        return new Response(JSON.stringify({ success: true, location }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      case 'directions': {
        if (!origin || !destination) {
          throw new Error('Origin and destination are required');
        }
        const directions = await getDirections(origin, destination, mode, arrivalTime);
        return new Response(JSON.stringify({ success: true, directions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      case 'distance': {
        if (!origin || !destination) {
          throw new Error('Origin and destination are required');
        }
        const distance = await getDistanceMatrix([origin], [destination], mode);
        return new Response(JSON.stringify({ success: true, distance }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      case 'status': {
        if (!origin || !destination || !arrivalTime) {
          throw new Error('Origin, destination and arrivalTime are required for status');
        }
        
        // Get current route info
        const directions = await getDirections(origin, destination, mode, arrivalTime);
        
        if (!directions) {
          throw new Error('Could not get directions');
        }
        
        // Calculate departure time
        const timing = calculateDepartureTime(
          arrivalTime, 
          directions.durationValue,
          10 // default walk time
        );
        
        return new Response(JSON.stringify({ 
          success: true, 
          status: {
            ...directions,
            ...timing,
            recommendation: timing.shouldLeaveNow 
              ? `Saia agora! Seu ${directions.transitDetails?.vehicleType === 'SUBWAY' ? 'metrô' : 'ônibus'} está chegando.`
              : timing.status === 'late'
                ? 'Você está atrasado! Considere alternativas.'
                : timing.status === 'hurry'
                  ? `Atenção! Saia em ${timing.minutesUntilDeparture} minutos.`
                  : `Você pode sair às ${timing.idealDepartureTime}. Relaxe por enquanto.`
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Smart Transport error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});