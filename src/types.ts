/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DormCategory = 'university' | 'private' | 'residence' | 'coliving' | 'studio' | 'hostel';

export interface DormFacility {
  id: string;
  name: string;
  category: DormCategory;
  lat: number;
  lon: number;
  address: string;
  distance?: number; // in km
  isOpen?: boolean;
  rating?: number;
  phone?: string;
  priceRange?: string;
  price?: number;
  specialty?: string;
  description?: string;
  type?: string;
  isCustom?: boolean;
  is_featured?: boolean;
  image_url?: string;
}

export interface UserLocation {
  lat: number;
  lon: number;
  accuracy?: number;
  timestamp?: number;
}


