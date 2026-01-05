import { useEffect } from 'react';

export default function LivePage() {
  // Redirect to the static HTML page
  useEffect(() => {
    window.location.href = '/live-direct.html';
  }, []);

  return null;
}