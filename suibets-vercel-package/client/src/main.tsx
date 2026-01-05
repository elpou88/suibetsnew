import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add a debug script to the document body
const debugScript = document.createElement('script');
debugScript.textContent = `
// Real-time debugging helpers
console.debug = function() {
  window._debug_logs = window._debug_logs || [];
  window._debug_logs.push(["debug", Date.now(), arguments]);
  // eslint-disable-next-line no-console
  return console.log.apply(console, arguments);
};
console.log("Debug script loaded");
`;
document.body.appendChild(debugScript);

// Clean up any wallet settings - we now use only real wallets
if (localStorage.getItem('use_demo_wallet') !== null) {
  localStorage.removeItem('use_demo_wallet');
  console.log('Removed demo wallet setting - only real wallets are now supported');
}

// Clean up any old wallet settings
if (localStorage.getItem('use_real_wallets') !== null) {
  localStorage.removeItem('use_real_wallets');
  console.log('Removed deprecated wallet setting');
}

// Add console logs for debugging
console.log("Starting React application");
try {
  const rootElement = document.getElementById("root");
  console.log("Root element found:", rootElement);
  if (rootElement) {
    createRoot(rootElement).render(<App />);
    console.log("React app rendered successfully");
  } else {
    console.error("Root element not found in the DOM");
  }
} catch (error) {
  console.error("Error rendering React app:", error);
}
