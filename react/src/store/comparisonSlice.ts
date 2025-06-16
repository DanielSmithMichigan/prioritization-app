import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type Story } from '../types';

export interface Comparison {
  leftId: string;
  rightId: string;
  metric: keyof Story['elo'];
}

interface ComparisonState {
  stories: Record<string, Story>;
  comparisons: Comparison[];
}

const initialState: ComparisonState = {
  stories: {},
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
      state.comparisons = [];
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
} = comparisonSlice.actions;

export default comparisonSlice.reducer;
