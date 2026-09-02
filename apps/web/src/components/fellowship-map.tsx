'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useFellowships, useCreateJoinRequest } from '@/hooks/use-fellowships';
import { Button } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import { toast } from 'sonner';
import type { FellowshipWithBranch } from '@kairos/types';
import { FellowshipType } from '@kairos/types';
import mapboxgl from 'mapbox-gl';

// ── Types ──────────────────────────────────────────────────

type MapStage = 'globe' | 'country' | 'detail';

interface CountryData {
  name: string;
  code: string;
  center: [number, number]; // [lat, lng] — kept in Leaflet order internally, converted to [lng, lat] when handing to Mapbox
  zoom: number;
}

// ── Constants ──────────────────────────────────────────────

const COUNTRIES: CountryData[] = [
  { name: 'Ghana', code: 'GH', center: [7.9465, -1.0232], zoom: 7 },
  { name: 'United Kingdom', code: 'GB', center: [52.3555, -1.1743], zoom: 6 },
  { name: 'United States', code: 'US', center: [37.0902, -95.7129], zoom: 4 },
  { name: 'Nigeria', code: 'NG', center: [9.082, 8.6753], zoom: 6 },
  { name: 'South Africa', code: 'ZA', center: [-29.0, 25.0834], zoom: 5 },
  { name: 'Canada', code: 'CA', center: [56.1304, -106.3468], zoom: 3 },
  { name: 'Germany', code: 'DE', center: [51.1657, 10.4515], zoom: 6 },
  { name: 'Sierra Leone', code: 'SL', center: [8.4606, -11.7799], zoom: 7 },
];

const TYPE_COLORS: Record<string, string> = {
  [FellowshipType.KGroups]: '#8b5cf6',
  [FellowshipType.KharisExpress]: '#f59e0b',
  [FellowshipType.NewBreeds]: '#10b981',
  [FellowshipType.KharisOnCampus]: '#0ea5e9',
  [FellowshipType.KharisOnCampusColleges]: '#f43f5e',
};

const MAPBOX_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12';
const MAPBOX_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';

// Convert [lat, lng] (Leaflet convention used in this file) to Mapbox's
// [lng, lat] tuple type. Kept as a helper because every fly/marker/bounds call
// otherwise risks silently swapping coordinates.
const ll = ([lat, lng]: [number, number]): [number, number] => [lng, lat];

// Known branch locations mapped to countries
interface BranchFellowshipInfo {
  name: string;
  type: string;
  schedule: string;
  description: string;
}

interface BranchLocation {
  name: string;
  country: string;
  coords: [number, number]; // [lat, lng]
  fellowships: string[];
  fellowshipDetails: BranchFellowshipInfo[];
}

const BRANCH_LOCATIONS: BranchLocation[] = [
  {
    name: 'Kharis London Central',
    country: 'United Kingdom',
    coords: [51.4934, -0.0998],
    fellowships: ['K-Groups', 'Kharis Express'],
    fellowshipDetails: [
      { name: 'Grace K-Group', type: 'K-Groups', schedule: 'Every Wednesday, 7:00 PM', description: 'Bible Study' },
      { name: 'Kharis Express London', type: 'Kharis Express', schedule: 'Every Friday, 6:30 PM', description: 'Fellowship' },
    ],
  },
  {
    name: 'Kharis Manchester',
    country: 'United Kingdom',
    coords: [53.4808, -2.2426],
    fellowships: ['K-Groups'],
    fellowshipDetails: [
      { name: 'Manchester K-Group', type: 'K-Groups', schedule: 'Every Wednesday, 7:00 PM', description: 'Bible Study' },
    ],
  },
  {
    name: 'Kharis Accra',
    country: 'Ghana',
    coords: [5.6037, -0.1870],
    fellowships: ['K-Groups', 'New Breeds'],
    fellowshipDetails: [
      { name: 'Accra K-Group Alpha', type: 'K-Groups', schedule: 'Every Thursday, 6:00 PM', description: 'Bible Study' },
      { name: 'New Breeds Accra', type: 'New Breeds', schedule: 'Every Saturday, 10:00 AM', description: 'Fellowship' },
    ],
  },
  {
    name: 'Kharis Kumasi',
    country: 'Ghana',
    coords: [6.6885, -1.6244],
    fellowships: ['K-Groups'],
    fellowshipDetails: [
      { name: 'Kumasi K-Group', type: 'K-Groups', schedule: 'Every Tuesday, 6:30 PM', description: 'Bible Study' },
    ],
  },
  {
    name: 'Kharis Freetown',
    country: 'Sierra Leone',
    coords: [8.4657, -13.2317],
    fellowships: ['K-Groups'],
    fellowshipDetails: [
      { name: 'Freetown K-Group', type: 'K-Groups', schedule: 'Every Wednesday, 6:00 PM', description: 'Bible Study' },
    ],
  },
];

