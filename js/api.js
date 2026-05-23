/**
 * Fetch marketplace inventory via local Netlify proxy
 */
async function fetchInventory(page = 1, perPage = 25, query = '') {
  // Call your local proxy instead of Discogs directly
  let url = `/.netlify/functions/get-inventory?page=${page}&per_page=${perPage}`;
  
  if (query) {
    url += `&q=${encodeURIComponent(query)}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Proxy error');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch from proxy:', error);
    return null;
  }
}

/**
 * Fetch reviews from local JSON file
 */
async function fetchLocalReviews() {
  try {
    const response = await fetch('data/reviews.json');
    if (!response.ok) throw new Error('Failed to load reviews.');
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Helper template generator for inventory cards
 * Loads the exact Discogs cover art securely via your proxy
 */
function createProductCardHtml(listing) {
  const { release, price, id, uri } = listing;
  
  const artist = release.artist || 'Unknown Artist';
  const title = release.title || 'Untitled Release';
  const format = release.format || 'Vinyl';
  const priceFormatted = price && price.value ? `${price.value} ${price.currency}` : 'Inquire';
  const discogsLink = uri || `https://www.discogs.com/sell/item/${id}`;

  const fallbackImage = 'images/defaultcoverart.jpg';
  
  // Set up the proxy image URL using your get-image function
  let coverImage = fallbackImage;
  if (release.thumbnail) {
    coverImage = `/.netlify/functions/get-image?url=${encodeURIComponent(release.thumbnail)}`;
  }

  return `
    <article class="card">
      <div class="card-img-container">
        <img 
          class="card-img" 
          src="${coverImage}" 
          alt="${title} cover art" 
          loading="lazy"
          onerror="this.onerror=null; this.src='${fallbackImage}';"
        />
      </div>
      <div class="card-content">
        <span class="card-artist">${artist}</span>
        <h3 class="card-title" title="${title}">${title}</h3>
        <p class="card-meta">${format}</p>
        <div class="card-footer">
          <span class="card-price">${priceFormatted}</span>
          <a href="${discogsLink}" target="_blank" rel="noopener" class="btn" style="padding: 0.4rem 1rem; font-size: 0.8rem;">View on Discogs</a>
        </div>
      </div>
    </article>
  `;
}