const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// Supabase Setup - Real PostgreSQL Database
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log('✅ Connected to Supabase:', process.env.SUPABASE_URL);

// Ensure reset_token column exists
async function ensureColumn() {
  try {
    await supabase.rpc('execute_sql', { sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reset_token TEXT;' });
  } catch (e) {
    // If RPC fails (likely not enabled), we ignore and assume column exists or was added manually
  }
}
ensureColumn();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.get('/', (req, res) => {
  res.json({ message: "DormPulse Node.js Backend Active (Supabase PostgreSQL)" });
});

// --- Auth Routes (Direct PostgreSQL - No Rate Limits) ---

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    // Check if user already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(400).json({ detail: "User already exists" });
    }

    // Insert directly into profiles table
    const newUser = {
      id: uuidv4(),
      full_name: name,
      email: email,
      password: password,
      role: 'Student',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(newUser)
      .select();

    if (error) {
      console.log('Signup Error:', error.message);
      return res.status(400).json({ detail: error.message });
    }

    console.log('✅ New user created:', email);
    res.json({ message: "Signup successful", user: data[0] });
  } catch (err) {
    console.log('Signup Exception:', err.message);
    res.status(400).json({ detail: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      console.log('Login Failed:', email);
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    console.log('✅ Login successful:', email);
    res.json({
      user: data,
      isAdmin: data.role === 'Admin'
    });
  } catch (err) {
    console.log('Login Exception:', err.message);
    res.status(401).json({ detail: "Invalid credentials" });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(404).json({ detail: "User not found" });
    }

    const resetToken = uuidv4();
    await supabase.from('profiles').update({ reset_token: resetToken }).eq('email', email);

    const resetLink = `http://localhost:5173/?reset_token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"Student House Locator" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'DormPulse - Reset Your Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1e293b; background: #f8fafc; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="background: #4B6344; width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span style="color: white; font-size: 24px;">🏠</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.025em;">Student House Locator</h1>
          </div>

          <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 16px;">Password Reset Request</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
              Hello ${user.full_name},<br>
              We received a request to reset your password for your DormPulse account. Click the button below to secure your account.
            </p>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${resetLink}" style="background: #4B6344; color: white; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 10px 15px -3px rgba(75, 99, 68, 0.3);">
                Reset My Password
              </a>
            </div>

            <p style="font-size: 14px; color: #94a3b8; line-height: 1.5;">
              If you did not request this reset, you can safely ignore this email. This link will remain active for 1 hour.
            </p>
          </div>

          <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
            © 2024 DormPulse • Manila, Philippines
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Reset link has been sent to your email" });
  } catch (err) {
    console.error('Forgot Password error:', err);
    res.status(500).json({ detail: "Failed to process recovery request" });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('reset_token', token)
      .single();

    if (error || !user) {
      return res.status(400).json({ detail: "Invalid or expired reset link" });
    }

    // Update password and clear token
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        password: newPassword,
        reset_token: null 
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.json({ message: "Password updated successfully! You can now log in." });
  } catch (err) {
    console.error('Reset Password error:', err);
    res.status(500).json({ detail: "Failed to reset password" });
  }
});

// --- Housing Units (Supabase PostgreSQL) ---

app.get('/api/units', async (req, res) => {
  try {
    const { data, error } = await supabase.from('housing_units').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.post('/api/units', async (req, res) => {
  try {
    const { data, error } = await supabase.from('housing_units').insert(req.body).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.put('/api/units/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('housing_units')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.delete('/api/units/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('housing_units').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: "Unit deleted" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- User Management (Supabase PostgreSQL) ---

app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: req.body.role })
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('profiles').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Update user profile (Account Settings)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Audit Logs (Admin) ---

app.get('/api/audit', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.post('/api/audit', async (req, res) => {
  try {
    const { data, error } = await supabase.from('audit_logs').insert(req.body).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Favorites (Students & Admin) ---

app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('unit_id')
      .eq('user_id', req.params.userId);
    if (error) throw error;
    res.json(data.map(f => f.unit_id));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const { data, error } = await supabase.from('favorites').insert(req.body).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.delete('/api/favorites/:userId/:unitId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', req.params.userId)
      .eq('unit_id', req.params.unitId);
    if (error) throw error;
    res.json({ message: "Removed from favorites" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Housing Proxy (Overpass API Bridge with Multi-Server Fallback & Caching) ---
const housingCache = new Map();
const inFlightRequests = new Map(); // Deduplication: prevent duplicate simultaneous fetches
const CACHE_TTL = 30 * 60 * 1000; // 30 minute cache

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.be/api/interpreter'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/housing', async (req, res) => {
  const { query } = req.body;
  
  // 1. Check cache first (30 minute TTL)
  if (housingCache.has(query)) {
    const cached = housingCache.get(query);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('⚡ Serving housing data from backend cache');
      return res.json(cached.data);
    }
  }

  // 2. Deduplication: if same query is already in-flight, wait for that result
  if (inFlightRequests.has(query)) {
    console.log('⏳ Waiting for in-flight request for same query...');
    try {
      const data = await inFlightRequests.get(query);
      return res.json(data);
    } catch (err) {
      return res.status(503).json({ detail: 'Housing servers unavailable.' });
    }
  }

  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

  // 3. Create and track the in-flight promise
  const fetchPromise = (async () => {
    for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
      const endpoint = OVERPASS_ENDPOINTS[i];
      try {
        console.log(`🌐 Proxying housing request to ${new URL(endpoint).hostname}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(endpoint, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.status === 429) {
          console.warn(`⚠️ ${endpoint} is rate limited, waiting 2s before next...`);
          await sleep(2000); // Back off before trying next
          continue;
        }

        if (response.status === 504) {
          console.warn(`⚠️ ${endpoint} returned 504, trying next...`);
          continue;
        }

        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        const data = await response.json();
        
        // Store in cache
        housingCache.set(query, { data, timestamp: Date.now() });
        console.log(`✅ Housing data fetched and cached (${data.elements?.length || 0} results)`);
        return data;
      } catch (err) {
        console.error(`❌ ${endpoint} failed:`, err.message);
        if (i < OVERPASS_ENDPOINTS.length - 1) {
          await sleep(1000); // Small delay before retrying next endpoint
        }
        continue;
      }
    }
    throw new Error('All Overpass endpoints failed');
  })();

  inFlightRequests.set(query, fetchPromise);

  try {
    const data = await fetchPromise;
    inFlightRequests.delete(query);
    return res.json(data);
  } catch (err) {
    inFlightRequests.delete(query);
    return res.status(503).json({ detail: 'Global housing servers are currently overloaded. Please try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 DormPulse Backend running on http://localhost:${PORT}`);
  console.log(`📦 Database: Supabase PostgreSQL (Real-Time)`);
});
