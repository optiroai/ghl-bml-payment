const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const qs = require('querystring');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// ✅ Health check
app.get('/', (req, res) => {
  res.send('✅ GHL BML Payment App is live!');
});

// ✅ /payment-methods endpoint (GHL polls this)
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

// ✅ Simulated /payments endpoint
app.post('/payments', (req, res) => {
  const { successUrl } = req.body;
  res.json({
    redirectUrl: successUrl || 'https://your-redirect-after-payment.com'
  });
});

// ✅ Webhook simulation
app.post('/webhook', (req, res) => {
  console.log('📬 Webhook received:', req.body);
  res.sendStatus(200);
});

// ✅ OAuth: Step 1 - Authorize
app.get('/oauth/authorize', (req, res) => {
  const { redirect_uri, client_id, state } = req.query;
  const authCode = 'dummy-auth-code'; // Simulated code

  if (!redirect_uri || redirect_uri.includes('highlevel')) {
    return res.status(400).send('❌ Invalid redirect URI');
  }

  const redirectUrl = `${redirect_uri}?code=${authCode}&state=${state}`;
  res.redirect(redirectUrl);
});

// ✅ OAuth: Step 2 - Redirect handler (exchanges code → access_token and registers payment config)
app.get('/oauth/redirect', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios.post(
      'https://api.msgsndr.com/oauth/token',
      qs.stringify({
        client_id: '687f2fbbd3996c631c1b4fea-mdemium6', // 🔁 Replace this
        client_secret: '0aff7dcc-0590-40e6-84c5-e624f996e30f', // 🔁 Replace this
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
    console.log('✅ Access token received:', accessToken);

    // Register payment provider config
    await axios.post(
      'https://api.msgsndr.com/integrations/payment/custom-provider/config',
      {
        name: 'BML Payment Gateway',
        description: 'Pay securely via Bank of Maldives',
        imageUrl: 'https://gateway.optiroai.com/logo.png',
        locationId: 'Z7DBdt6O2qMGJDafaqpA', // ✅ Replace with dynamic ID later
        queryUrl: 'https://gateway.optiroai.com/query', // Placeholder or implement later
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
    res.status(500).send('❌ Failed to register payment provider');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
