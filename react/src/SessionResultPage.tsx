import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import './SessionResultsPage.css';
import Collapsible from './Collapsible';
import './Collapsible.css';
import { type metricKeys } from './types';

const colorPalette = [
  '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#f472b6', '#38bdf8', '#facc15', '#4ade80', '#fb7185',
];

const API_BASE = import.meta.env.VITE_ELO_API_BASE!;

const getPercentile = (arr: number[], p: number) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  if (index % 1 === 0) return sorted[index];
  const lower = sorted[Math.floor(index)];
  const upper = sorted[Math.ceil(index)];
  return lower + (upper - lower) * (index - Math.floor(index));
};

const metricToSentence = (metric: metricKeys) => {
  switch (metric) {
    case 'impact':
      return 'Metric: What is the impact of this story?';
    case 'estimatedTime':
      return 'Metric: How long will this story take?';
    case 'risk':
      return 'Metric: What is the risk of this story?';
    case 'visibility':
      return 'Metric: What is the visibility of this story?';
  }
};

const SessionResultsPage: React.FC = () => {
  const sessionId = useSelector((s: RootState) => s.session.sessionId);
  const stories = useSelector((s: RootState) => s.comparison.sliderStories);
  const selectedMetric = useSelector((s: RootState) => s.comparison.selectedMetric);

  const [participants, setParticipants] = useState<{ userId: string; userName: string; ratings: Record<string, number> }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const fetchRatings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/session/ratings?sessionId=${sessionId}`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        console.log(data);
        setParticipants(data.participants);
      } catch (err) {
        console.error("Failed to load session ratings:", err);
        alert("Failed to load ratings. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatings()
  }, [sessionId]);

  const participantsWithColor = participants.map((p, i) => ({
    ...p,
    color: colorPalette[i % colorPalette.length],
  }));

  const handleUpdateRatings = async () => {
    const updates = stories.map(story => {
      const storyRatings = participants.map(p => p.ratings[story.id]).filter(r => r !== undefined) as number[];
      const p50 = getPercentile(storyRatings, 50);
      return { storyId: story.id, newRating: p50 };
    });

    try {
      const res = await fetch(`${API_BASE}/elo/batchSliderUpdate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: selectedMetric, updates }),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      alert('Ratings updated successfully!');
    } catch (err) {
      console.error("Failed to update ratings:", err);
      alert("Failed to update ratings. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <h2 className="mb-5 text-center">📊 Rating Results</h2>
        <p className="text-muted">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-2 text-center">📊 Rating Results</h2>
      <p className="text-center text-muted mb-4">{metricToSentence(selectedMetric)}</p>

      {stories.length === 0 ? (
        <p className="text-center text-muted">No stories found.</p>
      ) : (
        <>
          <div className="d-flex flex-column">
            {stories.map((story, index) => {
              const maxRating = Math.max(...participants.flatMap(p => Object.values(p.ratings).filter(r => r !== undefined) as number[]));
              const rightBound = Math.max(maxRating * 1.1, 1000);

              const storyRatings = participants.map(p => p.ratings[story.id]).filter(r => r !== undefined) as number[];
              const p20 = getPercentile(storyRatings, 20);
              const p40 = getPercentile(storyRatings, 40);
              const p50 = getPercentile(storyRatings, 50);
              const p60 = getPercentile(storyRatings, 60);
              const p80 = getPercentile(storyRatings, 80);

              return (
                <React.Fragment key={story.id}>
                  <div className="w-100">
                    <div style={{ textAlign: 'center', fontSize: '16pt', marginBottom: '10px'}}>
                      <strong>{story.title}</strong>
                    </div>

                    <div style={{
                      position: 'relative',
                      height: '20px',
                      background: '#e5e7eb',
                      borderRadius: '10px',
                    }}>
                      {/* One dot for each participant's rating */}
                      {participantsWithColor.map((p) => {
                        const rating = p.ratings[story.id];
                        if (rating === undefined) return null;

                        const leftPct = Math.min(Math.max((rating / rightBound) * 100, 0), 100);

                        return (
                          <div
                            key={p.userId}
                            className="dot-container"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: `${leftPct}%`,
                              transform: 'translate(-50%, -50%)',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              backgroundColor: p.color,
                              border: '2px solid white',
                              boxShadow: '0 0 4px rgba(0,0,0,0.2)',
                              cursor: 'default',
                            }}
                          >
                            <div className="dot-popover">
                              {p.userName}: {rating}
                              <div className="dot-popover-arrow"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ position: 'relative', height: '20px' }}>
                      <div className="percentile-marker" style={{ left: `${(p20 / rightBound) * 100}%` }}>
                        <div className="percentile-line" />
                        <div className="percentile-label">20th</div>
                      </div>
                      <div className="percentile-marker" style={{ left: `${(p40 / rightBound) * 100}%` }}>
                        <div className="percentile-line" />
                        <div className="percentile-label">40th</div>
                      </div>
                      <div className="percentile-marker" style={{ left: `${(p50 / rightBound) * 100}%` }}>
                        <div className="percentile-line" />
                        <div className="percentile-label">Median</div>
                      </div>
                      <div className="percentile-marker" style={{ left: `${(p60 / rightBound) * 100}%` }}>
                        <div className="percentile-line" />
                        <div className="percentile-label">60th</div>
                      </div>
                      <div className="percentile-marker" style={{ left: `${(p80 / rightBound) * 100}%` }}>
                        <div className="percentile-line" />
                        <div className="percentile-label">80th</div>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between mt-3">
                      <div className="w-50 pe-2">
                        <Collapsible title="User Ratings">
                          {participantsWithColor.map(p => (
                            <div key={p.userId} className="d-flex align-items-center mb-2">
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: p.color, marginRight: '8px' }} />
                              <span>{p.userName}: {p.ratings[story.id] ?? 'N/A'}</span>
                            </div>
                          ))}
                        </Collapsible>
                      </div>
                      <div className="w-50 ps-2">
                        <Collapsible title="Percentiles">
                          <div className="d-flex justify-content-between"><span>20th:</span> <span>{p20.toFixed(0)}</span></div>
                          <div className="d-flex justify-content-between"><span>40th:</span> <span>{p40.toFixed(0)}</span></div>
                          <div className="d-flex justify-content-between"><span>Median:</span> <span>{p50.toFixed(0)}</span></div>
                          <div className="d-flex justify-content-between"><span>60th:</span> - <span>{p60.toFixed(0)}</span></div>
                          <div className="d-flex justify-content-between"><span>80th:</span> <span>{p80.toFixed(0)}</span></div>
                        </Collapsible>
                      </div>
                    </div>
                  </div>
                  {index < stories.length - 1 && <hr style={{ border: '0px solid', margin: '100px 0px 0px 0px' }} />}
                </React.Fragment>
              )
            })}
          </div>
          <div className="text-center mt-5">
            <button className="btn btn-primary btn-lg" onClick={handleUpdateRatings}>
              Update All Ratings
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SessionResultsPage;
