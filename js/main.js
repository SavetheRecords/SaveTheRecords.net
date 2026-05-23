document.addEventListener('DOMContentLoaded', () => {
  // Inject Header
  fetch('header.html')
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch header');
      return response.text();
    })
    .then(data => {
      document.getElementById('global-header').innerHTML = data;
      highlightActiveNav();
    })
    .catch(err => console.error('Error loading header:', err));

  // Inject Footer
  fetch('footer.html')
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch footer');
      return response.text();
    })
    .then(data => {
      document.getElementById('global-footer').innerHTML = data;
      const yearEl = document.getElementById('year');
      if (yearEl) yearEl.textContent = new Date().getFullYear();
    })
    .catch(err => console.error('Error loading footer:', err));
});

// Highlight the active page in the navigation bar
function highlightActiveNav() {
  const currentPath = window.location.pathname;
  const page = currentPath.substring(currentPath.lastIndexOf('/') + 1);
  
  let activeId = 'nav-home';
  if (page === 'shop.html') activeId = 'nav-shop';
  else if (page === 'about.html') activeId = 'nav-about';
  else if (page === 'contact.html') activeId = 'nav-contact';
  
  const activeLink = document.getElementById(activeId);
  if (activeLink) activeLink.classList.add('active');
}