const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const qs = require('querystring');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Health check
app.get('/', (req, res) => {
  res.send('✅ GHL BML Payment App is live!');
});

// Simulated Payments endpoint
app.post('/payments', (req, res) => {
  const { successUrl } = req.body;
  res.json({
    redirectUrl: successUrl || 'https://your-redirect-after-payment.com'
  });
});

// Webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.sendStatus(200);
});

// Payment methods (required for GHL)
app.get('/payment-methods', (req, res) => {
  console.log('📥 GHL called /payment-methods:', req.headers.authorization);
  res.json([
    {
      id: 'bml',
      name: 'BML Payment Gateway',
      description: 'Pay securely via Bank of Maldives',
      type: 'redirect'
    }
  ]);
});

// OAuth Authorization endpoint
app.get('/oauth/authorize', (req, res) => {
  const redirectUri = req.query.redirect_uri;
  const state = req.query.state;
  const authCode = 'dummy-auth-code';

  if (!redirectUri || redirectUri.includes('highlevel')) {
    return res.status(400).send('Invalid redirect URI');
  }

  const redirectUrl = `${redirectUri}?code=${authCode}&state=${state}`;
  res.redirect(redirectUrl);
});

// OAuth Redirect handler
app.get('/oauth/redirect', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://api.msgsndr.com/oauth/token',
      qs.stringify({
        client_id: '687f2fbbd3996c631c1b4fea-mdemium6',
        client_secret: 'YOUR_0aff7dcc-0590-40e6-84c5-e624f996e30f',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://gateway.optiroai.com/oauth/redirect'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const decoded = jwt.decode(accessToken);
    const locationId = decoded?.authClassId;

    if (!locationId) throw new Error('Missing locationId from token');

    console.log('✅ Access token received:', accessToken);
    console.log('📍 Location ID:', locationId);

    // Register Payment Provider with GHL
    await axios.post(
      'https://services.msgsndr.com/integrations/payment/custom-provider/config',
      {
        name: 'BML Payment Gateway',
        description: 'Pay securely via Bank of Maldives',
        imageUrl: 'https://gateway.optiroai.com/logo.png',
        locationId: locationId,
        queryUrl: 'https://gateway.optiroai.com/query',
        paymentsUrl: 'https://gateway.optiroai.com/payments'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    res.send('✅ Payment provider registered successfully. You can close this tab.');
  } catch (err) {
    console.error('❌ Error in /oauth/redirect:', err.response?.data || err.message);
    res.status(500).send('Failed to register payment provider');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
