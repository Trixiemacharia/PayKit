import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { PlanProvider } from './context/PlanContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      <PlanProvider>
        <App />
      </PlanProvider>
    </GoogleOAuthProvider>
  ) : (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      Google sign-in is not configured. Set REACT_APP_GOOGLE_CLIENT_ID and restart the frontend.
    </main>
  )
);
