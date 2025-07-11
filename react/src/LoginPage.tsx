import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return; // Don't do anything while auth status is loading

    if (isAuthenticated) {
      // After login, redirect to where the user intended to go, or fallback
      const from = (location.state as { from?: Location })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, location, navigate]);

  if (isLoading) {
    return <div className="container py-5 text-center">Loading authentication…</div>;
  }

  return (
    <div className="container py-5 text-center">
      <h1 className="mb-4">Welcome to the Prioritization App</h1>
      <p className="mb-4">Please log in to access your stories and comparisons.</p>
      <button
        className="btn btn-primary btn-lg"
        onClick={() => loginWithRedirect()}
      >
        Log In
      </button>
    </div>
  );
};

export default LoginPage;
