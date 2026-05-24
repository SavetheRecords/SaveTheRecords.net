// netlify/functions/get-inventory.js
const https = require('https');

exports.handler = function (event, context) {
  const { page = 1, per_page = 25, q = '' } = event.queryStringParameters || {};
  const token = process.env.DISCOGS_TOKEN;

  if (!token) {
    return Promise.resolve({
      statusCode: 500,
      body: JSON.stringify({ error: 'DISCOGS_TOKEN is not configured in Netlify settings.' })
    });
  }

  let url = `https://api.discogs.com/users/rambone/inventory?page=${page}&per_page=${per_page}&status=for sale&sort=listed&sort_order=desc&token=${token}`;
  if (q) {
    url += `&q=${encodeURIComponent(q)}`;
  }

  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'RamboneRecordsWeb/1.0' }
    }, (res) => {
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
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      });
    });
  });
};
