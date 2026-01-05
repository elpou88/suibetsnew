document.addEventListener('DOMContentLoaded', () => {
  console.log('Debug script loaded');
  
  // Get all links in the document
  const links = document.querySelectorAll('a');
  
  // Add click event listeners to all links
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      console.log('Link clicked:', link.href);
      
      // For Live and Promotions links, let's force navigation
      if (link.href.includes('live.html') || link.href.includes('promotions.html')) {
        console.log('Redirecting to:', link.href);
        window.location.href = link.href;
        e.preventDefault(); // Prevent default only after setting location
      }
    });
  });
  
  // Add a global click handler
  document.addEventListener('click', (e) => {
    console.log('Click coordinates:', e.clientX, e.clientY);
    console.log('Element clicked:', e.target);
  });
});