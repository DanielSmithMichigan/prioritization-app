import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Auth0Provider } from '@auth0/auth0-react';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing root element');

const root = ReactDOM.createRoot(rootElement);

const queryClient = new QueryClient();


const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID!;

root.render(
  <Auth0Provider
    domain={AUTH0_DOMAIN}
    clientId={AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: "https://d2zqj6bs6gs3qs.cloudfront.net/",
      audience: "https://danielsmithmichigan.github.io/prioritization-app/",
      scope: "openid profile email",
    }}
  >
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>
  </Auth0Provider>
);