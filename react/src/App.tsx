import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import CreateStoriesPage from './CreateStoriesPage';
import ViewStoriesPage from './ViewStoriesPage';
import GraphPage from './GraphPage';
import SliderPage from './SliderPage';
import GroupSessionPage from './GroupSessionPage';
import SessionResultsPage from './SessionResultPage';
import { useAuth0 } from '@auth0/auth0-react';
import PrivateRoute from './PrivateRoute';


import 'bootstrap/dist/css/bootstrap.min.css';
import { SessionWebSocketProvider } from './SessionWebSocketProvider';
import LoginPage from './LoginPage';

const NavbarAuthButtons = () => {
  const { loginWithRedirect, logout, isAuthenticated } = useAuth0();

  return (
    <>
      {isAuthenticated ? (
        <button className="btn btn-outline-light ms-3"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          Log Out
        </button>
      ) : (
        <button className="btn btn-primary ms-3" onClick={() => loginWithRedirect()}>
          Log In
        </button>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <SessionWebSocketProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100">
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
            <NavLink className="navbar-brand" to="/">Prioritizer</NavLink>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <NavLink to="/stores" end className="nav-link">View Stories</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/create" className="nav-link">Create Stories</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/graph" className="nav-link">View Graph</NavLink>
                </li>
              </ul>
            </div>

            <NavbarAuthButtons />
          </nav>

          <main className="flex-fill p-3">
            <Routes>
              {/* Public login page */}
              <Route path="/login" element={<LoginPage />} />

              {/* All other routes are protected */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <ViewStoriesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <PrivateRoute>
                    <CreateStoriesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/group/:sessionId"
                element={
                  <PrivateRoute>
                    <GroupSessionPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/slider"
                element={
                  <PrivateRoute>
                    <SliderPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/stories"
                element={
                  <PrivateRoute>
                    <ViewStoriesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/graph"
                element={
                  <PrivateRoute>
                    <GraphPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/sessionResults"
                element={
                  <PrivateRoute>
                    <SessionResultsPage />
                  </PrivateRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SessionWebSocketProvider>
  );
};

export default App;
