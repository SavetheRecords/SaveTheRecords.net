// netlify/functions/get-image.js
const https = require('https');

exports.handler = function (event, context) {
  const { url } = event.queryStringParameters || {};
  const token = process.env.DISCOGS_TOKEN;

  // 1. More flexible check: Allow any valid secure Discogs asset subdomain
  if (!url || !url.includes('discogs.com')) {
    return Promise.resolve({ statusCode: 400, body: 'Invalid image URL' });
  }

  if (!token) {
    return Promise.resolve({ statusCode: 500, body: 'Token missing.' });
  }

  // 2. Only append the token if it is not already present in the URL
  let finalImageUrl = url;
  if (!url.includes('token=')) {
    const separator = url.includes('?') ? '&' : '?';
    finalImageUrl = `${url}${separator}token=${token}`;
  }

  return new Promise((resolve) => {
    console.log(`Proxying image request to: ${finalImageUrl}`);

    https.get(finalImageUrl, {
      headers: { 'User-Agent': 'RamboneRecordsWeb/1.0' }
    }, (res) => {
      // If the Discogs CDN itself returns an error, log it
      if (res.statusCode !== 200) {
        console.error(`Discogs CDN responded with status code: ${res.statusCode}`);
        resolve({
          statusCode: res.statusCode,
          body: `Failed to retrieve image from Discogs CDN. Status: ${res.statusCode}`
        });
        return;
      }

      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: 200,
          headers: {
            'Content-Type': res.headers['content-type'] || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            'Access-Control-Allow-Origin': '*'
          },
          body: buffer.toString('base64'),
          isBase64Encoded: true
        });
      });
    }).on('error', (error) => {
      console.error('Network error requesting image from Discogs:', error);
      resolve({
        statusCode: 500,
        body: error.message
      });
    });
  });
};
