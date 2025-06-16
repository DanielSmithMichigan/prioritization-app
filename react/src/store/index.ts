import { configureStore } from '@reduxjs/toolkit';
import comparisonReducer from './comparisonSlice';

export const store = configureStore({
  reducer: {
    comparison: comparisonReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
