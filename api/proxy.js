export default async function handler(req, res) {
  try {
    const targetUrl = req.headers['x-target-url'];
    if (!targetUrl) return res.status(400).json({ error: 'Missing x-target-url header' });
    const isAuth = targetUrl.includes('/oauth/token');

    // Build pure, untainted headers
    const headers = {
      'Authorization': req.headers['authorization'],
      'x-account': req.headers['x-account'],
      'x-idempotency-key': req.headers['x-idempotency-key'],
      'ngrok-skip-browser-warning': 'true'
    };

    // Purge undefined
    Object.keys(headers).forEach(k => {
      if (!headers[k]) delete headers[k];
    });

    // 1. OAUTH ROUTING (Strict URL-Encoded handling)
    if (isAuth) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const bodyParams = new URLSearchParams();
      bodyParams.append('grant_type', 'client_credentials');

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: bodyParams
      });
      return res.status(response.status).send(await response.text());
    }

    // 2. STANDARD JSON ROUTING (Conversations API & Ngrok API)
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      headers['Content-Type'] = 'application/json';
      
      // Vercel intelligently parses incoming JSON, we strictly rebuild it
      const stringifiedBody = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: stringifiedBody
      });
      return res.status(response.status).send(await response.text());
    }

    // 3. GET/DELETE ROUTING (Session cleanup & Webhook polling)
    const response = await fetch(targetUrl, {
      method: req.method,
      headers
    });
    return res.status(response.status).send(await response.text());

  } catch (err) {
    console.error('Vercel Node Fetch Error:', err);
    res.status(500).json({ error: 'Proxy Failure', details: err.message });
  }
}
