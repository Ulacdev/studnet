-- Sample INSERT statements for housing units in different Philippine locations
-- Run these in your Supabase SQL Editor after creating the housing_units table

-- Manila Area (Near UP Diliman, Ateneo, La Salle)
INSERT INTO housing_units (name, address, lat, lon, price, rating, category, description, is_featured) VALUES
('Diliman Dormitory', 'University of the Philippines Diliman, Quezon City, Metro Manila', 14.6538, 121.0680, 4500, 4.2, 'university', 'Modern dormitory near UP Diliman campus with study areas and laundry facilities', true),
('Katipunan Residences', 'Katipunan Avenue, Loyola Heights, Quezon City', 14.6407, 121.0750, 5500, 4.5, 'private', 'Luxury student housing near Ateneo de Manila University', false),
('Taft Avenue Apartments', 'Taft Avenue, Malate, Manila', 14.5654, 120.9919, 3800, 4.0, 'residence', 'Affordable housing near De La Salle University Manila', false);

-- Cebu City Area (Near University of San Carlos, Cebu Doctors')
INSERT INTO housing_units (name, address, lat, lon, price, rating, category, description, is_featured) VALUES
('USC Student Village', 'P. Del Rosario Street, Cebu City, Cebu', 10.2971, 123.8995, 3200, 4.3, 'university', 'Dormitory complex near University of San Carlos', true),
('IT Park Residences', 'Cebu IT Park, Apas, Cebu City', 10.3357, 123.9113, 4200, 4.6, 'coliving', 'Modern co-living spaces near Cebu Doctors University Hospital', false),
('Mandaue City Dorms', 'Mandaue City, Cebu', 10.3333, 123.9333, 3500, 4.1, 'private', 'Student housing in Mandaue City area', false);

-- Davao City Area (Near Ateneo de Davao, University of Mindanao)
INSERT INTO housing_units (name, address, lat, lon, price, rating, category, description, is_featured) VALUES
('Davao Student Hub', 'J.P. Laurel Avenue, Bajada, Davao City', 7.0722, 125.6131, 2800, 4.4, 'university', 'Affordable dorms near Ateneo de Davao University', true),
('Matina Residences', 'Matina, Davao City', 7.0644, 125.5625, 3600, 4.2, 'residence', 'Modern apartments in Matina district', false),
('Toril Apartments', 'Toril, Davao City', 7.0194, 125.4972, 3100, 3.9, 'private', 'Budget-friendly housing near University of Mindanao', false);

-- Baguio City Area (Near UP Baguio, University of Baguio)
INSERT INTO housing_units (name, address, lat, lon, price, rating, category, description, is_featured) VALUES
('Baguio Academic Village', 'University of the Philippines Baguio, Baguio City', 16.4131, 120.5966, 2900, 4.5, 'university', 'Mountain view dorms with cold climate perfect for studying', true),
('Session Road Residences', 'Session Road, Baguio City', 16.4023, 120.5960, 3800, 4.3, 'coliving', 'Cozy rooms near University of Baguio', false),
('Burnham Park Dorms', 'Burnham Park, Baguio City', 16.4100, 120.5900, 3400, 4.0, 'residence', 'Scenic housing near Burnham Park', false);

-- Iloilo City Area (Near University of San Agustin, CPU)
INSERT INTO housing_units (name, address, lat, lon, price, rating, category, description, is_featured) VALUES
('Iloilo University Residences', 'General Luna Street, Iloilo City', 10.6973, 122.5644, 2600, 4.1, 'university', 'Student housing near University of San Agustin', true),
('Mandurriao Apartments', 'Mandurriao, Iloilo City', 10.6917, 122.5494, 3200, 4.2, 'private', 'Modern apartments near Central Philippine University', false),
('Jaro District Dorms', 'Jaro, Iloilo City', 10.7167, 122.5500, 2800, 3.8, 'residence', 'Affordable housing in Jaro district', false);

-- Bacolod City Area (Near University of St. La Salle)
INSERT INTO housing_units (name, address, lat, lon, price, rating, category, description, is_featured) VALUES
('Bacolod Student Center', 'Lacson Street, Bacolod City, Negros Occidental', 10.6765, 122.9509, 2700, 4.0, 'university', 'Dorms near University of St. La Salle', true),
('Mandalagan Residences', 'Mandalagan, Bacolod City', 10.6700, 122.9500, 3300, 4.3, 'coliving', 'Co-living spaces with modern amenities', false),
('North Capitol Dorms', 'North Capitol Road, Bacolod City', 10.6900, 122.9600, 3000, 3.9, 'private', 'Budget student housing', false);

-- Cagayan de Oro Area (Near Xavier University)
INSERT INTO housing_units (name, address, lat, lon, price, rating, category, description, is_featured) VALUES
('CDO Academic Residences', 'Xavier University, Cagayan de Oro City', 8.4822, 124.6503, 2900, 4.4, 'university', 'Premium dorms near Xavier University', true),
('Limketkai Center Apartments', 'Limketkai Center, Cagayan de Oro City', 8.4744, 124.6472, 3600, 4.5, 'residence', 'Modern apartments in the city center', false),
('Bulua Residences', 'Bulua, Cagayan de Oro City', 8.4900, 124.6200, 3200, 4.1, 'private', 'Quiet residential area housing', false);