import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { setStories, setComparisons, clearSession } from './store/comparisonSlice';
import type { Story } from './types';

const API_BASE = import.meta.env.VITE_ELO_API_BASE!;
const tenantId = 'tenant-abc';

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [metric, setMetric] = useState<keyof Story['elo']>('impact');
  const [comparisonCount, setComparisonCount] = useState(10);
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
      const res = await fetch(`${API_BASE}/stories/getAll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, limit: 100 }),
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
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

  const beginSession = () => {
    const selectedStories = fetchedStories.filter(s => selectedIds.has(s.id));
    const pairs: { leftId: string; rightId: string }[] = [];

    for (let i = 0; i < selectedStories.length; i++) {
      for (let j = i + 1; j < selectedStories.length; j++) {
        pairs.push({ leftId: selectedStories[i].id, rightId: selectedStories[j].id });
      }
    }

    const selectedComparisons = Array.from({ length: comparisonCount }, () => {
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      return { ...pair, metric };
    });

    dispatch(clearSession());
    dispatch(setStories(selectedStories));
    dispatch(setComparisons(selectedComparisons));
    navigate('/compare');
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
                      className="form-select form-select-lg"
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

                  <div className="col-md-3">
                    <label className="form-label fw-bold">Comparisons</label>
                    <input
                      type="number"
                      className="form-control form-control-lg"
                      value={comparisonCount}
                      onChange={e => setComparisonCount(parseInt(e.target.value) || 1)}
                      min={1}
                      max={100}
                    />
                  </div>

                  <div className="col-md-5 d-flex align-items-end gap-2">
                    <button className="btn btn-outline-secondary" onClick={selectAll} disabled={selectedIds.size === visibleStories.length}>
                      <i className="bi bi-check-all me-1"></i> Select All
                    </button>
                    <button className="btn btn-outline-secondary" onClick={clearAll} disabled={selectedIds.size === 0}>
                      <i className="bi bi-x-square me-1"></i> Clear All
                    </button>
                    <button className="btn btn-success btn-lg flex-grow-1" disabled={selectedIds.size < 2} onClick={beginSession} style={{ fontWeight: '600' }}>
                      <i className="bi bi-play-circle-fill me-2"></i> Begin Session ({selectedIds.size} selected)
                    </button>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Filter by Category</label>
                    <select className="form-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                      <option value="">All Categories</option>
                      {[...new Set(fetchedStories.map(s => s.category))].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Sort by Metric</label>
                    <select className="form-select" value={sortKey} onChange={e => setSortKey(e.target.value as keyof Story['elo'])}>
                      <option value="">None</option>
                      {metrics.map(m => (
                        <option key={m} value={m}>{metricInfo[m].label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <button className="btn btn-outline-primary w-100" onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')} disabled={!sortKey}>
                      <i className={`bi bi-sort-${sortDirection === 'asc' ? 'down' : 'up'}-alt me-1`}></i>
                      Sort {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                    </button>
                  </div>
                </div>

                {selectedIds.size > 0 && (
                  <div className="alert alert-info border-0 mb-4" role="alert">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    <strong>{selectedIds.size}</strong> stories selected. 
                    This will generate up to <strong>{Math.min(comparisonCount, (selectedIds.size * (selectedIds.size - 1)) / 2)}</strong> comparisons.
                  </div>
                )}

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
                        <th>Story Title</th>
                        <th>Category</th>
                        {metrics.map(m => (
                          <th key={m} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <i className={`bi ${metricInfo[m].icon} text-${metricInfo[m].color} mb-1`}></i>
                              <small>{metricInfo[m].label}</small>
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
                              {selectedIds.has(story.id) && <i className="bi bi-check-circle-fill text-success me-2"></i>}
                              <div>
                                <div className="fw-semibold">{story.title}</div>
                                {story.description && <small className="text-muted">{story.description}</small>}
                              </div>
                            </div>
                          </td>
                          <td>{story.category}</td>
                          {metrics.map(m => (
                            <td key={m} className="text-center">{story.elo[m].rating}</td>
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
