import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { PlanProvider } from './context/PlanContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <PlanProvider>
    <App />
  </PlanProvider>
);