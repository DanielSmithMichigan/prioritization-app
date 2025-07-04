import { configureStore } from '@reduxjs/toolkit';
import comparisonReducer from './comparisonSlice';
import sessionReducer from './sessionSlice';

export const store = configureStore({
  reducer: {
    comparison: comparisonReducer,
    session: sessionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;