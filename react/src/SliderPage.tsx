import React, { useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import type { Story, metricKeys } from './types';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

const colorPalette = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#38bdf8', '#facc15', '#4ade80', '#fb7185'];
const API_BASE = import.meta.env.VITE_ELO_API_BASE!;
const tenantId = 'tenant-abc';

const StoryDragArea = () => {
  const sliderStories: Story[] = useSelector((s: RootState) => s.comparison.sliderStories);
  const selectedMetric: metricKeys = useSelector((s: RootState) => s.comparison.selectedMetric);
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [storyPositions, setStoryPositions] = useState(() => {
    const positions: Record<string, { x: number, y: number }> = {};

    // Get rating range for normalization
    const ratings = sliderStories.map(s => s.elo[selectedMetric].rating);
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const containerWidth = 1000; // adjust as needed

    sliderStories.forEach((story) => {
      const rating = story.elo[selectedMetric].rating;
      const normX = maxRating === minRating ? 0.5 : (rating - minRating) / (maxRating - minRating);
      const x = normX * (containerWidth - 100) + 50; // padding of 50 on each side
      const y = 150 + Math.random() * 100; // randomize vertical position slightly

      positions[story.id] = { x, y };
    });

    return positions;
  });


  const [draggedStory, setDraggedStory] = useState<Story | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredStory, setHoveredStory] = useState<Story | null>(null);
  const dragAreaRef = useRef<HTMLDivElement | null>(null);

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
    const rect = dragAreaRef.current.getBoundingClientRect();
    const newX = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left - dragOffset.x));
    const currentY = storyPositions[draggedStory.id].y;

    setStoryPositions(prev => ({
      ...prev,
      [draggedStory.id]: { x: newX, y: currentY }
    }));
  }, [draggedStory, dragOffset, storyPositions]);

  const handleMouseUp = useCallback(() => {
    setDraggedStory(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  React.useEffect(() => {
    if (draggedStory) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedStory, handleMouseMove, handleMouseUp]);

  const getHorizontalRanking = () => {
    return sliderStories
      .map((story, index) => ({
        ...story,
        position: storyPositions[story.id].x,
        origIndex: index
      }))
      .sort((a, b) => a.position - b.position);
  };

  const ranking = getHorizontalRanking();

  const submitRanking = async () => {
    const updates = ranking.map(story => ({
      storyId: story.id,
      newRating: storyPositions[story.id].x  // use actual dragged x-position
    }));

    const payload = {
      tenantId,
      metric: selectedMetric,
      updates
    };

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/elo/batchSliderUpdate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      await res.json();
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500); // Navigate after 1.5 seconds
    } catch (err) {
      console.error(err);
      alert('Failed to submit ranking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    dragArea: {
      position: 'relative' as const,
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '2px dashed #d1d5db',
      height: '400px',
      minWidth: '1200px',
      overflow: 'hidden',
      cursor: draggedStory ? 'grabbing' : 'default'
    } as CSSProperties,
    gridLine: {
      position: 'absolute' as const,
      top: 0,
      bottom: 0,
      width: '1px',
      backgroundColor: '#9ca3af',
      opacity: 0.2
    } as CSSProperties,
    label: {
      position: 'absolute' as const,
      top: '1rem',
      fontSize: '0.875rem',
      color: '#6b7280',
      fontWeight: '500'
    } as CSSProperties,
    leftLabel: {
      left: '1rem'
    } as CSSProperties,
    rightLabel: {
      right: '1rem'
    } as CSSProperties,
    storyDot: {
      position: 'absolute' as const,
      transform: 'translate(-50%, -50%)'
    } as CSSProperties,
    tooltip: {
      position: 'absolute' as const,
      bottom: '2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#374151',
      color: 'white',
      padding: '0.75rem',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      whiteSpace: 'nowrap',
      zIndex: 10
    } as CSSProperties,
    tooltipArrow: {
      position: 'absolute' as const,
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 0,
      height: 0,
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderTop: '8px solid #374151'
    } as CSSProperties,
    dot: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: '3px solid white',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      cursor: 'grab',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '0.75rem',
      fontWeight: 'bold'
    } as CSSProperties,
    dotHovered: {
      transform: 'scale(1.1)'
    } as CSSProperties,
    dotDragged: {
      transform: 'scale(1.25)',
      cursor: 'grabbing',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
    } as CSSProperties,
    rankingList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0.75rem'
    } as CSSProperties,
    rankingItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f3f4f6',
      padding: '0.5rem 1rem',
      borderRadius: '6px'
    } as CSSProperties,
    rankingDot: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      marginRight: '0.75rem'
    } as CSSProperties,
    rankingLeft: {
      display: 'flex',
      alignItems: 'center'
    } as CSSProperties
  };

  return (
    <div>
      <div ref={dragAreaRef} style={styles.dragArea}>
        {[...Array(10)].map((_, i) => (
          <div key={i} style={{ ...styles.gridLine, left: `${(i + 1) * 10}%` }} />
        ))}

        <div style={{ ...styles.label, ...styles.leftLabel }}>← Smaller</div>
        <div style={{ ...styles.label, ...styles.rightLabel }}>Bigger →</div>

        {sliderStories.map((story, index) => {
          const position = storyPositions[story.id];
          const isDragged = draggedStory?.id === story.id;
          const isHovered = hoveredStory?.id === story.id;
          const color = colorPalette[index % colorPalette.length];

          return (
            <div
              key={story.id}
              style={{ ...styles.storyDot, left: `${position.x}px`, top: `${position.y}px` }}
            >
              {(isHovered || isDragged) && (
                <div style={styles.tooltip}>
                  <div>{story.title}</div>
                  <div>{Math.round(story.elo[selectedMetric].rating)}</div>
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
