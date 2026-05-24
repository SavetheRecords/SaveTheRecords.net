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

  let url = '';

  if (q) {
    // 1. If searching, use Discogs' official Marketplace Search filtered to your store
    url = `https://api.discogs.com/marketplace/search?seller=rambone&q=${encodeURIComponent(q)}&page=${page}&per_page=${per_page}&token=${token}`;
  } else {
    // 2. If browsing, use the standard inventory endpoint sorted by recently listed
    url = `https://api.discogs.com/users/rambone/inventory?page=${page}&per_page=${per_page}&status=for%20sale&sort=listed&sort_order=desc&token=${token}`;
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
        let parsedData = null;
        
        try {
          if (data && data.trim().startsWith('{')) {
            parsedData = JSON.parse(data);
          }
        } catch (e) {
          console.error('[get-inventory] Failed to parse JSON response from Discogs:', e.message);
        }

        // Safety check: Map search "results" to "listings" safely if they exist
        if (parsedData && parsedData.results && Array.isArray(parsedData.results)) {
          console.log(`[get-inventory] Processing ${parsedData.results.length} search results into inventory schema.`);
          
          parsedData.listings = parsedData.results.map(item => {
            if (!item || typeof item !== 'object') return {};
            
            const normalized = { ...item };
            if (!normalized.release) {
              normalized.release = {};
            }

            // Extract artist and album name from the combined string "Artist - Title"
            if (!normalized.release.artist || !normalized.release.title) {
              const fullTitle = item.title || '';
              if (fullTitle.includes(' - ')) {
                const parts = fullTitle.split(' - ');
                normalized.release.artist = normalized.release.artist || parts[0].trim();
                normalized.release.title = normalized.release.title || parts.slice(1).join(' - ').trim();
              } else {
                normalized.release.title = normalized.release.title || fullTitle || 'Untitled Release';
                normalized.release.artist = normalized.release.artist || 'Unknown Artist';
              }
            }

            // Standardize format metadata
            if (item.format && !normalized.release.format) {
              normalized.release.format = item.format;
            }

            // Standardize thumbnail metadata
            if (item.thumbnail && !normalized.release.thumbnail) {
              normalized.release.thumbnail = item.thumbnail;
            }

            return normalized;
          });
          
          delete parsedData.results;
        }

        resolve({
          statusCode: res.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: parsedData ? JSON.stringify(parsedData) : data
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
