export default async function handler(req, res) {
  // A universal anti-CORS proxy executed on Vercel's Node backend.
  // This physically bypasses Chrome's strict OPTIONS pre-flight requirements 
  // which violently conflict with ngrok's destructive HTML abuse firewall.
  
  try {
    const targetUrl = req.headers['x-target-url'];
    if (!targetUrl) return res.status(400).json({ error: 'Missing x-target-url header' });

    const options = {
      method: req.method,
      headers: {
        'Authorization': req.headers['authorization'],
        'Content-Type': req.headers['content-type'],
        'x-account': req.headers['x-account'],
        'x-idempotency-key': req.headers['x-idempotency-key'],
        'ngrok-skip-browser-warning': 'true'
      }
    };

    // Purge undefined headers to prevent node-fetch crashes
    Object.keys(options.headers).forEach(k => {
      if (!options.headers[k]) delete options.headers[k];
    });

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (req.body) {
        options.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
      }
      
      // Handle OAuth form encoding natively
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
         options.body = new URLSearchParams(req.body).toString();
      }
    }

    const targetResponse = await fetch(targetUrl, options);
    
    // Attempt to pass back exact text/json
    const data = await targetResponse.text();
    res.status(targetResponse.status).send(data);

  } catch (err) {
    console.error('Vercel Serverless Proxy Error:', err);
    res.status(500).json({ error: 'Vercel Serverless Proxy Failed', details: err.message });
  }
}
