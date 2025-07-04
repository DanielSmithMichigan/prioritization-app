import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import CreateStoriesPage from './CreateStoriesPage';
import ViewStoriesPage from './ViewStoriesPage';
import GraphPage from './GraphPage';
import SliderPage from './SliderPage';
import GroupSessionPage from './GroupSessionPage';
import SessionResultsPage from './SessionResultPage';


import 'bootstrap/dist/css/bootstrap.min.css';
import { SessionWebSocketProvider } from './SessionWebSocketProvider';

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
                  <NavLink to="/prioritization-app/" end className="nav-link">View Stories</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/prioritization-app/create" className="nav-link">Create Stories</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/prioritization-app/graph" className="nav-link">View Graph</NavLink>
                </li>
              </ul>
            </div>
          </nav>

          <main className="flex-fill p-3">
            <Routes>
              <Route path="/prioritization-app/" element={<ViewStoriesPage />} />
              <Route path="/prioritization-app/create" element={<CreateStoriesPage />} />
              <Route path="/prioritization-app/group/:sessionId" element={<GroupSessionPage />} />
              <Route path="/prioritization-app/slider" element={<SliderPage />} />
              <Route path="/prioritization-app/stories" element={<ViewStoriesPage />} />
              <Route path="/prioritization-app/graph" element={<GraphPage />} />
              <Route path="/prioritization-app/sessionResults" element={<SessionResultsPage />} />
              <Route path="*" element={<Navigate to="/prioritization-app/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SessionWebSocketProvider>
  );
};

export default App;
