import fetch from 'node-fetch';

async function testForgotPassword() {
  const email = 'admin@dormpulse.com'; // Using a known email from your logs
  const apiBase = 'http://localhost:8000/api';

  console.log(`🧪 Testing Forgot Password for: ${email}`);
  
  try {
    const res = await fetch(`${apiBase}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    console.log(`Response Status: ${res.status}`);
    console.log(`Response Body:`, data);

    if (res.ok) {
      console.log('✅ Success! The backend processed the request and attempted to send an email.');
    } else {
      console.log('❌ Failed. Check if the email exists in your Supabase "profiles" table.');
    }
  } catch (err) {
    console.error('❌ Error connecting to backend:', err.message);
  }
}

testForgotPassword();
