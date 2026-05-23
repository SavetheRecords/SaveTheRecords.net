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

  // Detect if the Discogs URL already has parameters, and apply the correct separator
  const separator = url.includes('?') ? '&' : '?';
  const finalImageUrl = `${url}${separator}token=${token}`;

  try {
    console.log(`Proxying image request to: ${finalImageUrl}`);

    const response = await fetch(finalImageUrl, {
      headers: { 'User-Agent': 'RamboneRecordsWeb/1.0' }
    });

    if (!response.ok) {
      console.error(`Discogs Image CDN returned status: ${response.status}`);
      return { statusCode: response.status, body: 'Failed to retrieve image.' };
    }

    const buffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache image for 24 hours
        'Access-Control-Allow-Origin': '*'
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error in get-image function:', error);
    return { statusCode: 500, body: error.message };
  }
};
