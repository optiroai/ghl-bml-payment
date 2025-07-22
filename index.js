require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const qs = require('querystring');

const app = express();
const PORT = process.env.PORT || 3000;

// Health Check
app.get('/', (req, res) => {
  res.send('✅ GHL BML Payment App is live!');
});

// Simulated Payments Endpoint
app.post('/payments', (req, res) => {
  const { successUrl } = req.body;
  res.json({
    redirectUrl: successUrl || 'https://your-redirect-after-payment.com'
  });
});

// Webhook Endpoint
app.post('/webhook', (req, res) => {
  console.log('📩 Webhook received:', req.body);
  res.sendStatus(200);
});

// Payment Methods Endpoint for GHL
app.get('/payment-methods', (req, res) => {
  console.log('📥 GHL called /payment-methods');
  res.json([
    {
      id: 'bml',
      name: 'BML Payment Gateway',
      description: 'Pay securely via Bank of Maldives',
      type: 'redirect'
    }
  ]);
});

// OAuth Authorization Redirect (GHL calls this)
app.get('/oauth/authorize', (req, res) => {
  const { redirect_uri, state } = req.query;

  if (!redirect_uri || redirect_uri.includes('highlevel')) {
    return res.status(400).send('Invalid redirect URI');
  }

  const dummyCode = 'dummy-auth-code'; // Used for simulation
  const redirectUrl = `${redirect_uri}?code=${dummyCode}&state=${state}`;
  res.redirect(redirectUrl);
});

// OAuth Callback: Exchange code → token → register payment config
app.get('/oauth/redirect', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://api.msgsndr.com/oauth/token',
      qs.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenRes.data.access_token;
    const decoded = jwt.decode(accessToken);
    const locationId = decoded?.authClassId;

    if (!locationId) {
      throw new Error('❌ Missing locationId from token');
    }

    console.log('✅ Access token received:', accessToken);
    console.log('📍 Location ID:', locationId);

    res.send('✅ BML Payment Gateway registered successfully! You can close this tab.');
  } catch (err) {
    console.error('❌ Error in /oauth/redirect:', err.response?.data || err.message);
    res.status(500).send('Failed to register payment provider.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
