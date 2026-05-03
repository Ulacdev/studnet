import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple in-memory cache for housing data
  const housingCache = new Map();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Request queue to prevent overwhelming APIs
  let lastRequestTime = 0;
  const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  // Proxy API route for housing data
  app.post("/api/housing", async (req, res) => {
    // Rate limiting: ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    // Check cache first
    const cacheKey = query.replace(/\s+/g, '').substring(0, 100);
    const cached = housingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached housing data');
      return res.json(cached.data);
    }

    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://lz4.overpass-api.de/api/interpreter',
      'https://z.overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.osm.ch/api/interpreter'
    ];

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      try {
        console.log(`Proxying request to ${endpoint}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // Reduced to 8s

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'DormPulse-StudentLocator/1.0 (https://ais-dev.run.app)'
          },
          body: 'data=' + encodeURIComponent(query),
          signal: controller.signal
        } as any);

        clearTimeout(timeout);

        if (response.status === 429) {
          console.warn(`Rate limited by ${endpoint}, trying next endpoint`);
          // Add delay before next attempt
          if (i < endpoints.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Exponential backoff
          }
          continue;
        }

        if (!response.ok) {
          console.warn(`Endpoint ${endpoint} returned ${response.status}`);
          continue;
        }

        const data = await response.json();

        // Cache successful response
        housingCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });

        return res.json(data);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`Request to ${endpoint} timed out`);
        } else {
          console.warn(`Error connecting to ${endpoint}:`, error.message);
        }
        // Add delay before next attempt
        if (i < endpoints.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
      }
    }

    // If all endpoints fail, return cached data if available (even if expired)
    if (cached) {
      console.log('Returning expired cached data due to API failures');
      return res.json(cached.data);
    }

    res.status(502).json({ error: "All Overpass API mirrors failed" });
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
