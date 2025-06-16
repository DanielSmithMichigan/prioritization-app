import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import ComparisonPage from './ComparisonPage';
import CreateStoriesPage from './CreateStoriesPage';
import ViewStoriesPage from './ViewStoriesPage';
import GraphPage from './GraphPage';
import 'bootstrap/dist/css/bootstrap.min.css';

const App: React.FC = () => {
  return (
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
                <NavLink to="/" end className="nav-link">View Stories</NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/create" className="nav-link">Create Stories</NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/graph" className="nav-link">View Graph</NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <main className="flex-fill p-3">
          <Routes>
            <Route path="/" element={<ViewStoriesPage />} />
            <Route path="/create" element={<CreateStoriesPage />} />
            <Route path="/compare" element={<ComparisonPage />} />
            <Route path="/stories" element={<ViewStoriesPage />} />
            <Route path="/graph" element={<GraphPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
