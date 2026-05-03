/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserLocation } from '../types';

export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation | null>(() => {
    // Load cached location for instant UI on first render
    const stored = localStorage.getItem('dormpulse_last_loc');
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  const updateLocation = useCallback((position: GeolocationPosition) => {
    const newLoc: UserLocation = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
    
    console.log('📍 GPS Fix:', newLoc.lat.toFixed(6), newLoc.lon.toFixed(6), `(±${Math.round(newLoc.accuracy || 0)}m)`);
    
    // Always accept fresh GPS data
    localStorage.setItem('dormpulse_last_loc', JSON.stringify(newLoc));
    setLocation(newLoc);
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    console.error('❌ Geolocation error:', err.message);
    setError(getErrorMessage(err));
    setLoading(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Clean up any existing watcher
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setLoading(true);
    setError(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,      // Increased to 15s for better cold-start locks
      maximumAge: 5000,    // Allow 5s old cached positions for faster initial response
    };

    console.log('📡 Requesting GPS Lock (High Accuracy)...');

    // One-shot for immediate result
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('✅ Initial GPS Lock acquired');
        updateLocation(pos);
      }, 
      (err) => {
        console.warn('⚠️ High Accuracy failed, trying standard accuracy...', err.message);
        // Fallback to low accuracy if high accuracy fails
        navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
          ...options,
          enableHighAccuracy: false,
          timeout: 10000
        });
      }, 
      options
    );

    // Continuous watch for updates
    watchIdRef.current = navigator.geolocation.watchPosition(updateLocation, handleError, options);
  }, [updateLocation, handleError]);

  // Start tracking on mount
  useEffect(() => {
    startTracking();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startTracking]);

  const refresh = useCallback(() => {
    console.log('🔄 GPS Refresh requested');
    startTracking();
  }, [startTracking]);

  return { location, error, loading, refresh };
}

function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Permission Denied: Please enable location permissions in your browser settings.';
    case error.POSITION_UNAVAILABLE:
      return 'Position Unavailable: Location information is currently unavailable.';
    case error.TIMEOUT:
      return 'Timeout: Location request timed out. Please try again.';
    default:
      return 'Unknown Error: An unknown error occurred while detecting location.';
  }
}
