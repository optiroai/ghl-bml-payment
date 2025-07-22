const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Basic Payment Gateway Simulation
app.get('/payment-methods', (req, res) => {
  res.json([
    {
      id: 'bml',
      name: 'BML Gateway',
      description: 'Pay via Bank of Maldives',
      type: 'redirect',
    },
  ]);
});

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

// ✅ OAuth Token Handler
app.post('/oauth/token', (req, res) => {
  // Simulated token exchange response
  res.json({
    access_token: 'dummy-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'dummy-refresh-token'
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
