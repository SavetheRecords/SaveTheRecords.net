// netlify/functions/get-image.js

exports.handler = async function (event, context) {
  const { url } = event.queryStringParameters || {};
  const token = process.env.DISCOGS_TOKEN;

  if (!url || !url.startsWith('https://img.discogs.com')) {
    return { statusCode: 400, body: 'Invalid image URL' };
  }

  if (!token) {
    return { statusCode: 500, body: 'Token missing.' };
  }

  try {
    // Fetch the image from Discogs using your token securely
    const response = await fetch(`${url}?token=${token}`, {
      headers: { 'User-Agent': 'RamboneRecordsWeb/1.0' }
    });

    if (!response.ok) {
      return { statusCode: response.status, body: 'Failed to retrieve image.' };
    }

    const buffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache image locally for 24h
        'Access-Control-Allow-Origin': '*'
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};