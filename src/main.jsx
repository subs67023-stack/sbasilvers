// Global date format interceptor: Ensure any date formatted in the app strictly outputs DD/MM/YYYY
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (locales, options) {
  const loc = (!locales || locales === 'default' || locales === 'en-US' || locales === 'en' || locales === 'en-IN') ? 'en-GB' : locales;
  return originalToLocaleDateString.call(this, loc, options);
};

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)