import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from "@auth0/auth0-react";

const API_BASE = import.meta.env.VITE_ELO_API_BASE!;
const userId = 'user-123';

async function createStoriesRequest(input: {
  userId: string;
  titles: string[];
  getAccessTokenSilently: Function;
}): Promise<{ inserted: number }> {
  const token = await input.getAccessTokenSilently();
  const res = await fetch(`${API_BASE}/story/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Failed to create stories (${res.status})`);
  }

  return res.json();
}

const CreateStoriesPage: React.FC = () => {
  const [input, setInput] = useState('');
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const {
    mutateAsync: createStories,
    isPending,
    isSuccess,
    isError,
  } = useMutation({
    mutationFn: createStoriesRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });

  const handleSubmit = async () => {
    const lines = input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;

    try {
      await createStories({ userId, titles: lines, getAccessTokenSilently });
      setInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const lineCount = input.split('\n').filter(line => line.trim().length > 0).length;

  return (
    <div className="container-fluid min-vh-100 bg-light py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8 col-xl-6">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-primary text-white text-center py-4">
                <h2 className="card-title mb-0">
                  <i className="bi bi-plus-circle-fill me-2"></i>
                  Create New Stories
                </h2>
              </div>
              
              <div className="card-body p-4">
                <div className="mb-4">
                  <div className="alert alert-info border-0 bg-light" role="alert">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    <strong>Instructions:</strong> Enter one story title per line. Each title will be converted into a story for comparison.
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="storyInput" className="form-label fw-bold">
                    <i className="bi bi-pencil-square me-1"></i>
                    Story Titles
                  </label>
                  <textarea
                    id="storyInput"
                    className="form-control form-control-lg"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={12}
                    placeholder="Enter story titles here...&#10;Example:&#10;Implement user authentication&#10;Add dark mode support&#10;Optimize database queries"
                    style={{ 
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}
                  />
                  {lineCount > 0 && (
                    <div className="form-text">
                      <i className="bi bi-check-circle text-success me-1"></i>
                      {lineCount} story title{lineCount !== 1 ? 's' : ''} ready to submit
                    </div>
                  )}
                </div>

                <div className="d-grid gap-2">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleSubmit}
                    disabled={isPending || lineCount === 0}
                    style={{ 
                      fontWeight: '600',
                      borderRadius: '50px'
                    }}
                  >
                    {isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Stories...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-upload me-2"></i>
                        Create {lineCount} Stor{lineCount !== 1 ? 'ies' : 'y'}
                      </>
                    )}
                  </button>
                </div>

                {isSuccess && (
                  <div className="alert alert-success border-0 mt-3 shadow-sm" role="alert">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <strong>Success!</strong> Stories have been created successfully.
                  </div>
                )}

                {isError && (
                  <div className="alert alert-danger border-0 mt-3 shadow-sm" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <strong>Error!</strong> Something went wrong while creating stories. Please try again.
                  </div>
                )}
              </div>

              <div className="card-footer bg-light text-center py-3">
                <small className="text-muted">
                  <i className="bi bi-lightbulb me-1"></i>
                  Tip: Keep titles concise and descriptive for better comparison results
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStoriesPage;