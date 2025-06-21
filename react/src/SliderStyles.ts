import type { CSSProperties } from 'react';
export const styles : Record<string, CSSProperties> = {
  dragArea: {
    position: 'relative',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '2px dashed #d1d5db',
    height: '400px',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: '#9ca3af',
    opacity: 0.2
  },
  label: {
    position: 'absolute',
    top: '1rem',
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  leftLabel: { left: '1rem' },
  rightLabel: { right: '1rem' },
  storyDot: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)'
  },
  tooltip: {
    position: 'absolute',
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
  },
  tooltipArrow: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #374151'
  },
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
  },
  dotHovered: { transform: 'scale(1.1)' },
  dotDragged: {
    transform: 'scale(1.25)',
    cursor: 'grabbing',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    padding: '0.5rem 1rem',
    borderRadius: '6px'
  },
  rankingDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    marginRight: '0.75rem'
  },
  rankingLeft: {
    display: 'flex',
    alignItems: 'center'
  }
};