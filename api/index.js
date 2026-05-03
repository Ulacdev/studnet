import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Supabase Setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.get('/api', (req, res) => {
  res.json({ message: "DormPulse API Active (Vercel Serverless)" });
});

// --- Auth Routes ---
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const { data: existing } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (existing) return res.status(400).json({ detail: "User already exists" });

    const newUser = {
      id: uuidv4(),
      full_name: name,
      email: email,
      password: password,
      role: 'Student',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('profiles').insert(newUser).select();
    if (error) return res.status(400).json({ detail: error.message });
    res.json({ message: "Signup successful", user: data[0] });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('email', email).eq('password', password).single();
    if (error || !data) return res.status(401).json({ detail: "Invalid email or password" });
    res.json({ user: data, isAdmin: data.role === 'Admin' });
  } catch (err) {
    res.status(401).json({ detail: "Invalid credentials" });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const { data: user, error } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (error || !user) return res.status(404).json({ detail: "User not found" });

    const resetToken = uuidv4();
    await supabase.from('profiles').update({ reset_token: resetToken }).eq('email', email);

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?reset_token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"DormPulse" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'DormPulse - Reset Your Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1e293b; background: #f8fafc; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0;">DormPulse</h1>
          </div>
          <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 16px;">Password Reset Request</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
              Hello ${user.full_name},<br>
              Click the button below to reset your password.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${resetLink}" style="background: #4B6344; color: white; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block;">
                Reset My Password
              </a>
            </div>
          </div>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: "Reset link has been sent to your email" });
  } catch (err) {
    res.status(500).json({ detail: "Failed to process recovery request" });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;
  try {
    const { data: user, error } = await supabase.from('profiles').select('*').eq('email', email).eq('reset_token', token).single();
    if (error || !user) return res.status(400).json({ detail: "Invalid or expired reset link" });

    await supabase.from('profiles').update({ password: newPassword, reset_token: null }).eq('id', user.id);
    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ detail: "Failed to reset password" });
  }
});

// --- Housing Units ---
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
    const { data, error } = await supabase.from('housing_units').update(req.body).eq('id', req.params.id).select();
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

// --- User Management ---
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
    const { data, error } = await supabase.from('profiles').update({ role: req.body.role }).eq('id', req.params.id).select();
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

app.put('/api/users/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').update(req.body).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Audit Logs ---
app.get('/api/audit', async (req, res) => {
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
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

// --- Favorites ---
app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('favorites').select('unit_id').eq('user_id', req.params.userId);
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
    const { error } = await supabase.from('favorites').delete().eq('user_id', req.params.userId).eq('unit_id', req.params.unitId);
    if (error) throw error;
    res.json({ message: "Removed from favorites" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Housing Proxy ---
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

app.post('/api/housing', async (req, res) => {
  const { query } = req.body;
  
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for Vercel friendliness

      const response = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (err) {
      console.error(`Endpoint ${endpoint} failed`);
    }
  }
  res.status(503).json({ detail: 'Housing servers overloaded. Try again later.' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`🚀 API Server running locally on http://localhost:${PORT}`);
  });
}

export default app;
