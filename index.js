const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Basic Payment Gateway Simulation

app.post('/payments', (req, res) => {
  const { successUrl } = req.body;
  // Simulated payment redirection
  res.json({
    redirectUrl: successUrl || 'https://your-redirect-after-payment.com'
  });
});

app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('✅ GHL BML Payment App is live!');
});

app.get('/oauth/authorize', (req, res) => {
  const redirectUri = req.query.redirect_uri;
  const clientId = req.query.client_id;
  const state = req.query.state;
  const authCode = 'dummy-auth-code'; // Simulated code

  // 🚫 Optional: Block redirect_uri that includes 'highlevel' if needed
  if (!redirectUri || redirectUri.includes('highlevel')) {
    return res.status(400).send('Invalid redirect URI');
  }

  // ✅ Simulate successful authorization by redirecting back to GHL
  const redirectUrl = `${redirectUri}?code=${authCode}&state=${state}`;
  res.redirect(redirectUrl);
});

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

const axios = require('axios');

app.get('/oauth/redirect', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for access token from GHL
    const tokenResponse = await axios.post('https://api.msgsndr.com/oauth/token', {
      client_id: '687f2fbbd3996c631c1b4fea-mdemium6',
      client_secret: '0aff7dcc-0590-40e6-84c5-e624f996e30f',
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'https://gateway.optiroai.com/oauth/redirect'
    });

    const accessToken = tokenResponse.data.access_token;

    // Optional: log it
    console.log('✅ Access token received:', accessToken);

    // Now call GHL to register payment provider
    await axios.post('https://api.msgsndr.com/integrations/payment/custom-provider/config', {
      name: 'BML Payment Gateway',
      description: 'Pay securely via Bank of Maldives',
      imageUrl: 'https://gateway.optiroai.com/logo.png',
      locationId: 'Z7DBdt6O2qMGJDafaqpA', // 👈 Hardcoded for now
      queryUrl: 'https://gateway.optiroai.com/query',
      paymentsUrl: 'https://gateway.optiroai.com/payments'
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    res.send('✅ Payment provider registered successfully. You can close this tab.');
  } catch (err) {
    console.error('❌ Error in /oauth/redirect:', err.response?.data || err.message);
    res.status(500).send('Failed to register payment provider');
  }
});

app.post('/oauth/token', async (req, res) => {
  const accessToken = 'dummy-access-token'; // Simulated token
  const locationId = 'Z7DBdt6O2qMGJDafaqpA'; // 🔁 You should ideally extract this from the token or query param

  try {
    await axios.post('https://api.msgsndr.com/integrations/payment/custom-provider/config', {
      name: 'BML Payment Gateway',
      description: 'Pay securely via Bank of Maldives',
      imageUrl: 'https://gateway.optiroai.com/logo.png', // replace with your actual logo URL
      locationId: locationId,
      queryUrl: 'https://gateway.optiroai.com/query', // can be placeholder
      paymentsUrl: 'https://gateway.optiroai.com/payments' // iframe URL
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    console.log('✅ GHL payment provider config registered');
  } catch (err) {
    console.error('❌ Error registering payment config with GHL:', err.response?.data || err.message);
  }

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'dummy-refresh-token'
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
