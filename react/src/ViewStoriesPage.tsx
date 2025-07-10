import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { setStories, setSliderStories, setSelectedMetric } from './store/comparisonSlice';
import type { Story } from './types';
import { v4 as uuidv4 } from 'uuid';
import { setSessionId } from './store/sessionSlice';
import { useAuth0 } from '@auth0/auth0-react';

const API_BASE = import.meta.env.VITE_ELO_API_BASE!;

const metrics: (keyof Story['elo'])[] = ['impact', 'estimatedTime', 'risk', 'visibility'];

const metricInfo = {
  impact: { icon: 'bi-lightning-fill', color: 'danger', label: 'Impact' },
  estimatedTime: { icon: 'bi-clock-fill', color: 'warning', label: 'Estimated Time' },
  risk: { icon: 'bi-shield-exclamation', color: 'info', label: 'Risk' },
  visibility: { icon: 'bi-eye-fill', color: 'success', label: 'Visibility' }
};

const PaginatedStoryListPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [metric, setMetric] = useState<keyof Story['elo']>('impact');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortKey, setSortKey] = useState<keyof Story['elo'] | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const {
    data: fetchedStories = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${API_BASE}/stories/getAll`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ limit: 100 }),
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();

      dispatch(setStories(data.stories));
      return data.stories as Story[];
    },
  });

  const visibleStories = fetchedStories
    .filter(story => categoryFilter === '' || story.category === categoryFilter)
    .sort((a, b) => {
      if (!sortKey) return 0;
      const valA = a.elo[sortKey].rating;
      const valB = b.elo[sortKey].rating;
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

  const toggleStory = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const selectAll = () => setSelectedIds(new Set(visibleStories.map(s => s.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleCreateSession = async () => {
    const selectedStoryIds = Array.from(selectedIds);
    const newSessionId = uuidv4();

    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${API_BASE}/session/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: newSessionId,
          stories: selectedStoryIds,  // ✅ Only story IDs now
          metric,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to create session: ${response.status}`);
        alert("Failed to create rating session. Please try again.");
        return;
      }

      const result = await response.json();
      console.log("Session created:", result);

      // Dispatch full selected stories locally (for immediate use in Redux slider session)
      const selectedStories = fetchedStories.filter(s => selectedIds.has(s.id));
      dispatch(setSliderStories(selectedStories));
      dispatch(setSelectedMetric(metric));
      dispatch(setSessionId(newSessionId));
      navigate(`/prioritization-app/group/${newSessionId}`);

    } catch (err) {
      console.error("Error creating session:", err);
      alert("An error occurred while creating the rating session.");
    }
  };

  if (isLoading) {
    return (
      <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4 className="text-muted">Loading stories...</h4>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Failed to load stories. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid min-vh-100 bg-light py-4">
      <div className="container-xl">
        <div className="row">
          <div className="col-12">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-primary text-white py-4">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h2 className="card-title mb-0">
                      <i className="bi bi-collection-fill me-2"></i>
                      Story Comparison Setup
                    </h2>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <span className="badge bg-light text-primary fs-6 px-3 py-2">
                      {fetchedStories.length} Total Stories
                    </span>
                  </div>
                </div>
              </div>

              <div className="card-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Comparison Metric</label>
                    <select
                      className="form-select form-select"
                      value={metric}
                      onChange={e => setMetric(e.target.value as keyof Story['elo'])}
                    >
                      {metrics.map(m => (
                        <option key={m} value={m}>
                          {metricInfo[m].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Filter by Category</label>
                    <select className="form-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                      <option value="">All Categories</option>
                      {[...new Set(fetchedStories.map(s => s.category))].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4 d-flex align-items-end gap-2">
                    <button
                      className="btn btn-outline-primary"
                      disabled={selectedIds.size < 2}
                      onClick={handleCreateSession}
                      style={{ fontWeight: '600' }}
                    >
                      <i className="bi bi-people-fill me-2"></i>
                      Create Rating Session
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-dark">
                      <tr>
                        <th className="text-center">
                          <input type="checkbox" className="form-check-input"
                            checked={selectedIds.size === visibleStories.length && visibleStories.length > 0}
                            onChange={selectedIds.size === visibleStories.length ? clearAll : selectAll}
                          />
                        </th>
                        <th style={{ width: '450px' }}>Story Title</th>
                        <th style={{ width: '200px' }}>Category</th>
                        {metrics.map(m => (
                          <th key={m} className="text-center" style={{ cursor: 'pointer' }}
                            onClick={() => {
                              if (sortKey === m) {
                                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortKey(m);
                                setSortDirection('asc');
                              }
                            }}
                          >
                            <div className="d-flex flex-column align-items-center">
                              <div className="d-flex align-items-center gap-1">
                                <small className="mb-0">{metricInfo[m].label}</small>
                                {sortKey === m && (
                                  <i className={`bi bi-caret-${sortDirection === 'asc' ? 'up' : 'down'}-fill`} style={{ fontSize: '1rem' }}></i>
                                )}
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStories.map(story => (
                        <tr key={story.id}
                          className={selectedIds.has(story.id) ? 'table-success' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleStory(story.id)}
                        >
                          <td className="text-center">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedIds.has(story.id)}
                              onChange={() => toggleStory(story.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="fw-semibold text-truncate" style={{ maxWidth: '450px' }} title={story.title}>
                                {story.title}
                              </div>
                            </div>
                          </td>
                          <td>{story.category}</td>
                          {metrics.map(m => (
                            <td key={m} className="text-center">{Math.round(story.elo[m].rating)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {fetchedStories.length === 0 && (
                  <div className="text-center py-5">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: '4rem' }}></i>
                    <h4 className="text-muted mt-3">No stories found</h4>
                    <p className="text-muted">Create some stories first to start comparing them.</p>
                    <button className="btn btn-primary">
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Stories
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaginatedStoryListPage;
