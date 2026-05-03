/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { DormFacility, UserLocation } from '../types';
import { useEffect, useState } from 'react';
import { LocateFixed, MapPin, Star, Phone } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MapDisplayProps {
  userLocation: UserLocation;
  facilities: DormFacility[];
  selectedFacility: DormFacility | null;
  onSelectFacility: (facility: DormFacility) => void;
  onManualLocationChange?: (location: UserLocation) => void;
  isDarkMode?: boolean;
  recenterTrigger?: number;
}

// Custom Marker Icons for Housing
const getIcon = (category: string, isDarkMode?: boolean) => {
  const colors: Record<string, string> = {
    university: '#3B82F6', // Blue
    private: '#10B981', // Green
    residence: '#8B5CF6', // Purple
    coliving: '#F97316', // Orange
    hostel: '#6B8E61', // Sage
    studio: '#06B6D4', // Cyan
  };

  const icons: Record<string, string> = {
    university: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    private: '<path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3Z"/><path d="M9 21V9m6 12V9"/>',
    residence: '<path d="M3 21h18M3 10h18M5 6h2m4 0h2m4 0h2M5 14h2m4 0h2m4 0h2M5 18h2m4 0h2m4 0h2"/>',
    coliving: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    hostel: '<path d="M2 22v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3"/><path d="M4 17V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12"/><path d="M9 13v-2a3 3 0 0 1 6 0v2"/><path d="M9 13h6"/>',
    studio: '<path d="M12 2v20"/><path d="M2 12h20"/>',
  };

  const activeIcon = icons[category] || icons['university'];
  const activeColor = colors[category] || colors['university'];

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="medical-marker natural-shadow" style="background-color: ${isDarkMode ? '#1E211E' : '#FFFFFF'}; color: ${activeColor}; border: 2px solid ${isDarkMode ? activeColor : activeColor}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${activeIcon}</svg>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Internal controller to handle map movements
function MapController({ 
    userCoords, 
    isFollowing, 
    selectedFacility, 
    recenterTrigger 
}: { 
    userCoords: [number, number], 
    isFollowing: boolean, 
    selectedFacility: DormFacility | null,
    recenterTrigger?: number
}) {
  const map = useMap();

  // Follow user location
  useEffect(() => {
    if (isFollowing) {
      map.flyTo(userCoords, map.getZoom(), { duration: 1.5 });
    }
  }, [userCoords, isFollowing, map]);

  // Handle manual recenter trigger
  useEffect(() => {
    if (recenterTrigger) {
      map.flyTo(userCoords, 15, { duration: 1.5 });
    }
  }, [recenterTrigger, userCoords, map]);

  // Handle facility selection
  useEffect(() => {
    if (selectedFacility) {
      map.flyTo([selectedFacility.lat, selectedFacility.lon], 16, { duration: 1.5 });
    }
  }, [selectedFacility, map]);

  return null;
}

export default function MapDisplay({ 
  userLocation, 
  facilities, 
  selectedFacility, 
  onSelectFacility,
  onManualLocationChange,
  isDarkMode,
  recenterTrigger
}: MapDisplayProps) {
  const [isFollowing, setIsFollowing] = useState(true);
  const userCoords: [number, number] = [userLocation.lat, userLocation.lon];

  const handleRecenter = () => {
    setIsFollowing(true);
  };

  return (
    <div className="w-full h-full relative" id="map-container">
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
        {/* Recenter / Follow Toggle */}
        <button
          onClick={() => setIsFollowing(!isFollowing)}
          className={`p-4 rounded-[1.5rem] natural-shadow transition-all active:scale-95 border flex items-center justify-center ${
            isFollowing 
              ? 'bg-blue-500 text-white border-blue-600 shadow-xl shadow-blue-500/20' 
              : 'bg-white dark:bg-dark-surface text-slate-600 dark:text-dark-text border-slate-200 dark:border-dark-border'
          }`}
          title={isFollowing ? 'Following your location' : 'Click to follow your location'}
        >
          <div className="relative">
            <LocateFixed size={20} className={isFollowing ? 'animate-pulse' : ''} />
            {isFollowing && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full border-2 border-blue-500 animate-ping"></span>
            )}
          </div>
        </button>
      </div>

      <MapContainer 
        center={userCoords} 
        zoom={14} 
        scrollWheelZoom={true} 
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={isDarkMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        
        <MapController 
            userCoords={userCoords} 
            isFollowing={isFollowing} 
            selectedFacility={selectedFacility}
            recenterTrigger={recenterTrigger}
        />

        {/* User Location Marker */}
        <Circle 
          center={userCoords} 
          radius={userLocation.accuracy || 20} 
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1
          }} 
        />
        <Marker 
          position={userCoords} 
          draggable={true}
          zIndexOffset={1000}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              if (onManualLocationChange) {
                onManualLocationChange({
                  lat: position.lat,
                  lon: position.lng,
                  accuracy: 0
                });
              }
            },
          }}
          icon={L.divIcon({
            className: 'user-marker-container',
            html: `
              <div class="relative flex items-center justify-center group cursor-grab active:cursor-grabbing">
                <div class="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping group-hover:bg-blue-500/30"></div>
                <div class="relative w-6 h-6 bg-blue-500 border-4 border-white rounded-full shadow-2xl flex items-center justify-center">
                  <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
            `,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
          })}
        />

        {/* Facility Markers */}
        {facilities.map((fac) => (
          <Marker
            key={fac.id}
            position={[fac.lat, fac.lon]}
            icon={getIcon(fac.category, isDarkMode)}
            eventHandlers={{
              click: () => onSelectFacility(fac),
            }}
          >
            <Popup className={isDarkMode ? 'dark-popup' : ''}>
              <div className="p-3 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                    fac.isCustom ? "bg-blue-500/10 text-blue-600" : "bg-slate-500/10 text-slate-600"
                  )}>
                    {fac.category}
                  </span>
                  {fac.rating && (
                    <div className="flex items-center gap-1">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-black">{fac.rating}</span>
                    </div>
                  )}
                </div>
                <h3 className={`font-black text-sm leading-tight mb-1 ${isDarkMode ? 'text-dark-text' : 'text-slate-900'}`}>{fac.name}</h3>
                <p className="text-[10px] opacity-60 font-medium mb-3 line-clamp-2">{fac.address}</p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onSelectFacility(fac)}
                    className="flex-1 py-2 bg-medical-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                  >
                    Details
                  </button>
                  {fac.phone && fac.phone !== 'N/A' && (
                    <a 
                      href={`tel:${fac.phone}`}
                      className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-600 dark:text-dark-text"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