const NEAREST_LINE_SOURCE = 'kairos-nearest-line';
const NEAREST_LINE_LAYER = 'kairos-nearest-line-layer';

// ── Component ──────────────────────────────────────────────

// Helper: compute next meeting date from schedule string like "Every Wednesday, 7:00 PM"
function getNextMeetingDate(schedule: string): string | null {
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const lower = schedule.toLowerCase();
  const dayIndex = DAYS.findIndex((d) => lower.includes(d));
  if (dayIndex === -1) return null;

  const timeMatch = schedule.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  let timeStr = '';
  if (timeMatch) {
    const hours = parseInt(timeMatch[1] ?? '0', 10);
    const mins = timeMatch[2] ?? '00';
    const ampm = (timeMatch[3] ?? '').toUpperCase();
    timeStr = ` at ${hours}:${mins} ${ampm}`;
  }

  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = dayIndex - currentDay;
  if (daysUntil <= 0) daysUntil += 7;

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntil);

  const dayName = DAYS[dayIndex]!;
  const capitalDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const date = nextDate.getDate();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[nextDate.getMonth()];

  const suffix = date === 1 || date === 21 || date === 31 ? 'st'
    : date === 2 || date === 22 ? 'nd'
    : date === 3 || date === 23 ? 'rd' : 'th';

  const label = daysUntil <= 7 ? 'This' : 'Next';

  return `${label} ${capitalDay}, ${date}${suffix} ${month}${timeStr}`;
}

// ── Country Search Component ─────────────────────────────

