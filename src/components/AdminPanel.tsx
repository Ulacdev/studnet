import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  Plus,
  Settings,
  MapPin,
  Building2,
  TrendingUp,
  Users,
  Check,
  X,
  CreditCard,
  MessageSquare,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Search,
  Sun,
  Moon,
  User as UserIcon,
  Home,
  ChevronDown,
  Activity,
  Trash2,
  Mail,
  ShieldCheck as ShieldIcon,
  Menu,
  History,
  FileText,
  Filter,
  Download,
  Upload,
  X as XIcon,
  Edit2,
  Eye
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { DormFacility, DormCategory } from '../types';
import { Translation } from '../translations';
import { api } from '../api';
import { useGeolocation } from '../hooks/useGeolocation';

interface AdminPanelProps {
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  t: Translation;
  facilities: DormFacility[];
  onViewUnit?: (dorm: DormFacility) => void;
  currentUser: any;
}

const DASHBOARD_DATA = [
  { name: 'Mon', logins: 45, searches: 120 },
  { name: 'Tue', logins: 52, searches: 150 },
  { name: 'Wed', logins: 48, searches: 180 },
  { name: 'Thu', logins: 61, searches: 210 },
  { name: 'Fri', logins: 55, searches: 190 },
  { name: 'Sat', logins: 67, searches: 240 },
  { name: 'Sun', logins: 72, searches: 280 },
];

