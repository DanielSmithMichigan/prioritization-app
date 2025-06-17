import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { type RootState } from './store';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

const API_BASE = import.meta.env.VITE_ELO_API_BASE!;
const tenantId = 'tenant-abc';

const metricDescriptions: { [key: string]: string } = {
  'impact': 'Rank the stories based on which will have a greater impact. Greatest impact goes on top.',
  'estimatedTime': 'Rank the stories based on which will take longer. Most time consuming story goes on top.',
  'risk': 'Rank the stories based on risk of unexpected complexity. Most Complexity goes on top.',
  'visibility': 'Rank the stories based on visibility. Most visible goes on top.'
};

const SortableItem: React.FC<{ id: string; index: number; title: string; category: string }> = ({ id, index, title, category }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="list-group-item d-flex justify-content-between align-items-center shadow-sm mb-2 bg-white border"
    >
      <div>
        <strong className="me-2">#{index + 1}</strong> {title}
      </div>
      <span className="badge bg-secondary">{category}</span>
    </div>
  );
};

const RankOrderingPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const storiesMap = useSelector((state: RootState) => state.comparison.stories);
  const comparisons = useSelector((state: RootState) => state.comparison.comparisons);
  const comparison = comparisons[0];
  const metric = comparison.metric;

  const uniqueIds = Object.keys(storiesMap);

  const initialItems = uniqueIds.map(id => storiesMap[id]).filter(Boolean);
  const [orderedIds, setOrderedIds] = useState(initialItems.map(s => s.id));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = orderedIds.indexOf(active.id);
      const newIndex = orderedIds.indexOf(over.id);
      setOrderedIds(arrayMove(orderedIds, oldIndex, newIndex));
    }
  };

  const { mutateAsync: submitRanking, isPending, isSuccess, isError } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/elo/rankBatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          metric,
          orderedStoryIds: orderedIds,
        }),
      });
      if (!res.ok) throw new Error('Submission failed');
    },
    onSuccess: () => {
      setTimeout(() => navigate('/prioritization-app/'), 1500); // 1.5 sec delay
    }
  });

  return (
    <div className="container py-5">
      <div className="text-center mb-4">
        <h2 className="display-6">🧩 Rank the Stories</h2>
        <p className="text-muted">{metricDescriptions[metric]}</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="list-group mb-4">
            {orderedIds.map((id, index) => {
              const story = storiesMap[id];
              return (
                <SortableItem
                  key={id}
                  id={id}
                  index={index}
                  title={story.title}
                  category={story.category}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="text-center">
        <button
          className="btn btn-primary btn-lg"
          onClick={() => submitRanking()}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Submitting…
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>
              Submit Ranking
            </>
          )}
        </button>

        {isError && (
          <div className="alert alert-danger mt-3">
            <i className="bi bi-exclamation-triangle-fill me-1"></i>
            Something went wrong submitting the ranking.
          </div>
        )}

        {isSuccess && (
          <div className="alert alert-success mt-3">
            <i className="bi bi-check-circle-fill me-1"></i>
            Success! Ranking submitted.
          </div>
        )}
      </div>
    </div>
  );
};

export default RankOrderingPage;