function CountrySearch({ countries, onSelect }: { countries: CountryData[]; onSelect: (c: CountryData) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = query.trim()
    ? countries.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : countries;

  return (
    <div className="absolute bottom-4 right-4 z-[1000] w-64">
      <div className="rounded-lg bg-background/95 shadow-lg backdrop-blur-sm border border-border overflow-hidden">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search country..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="w-full bg-transparent py-2.5 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground"
          />
          {(open || query) && (
            <button
              onClick={() => { setQuery(''); setOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {open && (
          <div className="max-h-40 overflow-y-auto border-t border-border">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No countries found</div>
            ) : (
              filtered.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    onSelect(country);
                    setQuery(country.name);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  {country.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Postcode Search Component ────────────────────────────

function PostcodeSearch({ onLocate }: { onLocate: (lat: number, lng: number, label: string) => void }) {
  const [postcode, setPostcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!postcode.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(postcode.trim())}&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        onLocate(parseFloat(lat), parseFloat(lon), display_name);
        setPostcode('');
      } else {
        setError('Location not found');
      }
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-16 right-4 z-[1000] w-64">
      <div className="rounded-lg bg-background/95 shadow-lg backdrop-blur-sm border border-border overflow-hidden">
        <div className="relative flex">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <input
            type="text"
            placeholder="SEARCH POSTCODE..."
            value={postcode}
            onChange={(e) => { setPostcode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="w-full bg-transparent py-2.5 pl-9 pr-16 text-sm outline-none placeholder:text-muted-foreground uppercase"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !postcode.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? '...' : 'GO'}
          </button>
        </div>
        {error && (
          <div className="border-t border-border px-3 py-1.5 text-xs text-destructive">{error}</div>
        )}
      </div>
    </div>
  );
}

interface FellowshipMapProps {
  focusedFellowship?: FellowshipWithBranch | null;
}

// Reusable HTML for a Mapbox branch marker element — mirrors the Leaflet
// div-icon styling in the original implementation.
function branchMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'fellowship-marker-icon';
  el.innerHTML = `
    <div style="
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #6366f1;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
      </svg>
    </div>
  `;
  return el;
}

function userMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'fellowship-marker-icon';
  el.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`;
  return el;
}

function smallBranchMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'fellowship-marker-icon';
  el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg></div>`;
  return el;
}

export default function FellowshipMap({ focusedFellowship }: FellowshipMapProps) {
  const { theme } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapDestroyingRef = useRef(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const [stage, setStage] = useState<MapStage>('globe');
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [selectedFellowship, setSelectedFellowship] = useState<FellowshipWithBranch | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [joinSubmitted, setJoinSubmitted] = useState(false);
  const [joinPanelFellowship, setJoinPanelFellowship] = useState<{ id: string; name: string; type: string; schedule: string } | null>(null);
  const [joinRequestSent, setJoinRequestSent] = useState(false);
  const [nearestBranch, setNearestBranch] = useState<{ branch: BranchLocation; distanceKm: number; userCoords: [number, number] } | null>(null);

  const { data: listData } = useFellowships({ page: 1, limit: 200 });
  const fellowships = (listData?.data ?? []) as FellowshipWithBranch[];
  const fellowshipsRef = useRef<FellowshipWithBranch[]>([]);
  fellowshipsRef.current = fellowships;

  const createJoinRequest = useCreateJoinRequest();

  const isDark = theme === 'dark';

  // ── Listen for join button clicks from Mapbox popups ──

  useEffect(() => {
    const handleJoin = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        setJoinPanelFellowship({ id: detail.id, name: detail.name, type: detail.type, schedule: detail.schedule });
        setJoinRequestSent(false);
      }
    };
    const handleJoinStatic = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.name) {
        setJoinPanelFellowship({ id: '', name: detail.name, type: detail.type, schedule: detail.schedule });
        setJoinRequestSent(false);
      }
    };
    window.addEventListener('fellowship-join', handleJoin);
    window.addEventListener('fellowship-join-static', handleJoinStatic);
    return () => {
      window.removeEventListener('fellowship-join', handleJoin);
      window.removeEventListener('fellowship-join-static', handleJoinStatic);
    };
  }, []);

  // ── Handle join request submission ─────────────────────

  const handleJoinRequest = () => {
    if (!joinPanelFellowship) return;

    if (joinPanelFellowship.id) {
      createJoinRequest.mutate(
        { fellowshipId: joinPanelFellowship.id, data: { notes: 'Requested via fellowship map' } },
        {
          onSuccess: () => {
            setJoinRequestSent(true);
            toast.success('Request sent! The fellowship leader and admin have been notified.');
          },
          onError: () => {
            toast.error('Could not send request. You may already have a pending request.');
          },
        },
      );
    } else {
      setJoinRequestSent(true);
      toast.success('Request noted! Contact your branch admin to join this fellowship.');
    }
  };

  // ── Map initialization (recreates on theme change) ─────

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      // Without a token Mapbox refuses to render. Surface a hint rather than a
      // silent grey box.
      // eslint-disable-next-line no-console
      console.warn('NEXT_PUBLIC_MAPBOX_TOKEN is not set — fellowship map disabled.');
      return;
    }
    mapboxgl.accessToken = token;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: isDark ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT,
      center: [0, 20],
      zoom: 1.5,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    const timer = setTimeout(() => map.resize(), 200);
    const container = mapContainer.current;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    mapRef.current = map;

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      mapDestroyingRef.current = true;
      map.remove();
      mapRef.current = null;
      mapDestroyingRef.current = false;
    };
  }, [isDark]);

  // ── React to focused fellowship from parent ────────────

  useEffect(() => {
    if (!mapRef.current || !focusedFellowship) return;

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    const BRANCH_COORDS: Record<string, [number, number]> = {
      'Kharis London Central': [51.4934, -0.0998],
      'Kharis Manchester': [53.4808, -2.2426],
      'Kharis Accra': [5.6037, -0.1870],
      'Kharis Kumasi': [6.6885, -1.6244],
      'Kharis Freetown': [8.4657, -13.2317],
    };

    const { fellowshipName, meetingSchedule, fellowshipType, branchName } = focusedFellowship;

    const { latitude, longitude } = focusedFellowship;
    const branchFallback = branchName ? BRANCH_COORDS[branchName] : undefined;
    const latLng: [number, number] | null =
      latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined
        ? [latitude, longitude]
        : (branchFallback ?? null);

    if (latLng) {
      mapRef.current.flyTo({ center: ll(latLng), zoom: 12, duration: 1200 });

      const color = TYPE_COLORS[fellowshipType] || '#6366f1';
      const nextMeeting = meetingSchedule ? getNextMeetingDate(meetingSchedule) : null;
      const scheduleInfo = nextMeeting
        ? `<div style="margin-top:6px;font-size:12px;color:#374151;">Next meeting: <strong style="color:#111827;">${nextMeeting}</strong></div>`
        : meetingSchedule
          ? `<div style="margin-top:6px;font-size:12px;color:#374151;">${meetingSchedule}</div>`
          : '';

      const popupContent = `
        <div style="min-width:180px;padding:4px 0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></div>
            <strong style="font-size:13px;color:#111827;">${fellowshipName}</strong>
          </div>
          <div style="margin-top:4px;font-size:11px;color:#6b7280;">${branchName || ''}</div>
          ${scheduleInfo}
        </div>
      `;

      const popup = new mapboxgl.Popup({
        closeButton: true,
        className: 'fellowship-focus-popup',
        offset: 10,
      })
        .setLngLat(ll(latLng))
        .setHTML(popupContent)
        .addTo(mapRef.current);

      popup.on('close', () => {
        if (!mapDestroyingRef.current && mapRef.current) {
          mapRef.current.flyTo({ center: [0, 20], zoom: 1.5, duration: 1500 });
        }
      });

      popupRef.current = popup;
    }
  }, [focusedFellowship]);

  // ── Clear markers ──────────────────────────────────────

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Also clear any nearest-line source/layer that may still be present.
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      if (map.getLayer(NEAREST_LINE_LAYER)) map.removeLayer(NEAREST_LINE_LAYER);
      if (map.getSource(NEAREST_LINE_SOURCE)) map.removeSource(NEAREST_LINE_SOURCE);
    }
  }, []);

  // ── Fly to country ─────────────────────────────────────

  const flyToCountry = useCallback((country: CountryData) => {
    if (!mapRef.current) return;
    setSelectedCountry(country);
    setStage('country');
    setSelectedFellowship(null);
    setShowConfirmation(false);
    setJoinSubmitted(false);

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    mapRef.current.flyTo({ center: ll(country.center), zoom: country.zoom, duration: 1500 });

    setTimeout(() => {
      clearMarkers();
      if (!mapRef.current) return;

      const countryBranches = BRANCH_LOCATIONS.filter((b) => b.country === country.name);

      countryBranches.forEach((branch) => {
        const apiFellowships = fellowshipsRef.current.filter((f) => f.branchName === branch.name);
        const fellowshipTypes = branch.fellowships;

        const fellowshipSections = fellowshipTypes.map((type) => {
          const color = TYPE_COLORS[type] || '#6366f1';

          const apiMatching = apiFellowships.filter((f) => f.fellowshipType === type);
          const staticMatching = branch.fellowshipDetails.filter((f) => f.type === type);

          let detailCards: string;
          if (apiMatching.length > 0) {
            detailCards = apiMatching.map((f) => {
              const nextMeeting = f.meetingSchedule ? getNextMeetingDate(f.meetingSchedule) : null;
              return `
                <div style="padding:8px 10px;border:1px solid rgba(148,163,184,0.2);border-radius:8px;margin-top:6px;background:rgba(99,102,241,0.04);">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
                    <strong style="font-size:12px;color:#111827;">${f.fellowshipName}</strong>
                  </div>
                  ${nextMeeting ? `<div style="margin-top:5px;font-size:11px;color:#374151;">Next meeting: <strong style="color:#111827;">${nextMeeting}</strong></div>` : ''}
                  ${f.description ? `<div style="margin-top:3px;font-size:11px;color:#6b7280;">${f.description}</div>` : ''}
                  <button onclick="window.dispatchEvent(new CustomEvent('fellowship-join', {detail:{id:'${f.id}',name:'${f.fellowshipName.replace(/'/g, "\\'")}',type:'${f.fellowshipType}',schedule:'${(f.meetingSchedule || '').replace(/'/g, "\\'")}'} }))" style="margin-top:8px;width:100%;padding:6px 12px;background:#6366f1;color:white;border:none;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;">Request to Join</button>
                </div>
              `;
            }).join('');
          } else {
            detailCards = staticMatching.map((f) => {
              const nextMeeting = getNextMeetingDate(f.schedule);
              return `
                <div style="padding:8px 10px;border:1px solid rgba(148,163,184,0.2);border-radius:8px;margin-top:6px;background:rgba(99,102,241,0.04);">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
                    <strong style="font-size:12px;color:#111827;">${f.name}</strong>
                  </div>
                  ${nextMeeting ? `<div style="margin-top:5px;font-size:11px;color:#374151;">Next meeting: <strong style="color:#111827;">${nextMeeting}</strong></div>` : ''}
                  <div style="margin-top:3px;font-size:11px;color:#6b7280;">${f.description}</div>
                  <button onclick="window.dispatchEvent(new CustomEvent('fellowship-join-static', {detail:{name:'${f.name.replace(/'/g, "\\'")}',type:'${f.type}',schedule:'${f.schedule.replace(/'/g, "\\'")}'} }))" style="margin-top:8px;width:100%;padding:6px 12px;background:#6366f1;color:white;border:none;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;">Request to Join</button>
                </div>
              `;
            }).join('');
          }

          return `
            <details style="margin-top:6px;">
              <summary style="display:inline-block;background:${color};color:white;padding:5px 14px;border-radius:12px;font-size:11px;font-weight:500;cursor:pointer;list-style:none;user-select:none;">
                ${type}
              </summary>
              <div style="margin-top:4px;padding-left:4px;">
                ${detailCards}
              </div>
            </details>
          `;
        }).join('');

        const popupContent = `
          <div style="min-width:240px;max-width:300px;padding:6px 0;">
            <strong style="font-size:14px;display:block;margin-bottom:8px;">${branch.name}</strong>
            <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Tap a fellowship type to see details:</div>
            ${fellowshipSections}
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 20,
          maxWidth: '320px',
          className: 'fellowship-focus-popup',
        }).setHTML(popupContent);

        const marker = new mapboxgl.Marker({ element: branchMarkerElement() })
          .setLngLat(ll(branch.coords))
          .setPopup(popup)
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    }, 1600);
  }, [clearMarkers]);

  // ── Back to globe ──────────────────────────────────────

  const backToGlobe = () => {
    setStage('globe');
    setSelectedCountry(null);
    setSelectedFellowship(null);
    setShowConfirmation(false);
    setJoinSubmitted(false);
    clearMarkers();

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [0, 20], zoom: 1.5, duration: 1500 });
    }
  };

  // ── Back to country ────────────────────────────────────

  const backToCountry = () => {
    if (!selectedCountry) return backToGlobe();
    setStage('country');
    setSelectedFellowship(null);
    setShowConfirmation(false);

    if (mapRef.current) {
      mapRef.current.flyTo({ center: ll(selectedCountry.center), zoom: selectedCountry.zoom, duration: 1200 });
    }
  };

  // ── Confirm join ───────────────────────────────────────

  const handleConfirmJoin = () => {
    setJoinSubmitted(true);
    toast.success('Join request sent! The fellowship leader will be notified.');
  };

  // ── Estimate wait time ─────────────────────────────────

  const getWaitTime = () => {
    const hours = Math.floor(Math.random() * 48) + 2;
    if (hours < 24) return `~${hours} hours`;
    const days = Math.ceil(hours / 24);
    return `~${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <div className="relative" style={{ height: '500px', width: '100%' }}>
      {/* Map container */}
      <div ref={mapContainer} style={{ height: '500px', width: '100%' }} />

      {/* Top navigation breadcrumb */}
      <div className="absolute left-4 top-4 z-[1000] flex items-center gap-2">
        {stage !== 'globe' && (
          <Button
            size="sm"
            variant="outline"
            onClick={stage === 'detail' ? backToCountry : backToGlobe}
            className="bg-background/80 backdrop-blur-sm"
          >
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {stage === 'detail' ? selectedCountry?.name : 'Globe'}
          </Button>
        )}
        {stage === 'globe' && (
          <div className="rounded-lg bg-background/80 px-4 py-2 backdrop-blur-sm">
            <h2 className="text-sm font-semibold">Find a Fellowship Near You</h2>
            <p className="text-xs text-muted-foreground">Search for your country</p>
          </div>
        )}
      </div>

      {/* Country search (bottom right) */}
      <CountrySearch countries={COUNTRIES} onSelect={flyToCountry} />

      {/* Postcode search (above country search) */}
      <PostcodeSearch onLocate={(lat, lng) => {
        if (mapRef.current) {
          let nearest: BranchLocation | null = null;
          let minDist = Infinity;

          BRANCH_LOCATIONS.forEach((branch) => {
            const dLat = (branch.coords[0] - lat) * (Math.PI / 180);
            const dLng = (branch.coords[1] - lng) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat * Math.PI / 180) * Math.cos(branch.coords[0] * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
            const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (km < minDist) {
              minDist = km;
              nearest = branch;
            }
          });

          if (nearest) {
            const nearestBranchRef = nearest as BranchLocation;
            setNearestBranch({ branch: nearestBranchRef, distanceKm: minDist, userCoords: [lat, lng] });

            const bounds = new mapboxgl.LngLatBounds()
              .extend([lng, lat])
              .extend(ll(nearestBranchRef.coords));
            mapRef.current.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 60, right: 60 }, duration: 1500 });

            clearMarkers();

            const userMarker = new mapboxgl.Marker({ element: userMarkerElement() })
              .setLngLat([lng, lat])
              .setPopup(new mapboxgl.Popup({ offset: 12 }).setText('You'))
              .addTo(mapRef.current);
            markersRef.current.push(userMarker);

            const branchMarker = new mapboxgl.Marker({ element: smallBranchMarkerElement() })
              .setLngLat(ll(nearestBranchRef.coords))
              .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(nearestBranchRef.name))
              .addTo(mapRef.current);
            markersRef.current.push(branchMarker);

            // Dashed line between user and branch — GeoJSON source + line layer
            const addLine = () => {
              const map = mapRef.current;
              if (!map) return;
              if (map.getLayer(NEAREST_LINE_LAYER)) map.removeLayer(NEAREST_LINE_LAYER);
              if (map.getSource(NEAREST_LINE_SOURCE)) map.removeSource(NEAREST_LINE_SOURCE);

              map.addSource(NEAREST_LINE_SOURCE, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [[lng, lat], ll(nearestBranchRef.coords)],
                  },
                },
              });
              map.addLayer({
                id: NEAREST_LINE_LAYER,
                type: 'line',
                source: NEAREST_LINE_SOURCE,
                paint: {
                  'line-color': '#6366f1',
                  'line-width': 2,
                  'line-dasharray': [2, 3],
                  'line-opacity': 0.7,
                },
              });
            };
            if (mapRef.current.isStyleLoaded()) addLine();
            else mapRef.current.once('load', addLine);
          }
        }
      }} />

      {/* Fellowship detail panel */}
      {selectedFellowship && stage === 'detail' && (
        <div className="absolute bottom-6 right-4 z-[1000] w-80">
          <Card className="bg-background/95 shadow-xl backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{selectedFellowship.fellowshipName}</CardTitle>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: TYPE_COLORS[selectedFellowship.fellowshipType] || '#6366f1' }}
                >
                  {selectedFellowship.fellowshipType}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-1.5 text-sm">
                <p className="text-muted-foreground">{selectedFellowship.branchName}</p>
                {selectedFellowship.description && (
                  <p className="text-muted-foreground">{selectedFellowship.description}</p>
                )}
                {selectedFellowship.meetingDay && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span className="font-medium">{selectedFellowship.meetingDay}</span>
                  </div>
                )}
                {selectedFellowship.meetingTime && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{selectedFellowship.meetingTime}</span>
                  </div>
                )}
                {selectedFellowship.meetingSchedule && (
                  <p className="text-xs text-muted-foreground">{selectedFellowship.meetingSchedule}</p>
                )}
              </div>

              {!showConfirmation && !joinSubmitted && (
                <Button
                  className="w-full"
                  onClick={() => setShowConfirmation(true)}
                >
                  This is near me, I want to join
                </Button>
              )}

              {showConfirmation && !joinSubmitted && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-sm font-medium">Confirm your interest</p>
                  <p className="text-xs text-muted-foreground">
                    The fellowship leader will be notified of your request.
                    Estimated response time: <span className="font-semibold text-foreground">{getWaitTime()}</span>
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={handleConfirmJoin}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowConfirmation(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {joinSubmitted && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Request sent!</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The leader will review your request. You&apos;ll be notified once approved.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Join request panel */}
      {joinPanelFellowship && (
        <div className="absolute top-4 right-14 z-[1000] w-72">
          <Card className="bg-background/95 shadow-xl backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm">{joinPanelFellowship.name}</CardTitle>
                <button
                  onClick={() => setJoinPanelFellowship(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="text-xs text-muted-foreground">
                <span className="inline-block rounded-full px-2 py-0.5 text-white text-[10px] font-medium mr-2" style={{ backgroundColor: TYPE_COLORS[joinPanelFellowship.type] || '#6366f1' }}>
                  {joinPanelFellowship.type}
                </span>
                {joinPanelFellowship.schedule}
              </div>

              {!joinRequestSent ? (
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleJoinRequest}
                  disabled={createJoinRequest.isPending}
                >
                  {createJoinRequest.isPending ? 'Sending...' : 'Request to Join'}
                </Button>
              ) : (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Request sent!</p>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    The fellowship leader and admin have been notified.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Nearest branch travel info */}
      {nearestBranch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[520px] max-w-[95vw]">
          <Card className="bg-background/95 shadow-xl backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6 max-h-[460px] overflow-y-auto">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-sm text-muted-foreground">Nearest fellowship</p>
                  <p className="font-bold text-xl mt-1">{nearestBranch.branch.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{nearestBranch.distanceKm.toFixed(1)} km away</p>
                </div>
                <button
                  onClick={() => {
                    setNearestBranch(null);
                    clearMarkers();
                    if (mapRef.current) {
                      mapRef.current.flyTo({ center: [0, 20], zoom: 1.5, duration: 1500 });
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                {[
                  { label: 'Walk', mins: Math.round(nearestBranch.distanceKm / 5 * 60), mode: 'walking', icon: '<path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>' },
                  { label: 'Bus', mins: Math.round(nearestBranch.distanceKm / 20 * 60), mode: 'transit', icon: '<path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>' },
                  { label: 'Car', mins: Math.round(nearestBranch.distanceKm / 40 * 60), mode: 'driving', icon: '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>' },
                  { label: 'Train', mins: Math.round(nearestBranch.distanceKm / 60 * 60), mode: 'transit', icon: '<path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm2 0V6h5v5h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>' },
                ].map(({ label, mins, mode, icon }) => {
                  const hours = Math.floor(mins / 60);
                  const remainMins = mins % 60;
                  const display = hours > 0 ? `${hours}h ${remainMins}m` : `${mins}m`;
                  const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${nearestBranch.userCoords[0]},${nearestBranch.userCoords[1]}&destination=${nearestBranch.branch.coords[0]},${nearestBranch.branch.coords[1]}&travelmode=${mode}`;
                  const wazeUrl = `https://waze.com/ul?ll=${nearestBranch.branch.coords[0]},${nearestBranch.branch.coords[1]}&navigate=yes`;

                  if (label === 'Car') {
                    return (
                      <div key={label} className="text-center rounded-2xl border border-border/60 bg-background p-4 shadow-sm hover:shadow-md transition-all">
                        <svg className="mx-auto h-8 w-8 text-primary mb-2" viewBox="0 0 24 24" fill="currentColor" dangerouslySetInnerHTML={{ __html: icon }} />
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-lg font-bold mt-1 whitespace-nowrap">{display}</p>
                        <div className="flex gap-3 mt-3 justify-center items-center">
                          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-bold hover:underline">Maps</a>
                          <span className="text-sm text-muted-foreground">|</span>
                          <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-bold hover:underline">Waze</a>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <a key={label} href={googleUrl} target="_blank" rel="noopener noreferrer" className="text-center rounded-2xl border border-border/60 bg-background p-4 shadow-sm hover:shadow-md transition-all block">
                      <svg className="mx-auto h-8 w-8 text-primary mb-2" viewBox="0 0 24 24" fill="currentColor" dangerouslySetInnerHTML={{ __html: icon }} />
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-lg font-bold mt-1 whitespace-nowrap">{display}</p>
                      <p className="text-xs text-primary font-semibold mt-3">View route →</p>
                    </a>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-border pt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Available fellowships:</p>
                <div className="space-y-2">
                  {nearestBranch.branch.fellowshipDetails.map((f) => {
                    const color = TYPE_COLORS[f.type] || '#6366f1';
                    const nextMeeting = getNextMeetingDate(f.schedule);
                    return (
                      <details key={f.name} className="w-full">
                        <summary
                          className="flex items-center justify-between rounded-full px-4 py-2 text-sm font-medium text-white cursor-pointer list-none"
                          style={{ backgroundColor: color }}
                        >
                          <span>{f.type}</span>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </summary>
                        <div className="mt-2 ml-2 rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-sm font-medium">{f.name}</p>
                          {nextMeeting && <p className="text-xs text-muted-foreground mt-1">Next meeting: <span className="font-medium text-foreground">{nextMeeting}</span></p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend - hide when nearest branch panel is showing */}
      {!nearestBranch && (
      <div className="absolute bottom-6 left-4 z-[1000]">
        <div className="rounded-lg bg-background/90 p-3 shadow-md backdrop-blur-sm">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Fellowship Types</p>
          <div className="space-y-1">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Custom styles */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        .mapboxgl-map {
          background: ${isDark ? '#0a0a12' : '#aad3df'} !important;
        }
        .fellowship-marker-icon > div:hover {
          transform: scale(1.2);
        }
        /* Themed popup shell so the white-on-dark text isn't harsh. */
        .mapboxgl-popup-content {
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}
