/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Star, MapPin, Clock, Phone, Navigation, Heart, Sparkles, ShieldCheck } from 'lucide-react';
import { DormFacility } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Translation } from '../translations';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FacilityCardProps {
  key?: string | number;
  facility: DormFacility;
  isSelected?: boolean;
  isDarkMode?: boolean;
  isSaved?: boolean;
  onClick: () => void;
  onDirections?: (dormFacility: DormFacility) => void;
  onToggleSave?: (dormFacility: DormFacility) => void;
  t: Translation;
}

export default function FacilityCard({ facility, isSelected, isDarkMode, isSaved, onClick, onDirections, onToggleSave, t }: FacilityCardProps) {
  const placeholders: Record<string, string> = {
    university: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=800',
    private: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
    residence: 'https://images.unsplash.com/photo-1555854817-cc0867f8e91c?auto=format&fit=crop&q=80&w=800',
    coliving: 'https://images.unsplash.com/photo-1556912177-c54057108849?auto=format&fit=crop&q=80&w=800',
    hostel: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    studio: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800',
  };

  const displayImage = facility.image_url || placeholders[facility.category] || placeholders.university;

  const categoryColors = {
    university: 'text-blue-600 bg-blue-50 border-blue-200',
    private: 'text-green-600 bg-green-50 border-green-200',
    residence: 'text-purple-600 bg-purple-50 border-purple-200',
    coliving: 'text-orange-600 bg-orange-50 border-orange-200',
    hostel: 'text-medical-primary bg-medical-surface border-medical-primary',
    studio: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  };

  const categoryLabels: Record<string, string> = {
    university: t.dorms,
    private: t.privateDorms,
    residence: t.residences,
    coliving: t.coliving,
    hostel: t.hostels,
    studio: t.studios,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "p-4 sm:p-6 rounded-[2rem] natural-shadow border transition-all cursor-pointer group active:scale-[0.98] relative",
        isDarkMode 
          ? "bg-dark-surface border-dark-border hover:border-medical-primary" 
          : "bg-white border-transparent hover:border-medical-primary",
        isSelected && (isDarkMode ? "border-medical-primary bg-dark-bg" : "border-medical-primary bg-[#FDFCF8]")
      )}
      id={`facility-card-${facility.id}`}
    >
      <div className="w-full h-48 mb-4 rounded-2xl overflow-hidden border border-medical-border/50">
        <img 
          src={displayImage} 
          alt={facility.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
        />
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave?.(facility);
        }}
        className={cn(
          "absolute top-4 right-4 p-2 rounded-full transition-all active:scale-90 z-10",
          isSaved 
            ? "text-medical-emergency bg-rose-50 border border-rose-100" 
            : "text-medical-accent hover:bg-medical-surface"
        )}
      >
        <Heart size={20} className={isSaved ? "fill-current" : ""} />
      </button>

      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-10">
          <h3 className={cn(
            "font-bold text-lg leading-tight mb-1 transition-colors",
            isDarkMode ? "text-dark-text" : "text-medical-text"
          )}>
            {facility.name}
          </h3>
          <p className="text-[11px] opacity-60 font-bold mb-2 line-clamp-1">{facility.address}</p>
          <span className={cn(
            "inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
            categoryColors[facility.category as keyof typeof categoryColors] || 'text-slate-600 bg-slate-50 border-slate-200'
          )}>
            {categoryLabels[facility.category] || facility.category}
          </span>
        </div>
        <div className={cn(
          "p-2.5 rounded-2xl transition-colors",
          isDarkMode ? "bg-dark-bg text-medical-primary" : "bg-medical-surface text-medical-primary"
        )}>
          <Navigation size={18} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-medical-accent mb-4">
        <div className="flex items-center gap-1.5 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-medical-primary" />
          <span>{facility.distance} {t.km}</span>
        </div>
        {facility.rating && (
          <div className="flex items-center gap-1 border-l border-medical-border pl-3">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span className={cn("font-bold", isDarkMode ? "text-dark-text" : "text-medical-text")}>{facility.rating}</span>
          </div>
        )}
        {facility.price && (
          <div className="flex items-center gap-1 border-l border-medical-border pl-3 font-black text-green-600">
            <span>${facility.price}</span>
            <span className="text-[8px] opacity-40">/mo</span>
          </div>
        )}
      </div>

      {(facility.specialty || facility.isCustom) && (
        <div className="mb-5 flex flex-wrap gap-2">
          {facility.specialty && (
            <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 text-[10px] font-bold flex items-center gap-1">
              <Sparkles size={12} />
              {facility.specialty}
            </div>
          )}
          {facility.isCustom && (
            <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-1">
              <ShieldCheck size={12} />
              Verified
            </div>
          )}
          {facility.is_featured && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-1">
              <Star size={12} className="fill-current" />
              Featured
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDirections?.(facility);
          }}
          className="flex items-center justify-center gap-2 py-3.5 bg-medical-primary text-white text-sm font-bold rounded-2xl hover:bg-[#5A7A50] transition-colors shadow-lg shadow-medical-primary/10 active:scale-95"
        >
          {t.directions}
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `tel:${facility.phone}`;
          }}
          className={cn(
            "flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-2xl border transition-all active:scale-95",
            isDarkMode 
              ? "bg-dark-bg text-dark-text border-dark-border hover:bg-black/20" 
              : "bg-white text-medical-text border-medical-border hover:bg-medical-surface"
          )}
        >
          <Phone size={16} />
          {t.call}
        </button>
      </div>
    </motion.div>
  );
}
