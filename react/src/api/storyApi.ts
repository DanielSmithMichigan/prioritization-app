import type { Story, GetAllStoriesResponse, StoryPrimaryKey } from '../types';

const API_BASE = import.meta.env.VITE_ELO_API_BASE!;

export async function fetchAllStories(getAccessTokenSilently: () => Promise<string>): Promise<Story[]> {
  const token = await getAccessTokenSilently();
  let allStories: Story[] = [];
  let nextToken: StoryPrimaryKey | null = null;

  do {
    const res = await fetch(`${API_BASE}/stories/getAll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        limit: 100,
        ...(nextToken ? { nextToken } : {})
      }),
    });

    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status}`);
    }

    const data: GetAllStoriesResponse = await res.json();
    allStories = allStories.concat(data.stories);
    nextToken = data.nextToken;

  } while (nextToken);

  return allStories;
}
