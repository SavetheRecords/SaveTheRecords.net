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

  let url = '';

  if (q) {
    // 1. If searching, use Discogs' official Marketplace Search filtered to your store
    url = `https://api.discogs.com/marketplace/search?seller=rambone&q=${encodeURIComponent(q)}&page=${page}&per_page=${per_page}&token=${token}`;
  } else {
    // 2. If browsing, use the standard inventory endpoint sorted by recently listed
    url = `https://api.discogs.com/users/rambone/inventory?page=${page}&per_page=${per_page}&status=for%20sale&sort=listed&sort_order=desc&token=${token}`;
  }

  return new Promise((resolve) => {
    console.log(`Routing inventory request to: ${url}`);

    https.get(url, {
      headers: { 'User-Agent': 'RamboneRecordsWeb/1.0' }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
          
          // If this is a search result, normalize the "results" schema into the "listings" schema
          if (parsedData.results && !parsedData.listings) {
            parsedData.listings = parsedData.results.map(item => {
              const normalized = { ...item };
              
              if (!normalized.release) {
                normalized.release = {};
              }

              // Extract artist and title from the combined string "Artist - Title"
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

              // Map format if placed differently
              if (item.format && !normalized.release.format) {
                normalized.release.format = item.format;
              }

              // Map thumbnail image
              if (item.thumbnail && !normalized.release.thumbnail) {
                normalized.release.thumbnail = item.thumbnail;
              }

              return normalized;
            });
            
            // Clean up the original results field
            delete parsedData.results;
          }
        } catch (e) {
          console.error('Failed to parse Discogs response:', e);
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
      console.error('Error fetching inventory:', error);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      });
    });
  });
};
