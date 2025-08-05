import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WalletProvider } from './components/WalletProvider';
import { MaintenancePage } from './pages/MaintenancePage';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

const root = ReactDOM.createRoot(document.getElementById('root')!);

const loadApp = async () => {
  try {
    const { data, error } = await supabase
      .from('site_status')
      .select('maintenance')
      .eq('id', 1)
      .single();

    if (error) {
      console.error("Failed to fetch maintenance status:", error.message);
      // Fail-safe: default to showing main app
      renderApp();
    } else if (data?.maintenance) {
      root.render(<MaintenancePage />);
    } else {
      renderApp();
    }
  } catch (err) {
    console.error("Unexpected error loading app:", err);
    renderApp();
  }
};

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <WalletProvider>
        <App />
      </WalletProvider>
    </React.StrictMode>
  );
};

loadApp();
