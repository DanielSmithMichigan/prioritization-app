import React, { useEffect, useRef, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setParticipants, setSessionId, setConnectionId } from './store/sessionSlice';
import { setSelectedMetric, setSliderStories } from './store/comparisonSlice';
import type { Story } from './types';
import { WebSocketContext } from './SessionWebSocketProvider';
import type { RootState } from './store';
import { useSelector } from 'react-redux';


const API_BASE = import.meta.env.VITE_ELO_API_BASE!;
const tenantId = 'tenant-abc';

const GroupSessionPage: React.FC = () => {
  const userId = useSelector((s: RootState) => s.session.userId);
  const { socket, ready } = useContext(WebSocketContext);
  const { sessionId } = useParams();
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const socketRef = useRef<WebSocket | null>(null);

  if (!sessionId) return <div className="container py-5 text-center text-danger">Missing session ID</div>;

  const handleJoin = () => {
    if (!name.trim()) return;

    setJoined(true);
    dispatch(setSessionId(sessionId));
    localStorage.setItem(`session:${sessionId}:name`, name.trim());

    if (!ready || !socket.current) {
      console.error("WebSocket not ready yet");
      return;
    }

    socket.current.send(JSON.stringify({
      action: 'joinSession',
      sessionId,
      userId,
      userName: name.trim(),
    }));
  };

  
  const handleStartSession = () => {
    if (!ready || !socket.current) {
      console.error("WebSocket not ready yet");
      return;
    }

    socket.current.send(JSON.stringify({
      action: 'startSession',
      sessionId,
    }));
  };
  
  useEffect(() => {
    if (!ready || !socket.current) return;

    console.log('WebSocket Ready');

    socket.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(data);

        if (data.type === 'connectionId' && data.connectionId) {
          console.log("Received connectionId:", data.connectionId);
          dispatch(setConnectionId(data.connectionId));   // <-- store in Redux
        }

        if (data.type === 'sessionUsers') {
          setUsers(data.users);
          dispatch(setParticipants(data.users.map((u: string) => ({ userName: u, completed: false }))));
        }
        if (data.type === 'start') {
          navigate(`/prioritization-app/slider`);
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };
  }, [socket, ready, navigate, dispatch]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (joined) {
      const fetchSessionMetadata = async () => {
        try {
          // 1) Fetch session metadata (will contain story IDs and metric)
          const res = await fetch(`${API_BASE}/session/get?sessionId=${sessionId}`);
          if (!res.ok) throw new Error(`Failed to fetch session metadata: ${res.status}`);
          const sessionData = await res.json();

          // 2) Fetch all stories for the tenant
          const storiesRes = await fetch(`${API_BASE}/stories/getAll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, limit: 500 }),
          });
          if (!storiesRes.ok) throw new Error(`Failed to fetch stories: ${storiesRes.status}`);
          const storiesData = await storiesRes.json();

          const allStories: Story[] = storiesData.stories;

          // 3) Match session story IDs to full story objects
          const matchedStories = sessionData.stories
            .map((id: string) => allStories.find(story => story.id === id))
            .filter((story: Story | undefined): story is Story => story !== undefined);

          if (matchedStories.length !== sessionData.stories.length) {
            console.warn("Some stories in the session metadata could not be found in the fetched stories.");
          }

          // 4) Store matched stories in Redux and local state
          dispatch(setSliderStories(matchedStories));
          setStories(matchedStories);

          // 5) Store selected metric in Redux
          dispatch(setSelectedMetric(sessionData.metric));
        } catch (err) {
          console.error("Failed to fetch session data and match stories:", err);
          alert("Failed to load session data. Please try again.");
        }
      };

      fetchSessionMetadata();
    }
  }, [joined, sessionId, dispatch]);

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-center">👥 Group Rating Session</h2>
      <p className="text-muted text-center mb-4">Session ID: <code>{sessionId}</code></p>

      {!joined ? (
        <div className="text-center">
          <div className="mb-3" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <input
              className="form-control form-control-lg text-center"
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleJoin}
            disabled={!name.trim()}
          >
            Join Session
          </button>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-5">
            <h4 className="text-success mb-3">Participants</h4>
            <ul className="list-group list-group-flush mb-4">
              {users.map((u, i) => (
                <li key={i} className="list-group-item text-start">
                  <i className="bi bi-person-fill me-2"></i>{u}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-7">
            <h4 className="text-primary mb-3">Stories in Session</h4>
            {stories.length === 0 ? (
              <p className="text-muted">Loading stories...</p>
            ) : (
              <ul className="list-group list-group-flush">
                {stories.map((story) => (
                  <li key={story.id} className="list-group-item">
                    <i className="bi bi-journal-text me-2 text-primary"></i>{story.title}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="col-12 text-center mt-4">
            <button
              className="btn btn-outline-success"
              onClick={handleStartSession}
            >
              <i className="bi bi-play-circle me-2"></i>
              Everyone is here
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSessionPage;
