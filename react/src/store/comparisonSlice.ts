import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type Story, type metricKeys } from '../types';

interface ComparisonState {
  stories: Story[];
  sliderStories: Story[];
  selectedMetric: metricKeys;
}

const initialState: ComparisonState = {
  selectedMetric: 'impact',
  stories: [],
  sliderStories: [],
};

export const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    setStories(state, action: PayloadAction<Story[]>) {
      state.stories = action.payload;
    },
    clearSession(state) {
      state.stories = [];
      state.sliderStories = [];
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
  clearSession,
  setSliderStories,
  setSelectedMetric,
} = comparisonSlice.actions;

export default comparisonSlice.reducer;
