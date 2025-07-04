import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// store/sessionSlice.ts
interface SessionState {
  userId: string;
  sessionId: string | null;
  participants: { userName: string; completed: boolean }[];
  connectionId: string | null;   // <-- add this line
}

const initialState: SessionState = {
  userId: crypto.randomUUID(),
  sessionId: null,
  participants: [],
  connectionId: null,            // <-- and here
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSessionId(state, action: PayloadAction<string>) {
      state.sessionId = action.payload;
    },
    setParticipants(state, action: PayloadAction<{ userName: string; completed: boolean }[]>) {
      state.participants = action.payload;
    },
    setConnectionId(state, action: PayloadAction<string>) {   // <-- add this reducer
      state.connectionId = action.payload;
    },
    clearSession(state) {
      state.sessionId = null;
      state.participants = [];
      state.userId = crypto.randomUUID();
      state.connectionId = null;  // reset connectionId on clear
    },
  },
});

export const { setSessionId, setParticipants, setConnectionId, clearSession } = sessionSlice.actions;
export default sessionSlice.reducer;
