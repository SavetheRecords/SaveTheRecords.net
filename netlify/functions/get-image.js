// netlify/functions/get-image.js
const https = require('https');

exports.handler = function (event, context) {
  const { url } = event.queryStringParameters || {};
  const token = process.env.DISCOGS_TOKEN;

  if (!url || !url.startsWith('https://img.discogs.com')) {
    return Promise.resolve({ statusCode: 400, body: 'Invalid image URL' });
  }

  if (!token) {
    return Promise.resolve({ statusCode: 500, body: 'Token missing.' });
  }

  // Handle URL parameter separator
  const separator = url.includes('?') ? '&' : '?';
  const finalImageUrl = `${url}${separator}token=${token}`;

  return new Promise((resolve) => {
    https.get(finalImageUrl, {
      headers: { 'User-Agent': 'RamboneRecordsWeb/1.0' }
    }, (res) => {
      if (res.statusCode !== 200) {
        resolve({
          statusCode: res.statusCode,
          body: 'Failed to retrieve image from Discogs CDN.'
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
      resolve({
        statusCode: 500,
        body: error.message
      });
    });
  });
};
