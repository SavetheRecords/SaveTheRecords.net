// netlify/functions/get-inventory.js
const https = require('https');

exports.handler = function (event, context) {
  const { page = 1, per_page = 25, q = '' } = event.queryStringParameters || {};
  const token = process.env.DISCOGS_TOKEN;

  if (!token) {
    console.error("CRITICAL ERROR: DISCOGS_TOKEN is not configured in your Netlify settings.");
    return Promise.resolve({
      statusCode: 500,
      body: JSON.stringify({ error: 'DISCOGS_TOKEN is not configured in Netlify settings.' })
    });
  }

  // We use the standard inventory endpoint which natively supports searching via the 'q' parameter.
  // We encode the space as "for%20sale" so the native Node.js HTTPS module doesn't crash on unescaped characters.
  let url = `https://api.discogs.com/users/rambone/inventory?page=${page}&per_page=${per_page}&status=for%20sale&sort=listed&sort_order=desc&token=${token}`;
  
  if (q) {
    url += `&q=${encodeURIComponent(q)}`;
  }

  // Log the request for diagnostics (Hiding the token for safety)
  const safeLogUrl = url.replace(`token=${token}`, 'token=HIDDEN_SECRET');
  console.log(`[get-inventory] Routing request to Discogs: ${safeLogUrl}`);

  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'RamboneRecordsWeb/1.0' }
    }, (res) => {
      console.log(`[get-inventory] Discogs responded with status: ${res.statusCode}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: data
        });
      });
    }).on('error', (error) => {
      console.error('[get-inventory] Network error requesting data from Discogs:', error.message);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      });
    });
  });
};
