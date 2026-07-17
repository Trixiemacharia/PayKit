import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { PlanProvider } from './context/PlanContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId='1051520030241-fps5qgcsm6clv0r12lm5gpmp3r33q6k0.apps.googleusercontent.com'>
    <PlanProvider>
      <App />
    </PlanProvider>
  </GoogleOAuthProvider>
);