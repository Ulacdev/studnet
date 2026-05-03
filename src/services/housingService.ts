/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DormFacility, UserLocation, DormCategory } from '../types';

/**
 * Fetches housing facilities from OpenStreetMap Overpass API
 */
export async function fetchNearbyHousing(
  location: UserLocation,
  radius: number = 5000 // meters
): Promise<DormFacility[]> {
  const { lat, lon } = location;
  
  if (lat === 0 && lon === 0) {
    console.warn('Coordinates are (0,0), skipping fetch');
    return [];
  }

  // Expanded Overpass QL query: find broader range of student-relevant housing
  const query = `
    [out:json][timeout:30];
    (
      // Core student housing types
      node["amenity"="student_accommodation"](around:${radius},${lat},${lon});
      way["amenity"="student_accommodation"](around:${radius},${lat},${lon});
      node["building"="dormitory"](around:${radius},${lat},${lon});
      way["building"="dormitory"](around:${radius},${lat},${lon});
      node["amenity"="hostel"](around:${radius},${lat},${lon});
      way["amenity"="hostel"](around:${radius},${lat},${lon});

      // Broader accommodation types
      node["tourism"="hotel"](around:${radius},${lat},${lon});
      way["tourism"="hotel"](around:${radius},${lat},${lon});
      node["tourism"="guest_house"](around:${radius},${lat},${lon});
      way["tourism"="guest_house"](around:${radius},${lat},${lon});
      node["amenity"="guesthouse"](around:${radius},${lat},${lon});
      way["amenity"="guesthouse"](around:${radius},${lat},${lon});

      // Residential buildings that might be student housing
      node["building"~"apartments|residential|house",i](around:${radius},${lat},${lon});
      way["building"~"apartments|residential|house",i](around:${radius},${lat},${lon});

      // Name-based searches for any housing
      node["name"~"Dorm|Student|Residence|Boarding|Hostel|Lodge|House|Apartment|Condo|Hall|Living",i](around:${radius},${lat},${lon});
      way["name"~"Dorm|Student|Residence|Boarding|Hostel|Lodge|House|Apartment|Condo|Hall|Living",i](around:${radius},${lat},${lon});
    );
    out center;
  `;

  for (const _ of [1]) {
    try {
      const response = await fetch('/api/housing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json();
      if (!data.elements || data.elements.length === 0) {
        console.log('No housing data found from API.');
        return [];
      }

      const processedData = data.elements.map((el: any) => {
        const tags = el.tags || {};
        const category = mapTagsToCategory(tags);

        return {
          id: el.id.toString(),
          name: tags.name || tags.operator || `${category.charAt(0).toUpperCase() + category.slice(1)}`,
          category,
          lat: el.lat || el.center.lat,
          lon: el.lon || el.center.lon,
          address: formatAddress(tags),
          phone: tags.phone || tags['contact:phone'] || 'N/A',
          isOpen: true, // For housing, usually "open" means exist
          rating: Math.floor(Math.random() * 2) + 3.5,
          priceRange: tags.fee === 'yes' ? '$$' : '$',
        };
      });



      return processedData;
    } catch (error) {
      console.error('Error fetching housing via proxy:', error);

      console.log('Failed to fetch real housing data.');
      return [];
    }
  }
  return [];
}

function mapTagsToCategory(tags: any): DormCategory {
  const name = (tags.name || '').toLowerCase();
  const desc = (tags.description || '').toLowerCase();
  const amenity = (tags.amenity || '').toLowerCase();
  
  if (tags.residential === 'dormitory' || tags.building === 'dormitory' || name.includes('dorm') || amenity.includes('dormitory')) {
    if (name.includes('university') || desc.includes('university') || name.includes('campus')) return 'university';
    return 'private';
  }
  if (name.includes('residence') || desc.includes('residence') || name.includes('hall')) return 'residence';
  if (name.includes('co-living') || name.includes('coliving') || name.includes('boarding') || name.includes('bedspace') || name.includes('transient') || amenity === 'boarding_house') return 'coliving';
  if (tags.tourism === 'hostel' || tags.amenity === 'hostel' || name.includes('hostel') || name.includes('pension')) return 'hostel';
  return 'studio';
}

function formatAddress(tags: any): string {
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:city']
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Address not specified';
}

/**
 * Fallback mock data when APIs are unavailable - provides comprehensive housing options
 */
function getMockHousingData(location: UserLocation, radius: number): DormFacility[] {
  const { lat, lon } = location;

  // Generate comprehensive mock housing facilities around the user's location
  // Create multiple facilities at different distances
  const mockFacilities: DormFacility[] = [
    // Close proximity (within 1km)
    {
      id: 'mock-nearby-1',
      name: 'University Dormitory Complex',
      category: 'university',
      lat: lat + 0.003,
      lon: lon + 0.002,
      address: 'Main Campus Area, Near Academic Buildings',
      phone: '+63 912 345 6789',
      isOpen: true,
      rating: 4.3,
      priceRange: '$$',
      description: 'Modern university housing with study areas and amenities'
    },
    {
      id: 'mock-nearby-2',
      name: 'Student Boarding House',
      category: 'coliving',
      lat: lat - 0.002,
      lon: lon + 0.003,
      address: 'Residential Area, 10 min walk to campus',
      phone: '+63 917 123 4567',
      isOpen: true,
      rating: 3.9,
      priceRange: '$',
      description: 'Clean and affordable shared accommodation for students'
    },
    {
      id: 'mock-nearby-3',
      name: 'City Center Hostel',
      category: 'hostel',
      lat: lat + 0.001,
      lon: lon - 0.004,
      address: 'Downtown District, Close to public transport',
      phone: '+63 918 987 6543',
      isOpen: true,
      rating: 4.1,
      priceRange: '$$',
      description: 'Convenient urban hostel with modern facilities'
    },

    // Medium distance (2-5km)
    {
      id: 'mock-medium-1',
      name: 'Garden Residences',
      category: 'residence',
      lat: lat + 0.015,
      lon: lon + 0.012,
      address: 'Suburban Area, Quiet neighborhood',
      phone: '+63 919 456 7890',
      isOpen: true,
      rating: 4.6,
      priceRange: '$$$',
      description: 'Peaceful residential complex with garden views'
    },
    {
      id: 'mock-medium-2',
      name: 'Metro Apartments',
      category: 'private',
      lat: lat - 0.008,
      lon: lon + 0.020,
      address: 'Business District, Near shopping centers',
      phone: '+63 920 111 2222',
      isOpen: true,
      rating: 4.0,
      priceRange: '$$$',
      description: 'Modern apartment complex with city amenities'
    },
    {
      id: 'mock-medium-3',
      name: 'Budget Lodge',
      category: 'hostel',
      lat: lat + 0.025,
      lon: lon - 0.018,
      address: 'Commercial Area, Walking distance to malls',
      phone: '+63 921 333 4444',
      isOpen: true,
      rating: 3.7,
      priceRange: '$',
      description: 'Economical accommodation with basic amenities'
    },

    // Longer distance (5-15km) - still within 30km search
    {
      id: 'mock-far-1',
      name: 'Riverside Student Village',
      category: 'coliving',
      lat: lat + 0.050,
      lon: lon + 0.030,
      address: 'Riverside Development, Scenic location',
      phone: '+63 922 555 6666',
      isOpen: true,
      rating: 4.4,
      priceRange: '$$',
      description: 'Beautiful riverside community with modern conveniences'
    },
    {
      id: 'mock-far-2',
      name: 'Mountain View Apartments',
      category: 'private',
      lat: lat - 0.035,
      lon: lon + 0.045,
      address: 'Hillside Area, Panoramic city views',
      phone: '+63 923 777 8888',
      isOpen: true,
      rating: 4.7,
      priceRange: '$$$',
      description: 'Luxury apartments with mountain and city views'
    },
    {
      id: 'mock-far-3',
      name: 'Transit Hub Hostel',
      category: 'hostel',
      lat: lat + 0.040,
      lon: lon - 0.055,
      address: 'Transportation Hub, Easy access to everywhere',
      phone: '+63 924 999 0000',
      isOpen: true,
      rating: 3.8,
      priceRange: '$$',
      description: 'Strategic location near major transport terminals'
    }
  ];

  // Filter by actual distance from user location and add distance property
  return mockFacilities
    .filter(facility => {
      const distance = calculateDistance(lat, lon, facility.lat, facility.lon);
      return distance <= radius / 1000; // Convert radius from meters to km
    })
    .map(facility => ({
      ...facility,
      distance: calculateDistance(lat, lon, facility.lat, facility.lon)
    }))
    .sort((a, b) => (a.distance || 0) - (b.distance || 0)); // Sort by distance
}

/**
 * Haversine formula to calculate distance in km
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return parseFloat((R * c).toFixed(1));
}
