import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type Story, type metricKeys } from '../types';

export interface Comparison {
  leftId: string;
  rightId: string;
  metric: metricKeys;
}

interface ComparisonState {
  stories: Record<string, Story>;
  sliderStories: Story[];
  comparisons: Comparison[];
  selectedMetric: metricKeys;
}

const initialState: ComparisonState = {
  selectedMetric: 'impact',
  stories: {},
  sliderStories: [],
  comparisons: [],
};

export const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    setStories(state, action: PayloadAction<Story[]>) {
      for (const story of action.payload) {
        state.stories[story.id] = story;
      }
    },
    updateStories(state, action: PayloadAction<Story[]>) {
      for (const story of action.payload) {
        state.stories[story.id] = story;
      }
    },
    removeStories(state, action: PayloadAction<string[]>) {
      for (const id of action.payload) {
        delete state.stories[id];
      }
    },
    setComparisons(state, action: PayloadAction<Comparison[]>) {
      state.comparisons = action.payload;
    },
    shiftComparison(state) {
      state.comparisons.shift();
    },
    clearSession(state) {
      state.stories = {};
      state.sliderStories = [];
      state.comparisons = [];
    },
    setSliderStories(state, action: PayloadAction<Story[]>) {
      state.sliderStories = action.payload;
    },
    setSelectedMetric(state, action: PayloadAction<metricKeys>) {
      state.selectedMetric = action.payload;
    },
  },
});

export const {
  setStories,
  updateStories,
  removeStories,
  setComparisons,
  shiftComparison,
  clearSession,
  setSliderStories,
  setSelectedMetric,
} = comparisonSlice.actions;

export default comparisonSlice.reducer;
