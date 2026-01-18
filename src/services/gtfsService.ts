import JSZip from 'jszip';

export interface GTFSStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_desc?: string;
}

export interface GTFSRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color?: string;
}

export interface GTFSTrip {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_headsign?: string;
  direction_id?: number;
  shape_id?: string;
}

export interface GTFSStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
}

let cachedData: {
  stops: GTFSStop[];
  routes: GTFSRoute[];
  trips: GTFSTrip[];
  stopTimes: GTFSStopTime[];
  stopTimesByStop: Map<string, GTFSStopTime[]>;
  routesByStop: Map<string, Set<string>>;
} | null = null;

let loadingPromise: Promise<typeof cachedData> | null = null;

function parseCSV<T>(content: string, mapper: (row: Record<string, string>) => T): T[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const result: T[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    try {
      result.push(mapper(row));
    } catch (e) {
      // Skip malformed rows
    }
  }
  
  return result;
}

async function loadGTFSData(): Promise<typeof cachedData> {
  if (cachedData) return cachedData;
  if (loadingPromise) return loadingPromise;
  
  loadingPromise = (async () => {
    console.log('Loading GTFS data...');
    
    const response = await fetch('/data/gtfs.zip');
    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Extract files
    const stopsContent = await zip.file('stops.txt')?.async('string') || '';
    const routesContent = await zip.file('routes.txt')?.async('string') || '';
    const tripsContent = await zip.file('trips.txt')?.async('string') || '';
    const stopTimesContent = await zip.file('stop_times.txt')?.async('string') || '';
    
    console.log('Parsing GTFS files...');
    
    const stops = parseCSV<GTFSStop>(stopsContent, row => ({
      stop_id: row.stop_id,
      stop_name: row.stop_name,
      stop_lat: parseFloat(row.stop_lat),
      stop_lon: parseFloat(row.stop_lon),
      stop_desc: row.stop_desc,
    }));
    
    const routes = parseCSV<GTFSRoute>(routesContent, row => ({
      route_id: row.route_id,
      route_short_name: row.route_short_name,
      route_long_name: row.route_long_name,
      route_type: parseInt(row.route_type) || 3,
      route_color: row.route_color,
    }));
    
    const trips = parseCSV<GTFSTrip>(tripsContent, row => ({
      trip_id: row.trip_id,
      route_id: row.route_id,
      service_id: row.service_id,
      trip_headsign: row.trip_headsign,
      direction_id: row.direction_id ? parseInt(row.direction_id) : undefined,
      shape_id: row.shape_id,
    }));
    
    // Stop times can be large, so we sample or limit
    const stopTimesRaw = parseCSV<GTFSStopTime>(stopTimesContent, row => ({
      trip_id: row.trip_id,
      arrival_time: row.arrival_time,
      departure_time: row.departure_time,
      stop_id: row.stop_id,
      stop_sequence: parseInt(row.stop_sequence) || 0,
    }));
    
    // Build indexes for fast lookup
    const stopTimesByStop = new Map<string, GTFSStopTime[]>();
    const routesByStop = new Map<string, Set<string>>();
    
    // Create trip -> route mapping
    const tripToRoute = new Map<string, string>();
    trips.forEach(t => tripToRoute.set(t.trip_id, t.route_id));
    
    stopTimesRaw.forEach(st => {
      // Index by stop
      if (!stopTimesByStop.has(st.stop_id)) {
        stopTimesByStop.set(st.stop_id, []);
      }
      stopTimesByStop.get(st.stop_id)!.push(st);
      
      // Track which routes serve each stop
      const routeId = tripToRoute.get(st.trip_id);
      if (routeId) {
        if (!routesByStop.has(st.stop_id)) {
          routesByStop.set(st.stop_id, new Set());
        }
        routesByStop.get(st.stop_id)!.add(routeId);
      }
    });
    
    console.log(`GTFS loaded: ${stops.length} stops, ${routes.length} routes, ${trips.length} trips`);
    
    cachedData = {
      stops,
      routes,
      trips,
      stopTimes: stopTimesRaw,
      stopTimesByStop,
      routesByStop,
    };
    
    return cachedData;
  })();
  
  return loadingPromise;
}

