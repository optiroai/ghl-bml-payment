require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const qs = require('querystring');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// ✅ Health check
app.get('/', (req, res) => {
  res.send('✅ GHL BML Payment App is live!');
});

// ✅ Simulated payments iframe handler
app.post('/payments', (req, res) => {
  const { successUrl } = req.body;
  res.json({
    redirectUrl: successUrl || 'https://your-redirect-after-payment.com'
  });
});

// ✅ Webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('📩 Webhook received:', req.body);
  res.sendStatus(200);
});

// ✅ Payment methods endpoint (used by GHL to identify the provider)
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

// ✅ OAuth authorization step
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

// ✅ OAuth redirect and payment provider registration
app.get('/oauth/redirect', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios.post(
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

    const accessToken = tokenResponse.data.access_token;
    const decoded = jwt.decode(accessToken);
    const locationId = decoded?.authClassId;

    if (!locationId) throw new Error('Missing locationId from token');

    console.log('✅ Access token received:', accessToken);
    console.log('📍 Location ID:', locationId);

    // 🔁 Register payment provider
    await axios.post(
      'https://backend.leadconnectorhq.com/integrations/payment/custom-provider/config',
      {
        name: 'BML Payment Gateway',
        description: 'Pay securely via Bank of Maldives',
        imageUrl: 'https://gateway.optiroai.com/logo.png',
        locationId,
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

// ✅ Query endpoint (GHL verifies payment status here)
app.post('/query', (req, res) => {
  const { type } = req.body;

  console.log('📩 /query received:', req.body);

  switch (type) {
    case 'verify':
      return res.json({ success: true }); // simulate success
    case 'list_payment_methods':
      return res.json([
        {
          id: 'demo-card-001',
          type: 'card',
          title: 'Visa',
          subTitle: '**** **** **** 4242',
          expiry: '12/29',
          customerId: 'demo-customer-id',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png'
        }
      ]);
    case 'charge_payment':
      return res.json({
        success: true,
        chargeId: 'demo_charge_id',
        chargeSnapshot: {
          id: 'demo_charge_id',
          status: 'succeeded',
          amount: req.body.amount,
          chargeId: 'demo_charge_id',
          chargedAt: Math.floor(Date.now() / 1000)
        }
      });
    default:
      return res.json({ message: `Unhandled type: ${type}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
