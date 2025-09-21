import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';

interface AuthProviderWrapperProps {
  children: React.ReactNode;
}

const AuthProviderWrapper: React.FC<AuthProviderWrapperProps> = ({ children }) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  if (!domain || !clientId) {
    throw new Error('Auth0 configuration is missing');
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
        scope: 'openid profile email',
      }}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};

export default AuthProviderWrapper;