export default function AdminPanel({ 
  onClose, 
  isDarkMode, 
  onToggleDarkMode, 
  onLogout,
  t, 
  facilities,
  onViewUnit,
  currentUser
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dash' | 'create' | 'list' | 'users' | 'logs' | 'profile'>('dash');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Map helper component
  function LocationPicker({ lat, lon, onChange, isDarkMode }: { lat: number, lon: number, onChange: (lat: number, lon: number) => void, isDarkMode: boolean }) {
    const map = useMapEvents({
      click(e) {
        onChange(e.latlng.lat, e.latlng.lng);
      },
    });

    useEffect(() => {
      map.setView([lat, lon], map.getZoom());
    }, [lat, lon, map]);

    return (
      <Marker 
        position={[lat, lon]} 
        icon={L.divIcon({
          className: 'admin-marker',
          html: `<div class="w-8 h-8 bg-medical-primary border-4 border-white rounded-full shadow-2xl flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })}
      />
    );
  }
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [unitSearch, setUnitSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [headerSearch, setHeaderSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingDormId, setEditingDormId] = useState<string | null>(null);
  
  // New Dorm Form State
  const { location: rawLocation } = useGeolocation();
  const [newDorm, setNewDorm] = useState<Partial<DormFacility>>({
    name: '',
    category: 'private',
    address: '',
    lat: rawLocation?.lat || 14.5995,
    lon: rawLocation?.lon || 120.9842,
    price: 0,
    specialty: '',
    description: '',
    rating: 5,
    isCustom: true,
    image_url: ''
  });

  // Sync newDorm to rawLocation only once when it becomes available and we are NOT editing
  useEffect(() => {
    if (rawLocation && !editingDormId && newDorm.lat === 14.5995) {
      setNewDorm(prev => ({
        ...prev,
        lat: rawLocation.lat,
        lon: rawLocation.lon
      }));
    }
  }, [rawLocation, editingDormId]);

  const [customDorms, setCustomDorms] = useState<DormFacility[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadAllAdminData = async () => {
    try {
      const [unitsData, usersData, logsData] = await Promise.all([
        api.getUnits(),
        api.getUsers(),
        api.getAuditLogs()
      ]);
      setCustomDorms(unitsData);
      setUsers(usersData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, [activeTab]);

  const handleAddressSearch = async () => {
    if (!newDorm.address) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newDorm.address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setNewDorm(prev => ({
          ...prev,
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          address: display_name
        }));
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setIsSearching(false);
      setAddressSuggestions([]);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      setAddressSuggestions(data);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  };

  // Debounce suggestions and auto-geocode
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newDorm.address && (activeTab === 'create' || showCreateModal)) {
        fetchSuggestions(newDorm.address);

        // Auto-geocode if address is substantial (>8 chars) and coordinates are still default
        if (newDorm.address.length > 8 && newDorm.lat === 14.5995 && newDorm.lon === 120.9842) {
          handleAddressSearch();
        }
      }
    }, 800); // Increased debounce time
    return () => clearTimeout(timer);
  }, [newDorm.address]);

  const saveDorm = async () => {
    if (!newDorm.name || !newDorm.address) return;

    // Validate coordinates are set (not default Manila coordinates)
    if (newDorm.lat === 14.5995 && newDorm.lon === 120.9842) {
      alert('Please set the unit location by clicking on the map or pressing Enter after typing the address.');
      return;
    }

    try {
      // Filter to only include fields supported by the database schema
      const payload = {
        name: newDorm.name,
        address: newDorm.address,
        lat: newDorm.lat,
        lon: newDorm.lon,
        price: newDorm.price,
        category: newDorm.category,
        description: newDorm.description,
        image_url: newDorm.image_url
      };

      if (editingDormId) {
        const updated = await api.updateUnit(editingDormId, payload);
        setCustomDorms(customDorms.map(d => d.id === editingDormId ? updated : d));
        api.logAction({ user_id: currentUser.id, user_email: currentUser.email, action: 'UNIT_UPDATED', details: `Updated unit: ${payload.name}` });
        alert("Unit updated successfully!");
      } else {
        const facility = await api.createUnit(payload);
        setCustomDorms([facility, ...customDorms]);
        api.logAction({ user_id: currentUser.id, user_email: currentUser.email, action: 'UNIT_CREATED', details: `Created unit: ${payload.name}` });
        alert("Unit registered successfully!");
      }

      setNewDorm({
        name: '',
        category: 'private',
        address: '',
        lat: 14.5995,
        lon: 120.9842,
        price: 0,
        specialty: '',
        description: '',
        rating: 5,
        isCustom: true,
        image_url: ''
      });
      setEditingDormId(null);
      setShowCreateModal(false);
      setActiveTab('list');
    } catch (err) {
      console.error("Save Error:", err);
      alert("Failed to save unit: " + (err instanceof Error ? err.message : "Database Error"));
    }
  };

  const handleEdit = (dorm: DormFacility) => {
    setNewDorm({
      ...dorm,
      price: Number(dorm.price)
    });
    setEditingDormId(dorm.id);
    setActiveTab('create');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDorm({ ...newDorm, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteDorm = async (id: string) => {
    if (confirm('Are you sure you want to delete this unit?')) {
      try {
        const dormToDelete = customDorms.find(d => d.id === id);
        await api.deleteUnit(id);
        const updated = customDorms.filter(d => d.id !== id);
        setCustomDorms(updated);
        api.logAction({ user_id: currentUser.id, user_email: currentUser.email, action: 'UNIT_DELETED', details: `Deleted unit: ${dormToDelete?.name || id}` });
      } catch (err) {
        alert("Failed to delete unit");
      }
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      await api.updateUserRole(userId, role);
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err) {
      alert("Failed to update user role");
    }
  };

  const deleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const userToDelete = users.find(u => u.id === userId);
        await api.deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
        api.logAction({ user_id: currentUser.id, user_email: currentUser.email, action: 'USER_DELETED', details: `Deleted user: ${userToDelete?.email || userId}` });
      } catch (err) {
        alert("Failed to delete user");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex bg-black/40 backdrop-blur-md">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-20 lg:w-72' : 'w-20'} flex flex-col border-r transition-all ${isDarkMode ? 'bg-dark-surface border-dark-border' : 'bg-[#4F6A44] border-white/10'}`}>
        <div className={`h-24 px-6 flex items-center border-b ${isDarkMode ? 'border-dark-border' : 'border-white/10'} ${!isSidebarOpen ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-4`}>
            <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center ${isDarkMode ? 'text-medical-primary' : 'text-white'}`}>
              <Home size={28} strokeWidth={2.5} />
            </div>
            {isSidebarOpen && (
              <span className={`font-black text-lg tracking-tight leading-tight block ${isDarkMode ? 'text-white' : 'text-white'}`}>Student House <br /> Locator</span>
            )}
          </div>
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className={`lg:hidden p-2 rounded-lg ${isDarkMode ? 'hover:bg-medical-primary/10 text-white' : 'hover:bg-white/10 text-white'}`}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {[
            { id: 'dash', label: 'Dashboard', icon: <BarChart3 size={20} /> },
            { id: 'users', label: 'Users', icon: <Users size={20} /> },
            { id: 'list', label: 'Units', icon: <Building2 size={20} /> },
            { id: 'logs', label: 'History', icon: <History size={20} /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full p-4 rounded-xl flex items-center gap-4 font-bold transition-all relative group ${
                activeTab === item.id 
                  ? isDarkMode 
                    ? 'bg-medical-primary text-white shadow-xl shadow-medical-primary/20' 
                    : 'bg-white text-[#4F6A44] shadow-xl' 
                  : isDarkMode 
                    ? 'text-white/60 hover:text-white hover:bg-white/5' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <span className={`${isSidebarOpen ? 'block' : 'hidden'}`}>{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                   layoutId="active-tab"
                  className={`absolute right-2 w-1.5 h-1.5 rounded-full hidden lg:block ${isDarkMode ? 'bg-white' : 'bg-[#4F6A44]'}`}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          {/* Admin access section removed */}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ml-2 ${isDarkMode ? 'bg-dark-bg' : 'bg-[#F9FAF8]'}`}>
        <header className={`h-24 px-10 flex items-center justify-between border-b sticky top-0 z-[2005] transition-all ${isDarkMode ? 'bg-dark-surface border-dark-border' : 'bg-white border-medical-border'}`}>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-3 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/5 text-white/60' : 'hover:bg-medical-surface text-medical-text/60'}`}
            >
              <Menu size={24} />
            </button>
            
            <div className={`hidden md:flex items-center gap-3 px-5 py-2.5 rounded-lg border w-96 transition-all ${isDarkMode ? 'bg-dark-bg border-dark-border' : 'bg-[#F9FAF8] border-medical-border'}`}>
              <Search size={18} className="opacity-30" />
              <input 
                type="text" 
                placeholder="Search resources, units, logs..." 
                className="bg-transparent outline-none font-bold text-sm w-full"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="hidden xl:flex items-center gap-3 px-6 py-3 bg-medical-primary text-white rounded-lg font-black text-xs shadow-xl shadow-medical-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} />
              Create New Units
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onToggleDarkMode}
                className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-400' : 'bg-medical-surface hover:bg-medical-border text-medical-primary'}`}
              >
                {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
              </button>
            </div>

            <div className="h-10 w-[1px] bg-medical-border mx-2" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-4 p-2 pr-6 rounded-[1.25rem] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-medical-surface hover:bg-medical-border'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-medical-primary flex items-center justify-center text-white font-black shadow-lg shadow-medical-primary/20 text-lg">
                  A
                </div>
                <div className="hidden lg:block text-left">
                  <p className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-medical-text'}`}>Administrator</p>
                  <p className="text-[10px] opacity-40 font-black uppercase tracking-widest leading-none">Super Admin</p>
                </div>
                <ChevronDown size={14} className={`opacity-40 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-[2050]" onClick={() => setShowProfileMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className={`absolute right-0 mt-4 w-64 p-3 rounded-xl shadow-2xl border z-[2100] transform-gpu ${isDarkMode ? 'bg-dark-surface border-dark-border' : 'bg-white border-medical-border'}`}
                  >
                    <div className="p-4 border-b border-inherit mb-2">
                      <p className="text-[10px] font-black opacity-30 uppercase mb-2 tracking-widest">Active Account</p>
                      <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-medical-text'}`}>admin@dormpulse.com</p>
                    </div>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setShowProfileMenu(false);
                        }}
                        className={`w-full p-4 rounded-lg flex items-center gap-4 text-sm font-bold transition-all hidden ${isDarkMode ? 'hover:bg-white/5 text-white/70 hover:text-white' : 'hover:bg-medical-primary/5 text-medical-text/70 hover:text-medical-primary'}`}
                      >
                        <UserIcon size={20} className="opacity-50" /> Profile & Security
                      </button>
                      <div className="h-[1px] bg-medical-border my-2" />
                      <button 
                        onClick={onLogout}
                        className="w-full p-4 rounded-lg flex items-center gap-4 text-sm font-black text-rose-500 hover:bg-rose-500/10 transition-all"
                      >
                        <LogOut size={20} /> Logout System
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'dash' && (
              <motion.div key="dash" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-medical-text'}`}>System Overview</h2>
                    <p className="text-sm opacity-50 font-bold mt-1">Real-time system and user stats.</p>
                  </div>
                  <div className={`px-5 py-3 rounded-lg border font-bold flex items-center gap-3 ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border'}`}>
                    <Activity size={18} className="text-medical-primary" />
                    Status: <span className="text-medical-primary">Active</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { label: 'Total Units', val: facilities.length + customDorms.length, trend: '+4%', icon: <Building2 />, color: 'blue' },
                    { label: 'Active Users', val: users.length, trend: '+12%', icon: <Users />, color: 'purple' },
                    { label: 'Custom Dorms', val: customDorms.length, trend: 'Manual', icon: <Home />, color: 'orange' },
                  ].map((stat, i) => (
                    <div key={i} className={`p-8 rounded-xl border shadow-sm group hover:scale-[1.02] transition-transform ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border'}`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center bg-${stat.color}-500/10 text-${stat.color}-500`}>
                          {React.cloneElement(stat.icon as React.ReactElement<{ size?: number }>, { size: 28 })}
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {stat.trend}
                        </span>
                      </div>
                      <p className="text-sm font-bold opacity-40 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-4xl font-black">{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className={`xl:col-span-2 p-10 rounded-2xl border ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-10">
                      <h3 className="text-2xl font-black">User Login Patterns</h3>
                      <select className={`p-3 rounded-xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-dark-bg border-white/10' : 'bg-white border-medical-border'}`}>
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                      </select>
                    </div>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={DASHBOARD_DATA}>
                          <defs>
                            <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4FB9AF" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#4FB9AF" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#ffffff10' : '#00000010'} />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fontWeight: 700, fill: isDarkMode ? '#ffffff40' : '#00000040' }}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fontWeight: 700, fill: isDarkMode ? '#ffffff40' : '#00000040' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '24px', 
                              border: 'none', 
                              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                              backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                              color: isDarkMode ? '#fff' : '#000'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="logins" 
                            stroke="#4FB9AF" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorLogins)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="searches" 
                            stroke="#6366f1" 
                            strokeWidth={4}
                            fillOpacity={0}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={`p-10 rounded-2xl border ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-sm'}`}>
                    <h3 className="text-xl font-black mb-8">System Activity</h3>
                    <div className="space-y-6">
                      {[
                        { title: 'New Unit Registration', desc: 'Private Student Hall added', time: '4m ago', status: 'success' },
                        { title: 'User Backup', desc: 'Automated DB backup completed', time: '12m ago', status: 'info' },
                        { title: 'Traffic Spike', desc: '240 new visitors in last hour', time: '1h ago', status: 'warning' },
                        { title: 'System Patch', desc: 'Security protocols updated', time: '3h ago', status: 'success' },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4 group">
                          <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${item.status === 'success' ? 'bg-green-500' : item.status === 'warning' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                          <div className="flex-1">
                            <h4 className="text-sm font-black tracking-tight">{item.title}</h4>
                            <p className="text-xs opacity-50 font-bold">{item.desc}</p>
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-30 mt-1 block">{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className={`w-full mt-10 p-5 rounded-lg border font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-medical-surface border-medical-border'}`}>
                      View Full Logs
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div key="users" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">Users</h2>
                    <p className="text-sm opacity-50 font-bold mt-1">Manage who can use the app and change roles.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-lg border ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-sm'}`}>
                      <Search size={20} className="opacity-40" />
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        className="bg-transparent outline-none font-bold text-sm w-48"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {editingUser && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEditingUser(null)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`relative w-full max-w-lg p-10 rounded-[5px] border-2 z-[3010] shadow-2xl ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border'}`}
                      >
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-2xl font-black tracking-tight">Edit Role: {editingUser.full_name}</h3>
                          <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all">
                            <X size={24} />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <p className="text-sm font-bold opacity-60 mb-4">Select new system role for this user account:</p>
                          <div className="grid grid-cols-1 gap-3">
                            {['Student', 'Admin'].map(role => (
                              <button
                                key={role}
                                onClick={() => {
                                  updateUserRole(editingUser.id, role);
                                  setEditingUser(null);
                                }}
                                className={`px-8 py-5 rounded-lg font-black text-sm transition-all border flex items-center justify-between ${
                                  editingUser.role === role 
                                    ? 'bg-medical-primary text-white border-medical-primary shadow-lg shadow-medical-primary/20' 
                                    : isDarkMode ? 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10' : 'bg-medical-surface border-medical-border text-medical-text/40 hover:bg-medical-border'
                                }`}
                              >
                                {role}
                                {editingUser.role === role && <Check size={18} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-sm'}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b ${isDarkMode ? 'border-white/10' : 'border-medical-border'}`}>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Identity</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Role</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Status</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Last Pulse</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => 
                          u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email?.toLowerCase().includes(userSearch.toLowerCase())
                        ).map(user => (
                          <tr key={user.id} className={`border-b last:border-0 hover:bg-medical-primary/5 transition-colors ${isDarkMode ? 'border-white/5' : 'border-medical-border/50'}`}>
                            <td className="p-8">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-medical-primary/10 flex items-center justify-center text-medical-primary font-black">
                                  {user.full_name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="font-black tracking-tight">{user.full_name || 'Anonymous'}</p>
                                  <p className="text-xs opacity-50 font-bold">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-8">
                              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.role === 'Admin' ? 'bg-medical-primary/10 text-medical-primary' : 'bg-medical-surface border border-medical-border text-medical-text opacity-60'}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="p-8">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-500' : user.status === 'Pending' ? 'bg-orange-500' : 'bg-rose-500'}`} />
                                <span className="text-xs font-bold">{user.status}</span>
                              </div>
                            </td>
                            <td className="p-8">
                              <span className="text-sm font-mono opacity-50">2026-05-03</span>
                            </td>
                            <td className="p-8 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setEditingUser(user)}
                                  className={`p-3 rounded-xl border transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-medical-border hover:bg-medical-surface shadow-sm'}`}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => deleteUser(user.id)}
                                  className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'create' && (
              <motion.div key="create" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-6xl mx-auto">
                <div className="mb-10 text-center">
                  <h2 className="text-4xl font-black tracking-tight text-medical-text">
                    {editingDormId ? 'Update Existing Unit' : 'Register New Unit'}
                  </h2>
                  <p className="text-sm opacity-50 font-bold mt-1 text-medical-accent">
                    {editingDormId ? 'Modify property details and coordinates.' : 'Expand the housing database.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className={`p-10 rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-2xl shadow-medical-primary/5'}`}>
                      <h3 className="text-xs font-black uppercase tracking-widest text-medical-primary mb-8 flex items-center gap-2">
                        <MapPin size={14} /> Geographic Location
                        {(() => {
                          const isValidCoords = newDorm.lat && newDorm.lon &&
                            newDorm.lat >= -90 && newDorm.lat <= 90 &&
                            newDorm.lon >= -180 && newDorm.lon <= 180 &&
                            !(newDorm.lat === 14.5995 && newDorm.lon === 120.9842); // Not default Manila

                          if (isSearching) {
                            return (
                              <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                🔍 Locating...
                              </span>
                            );
                          } else if (isValidCoords) {
                            return (
                              <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full font-bold">
                                ✓ Located
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-xs bg-orange-500/20 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                                ⚠ Set Location
                              </span>
                            );
                          }
                        })()}
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Full Address</label>
                          <div className="relative group">
                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-medical-primary" size={20} />
                            <input 
                              type="text" 
                              placeholder="Street, Barangay, City..."
                              className={`w-full p-5 pl-14 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                              value={newDorm.address}
                              onChange={e => setNewDorm({...newDorm, address: e.target.value})}
                              onKeyDown={e => e.key === 'Enter' && handleAddressSearch()}
                            />

                            {/* Suggestions Dropdown */}
                            <AnimatePresence>
                              {addressSuggestions.length > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className={`absolute left-0 right-0 top-full mt-2 z-[1000] rounded-2xl border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border'}`}
                                >
                                  {addressSuggestions.map((s, i) => (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        setNewDorm({
                                          ...newDorm,
                                          address: s.display_name,
                                          lat: parseFloat(s.lat),
                                          lon: parseFloat(s.lon)
                                        });
                                        setAddressSuggestions([]);
                                      }}
                                      className={`w-full text-left p-4 text-xs font-bold border-b last:border-0 transition-colors ${isDarkMode ? 'border-white/5 hover:bg-white/5 text-white/70' : 'border-medical-border/50 hover:bg-medical-surface text-medical-text/70'}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <MapPin size={14} className="mt-0.5 text-medical-primary shrink-0" />
                                        <span>{s.display_name}</span>
                                      </div>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        <div className="h-64 rounded-2xl overflow-hidden border border-medical-border relative group">
                          <MapContainer 
                            center={[newDorm.lat || 14.5995, newDorm.lon || 120.9842]} 
                            zoom={13} 
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={false}
                          >
                            <TileLayer
                              url={isDarkMode 
                                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              }
                            />
                            <LocationPicker 
                              lat={newDorm.lat || 14.5995} 
                              lon={newDorm.lon || 120.9842} 
                              isDarkMode={isDarkMode}
                              onChange={(lat, lon) => setNewDorm({...newDorm, lat, lon})} 
                            />
                          </MapContainer>
                          <div className="absolute bottom-4 left-4 right-4 bg-medical-primary/90 backdrop-blur-md text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-xl transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                            Click map to set location or press Enter after typing address
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className={`p-10 rounded-3xl border ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-2xl shadow-medical-primary/5'}`}>
                      <h3 className="text-xs font-black uppercase tracking-widest text-medical-primary mb-8 flex items-center gap-2">
                        <Building2 size={14} /> Unit Specifications
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Property Name</label>
                          <input 
                            type="text" 
                            placeholder="Unit Title"
                            className={`w-full p-5 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                            value={newDorm.name}
                            onChange={e => setNewDorm({...newDorm, name: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Category</label>
                            <select 
                              className={`w-full p-5 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 appearance-none bg-no-repeat bg-[right_1.5rem_center] ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                              value={newDorm.category}
                              onChange={e => setNewDorm({...newDorm, category: e.target.value as DormCategory})}
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundSize: '1.2em' }}
                            >
                              <option value="private">Private</option>
                              <option value="university">University Dorm</option>
                              <option value="residence">Residence</option>
                              <option value="coliving">Co-living</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Price</label>
                            <input 
                              type="number" 
                              placeholder="₱ Amount"
                              className={`w-full p-5 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                              value={newDorm.price || ''}
                              onChange={e => setNewDorm({...newDorm, price: parseFloat(e.target.value)})}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Description</label>
                          <textarea 
                            rows={3}
                            placeholder="Unit details..."
                            className={`w-full p-5 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 resize-none ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                            value={newDorm.description}
                            onChange={e => setNewDorm({...newDorm, description: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Unit Image</label>
                          <div className="flex flex-wrap gap-4">
                            <label className={`flex-1 min-w-[200px] h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-medical-primary/5 ${isDarkMode ? 'border-white/10 hover:border-medical-primary/40' : 'border-medical-border hover:border-medical-primary/40'}`}>
                              <Upload size={24} className="text-medical-primary" />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Upload Photo</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageUpload}
                              />
                            </label>
                            
                            {newDorm.image_url && (
                              <div className="relative w-32 h-32 rounded-2xl border border-medical-border overflow-hidden shrink-0 group">
                                <img src={newDorm.image_url} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                  onClick={() => setNewDorm({ ...newDorm, image_url: '' })}
                                  className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <XIcon size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={saveDorm}
                      className="w-full p-8 bg-gradient-to-r from-medical-primary to-emerald-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-medical-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                    >
                      {editingDormId ? <Check size={28} /> : <Plus size={28} />}
                      {editingDormId ? 'Update Unit Info' : 'Commit to System'}
                    </button>
                    {editingDormId && (
                      <button 
                        onClick={() => {
                          setEditingDormId(null);
                          setNewDorm({
                            name: '',
                            category: 'private',
                            address: '',
                            lat: 14.5995,
                            lon: 120.9842,
                            price: 0,
                            specialty: '',
                            description: '',
                            rating: 5,
                            isCustom: true,
                            image_url: ''
                          });
                        }}
                        className={`w-full p-4 mt-4 rounded-2xl font-black text-sm border transition-all ${isDarkMode ? 'border-white/10 text-white/40 hover:bg-white/5' : 'border-medical-border text-medical-accent hover:bg-medical-surface'}`}
                      >
                        Cancel Edit Mode
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'list' && (
              <motion.div key="list" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">Units List</h2>
                    <p className="text-sm opacity-50 font-bold mt-1">List of all added student housing units.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-sm'}`}>
                      <Search size={20} className="opacity-40" />
                      <input 
                        type="text" 
                        placeholder="Search by name, address..." 
                        className="bg-transparent outline-none font-bold text-sm w-64"
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                      />
                    </div>
                    <button className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-medical-border shadow-sm'}`}>
                      <Filter size={20} className="opacity-40" />
                    </button>
                  </div>
                </div>
                
                <div className={`rounded-[3rem] border overflow-hidden ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-sm'}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b ${isDarkMode ? 'border-white/10' : 'border-medical-border'}`}>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Unit Name</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Location</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Category</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Price</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customDorms.filter(d => d.name.toLowerCase().includes(unitSearch.toLowerCase()) || d.address.toLowerCase().includes(unitSearch.toLowerCase())).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-20 text-center">
                              <p className="text-sm font-bold opacity-30">No units matching your criteria were found.</p>
                            </td>
                          </tr>
                        ) : (
                          customDorms.filter(d => d.name.toLowerCase().includes(unitSearch.toLowerCase()) || d.address.toLowerCase().includes(unitSearch.toLowerCase())).map(dorm => (
                            <tr key={dorm.id} className={`border-b last:border-0 hover:bg-medical-primary/5 transition-colors ${isDarkMode ? 'border-white/5' : 'border-medical-border/50'}`}>
                              <td className="p-8 font-black tracking-tight">{dorm.name}</td>
                              <td className="p-8">
                                <div className="flex items-center gap-2 opacity-60 text-xs font-bold">
                                  <MapPin size={14} /> {dorm.address}
                                </div>
                              </td>
                              <td className="p-8">
                                <span className="px-3 py-1 bg-medical-primary/10 text-medical-primary text-[10px] font-black rounded-full uppercase tracking-widest">
                                  {dorm.category}
                                </span>
                              </td>
                              <td className="p-8">
                                <span className="text-sm font-black text-green-500">₱{dorm.price}/mo</span>
                              </td>
                              <td className="p-8 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => onViewUnit?.(dorm)}
                                      className={`p-3 rounded-xl border transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-medical-border hover:bg-medical-surface shadow-sm'}`}
                                      title="View Details"
                                    >
                                      <Eye size={16} className="text-blue-500" />
                                    </button>
                                    <button 
                                      onClick={() => handleEdit(dorm)}
                                      className={`p-3 rounded-xl border transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-medical-border hover:bg-medical-surface shadow-sm'}`}
                                      title="Edit Unit"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => deleteDorm(dorm.id)} className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-all">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">History</h2>
                    <p className="text-sm opacity-50 font-bold mt-1">Complete record of what happened in the app.</p>
                  </div>
                  <div />
                </div>

                <div className={`rounded-[3rem] border overflow-hidden ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-sm'}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b ${isDarkMode ? 'border-white/10' : 'border-medical-border'}`}>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Event</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Actor</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">Resource</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40">IP Address</th>
                          <th className="p-8 text-xs font-black uppercase tracking-widest opacity-40 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.filter(log => 
                          log.action?.toLowerCase().includes(unitSearch.toLowerCase()) || 
                          log.user_email?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                          log.details?.toLowerCase().includes(unitSearch.toLowerCase())
                        ).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-20 text-center opacity-30 font-bold">No logs found.</td>
                          </tr>
                        ) : (
                          auditLogs.filter(log => 
                            log.action?.toLowerCase().includes(unitSearch.toLowerCase()) || 
                            log.user_email?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                            log.details?.toLowerCase().includes(unitSearch.toLowerCase())
                          ).map(log => (
                            <tr key={log.id} className={`border-b last:border-0 hover:bg-medical-primary/5 transition-colors ${isDarkMode ? 'border-white/5' : 'border-medical-border/50'}`}>
                              <td className="p-8">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                  log.action.includes('DELETE') ? "bg-rose-500/10 text-rose-500" :
                                  log.action.includes('CREATE') || log.action.includes('ADD') ? "bg-green-500/10 text-green-500" :
                                  "bg-blue-500/10 text-blue-500"
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-8 font-bold opacity-70">{log.user_email || 'System'}</td>
                              <td className="p-8 text-xs font-medium opacity-50">{log.details || 'N/A'}</td>
                              <td className="p-8 text-xs font-mono opacity-40">{log.ip_address || 'internal'}</td>
                              <td className="p-8 text-right opacity-40 text-xs font-bold">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-4xl mx-auto space-y-10">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-black tracking-tight">Profile & Security</h2>
                  <p className="text-sm opacity-50 font-bold mt-1">Manage your identity and account protection.</p>
                </div>

                <div className={`p-10 rounded-[3rem] border ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border shadow-xl'}`}>
                  <div className="flex flex-col items-center mb-10">
                    <div className="w-24 h-24 rounded-3xl bg-medical-primary text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-medical-primary/30 mb-4">
                      {currentUser?.full_name?.charAt(0) || 'A'}
                    </div>
                    <p className="text-sm font-black text-medical-primary uppercase tracking-widest">{currentUser?.role}</p>
                  </div>

                  <form className="space-y-8" onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const email = formData.get('email') as string;
                    const password = formData.get('password') as string;

                    try {
                      const updateData: any = { full_name: name, email };
                      if (password) updateData.password = password;

                      await api.updateUser(currentUser.id, updateData);
                      api.logAction({ user_id: currentUser.id, user_email: email, action: 'PROFILE_UPDATED', details: 'Updated profile info via Admin Panel' });
                      alert('Profile updated! Please log in again to sync changes.');
                      onLogout();
                    } catch (err) {
                      alert('Failed to update profile');
                    }
                  }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Full Name</label>
                        <input name="name" type="text" defaultValue={currentUser?.full_name} className={`w-full p-4 rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#F9FAF8] border-medical-border'}`} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Email Address</label>
                        <input name="email" type="email" defaultValue={currentUser?.email} className={`w-full p-4 rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#F9FAF8] border-medical-border'}`} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">New Password (optional)</label>
                      <input name="password" type="password" placeholder="Leave blank to keep current" className={`w-full p-4 rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#F9FAF8] border-medical-border'}`} />
                    </div>
                    <button type="submit" className="w-full py-5 bg-medical-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-medical-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                      Update Profile Settings
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Create Unit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-5xl p-10 rounded-[3rem] border shadow-2xl z-[3010] max-h-[90vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border'}`}
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-medical-text">Register New Unit</h2>
                  <p className="text-sm opacity-50 font-bold mt-1 text-medical-accent">Expand the housing database.</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-3 hover:bg-rose-500/10 text-rose-500 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Full Address</label>
                    <div className="relative group">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-medical-primary" size={20} />
                      <input 
                        type="text" 
                        placeholder="Street, Barangay, City..."
                        className={`w-full p-5 pl-14 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                        value={newDorm.address}
                        onChange={e => setNewDorm({...newDorm, address: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleAddressSearch()}
                      />

                      {/* Modal Suggestions Dropdown */}
                      <AnimatePresence>
                        {addressSuggestions.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`absolute left-0 right-0 top-full mt-2 z-[1000] rounded-2xl border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-dark-surface border-white/10' : 'bg-white border-medical-border'}`}
                          >
                            {addressSuggestions.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setNewDorm({
                                    ...newDorm,
                                    address: s.display_name,
                                    lat: parseFloat(s.lat),
                                    lon: parseFloat(s.lon)
                                  });
                                  setAddressSuggestions([]);
                                }}
                                className={`w-full text-left p-4 text-xs font-bold border-b last:border-0 transition-colors ${isDarkMode ? 'border-white/5 hover:bg-white/5 text-white/70' : 'border-medical-border/50 hover:bg-medical-surface text-medical-text/70'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <MapPin size={14} className="mt-0.5 text-medical-primary shrink-0" />
                                  <span>{s.display_name}</span>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="h-72 rounded-2xl overflow-hidden border border-medical-border relative group">
                    <MapContainer 
                      center={[newDorm.lat || 14.5995, newDorm.lon || 120.9842]} 
                      zoom={13} 
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url={isDarkMode 
                          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        }
                      />
                      <LocationPicker 
                        lat={newDorm.lat || 14.5995} 
                        lon={newDorm.lon || 120.9842} 
                        isDarkMode={isDarkMode}
                        onChange={(lat, lon) => setNewDorm({...newDorm, lat, lon})} 
                      />
                    </MapContainer>
                    <div className="absolute bottom-4 left-4 right-4 bg-medical-primary/90 backdrop-blur-md text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-xl transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                      Click map to set precise location
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Property Name</label>
                    <input 
                      type="text" 
                      placeholder="Unit Title"
                      className={`w-full p-5 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                      value={newDorm.name}
                      onChange={e => setNewDorm({...newDorm, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Category</label>
                      <select 
                        className={`w-full p-5 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 appearance-none bg-no-repeat bg-[right_1.5rem_center] ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                        value={newDorm.category}
                        onChange={e => setNewDorm({...newDorm, category: e.target.value as DormCategory})}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundSize: '1.2em' }}
                      >
                        <option value="private">Private</option>
                        <option value="university">University Dorm</option>
                        <option value="residence">Residence</option>
                        <option value="coliving">Co-living</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Price</label>
                      <input 
                        type="number" 
                        placeholder="₱ Amount"
                        className={`w-full p-5 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                        value={newDorm.price || ''}
                        onChange={e => setNewDorm({...newDorm, price: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Description</label>
                    <textarea 
                      rows={4}
                      placeholder="Unit details..."
                      className={`w-full p-5 rounded-2xl border outline-none font-bold transition-all focus:ring-4 focus:ring-medical-primary/20 resize-none ${isDarkMode ? 'bg-dark-bg border-white/10 text-white' : 'bg-[#FDFDFD] border-medical-border shadow-inner'}`}
                      value={newDorm.description}
                      onChange={e => setNewDorm({...newDorm, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-3 text-medical-accent/60">Unit Image</label>
                    <div className="flex flex-wrap gap-4">
                      <label className={`flex-1 min-w-[200px] h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-medical-primary/5 ${isDarkMode ? 'border-white/10 hover:border-medical-primary/40' : 'border-medical-border hover:border-medical-primary/40'}`}>
                        <Upload size={24} className="text-medical-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Upload Photo</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </label>
                      
                      {newDorm.image_url && (
                        <div className="relative w-32 h-32 rounded-2xl border border-medical-border overflow-hidden shrink-0 group">
                          <img src={newDorm.image_url} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setNewDorm({ ...newDorm, image_url: '' })}
                            className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XIcon size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={saveDorm}
                className="w-full mt-10 p-8 bg-gradient-to-r from-medical-primary to-emerald-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-medical-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
              >
                <Check size={28} />
                {editingDormId ? 'Update Unit Info' : 'Commit to System'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
