// netlify/functions/get-inventory.js

exports.handler = async function (event, context) {
  const { page = 1, per_page = 25, q = '' } = event.queryStringParameters || {};
  const token = process.env.DISCOGS_TOKEN; // Safely read from secure backend environment

  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'DISCOGS_TOKEN is not configured in Netlify settings.' })
    };
  }

  let url = `https://api.discogs.com/users/rambone/inventory?page=${page}&per_page=${per_page}&status=for sale&sort=listed&sort_order=desc&token=${token}`;
  if (q) {
    url += `&q=${encodeURIComponent(q)}`;
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RamboneRecordsWeb/1.0' }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Discogs API returned status ${response.status}` })
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};