// Calculate distance between two coordinates (Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Public API

export async function searchRoutes(term: string): Promise<GTFSRoute[]> {
  const data = await loadGTFSData();
  if (!data) return [];
  
  const termLower = term.toLowerCase();
  return data.routes.filter(r => 
    r.route_short_name.toLowerCase().includes(termLower) ||
    r.route_long_name.toLowerCase().includes(termLower)
  ).slice(0, 20);
}

export async function getNearbyStops(lat: number, lon: number, radiusMeters: number = 500): Promise<(GTFSStop & { distance: number })[]> {
  const data = await loadGTFSData();
  if (!data) return [];
  
  return data.stops
    .map(stop => ({
      ...stop,
      distance: calculateDistance(lat, lon, stop.stop_lat, stop.stop_lon),
    }))
    .filter(s => s.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 30);
}

export async function getStopsForRoute(routeId: string): Promise<GTFSStop[]> {
  const data = await loadGTFSData();
  if (!data) return [];
  
  // Find trips for this route
  const routeTrips = data.trips.filter(t => t.route_id === routeId);
  if (routeTrips.length === 0) return [];
  
  // Get stop IDs from first trip
  const firstTripId = routeTrips[0].trip_id;
  const stopIds = new Set(
    data.stopTimes
      .filter(st => st.trip_id === firstTripId)
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .map(st => st.stop_id)
  );
  
  // Return stops in order
  return data.stops.filter(s => stopIds.has(s.stop_id));
}

export async function getRoutesForStop(stopId: string): Promise<GTFSRoute[]> {
  const data = await loadGTFSData();
  if (!data) return [];
  
  const routeIds = data.routesByStop.get(stopId);
  if (!routeIds) return [];
  
  return data.routes.filter(r => routeIds.has(r.route_id));
}

export async function getNextArrivals(stopId: string, routeId?: string): Promise<{
  route: GTFSRoute;
  arrivalTime: string;
  minutesUntil: number;
}[]> {
  const data = await loadGTFSData();
  if (!data) return [];
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
  
  const stopTimes = data.stopTimesByStop.get(stopId) || [];
  
  // Create trip -> route mapping
  const tripToRoute = new Map<string, string>();
  data.trips.forEach(t => tripToRoute.set(t.trip_id, t.route_id));
  
  const arrivals = stopTimes
    .filter(st => {
      if (routeId) {
        const stRouteId = tripToRoute.get(st.trip_id);
        if (stRouteId !== routeId) return false;
      }
      return st.arrival_time >= currentTime;
    })
    .sort((a, b) => a.arrival_time.localeCompare(b.arrival_time))
    .slice(0, 10);
  
  return arrivals.map(st => {
    const stRouteId = tripToRoute.get(st.trip_id) || '';
    const route = data.routes.find(r => r.route_id === stRouteId);
    
    // Calculate minutes until arrival
    const [h, m] = st.arrival_time.split(':').map(Number);
    const arrivalDate = new Date(now);
    arrivalDate.setHours(h, m, 0, 0);
    const minutesUntil = Math.max(0, Math.round((arrivalDate.getTime() - now.getTime()) / 60000));
    
    return {
      route: route || { route_id: stRouteId, route_short_name: stRouteId, route_long_name: '', route_type: 3 },
      arrivalTime: st.arrival_time,
      minutesUntil,
    };
  });
}

export async function getAllRoutes(): Promise<GTFSRoute[]> {
  const data = await loadGTFSData();
  return data?.routes || [];
}

export async function getAllStops(): Promise<GTFSStop[]> {
  const data = await loadGTFSData();
  return data?.stops || [];
}

export async function isGTFSAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/data/gtfs.zip', { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
