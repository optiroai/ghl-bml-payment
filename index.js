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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
