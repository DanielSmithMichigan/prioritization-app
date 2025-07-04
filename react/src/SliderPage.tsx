import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from './store';
import type { Story, metricKeys } from './types';
import type { CSSProperties } from 'react';
import { styles } from './SliderStyles';
import * as _ from 'lodash';
import { WebSocketContext } from './SessionWebSocketProvider';

const colorPalette = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#38bdf8', '#facc15', '#4ade80', '#fb7185'];
const API_BASE = import.meta.env.VITE_ELO_API_BASE!;

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set once synchronously on first render
    setSize({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height });

    // Watch for every change afterwards
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
}

const StoryDragArea = () => {
  const initialParticipants = useSelector((s: RootState) => s.session.participants);
  const userId = useSelector((s: RootState) => s.session.userId);
  const connectionId = useSelector((s: RootState) => s.session.connectionId);
  const [participants, setParticipants] = useState(initialParticipants);
  const sliderStories: Story[] = useSelector((s: RootState) => s.comparison.sliderStories);
  const selectedMetric: metricKeys = useSelector((s: RootState) => s.comparison.selectedMetric);
  const allStories: Story[] = useSelector((s: RootState) => s.comparison.stories);
  const sessionId = useSelector((s: RootState) => s.session.sessionId);
  const [positionsReady, setPositionsReady] = useState(false);
  const navigate = useNavigate();
  const lastUpdateRef = useRef(0);

  const { socket, ready } = useContext(WebSocketContext);

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

  useEffect(() => {
    if (!ready || !socket.current) return;

    const handleMessage = (event: MessageEvent) => {
      console.log("WebSocket raw message:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("Parsed WebSocket message:", data);

        if (data.type === 'participantsUpdate' && Array.isArray(data.participants)) {
          setParticipants(prev => {
            const updated = [...prev];

            for (const newP of data.participants) {
              const idx = updated.findIndex(p => p.userName === newP.userName);
              if (idx !== -1) {
                // Replace the participant if found
                updated[idx] = { ...updated[idx], completed: newP.completed };
              } else {
                // Add if this participant wasn't already known
                updated.push(newP);
              }
            }

            return updated;
          });
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };


    socket.current.addEventListener('message', handleMessage);

    return () => socket.current?.removeEventListener('message', handleMessage);
  }, [socket, ready]);

  useEffect(() => {
    if (participants.length > 0 && participants.every(p => p.completed)) {
      console.log("All participants completed, redirecting to results...");
      navigate('/prioritization-app/sessionResults');
    }
  }, [participants, navigate]);



  const initialYPositions = useRef<Record<string, number>>({});

  sliderStories.forEach(story => {
    if (!initialYPositions.current[story.id]) {
      initialYPositions.current[story.id] = 150 + Math.random() * 100;
    }
  });

  const [dragAreaRef, { width: containerWidth }] = useElementSize<HTMLDivElement>();

  const padding = 50;

  const allRatings = Object.values(allStories)
    .map(story => story.elo[selectedMetric].rating);

  function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  const p10 = percentile(allRatings, 10);
  const p90 = percentile(allRatings, 90);

  // Find the minimum and maximum ratings of stories currently in the slider
  const currentRatings = sliderStories.map(s => s.elo[selectedMetric].rating);

  // Determine bounds based on percentiles, but expand if needed
  let minRating = Math.min(p10, ...currentRatings);
  let maxRating = Math.max(p90, ...currentRatings);

  // Ensure at least a 200-point spread
  if (maxRating - minRating < 200) {
    const mid = (minRating + maxRating) / 2;
    minRating = mid - 100;
    maxRating = mid + 100;
  }

  const [visibleMin, setVisibleMin] = useState(minRating);
  const [visibleMax, setVisibleMax] = useState(maxRating);
  const [storyRatings, setStoryRatings] = useState<Record<string, number>>({});
  const [storyPositions, setStoryPositions] = useState<Record<string, { x: number; y: number }>>({});
  useEffect(() => {
    if (sliderStories.length === 0) return;

    setStoryRatings(prev => {
      // Only set if not already initialized
      if (Object.keys(prev).length > 0) return prev;

      const map: Record<string, number> = {};
      sliderStories.forEach(story => {
        map[story.id] = story.elo[selectedMetric].rating;
      });
      return map;
    });
  }, [sliderStories, selectedMetric]);

  useEffect(() => {
    if (containerWidth === 0 || sliderStories.length === 0 || Object.keys(storyRatings).length === 0) {
      return;
    }

    const newPositions: Record<string, { x: number; y: number }> = {};
    sliderStories.forEach((story) => {
      const rating = storyRatings[story.id];
      const normX = (rating - visibleMin) / (visibleMax - visibleMin);
      const x = normX * (containerWidth - 2 * padding) + padding;
      const y = initialYPositions.current[story.id];
      newPositions[story.id] = { x, y };
    });

    // Only update if positions actually changed
    setStoryPositions(prev => {
      if (_.isEqual(prev, newPositions)) {
        return prev;
      }
      return newPositions;
    });
  }, [visibleMin, visibleMax, sliderStories, containerWidth, storyRatings]);

  useEffect(() => { if (containerWidth > 0 && sliderStories.length && Object.keys(storyPositions).length) { setPositionsReady(true); } }, [containerWidth, sliderStories.length, storyPositions]);

  const [draggedStory, setDraggedStory] = useState<Story | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredStory, setHoveredStory] = useState<Story | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const dragAreaRef = useRef<HTMLDivElement | null>(null);


  const dragAreaStyle: CSSProperties = {
    width: '100%',         // grow to the parent
    minWidth: '600px',     // still guarantee a usable minimum
    cursor: draggedStory ? 'grabbing' : 'default',
    position: 'relative',
  };

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    story: Story
  ) => {
    e.preventDefault();
    if (!dragAreaRef.current) return;
    const rect = dragAreaRef.current.getBoundingClientRect();
    const currentPos = storyPositions[story.id];

    setDraggedStory(story);
    setDragOffset({
      x: e.clientX - rect.left - currentPos.x,
      y: e.clientY - rect.top - currentPos.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedStory || !dragAreaRef.current) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 16) return; // ~60fps throttle
    lastUpdateRef.current = now;

    const rect = dragAreaRef.current.getBoundingClientRect();
    const newX = Math.max(padding, Math.min(rect.width - padding, e.clientX - rect.left - dragOffset.x));
    const normalized = (newX - padding) / (rect.width - 2 * padding);
    const newRating = visibleMin + normalized * (visibleMax - visibleMin);

    setStoryRatings(prev => ({
      ...prev,
      [draggedStory.id]: newRating
    }));
  }, [draggedStory, dragOffset, storyPositions]);

  const handleMouseUp = useCallback(() => {
    setDraggedStory(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (draggedStory) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedStory, handleMouseMove, handleMouseUp]);

  const ranking = sliderStories
    .map((story, index) => ({
      ...story,
      position: storyPositions[story.id]?.x ?? 0,
      origIndex: index
    }))
    .sort((a, b) => a.position - b.position);

  const submitRanking = async () => {
    const updates = sliderStories.map(story => {
      const x = storyPositions[story.id].x;
      const normalized = (x - padding) / (containerWidth - 2 * padding);
      const newRating = visibleMin + normalized * (visibleMax - visibleMin);
      return {
        storyId: story.id,
        newRating: Math.round(newRating)
      };
    });

    const ratingsMap = updates.reduce<Record<string, number>>((acc, item) => {
      acc[item.storyId] = item.newRating;
      return acc;
    }, {});

    try {
      setIsSubmitting(true);

      const sessionFinishRes = await fetch(`${API_BASE}/session/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connectionId,
          sessionId: sessionId,
          userId: userId,
          ratings: ratingsMap
        })
      });

      if (!sessionFinishRes.ok) throw new Error(`Failed to finish session: ${sessionFinishRes.status}`);
      await sessionFinishRes.json();

      setSuccess(true);

    } catch (err) {
      console.error(err);
      alert('Failed to submit ranking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {!positionsReady && <div style={{ textAlign: 'center', padding: '1rem' }}>Loading&hellip;</div>}
      <h2 className="mb-2 text-center">📊 Rating Results</h2>
      <p className="text-center text-muted mb-4">{metricToSentence(selectedMetric)}</p>
      <div ref={dragAreaRef} style={{ ...styles.dragArea, ...dragAreaStyle }}>
        {/* Left Side Buttons */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={() => setVisibleMin(v => v - (visibleMax - visibleMin) * 0.1)}
            style={{
              flex: 1,
              width: '2rem',
              background: '#e5e7eb',
              border: '1px solid #9ca3af',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            ‹
          </button>
          <button
            onClick={() => setVisibleMin(v => v + (visibleMax - visibleMin) * 0.1)}
            style={{
              flex: 1,
              width: '2rem',
              background: '#fef2f2',
              border: '1px solid #9ca3af',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            ›
          </button>
        </div>

        {/* Right Side Buttons */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={() => setVisibleMax(v => v - (visibleMax - visibleMin) * 0.1)}
            style={{
              flex: 1,
              width: '2rem',
              background: '#fef2f2',
              border: '1px solid #9ca3af',
              borderLeft: 'none',
              cursor: 'pointer'
            }}
          >
            ‹
          </button>
          <button
            onClick={() => setVisibleMax(v => v + (visibleMax - visibleMin) * 0.1)}
            style={{
              flex: 1,
              width: '2rem',
              background: '#e5e7eb',
              border: '1px solid #9ca3af',
              borderLeft: 'none',
              cursor: 'pointer'
            }}
          >
            ›
          </button>
        </div>
        {positionsReady && [...Array(11)].map((_, i) => {
          const norm = i / 10;
          const x = norm * (containerWidth - 2 * padding) + padding;
          const elo = Math.round(visibleMin + norm * (visibleMax - visibleMin));

          return (
            <div key={i}>
              {/* Vertical line */}
              <div style={{ ...styles.gridLine, left: `${x}px` }} />

              {/* ELO label under the line */}
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% - 1rem)',
                  left: `${x}px`,
                  transform: 'translateX(-50%)',
                  fontSize: '0.75rem',
                  color: '#4b5563',
                  fontWeight: 500,
                }}
              >
                {elo}
              </div>
            </div>
          );
        })}

        <div style={{ ...styles.label, ...styles.leftLabel }}>← Lower Rating</div>
        <div style={{ ...styles.label, ...styles.rightLabel }}>Higher Rating →</div>

        {positionsReady && sliderStories.map((story, index) => {
          const position = storyPositions[story.id];
          const isDragged = draggedStory?.id === story.id;
          const isHovered = hoveredStory?.id === story.id;
          const color = colorPalette[index % colorPalette.length];

          return (
            <div
              key={story.id}
              style={{ ...styles.storyDot, left: `${position?.x}px`, top: `${position.y}px` }}
            >
              {(isHovered || isDragged) && (
                <div style={styles.tooltip}>
                  <div>{story.title}</div>
                  <div>{Math.round(storyRatings[story.id])}</div>
                  <div style={styles.tooltipArrow}></div>
                </div>
              )}
              <div
                style={{
                  ...styles.dot,
                  backgroundColor: color,
                  ...(isDragged ? styles.dotDragged : isHovered ? styles.dotHovered : {})
                }}
                onMouseDown={(e) => handleMouseDown(e, story)}
                onMouseEnter={() => setHoveredStory(story)}
                onMouseLeave={() => setHoveredStory(null)}
              >
                {index}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, marginBottom: '0.5rem' }}>
        <span>{Math.round(visibleMin)}</span>
        <span>{Math.round(visibleMax)}</span>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1rem 0'
        }}>
          {participants.map((p, i) => (
            <div key={i} style={{
              background: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              minWidth: '200px',
              textAlign: 'left'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{p.userName}</div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', color: p.completed ? '#22c55e' : '#6b7280' }}>
                {p.completed ? (
                  <i className="bi bi-check-circle-fill" style={{ marginRight: '0.5rem' }}></i>
                ) : (
                  <i className="bi bi-clock" style={{ marginRight: '0.5rem' }}></i>
                )}
                <span>{p.completed ? 'Completed' : 'Pending'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Current Ranking (Left to Right)</h3>
        <div style={styles.rankingList}>
          {ranking.map((story, index) => (
            <div key={story.id} style={styles.rankingItem}>
              <div style={styles.rankingLeft}>
                <div style={{ ...styles.rankingDot, backgroundColor: colorPalette[story.origIndex % colorPalette.length], textAlign: 'center', color: 'white', fontWeight: 'bold' }}>{story.origIndex}</div>
                <div>{story.title}</div>
              </div>
              <div>#{index + 1}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={submitRanking}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Ranking'}
        </button>
      </div>

      {success && (
        <div className="alert alert-success mt-3" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          Ranking submitted successfully! Redirecting…
        </div>
      )}
    </div>
  );
};

export default StoryDragArea;
