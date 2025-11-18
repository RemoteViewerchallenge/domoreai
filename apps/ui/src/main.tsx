import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
// import { initialize } from '@codingame/monaco-vscode-api'; // Commented out to fix build issues

import App from './App'; // Import from the TypeScript source file
import { trpc } from './utils/trpc';
import './index.css'; // Import the main stylesheet with Tailwind directives

const queryClient = new trpc.queryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || 'http://localhost:4000/trpc', // URL of your tRPC server
    }),
  ],
  transformer: superjson,
});

function Main() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <App />
    </trpc.Provider>
  );
}

// async function initVscodeApi() {
//   await initialize();
// }

// initVscodeApi().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <Main />
      </BrowserRouter>
    </React.StrictMode>
  );
// });
