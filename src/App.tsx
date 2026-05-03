/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import AdminPanel from './components/AdminPanel';
import { api } from './api';
import { Home, Search, Map as MapIcon, List, Settings2, ShieldAlert, Heart, ChevronRight, ChevronLeft, Phone, Navigation, X, XIcon, MapPin, LocateFixed, Building2, Bed, Building, GraduationCap, Map as MapPlaceholder, Sun, Moon, User, ShieldCheck, TrendingUp, Facebook, Instagram, Twitter, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGeolocation } from './hooks/useGeolocation';
import { DormFacility, UserLocation, DormCategory } from './types';
import { fetchNearbyHousing, calculateDistance } from './services/housingService';
import MapDisplay from './components/MapDisplay';
import FacilityCard from './components/FacilityCard';

import AuthScreen from './components/AuthScreen';
import { translations, languages, type LanguageCode } from './translations';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { location: rawLocation, error: geoError, loading: geoLoading, refresh: refreshGeo } = useGeolocation();
  const [activeLocation, setActiveLocation] = useState<UserLocation | null>(null);
  const [facilities, setFacilities] = useState<DormFacility[]>([]);
  const [adminDorms, setAdminDorms] = useState<DormFacility[]>([]);
  const allFacilities = useMemo(() => {
    const combined = [...facilities, ...adminDorms];
    return combined.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [facilities, adminDorms]);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Track the timestamp of the last manual refresh request
  const [lastRefreshRequest, setLastRefreshRequest] = useState(0);

  // Sync raw location to active location if not manual
  useEffect(() => {
    if (rawLocation && !isManualLocation && hasInteracted) {
      setActiveLocation(rawLocation);
      
      // If we have a pending refresh request and this location is fresh (newer than the request)
      if (lastRefreshRequest > 0 && rawLocation.timestamp && rawLocation.timestamp >= lastRefreshRequest) {
        setLastRefreshRequest(0); // Reset request
        loadData(rawLocation);
      }
    }
  }, [rawLocation, isManualLocation, hasInteracted, lastRefreshRequest]);

  // Reverse Geocoding to show Municipality/Address in Search Bar
  useEffect(() => {
    if (activeLocation && !isManualLocation && hasInteracted) {
      const reverseGeocode = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${activeLocation.lat}&lon=${activeLocation.lon}`);
          const data = await res.json();
          if (data && data.display_name) {
            const addr = data.address;
            // Short readable name for the search bar (Prioritizing specific town/village names)
            const shortName = addr.village || addr.town || addr.municipality || addr.suburb || addr.city_district || addr.city || 'Your Location';
            setLocationName(shortName);
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
        }
      };
      reverseGeocode();
    }
  }, [activeLocation, isManualLocation, hasInteracted]);

  const [selectedFacility, setSelectedFacility] = useState<DormFacility | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list');

  const [searchQuery, setSearchQuery] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [savedFacilities, setSavedFacilities] = useState<DormFacility[]>(() => {
    const saved = localStorage.getItem('dormpulse_saved');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('housing_logged_in') === 'true');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('housing_is_admin') === 'true');
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const stored = localStorage.getItem('dormpulse_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<DormFacility | null>(null);
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const t = translations[currentLang];



  const [lastFetchLocation, setLastFetchLocation] = useState<UserLocation | null>(null);

  // Auto-open AuthScreen for Password Reset Link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('reset_token')) {
      setIsAuthOpen(true);
    }
  }, []);

  // Fetch facilities when location changes
  useEffect(() => {
    if (activeLocation && hasInteracted) {
      if (!lastFetchLocation) {
        loadData(activeLocation);
      } else {
        const distanceMoved = calculateDistance(
          activeLocation.lat,
          activeLocation.lon,
          lastFetchLocation.lat,
          lastFetchLocation.lon
        );
        // Refresh if moved more than 200 meters for a more real-time feel
        if (distanceMoved > 0.2) {
          loadData(activeLocation);
        }
      }
    }
  }, [activeLocation, lastFetchLocation, hasInteracted]);

  // Handle geolocation errors to stop loading states
  useEffect(() => {
    if (geoError) {
      setIsLoading(false);
    }
  }, [geoError]);

  // Load favorites from DB when logged in
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      api.getFavorites(currentUser.id).then(favIds => {
        setSavedFacilities(prev => {
          const existingValid = prev.filter(f => favIds.includes(f.id));
          const existingIds = existingValid.map(f => f.id);
          const newlyFound = allFacilities.filter(f => favIds.includes(f.id) && !existingIds.includes(f.id));
          return [...existingValid, ...newlyFound];
        });
      }).catch(err => console.error("Failed to load favorites", err));
    }
  }, [isLoggedIn, currentUser?.id, allFacilities]);

  // Save to localStorage when changed (fallback)

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('dormpulse_saved', JSON.stringify(savedFacilities));
  }, [savedFacilities]);

  const [showAdmin, setShowAdmin] = useState(() => localStorage.getItem('housing_show_admin') === 'true');
  
  // Persist authentication state
  useEffect(() => {
    localStorage.setItem('housing_logged_in', isLoggedIn.toString());
    localStorage.setItem('housing_is_admin', isAdmin.toString());
    localStorage.setItem('housing_show_admin', showAdmin.toString());
  }, [isLoggedIn, isAdmin, showAdmin]);

  // Load admin created dorms and calculate distance if location exists
  useEffect(() => {
    const loadAdminUnits = async () => {
      try {
        const data = await api.getUnits();
        if (activeLocation) {
          const withDistance = data.map((d: any) => ({
            ...d,
            distance: calculateDistance(activeLocation.lat, activeLocation.lon, d.lat, d.lon),
            rating: d.rating || (Math.floor(Math.random() * 2) + 3.5),
            isCustom: true,
            is_featured: d.is_featured
          })).sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
          setAdminDorms(withDistance);
        } else {
          setAdminDorms(data.map((d: any) => ({ ...d, isCustom: true, is_featured: d.is_featured })));
        }
      } catch (e) {
        console.error("Failed to fetch admin units", e);
      }
    };
    loadAdminUnits();
  }, [showAdmin, activeLocation]);

  // Update distances for all facilities in real-time whenever location changes
  useEffect(() => {
    if (activeLocation) {
      setFacilities(prev => 
        prev.map(f => ({
          ...f,
          distance: calculateDistance(activeLocation.lat, activeLocation.lon, f.lat, f.lon)
        })).sort((a, b) => (a.distance || 0) - (b.distance || 0))
      );
      
      setAdminDorms(prev => 
        prev.map(d => ({
          ...d,
          distance: calculateDistance(activeLocation.lat, activeLocation.lon, d.lat, d.lon)
        })).sort((a, b) => (a.distance || 0) - (b.distance || 0))
      );
    }
  }, [activeLocation]);

  const loadData = async (loc: UserLocation) => {
    setIsLoading(true);
    setLastFetchLocation(loc);
    
    // 1. Trigger Admin Units Refresh (handled via useEffect dependencies, but we ensure it's fresh)
    // 2. Fetch Global Housing (OSM) - Default 30km
    setIsGlobalLoading(true);
    fetchNearbyHousing(loc, 30000).then(osmData => {
      setIsGlobalLoading(false);
      setIsLoading(false);
      if (!osmData || osmData.length === 0) {
          console.log('🌍 Global: No units found in radius.');
          if (facilities.length === 0 && adminDorms.length === 0) setError("No housing found in this 30km area.");
          return;
      }
      console.log(`🌍 Global: Found ${osmData.length} housing units.`);

      const osmWithDist = osmData.map(d => ({
        ...d,
        distance: calculateDistance(loc.lat, loc.lon, d.lat, d.lon)
      }));

      setFacilities(osmWithDist);
      // Clear any previous error when we successfully find housing
      if (osmWithDist.length > 0) setError(null);
    }).catch(err => {
      console.warn("Global housing fetch failed or timed out.");
      setIsGlobalLoading(false);
      setIsLoading(false);
      if (facilities.length === 0 && adminDorms.length === 0) setError("Unable to load housing data. Please try again.");
    });
  };



  const featuredUnits = useMemo(() => {
    // Priority 1: Admin units marked as featured
    const featuredAdmin = adminDorms.filter((d: any) => d.is_featured);
    if (featuredAdmin.length > 0) return featuredAdmin;
    
    // Priority 2: Any admin units
    if (adminDorms.length > 0) return adminDorms;
    
    // Fallback: Global facilities
    return facilities;
  }, [adminDorms, facilities]);

  const filteredFacilities = useMemo(() => {
    return allFacilities.filter(f => {
      const query = searchQuery.toLowerCase();
      const matchSearch = f.name.toLowerCase().includes(query) ||
        f.category.toLowerCase().includes(query) ||
        f.address.toLowerCase().includes(query);
      return matchSearch;
    });
  }, [allFacilities, searchQuery]);

  const handleToggleSave = async (fac: DormFacility) => {
    if (!isLoggedIn) {
      setPendingSave(fac);
      setIsAuthOpen(true);
      return;
    }

    const isSaved = savedFacilities.some(f => f.id === fac.id);
    try {
      if (isSaved) {
        setSavedFacilities(prev => prev.filter(f => f.id !== fac.id));
        if (currentUser) {
          await api.removeFavorite(currentUser.id, fac.id);
          api.logAction({ user_id: currentUser.id, user_email: currentUser.email, action: 'REMOVE_FAVORITE', details: `Removed ${fac.name} from favorites` });
        }
      } else {
        setSavedFacilities(prev => [...prev, fac]);
        if (currentUser) {
          await api.addFavorite(currentUser.id, fac.id);
          api.logAction({ user_id: currentUser.id, user_email: currentUser.email, action: 'ADD_FAVORITE', details: `Added ${fac.name} to favorites` });
        }
      }
    } catch (e) {
      console.error("Favorite operation failed", e);
    }
  };

  const onAuthSuccess = (userData: any) => {
    setIsLoggedIn(true);
    setIsAdmin(userData.isAdmin);
    setCurrentUser(userData.user);
    setIsAuthOpen(false);
    
    api.logAction({ user_id: userData.user.id, user_email: userData.user.email, action: 'LOGIN', details: `User logged in as ${userData.user.role}` });

    // Persist to localStorage so refresh keeps you logged in
    localStorage.setItem('housing_logged_in', 'true');
    localStorage.setItem('housing_is_admin', userData.isAdmin ? 'true' : 'false');
    localStorage.setItem('dormpulse_user', JSON.stringify(userData.user));
    
    // Automatically take the user to the map after login
    setIsHome(false);
    setActiveTab('map');

    if (userData.isAdmin) {
      setShowAdmin(true);
    }

    if (pendingSave) {
      handleToggleSave(pendingSave);
      setPendingSave(null);
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      api.logAction({ user_id: currentUser.id, user_email: currentUser.email, action: 'LOGOUT', details: 'User logged out' });
    }
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setIsHome(true);
    setShowUserMenu(false);
    setShowAdmin(false);
    localStorage.removeItem('housing_logged_in');
    localStorage.removeItem('housing_is_admin');
    localStorage.removeItem('dormpulse_user');
    localStorage.removeItem('housing_show_admin');
  };

  const handleNearMe = () => {
    setHasInteracted(true);
    setIsManualLocation(false);
    setSearchQuery('');
    setIsLoading(true);
    // Record the time of this request to ensure we wait for a fresh GPS fix
    setLastRefreshRequest(Date.now());
    setRecenterTrigger(Date.now());
    refreshGeo();
    setIsHome(false);
    setActiveTab('map');
  };

  const handleQuickLocation = () => {
    setHasInteracted(true);
    setIsManualLocation(false);
    setSearchQuery('');
    setIsLoading(true);
    // Record the time of this request
    setLastRefreshRequest(Date.now());
    setRecenterTrigger(Date.now());
    refreshGeo();
  };

  const handleDirections = (fac: DormFacility) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${fac.lat},${fac.lon}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const currentView = useMemo(() => {
    if (isHome) return 'home';
    return activeTab;
  }, [isHome, activeTab]);

  if (geoError && !isHome) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-medical-surface p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 border border-rose-100">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-medical-text tracking-tight">Location Access Required</h2>
        <p className="text-slate-500 mt-3 max-w-md font-medium leading-relaxed">
          {geoError}
        </p>
        <p className="text-sm text-medical-primary mt-4 font-bold">
          Tip: Try opening the app in a new tab if permissions don't appear.
        </p>
        <div className="flex gap-4 mt-8 w-full max-w-sm">
          <button
            onClick={() => setIsHome(true)}
            className="flex-1 py-4 px-6 bg-white border border-medical-border text-medical-text rounded-2xl font-bold transition-all active:scale-95"
          >
            {t.backHome}
          </button>
          <button
            onClick={() => refreshGeo()}
            className="flex-1 py-4 px-6 bg-medical-primary text-white rounded-2xl font-bold natural-shadow transition-all active:scale-95"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Zero-Blocking UI: We always return the main app layout. 
  // Loading states are now handled within specific components (Sidebar/Map).
  return (
    <div className={cn(
      "min-h-screen flex flex-col font-sans transition-colors",
      isDarkMode ? "bg-dark-bg text-dark-text" : "bg-medical-surface text-medical-text"
    )}>
      {/* Non-blocking GPS Sync Bar */}
      {geoLoading && !activeLocation && (
        <div className="bg-medical-primary text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 flex items-center justify-center gap-3 animate-pulse z-[2000]">
          <LocateFixed size={12} />
          Establishing GPS Connection...
        </div>
      )}
      <AuthScreen
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setPendingSave(null);
        }}
        onSuccess={onAuthSuccess}
        isDarkMode={isDarkMode}
        t={t}
      />

      {!showAdmin ? (
        <>
          <header className={cn(
            "px-6 py-4 flex items-center justify-between z-[1000] sticky top-0 border-b transition-all shadow-lg",
            isDarkMode ? "bg-medical-primary/95 backdrop-blur-md border-white/20" : "bg-medical-primary text-white border-white/20"
          )}>
        <div className="flex items-center gap-4 z-10">
          <div
            onClick={() => setIsHome(true)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="bg-white/20 p-2 rounded-xl border border-white/10">
              <Home size={18} className="text-white" />
            </div>
            <span className="font-black tracking-tight text-lg hidden lg:block">Student House Locator</span>
          </div>
        </div>

        {/* Combined Header Search Centered - Further Expanded */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center w-full max-w-5xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden group focus-within:bg-white/20 transition-all z-0 shadow-lg">
          <div className="flex-1 flex items-center px-4 gap-3 border-r border-white/20">
            <Search size={18} className="text-white/40" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              className="bg-transparent border-none outline-none text-sm w-full py-3 text-white placeholder:text-white/40 font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 flex items-center px-4 gap-3">
            <MapPin size={18} className="text-white/40" />
            <input 
              type="text"
              placeholder="Search address or university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm text-white placeholder:text-white/40 bg-transparent flex-1 outline-none font-bold"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const query = (e.target as HTMLInputElement).value;
                  if (!query) return;
                  
                  // 1. Search Local Facilities First (Dorms in DB/OSM)
                  const localMatch = facilities.find(f => 
                    f.name.toLowerCase().includes(query.toLowerCase()) ||
                    f.address.toLowerCase().includes(query.toLowerCase())
                  );

                  if (localMatch) {
                    console.log('🎯 Found local match:', localMatch.name);
                    const newLoc = { lat: localMatch.lat, lon: localMatch.lon, accuracy: 0 };
                    setActiveLocation(newLoc);
                    setIsManualLocation(true);
                    setSelectedFacility(localMatch);
                    setIsHome(false);
                    setActiveTab('map');
                    return;
                  }

                  // 2. Fallback to Global Address Search
                  try {
                    setIsLoading(true);
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data && data.length > 0) {
                      const newLoc = {
                        lat: parseFloat(data[0].lat),
                        lon: parseFloat(data[0].lon),
                        accuracy: 0
                      };
                      setActiveLocation(newLoc);
                      setIsManualLocation(true);
                      loadData(newLoc);
                      if (activeTab === 'list' && !isHome) setActiveTab('map');
                    }
                  } catch (err) {
                    console.error("Geocoding failed:", err);
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
            />
            <button 
              onClick={handleNearMe}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="Use Current Location"
            >
              <LocateFixed size={18} className="text-white" />
            </button>
          </div>
          <button 
            onClick={handleNearMe}
            className="p-3 bg-white/20 hover:bg-white/30 transition-colors border-l border-white/20"
          >
            <Search size={18} className="text-white" />
          </button>
        </div>



        <div className="flex items-center gap-4 sm:gap-8 ml-auto">
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="p-1 transition-all active:scale-90 text-xl sm:text-2xl hover:opacity-70"
              aria-label="Change Language"
            >
              {languages.find(l => l.code === currentLang)?.flag}
            </button>
            <AnimatePresence>
              {isLangMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[1001]" onClick={() => setIsLangMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={cn(
                      "absolute right-0 mt-3 w-48 sm:w-56 rounded-[1.5rem] sm:rounded-[2rem] natural-shadow z-[1002] p-2 sm:p-3 overflow-hidden border",
                      isDarkMode ? "bg-dark-surface border-dark-border" : "bg-white border-medical-border"
                    )}
                  >
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setCurrentLang(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-3 sm:px-4 sm:py-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4 transition-colors",
                          currentLang === lang.code
                            ? "bg-medical-primary/10 text-medical-primary font-bold"
                            : isDarkMode ? "hover:bg-dark-bg text-dark-text" : "hover:bg-medical-surface text-medical-text"
                        )}
                      >
                        <span className="text-xl sm:text-2xl">{lang.flag}</span>
                        <span className="text-sm sm:text-base">{lang.name}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>




          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 transition-all active:scale-90 text-white hover:bg-white/10 rounded-lg"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>



            {isLoggedIn && currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-all active:scale-95"
                >
                  <div className="w-6 h-6 rounded-full bg-medical-primary flex items-center justify-center text-white text-[10px] font-black">
                    {currentUser.full_name?.[0] || 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-black text-white uppercase tracking-widest">
                    {currentUser.full_name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronRight size={12} className={`text-white/50 transition-transform ${showUserMenu ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-[1001]" onClick={() => setShowUserMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className={cn(
                          "absolute right-0 mt-3 w-64 rounded-2xl natural-shadow z-[1002] overflow-hidden border",
                          isDarkMode ? "bg-dark-surface border-dark-border" : "bg-white border-medical-border"
                        )}
                      >
                        {/* User Info Header */}
                        <div className="p-5 bg-gradient-to-br from-medical-primary/10 to-emerald-500/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-medical-primary to-emerald-600 flex items-center justify-center text-white font-black shadow-lg shadow-medical-primary/30">
                              {currentUser.full_name?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="font-black text-sm tracking-tight">{currentUser.full_name || 'User'}</p>
                              <p className="text-[10px] font-bold text-medical-accent">{currentUser.email}</p>
                            </div>
                          </div>
                          <span className={`inline-block mt-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            isAdmin ? 'bg-amber-500/15 text-amber-600 border border-amber-500/20' : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/20'
                          }`}>
                            {isAdmin ? '⚡ Admin' : '🎓 Student'}
                          </span>
                        </div>

                        {/* Menu Items */}
                        <div className="p-2">
                          {isAdmin && (
                            <button
                              onClick={() => { setShowUserMenu(false); setShowAdmin(true); }}
                              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                                isDarkMode ? 'hover:bg-white/5' : 'hover:bg-medical-surface'
                              }`}
                            >
                              <ShieldCheck size={16} className="text-amber-500" />
                              <span className="text-sm font-bold text-slate-700">Admin Dashboard</span>
                            </button>
                          )}
                          <button
                            onClick={() => { setShowUserMenu(false); setShowFavorites(true); }}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                              isDarkMode ? 'hover:bg-white/5' : 'hover:bg-medical-surface'
                            }`}
                          >
                            <Heart size={16} className="text-rose-500" />
                            <span className="text-sm font-bold text-slate-700">Favorites</span>
                            {savedFacilities.length > 0 && (
                              <span className="ml-auto text-[10px] font-black bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full">
                                {savedFacilities.length}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => { setShowUserMenu(false); setShowAccountSettings(true); }}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors hidden ${
                              isDarkMode ? 'hover:bg-white/5' : 'hover:bg-medical-surface'
                            }`}
                          >
                            <Settings2 size={16} className="text-emerald-600" />
                            <span className="text-sm font-bold text-slate-700">Account Settings</span>
                          </button>
                        </div>

                        {/* Logout */}
                        <div className={`p-2 border-t ${isDarkMode ? 'border-dark-border' : 'border-medical-border/50'}`}>
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              handleLogout();
                            }}
                            className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-rose-500 hover:bg-rose-500/5 transition-colors"
                          >
                            <XIcon size={16} />
                            <span className="text-sm font-bold">Log Out</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="p-2 transition-all active:scale-90 text-white hover:bg-white/10 rounded-lg border border-white/20 flex items-center gap-2"
                aria-label="Login"
              >
                <User size={18} />
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Login</span>
              </button>
            )}
        </div>
      </header>

      <main className="flex-1 relative overflow-x-hidden">
        {/* Premium Aura Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-medical-primary/10 rounded-full blur-[140px] animate-[pulse_8s_infinite]" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-[pulse_12s_infinite]" />
          <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] bg-amber-500/5 rounded-full blur-[100px]" />
        </div>

        <AnimatePresence mode="wait">
          {isHome ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`min-h-screen flex flex-col transition-colors w-full relative z-10 ${isDarkMode ? 'bg-transparent' : 'bg-transparent'
                }`}
            >
              {/* Hero Section */}
              <div className="flex flex-col py-16 w-full relative">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-6 sm:px-12 lg:px-20 w-full relative z-10">
                  {/* Left Column: Content */}
                  <div className="space-y-10">
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-medical-primary/10 dark:bg-medical-primary/20 rounded-full border border-medical-primary/20 shadow-sm">
                      <span className="text-sm leading-none">📢</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-medical-primary">New: 50+ Units added in Manila — <span className="opacity-60">Discover more</span></span>
                    </div>
                    
                    <div className="space-y-6">
                      <h1 className={`text-6xl sm:text-7xl lg:text-[6.5rem] font-black leading-[0.85] tracking-tighter transition-colors ${isDarkMode ? 'text-dark-text' : 'text-medical-text'
                        }`}>
                        Find your <br />
                        <span className="text-medical-primary italic serif pr-4">dream</span> <br />
                        dorm <span className="text-medical-accent">now.</span>
                      </h1>
                      <p className={`text-lg sm:text-xl font-medium opacity-60 max-w-xl leading-relaxed ${isDarkMode ? 'text-dark-text' : 'text-medical-text'}`}>
                        The most premium student housing locator. Verified rooms, real-time map, and seamless booking for Pinoy students.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button 
                        onClick={handleNearMe}
                        className="px-8 py-4 bg-medical-primary text-white rounded-2xl flex items-center justify-center gap-3 text-base font-black shadow-xl shadow-medical-primary/20 hover:scale-[1.02] transition-all active:scale-95"
                      >
                        Explore Map <ChevronRight size={20} />
                      </button>
                      <button 
                        onClick={() => document.getElementById('featured-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className={`px-8 py-4 rounded-2xl flex items-center justify-center gap-3 text-base font-black border transition-all hover:bg-medical-primary/5 active:scale-95 ${isDarkMode ? 'border-white/10 text-white' : 'border-medical-primary/20 text-medical-primary'}`}
                      >
                        <TrendingUp size={20} /> Featured Units
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 pt-8 border-t border-medical-primary/10">
                      <div>
                        <p className="text-4xl font-black text-medical-primary mb-1">500+</p>
                        <p className="text-xs font-black uppercase tracking-widest opacity-40">Total Units</p>
                        <p className="text-[10px] font-medium opacity-50 mt-1">Checked by us</p>
                      </div>
                      <div>
                        <p className="text-4xl font-black text-medical-primary mb-1">10k+</p>
                        <p className="text-xs font-black uppercase tracking-widest opacity-40">Happy Students</p>
                        <p className="text-[10px] font-medium opacity-50 mt-1">In Metro Manila</p>
                      </div>
                      <div>
                        <p className="text-4xl font-black text-medical-primary mb-1">15+</p>
                        <p className="text-xs font-black uppercase tracking-widest opacity-40">School Hubs</p>
                        <p className="text-[10px] font-medium opacity-50 mt-1">Near your campus</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Image Preview */}
                  <div className="relative group lg:block hidden">
                    <div className="absolute inset-0 bg-medical-primary/20 rounded-[3rem] blur-[100px] -z-10 group-hover:bg-medical-primary/30 transition-colors" />
                    <div className="relative rounded-[3rem] overflow-hidden border-8 border-white/10 natural-shadow-lg hover:scale-[1.02] transition-transform duration-700">
<img 
                        src="/hero-preview.png" 
                        alt="Student House Locator Preview" 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Natural Scroll Content Area - StartupLab Style Categories */}
              <div className="w-full py-8">
                <div className={cn(
                  "border-y border-medical-primary/5 px-6 sm:px-12 lg:px-20 py-16 transition-colors",
                  isDarkMode ? "" : ""
                )}>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest mb-8 transition-colors ${isDarkMode ? 'text-white/40' : 'text-medical-text/40'}`}>
                    Housing smart categories
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                    {[
                      { icon: GraduationCap, label: t.dorms, category: 'university' },
                      { icon: Building2, label: t.privateDorms, category: 'private' },
                      { icon: Building, label: t.residences, category: 'residence' },
                      { icon: User, label: t.coliving, category: 'coliving' },
                      { icon: Bed, label: t.hostels, category: 'hostel' },
                      { icon: MapPlaceholder, label: t.studios, category: 'studio' },
                    ].map((link, i) => (
                      <button
                        key={link.label}
                        onClick={() => {
                            setSearchQuery(link.category);
                            handleNearMe();
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-4 group transition-all p-8 rounded-[2.5rem] border transition-all hover:scale-[1.02] active:scale-95",
                          isDarkMode 
                            ? "bg-transparent border-white/10 hover:border-medical-primary/30 hover:bg-white/5" 
                            : "bg-transparent border-medical-primary/10 hover:border-medical-primary/30 hover:bg-medical-primary/5"
                        )}
                      >
                        <div className={cn(
                          "p-4 rounded-2xl transition-all group-hover:scale-110",
                          isDarkMode ? "bg-white/5 text-white" : "bg-medical-primary/5 text-medical-primary"
                        )}>
                          <link.icon size={28} strokeWidth={1.5} />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black tracking-[0.1em] whitespace-nowrap uppercase transition-colors",
                          isDarkMode ? "text-dark-text opacity-40 group-hover:opacity-100" : "text-medical-text opacity-50 group-hover:opacity-100 group-hover:text-medical-primary"
                        )}>
                          {link.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>


          {/* Browse Section Inspiration */}
          <div className="px-6 sm:px-12 lg:px-20 mb-10 mt-24">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 pb-4 border-b border-medical-border dark:border-dark-border">
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <h2 className={cn(
                    "text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2 flex-wrap",
                    isDarkMode ? "text-white" : "text-medical-text"
                  )}>
                    Browsing units in 
                    <div className="relative inline-block ml-2">
                      <button 
                        onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                        className="text-medical-primary flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all outline-none"
                      >
                        {hasInteracted ? (locationName || searchQuery || (isLoading ? "Locating..." : "Your Location")) : "Your Location"}
                        <ChevronRight className={cn("transition-transform", isLocationMenuOpen ? "rotate-90" : "")} size={20} />
                      </button>

                      <AnimatePresence>
                        {isLocationMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-[1001]" onClick={() => setIsLocationMenuOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className={cn(
                                "absolute left-0 mt-2 w-72 rounded-3xl natural-shadow z-[1002] overflow-hidden border p-2",
                                isDarkMode ? "bg-dark-surface border-dark-border" : "bg-white border-medical-border"
                              )}
                            >
                              <button
                                onClick={() => {
                                  setIsLocationMenuOpen(false);
                                  handleQuickLocation();
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 p-4 rounded-2xl transition-all",
                                  isDarkMode ? "hover:bg-white/5" : "hover:bg-medical-surface"
                                )}
                              >
                                <div className="w-10 h-10 rounded-full bg-medical-primary/10 flex items-center justify-center text-medical-primary">
                                  <LocateFixed size={20} />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-black">Use my current location</p>
                                  <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Find nearby housing</p>
                                </div>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="w-3 h-3 rounded-full border-2 border-slate-200 border-t-medical-primary animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                )}
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {isLoading ? 'Updating housing list...' : 'Housing list up to date'}
                </span>
              </div>

              <div id="featured-section">
                <h3 className={cn(
                  "text-2xl lg:text-3xl font-black tracking-tight mb-2",
                  isDarkMode ? "text-white" : "text-medical-text"
                )}>
                  {adminDorms.length > 0 ? "Verified Premium Units" : "Global Trending Units"}
                </h3>
                <p className="text-slate-500 font-medium text-sm lg:text-base max-w-2xl mb-8">
                  {adminDorms.length > 0 
                    ? "Hand-picked, verified student housing units from our trusted partners."
                    : "The most liked and anticipated housing units happening now world-wide."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredUnits.slice(0, 6).map((facility) => (
                    <motion.div
                      key={facility.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                      <FacilityCard
                        facility={facility}
                        onClick={() => {
                          setSelectedFacility(facility);
                          setIsHome(false);
                          setActiveTab('map');
                        }}
                        isDarkMode={isDarkMode}
                        isSaved={savedFacilities.some(sf => sf.id === facility.id)}
                        onDirections={handleDirections}
                        onToggleSave={handleToggleSave}
                        t={t}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>                {/* Comprehensive Professional Footer */}
                <footer className={cn(
                  "mt-24 pt-20 pb-12 transition-colors w-full bg-medical-primary text-white border-t border-white/10"
                )}>
                  <div className="w-full px-6 sm:px-12 lg:px-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                      {/* Brand Column */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2.5 rounded-2xl border border-white/10">
                            <Home size={24} className="text-white" />
                          </div>
                          <span className="font-black tracking-tight text-xl">Student House Locator</span>
                        </div>
                        <p className="text-sm opacity-70 leading-relaxed max-w-xs font-medium">
                          The Philippines' leading platform for verified student housing. Connecting growth-focused students with their perfect home away from home.
                        </p>
                        <div className="flex items-center gap-4">
                          {[Facebook, Instagram, Twitter].map((Icon, i) => (
                            <a key={i} href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10">
                              <Icon size={18} />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Explore Column */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] opacity-50">Explore</h4>
                        <ul className="space-y-4 text-sm font-bold">
                          {['Verified Dorms', 'Private Residences', 'Co-living Spaces', 'University Hubs', 'Near Me'].map(item => (
                            <li key={item}><a href="#" className="hover:text-white/60 transition-colors">{item}</a></li>
                          ))}
                        </ul>
                      </div>

                      {/* Support Column */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] opacity-50">Support</h4>
                        <ul className="space-y-4 text-sm font-bold">
                          {['Help Center', 'Safety & Security', 'Booking Guide', 'Owner Registration', 'Contact Support'].map(item => (
                            <li key={item}><a href="#" className="hover:text-white/70 transition-colors">{item}</a></li>
                          ))}
                        </ul>
                      </div>

                      {/* Legal Column */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] opacity-50">Legal</h4>
                        <ul className="space-y-4 text-sm font-bold">
                          {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Accessibility', 'Refund Policy'].map(item => (
                            <li key={item}><a href="#" className="hover:text-white/70 transition-colors">{item}</a></li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        © 2024 Student House Locator. All rights reserved.
                      </p>
                      <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <span>Manila, Philippines</span>
                        <div className="w-1 h-1 rounded-full bg-white" />
                        <span>Powered by Sagetech</span>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col lg:flex-row min-h-screen"
            >
              {/* Results List Section */}
              <div className={`flex-1 lg:flex-none lg:w-[450px] xl:w-[500px] transition-colors border-r ${isDarkMode ? 'bg-dark-bg border-dark-border' : 'bg-medical-surface border-medical-border'
                } ${activeTab === 'list' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
                <div className={`sticky top-[52px] px-6 py-2 border-b z-[60] flex flex-col gap-1.5 transition-colors ${isDarkMode ? 'bg-dark-surface border-dark-border text-dark-text' : 'bg-white border-medical-border text-medical-accent'
                  }`}>
                  <button
                    onClick={() => setIsHome(true)}
                    className="flex items-center gap-1.5 text-xs font-black text-medical-primary uppercase tracking-tight hover:opacity-70 w-fit"
                  >
                    <ChevronLeft size={16} />
                    {t.backHome}
                  </button>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                      {filteredFacilities.length} {t.resultsNearYou}
                    </span>
                    {isGlobalLoading && (
                      <div className="flex items-center gap-1.5 text-medical-primary animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="text-[9px] font-black uppercase tracking-[0.1em]">Scanning...</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
                  <AnimatePresence mode="popLayout">
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-white/60 dark:bg-dark-bg/60 backdrop-blur-[2px] flex items-center justify-center p-12"
                      >
                        <div className="flex flex-col items-center gap-4 text-center">
                          <div className="w-12 h-12 border-4 border-medical-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-medical-primary animate-pulse">Syncing housing data...</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {filteredFacilities.length > 0 ? (
                    <div className="p-4 space-y-4">
                      {filteredFacilities.map(f => (
                        <FacilityCard
                          key={f.id}
                          facility={f}
                          isDarkMode={isDarkMode}
                          isSaved={savedFacilities.some(sf => sf.id === f.id)}
                          isSelected={selectedFacility?.id === f.id}
                          onClick={() => {
                            setSelectedFacility(f);
                            setShowDetails(true);
                          }}
                          onDirections={handleDirections}
                          onToggleSave={handleToggleSave}
                          t={t}
                        />
                      ))}
                    </div>
                  ) : !isLoading && (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 bg-medical-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-medical-primary/10">
                        <Home size={32} className="text-medical-primary/40" />
                      </div>
                      <h3 className={cn("text-xl font-black tracking-tight mb-2", isDarkMode ? "text-white" : "text-medical-text")}>
                        No units found near you
                      </h3>
                      <p className="text-xs font-bold text-slate-500 leading-relaxed mb-8 max-w-[240px] mx-auto">
                        Try expanding your search radius or searching for a different housing category.
                      </p>
                      

                    </div>
                  )}
                </div>
              </div>

              {/* Map Section */}
              <div className={`flex-1 relative h-[600px] lg:h-[calc(100vh-80px)] lg:sticky lg:top-[52px] ${activeTab === 'map' ? 'block' : 'hidden lg:block'}`}>
                {activeLocation ? (
                    <MapDisplay
                      userLocation={activeLocation}
                      facilities={filteredFacilities}
                      selectedFacility={selectedFacility}
                      onSelectFacility={(f) => {
                        setSelectedFacility(f);
                        if (f) setShowDetails(true);
                      }}
                      onManualLocationChange={(loc) => {
                        setActiveLocation(loc);
                        setIsManualLocation(true);
                        loadData(loc);
                      }}
                      isDarkMode={isDarkMode}
                      recenterTrigger={recenterTrigger}
                    />
                ) : (
                  <div className="h-full flex items-center justify-center p-12 text-center text-slate-500">
                    Location required to view map
                  </div>
                )}
              </div>

              {/* View Toggle (Mobile Only) */}
              <div className={`lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 p-1.5 backdrop-blur-md shadow-2xl rounded-[1.5rem] border z-[1001] flex gap-1 items-center transition-colors ${isDarkMode ? 'bg-dark-surface/95 border-dark-border' : 'bg-white/95 border-medical-border'
                }`}>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${activeTab === 'list' ? 'bg-medical-primary text-white shadow-lg' : isDarkMode ? 'text-dark-text hover:bg-dark-bg' : 'text-medical-text hover:bg-medical-surface'
                    }`}
                >
                  <List size={16} />
                  {t.listView}
                </button>
                <div className={`w-[1px] h-4 mx-1 ${isDarkMode ? 'bg-dark-border' : 'bg-medical-border'}`} />
                <button
                  onClick={() => setActiveTab('map')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${activeTab === 'map' ? 'bg-medical-primary text-white shadow-lg' : isDarkMode ? 'text-dark-text hover:bg-dark-bg' : 'text-medical-text hover:bg-medical-surface'
                    }`}
                >
                  <MapIcon size={16} />
                  {t.mapView}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>


    </>
  ) : (
    /* Admin Panel */
    <AdminPanel
          onClose={() => {
            setShowAdmin(false);
            if (activeLocation) loadData(activeLocation);
          }}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onLogout={handleLogout}
          t={t}
          facilities={facilities}
          currentUser={currentUser}
          onViewUnit={(f) => {
            setSelectedFacility(f);
            setShowDetails(true);
          }}
        />
    )}

    {/* Favorites Panel */}
    <AnimatePresence>
      {showFavorites && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowFavorites(false)} />
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className={cn(
              "w-full max-w-lg max-h-[80vh] rounded-[2.5rem] natural-shadow overflow-hidden relative border flex flex-col",
              isDarkMode ? "bg-dark-surface border-dark-border text-dark-text" : "bg-white border-medical-border text-medical-text"
            )}
          >
            <div className="p-8 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <Heart size={24} className="text-rose-500" /> Favorites
                </h2>
                <p className="text-xs font-bold text-medical-accent mt-1">{savedFacilities.length} saved units</p>
              </div>
              <button onClick={() => setShowFavorites(false)} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                <XIcon size={20} className="text-medical-accent" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 pb-8">
              {savedFacilities.length === 0 ? (
                <div className="text-center py-16">
                  <Heart size={48} className="text-medical-accent/20 mx-auto mb-4" />
                  <p className="font-black text-lg opacity-40">No Favorites Yet</p>
                  <p className="text-xs text-medical-accent mt-2">Save housing units by clicking the heart icon.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedFacilities.map(fac => (
                    <div key={fac.id} className={`p-5 rounded-2xl border flex items-center gap-4 group transition-all hover:scale-[1.01] ${isDarkMode ? 'bg-dark-bg border-dark-border' : 'bg-medical-surface border-medical-border'}`}>
                      <div className="w-12 h-12 rounded-xl bg-medical-primary/10 flex items-center justify-center text-medical-primary flex-shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate">{fac.name}</p>
                        <p className="text-[10px] text-medical-accent font-bold truncate">{fac.address}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowFavorites(false);
                          setSelectedFacility(fac);
                          setIsHome(false);
                          setActiveTab('map');
                        }}
                        className="p-2 rounded-lg hover:bg-medical-primary/10 text-medical-primary transition-all"
                        title="View on Map"
                      >
                        <MapIcon size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleSave(fac)}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-all"
                        title="Remove"
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Account Settings Panel */}
    <AnimatePresence>
      {showAccountSettings && currentUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAccountSettings(false)} />
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className={cn(
              "w-full max-w-md rounded-[2.5rem] natural-shadow overflow-hidden relative border",
              isDarkMode ? "bg-dark-surface border-dark-border text-dark-text" : "bg-white border-medical-border text-medical-text"
            )}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <Settings2 size={24} className="text-medical-primary" /> Account
                </h2>
                <button onClick={() => setShowAccountSettings(false)} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                  <XIcon size={20} className="text-medical-accent" />
                </button>
              </div>

              {/* Profile Card */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-medical-primary flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-medical-primary/20 mb-4">
                  {currentUser.full_name?.[0] || 'U'}
                </div>
                <h3 className="text-xl font-black tracking-tight">{currentUser.full_name}</h3>
                <p className="text-xs text-medical-accent font-bold">{currentUser.email}</p>
                <span className={`mt-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  isAdmin ? 'bg-amber-500/10 text-amber-600' : 'bg-medical-primary/10 text-medical-primary'
                }`}>
                  {isAdmin ? '⚡ Administrator' : '🎓 Student'}
                </span>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-dark-bg border-dark-border' : 'bg-medical-surface border-medical-border'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Full Name</p>
                  <p className="font-bold text-sm">{currentUser.full_name}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-dark-bg border-dark-border' : 'bg-medical-surface border-medical-border'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Email Address</p>
                  <p className="font-bold text-sm">{currentUser.email}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-dark-bg border-dark-border' : 'bg-medical-surface border-medical-border'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Role</p>
                  <p className="font-bold text-sm">{currentUser.role || 'Student'}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-dark-bg border-dark-border' : 'bg-medical-surface border-medical-border'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Member Since</p>
                  <p className="font-bold text-sm">{currentUser.updated_at ? new Date(currentUser.updated_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAccountSettings(false);
                  handleLogout();
                }}
                className="w-full mt-8 py-4 bg-rose-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Log Out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    {/* Unit Details Modal */}
    <AnimatePresence>
      {showDetails && selectedFacility && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2500] flex items-center justify-center p-0 sm:p-4"
        >
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowDetails(false)} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "w-full max-w-4xl h-full sm:h-[90vh] sm:rounded-[3rem] overflow-hidden relative flex flex-col shadow-2xl",
              isDarkMode ? "bg-[#121412] text-dark-text border-white/10" : "bg-white text-medical-text border-medical-border"
            )}
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowDetails(false)}
              className="absolute top-6 right-6 z-50 p-3 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-all active:scale-90"
            >
              <XIcon size={24} />
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Hero Image Section */}
              <div className="relative h-[300px] sm:h-[450px] w-full">
                {selectedFacility.image_url ? (
                  <img src={selectedFacility.image_url} alt={selectedFacility.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-medical-primary/5 flex items-center justify-center">
                    <Building2 size={80} className="text-medical-primary opacity-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-10 left-6 sm:left-12 right-6 sm:right-12 text-white">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-4 py-1.5 bg-medical-primary text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                      {selectedFacility.category}
                    </span>
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black">4.8</span>
                    </div>
                  </div>
                  <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none mb-2">{selectedFacility.name}</h2>
                  <p className="text-white/70 text-lg font-bold flex items-center gap-2">
                    <MapPin size={20} className="text-medical-primary" /> {selectedFacility.address}
                  </p>
                </div>
              </div>

              {/* Content Area */}
              <div className="px-6 sm:px-12 py-12">
                <div className="flex flex-col lg:flex-row gap-16">
                  {/* Left Column: Info & Description */}
                  <div className="flex-1 space-y-12">
                    {/* Quick Specs Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                       <div className={`p-6 rounded-3xl border transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-[#FDFDFD] border-medical-border'}`}>
                          <Navigation size={20} className="text-medical-primary mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Distance</p>
                          <p className="font-black text-xl">{selectedFacility.distance} <span className="text-sm opacity-40">km</span></p>
                       </div>
                       <div className={`p-6 rounded-3xl border transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-[#FDFDFD] border-medical-border'}`}>
                          <Building size={20} className="text-medical-primary mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Type</p>
                          <p className="font-black text-xl capitalize">{selectedFacility.category}</p>
                       </div>
                       <div className={`p-6 rounded-3xl border transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-[#FDFDFD] border-medical-border'}`}>
                          <ShieldCheck size={20} className="text-medical-primary mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Verified</p>
                          <p className="font-black text-xl">System</p>
                       </div>
                    </div>

                    {/* About Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="h-1.5 w-12 bg-medical-primary rounded-full" />
                        <h4 className="text-2xl font-black tracking-tight uppercase">Property Overview</h4>
                      </div>
                      <p className={`text-xl leading-relaxed font-medium ${isDarkMode ? 'text-white/60' : 'text-slate-600'}`}>
                        {selectedFacility.description || "Discover premium student living at its finest. This unit offers a perfect blend of comfort and convenience, strategically located near major universities and transport hubs. Features include round-the-clock security, modern fixtures, and a quiet study-friendly environment."}
                      </p>
                    </div>

                    {/* Location & Map Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="h-1.5 w-12 bg-medical-primary rounded-full" />
                        <h4 className="text-2xl font-black tracking-tight uppercase">Location Context</h4>
                      </div>
                      <div className="h-[300px] rounded-[2.5rem] bg-slate-100 overflow-hidden relative border border-medical-border group shadow-inner">
                          <MapContainer 
                            center={[selectedFacility.lat, selectedFacility.lon]} 
                            zoom={16} 
                            scrollWheelZoom={false} 
                            zoomControl={false}
                            dragging={false}
                            className="h-full w-full grayscale-[0.2]"
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[selectedFacility.lat, selectedFacility.lon]} />
                          </MapContainer>
                          <div className="absolute inset-0 bg-medical-primary/5 pointer-events-none group-hover:bg-transparent transition-all" />
                          <div className="absolute bottom-6 left-6 right-6 p-4 backdrop-blur-xl bg-white/80 rounded-2xl border border-white/20 shadow-xl">
                             <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <MapPin size={14} className="text-medical-primary" /> {selectedFacility.address}
                             </p>
                          </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sticky Sidebar */}
                  <div className="hidden lg:block w-96 space-y-8">
                    <div className={`p-10 rounded-[3rem] border sticky top-12 transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-medical-border shadow-2xl shadow-medical-primary/10'}`}>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Starting From</p>
                       <div className="flex items-baseline gap-2 mb-10">
                          <span className="text-6xl font-black tracking-tighter">₱{selectedFacility.price || '0'}</span>
                          <span className="text-lg font-bold opacity-30 uppercase tracking-widest">/mo</span>
                       </div>
                       
                       <div className="space-y-4">
                         <button 
                           onClick={() => window.location.href = `tel:${selectedFacility.phone}`}
                           className="w-full py-5 bg-medical-primary text-white rounded-[1.5rem] font-black text-base hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-xl shadow-medical-primary/30"
                         >
                           <Phone size={22} /> Contact Owner
                         </button>
                         <button 
                           onClick={() => handleDirections(selectedFacility)}
                           className={`w-full py-5 border rounded-[1.5rem] font-black text-base hover:bg-black/5 active:scale-95 transition-all flex items-center justify-center gap-4 ${isDarkMode ? 'border-white/10 text-white' : 'border-medical-border text-slate-700'}`}
                         >
                           <Navigation size={22} /> Get Directions
                         </button>
                       </div>

                       <div className="mt-8 pt-8 border-t border-dashed border-medical-border">
                          <button 
                            onClick={() => handleToggleSave(selectedFacility)}
                            className={cn(
                              "w-full py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all",
                              savedFacilities.some(sf => sf.id === selectedFacility.id)
                                ? "bg-rose-50 text-rose-500"
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            <Heart size={18} className={savedFacilities.some(sf => sf.id === selectedFacility.id) ? "fill-current" : ""} />
                            {savedFacilities.some(sf => sf.id === selectedFacility.id) ? 'Saved in your favorites' : 'Save for later'}
                          </button>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Bar (Mobile Only) */}
            <div className={`lg:hidden px-6 py-6 border-t flex gap-4 backdrop-blur-xl ${isDarkMode ? 'bg-dark-surface/95 border-white/10' : 'bg-white/95 border-medical-border'}`}>
              <div className="flex-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Monthly</p>
                <p className="font-black text-2xl">₱{selectedFacility.price || '0'}</p>
              </div>
              <button 
                onClick={() => window.location.href = `tel:${selectedFacility.phone}`}
                className="px-8 py-4 bg-medical-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-medical-primary/20"
              >
                <Phone size={18} /> Call
              </button>
              <button 
                onClick={() => handleDirections(selectedFacility)}
                className={`p-4 border rounded-2xl font-black text-sm flex items-center justify-center transition-colors ${isDarkMode ? 'border-white/10 text-white' : 'border-medical-border text-slate-700'}`}
              >
                <Navigation size={20} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Floating Error Toast */}
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] px-6 py-4 bg-rose-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm min-w-[320px]"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <X size={18} />
          </div>
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-lg">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}
