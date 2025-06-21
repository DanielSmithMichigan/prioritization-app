// import React, { useState } from 'react';
// import { useSelector, useDispatch } from 'react-redux';
// import { type RootState } from './store';
// import {
//   shiftComparison,
//   updateStories,
//   removeStories,
// } from './store/comparisonSlice';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { type Story } from './types';

// const VITE_ELO_API_BASE = import.meta.env.VITE_ELO_API_BASE!;
// const tenantId = 'tenant-abc';
// const userId = 'user-123';

// const metricDescriptions : { [key: string]: string } = {
//   'impact': 'Which story will have a greater impact?',
//   'estimatedTime': 'Which story will take longer?',
//   'risk': 'Which has greater risk of unexpected complexity?',
//   'visibility': 'Which has more visibility?'
// };

// async function fetchStory(tenantId: string, storyId: string): Promise<Story> {
//   const res = await fetch(`${VITE_ELO_API_BASE}/story`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ tenantId, storyId }),
//   });
//   if (!res.ok) throw new Error('Fetch failed');
//   return res.json();
// }

// async function updateElo(input: {
//   tenantId: string;
//   userId: string;
//   leftStoryId: string;
//   rightStoryId: string;
//   winnerStoryId: string;
//   metric: keyof Story['elo'];
// }) {
//   const res = await fetch(`${VITE_ELO_API_BASE}/elo/update`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(input),
//   });
//   if (!res.ok) throw new Error(`Update failed (${res.status})`);
// }

// const ComparisonPage: React.FC = () => {
//   const dispatch = useDispatch();
//   const queryClient = useQueryClient();

//   const comparisons = useSelector((state: RootState) => state.comparison.comparisons);
//   const stories = useSelector((state: RootState) => state.comparison.stories);

//   const [selectedId, setSelectedId] = useState<string | null>(null);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [initialCount] = useState(comparisons.length); // 🆕 Save initial count once

//   const comparison = comparisons[0];
//   const leftStory = stories[comparison?.leftId ?? ''];
//   const rightStory = stories[comparison?.rightId ?? ''];

//   const { mutateAsync: submitElo } = useMutation({
//     mutationFn: updateElo,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['story', comparison.leftId] });
//       queryClient.invalidateQueries({ queryKey: ['story', comparison.rightId] });
//     },
//   });

//   const handleContinue = async (storyId: string) => {
//     setLoading(true);
//     await submitElo({
//       tenantId,
//       userId,
//       leftStoryId: comparison.leftId,
//       rightStoryId: comparison.rightId,
//       winnerStoryId: storyId,
//       metric: comparison.metric,
//     });
//     setLoading(false);

//     dispatch(removeStories([comparison.leftId, comparison.rightId]));

//     const [freshLeft, freshRight] = await Promise.all([
//       queryClient.fetchQuery({
//         queryKey: ['story', comparison.leftId],
//         queryFn: () => fetchStory(tenantId, comparison.leftId),
//       }),
//       queryClient.fetchQuery({
//         queryKey: ['story', comparison.rightId],
//         queryFn: () => fetchStory(tenantId, comparison.rightId),
//       }),
//     ]);

//     dispatch(updateStories([freshLeft, freshRight]));
//     dispatch(shiftComparison());
//     setSelectedId(null);
//   };

//   if (!comparison) {
//     return (
//       <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
//         <div className="text-center">
//           <div className="mb-4">
//             <i className="bi bi-trophy-fill text-success" style={{ fontSize: '4rem' }}></i>
//           </div>
//           <h2 className="display-5 mb-3 text-success">🎉 Congratulations!</h2>
//           <p className="lead text-muted">All comparisons have been completed successfully.</p>
//           <button className="btn btn-primary btn-lg mt-3">
//             <i className="bi bi-arrow-left me-2"></i>
//             Back to Stories
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (!leftStory || !rightStory || loading) {
//     return (
//       <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center">
//         <div className="text-center">
//           <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
//             <span className="visually-hidden">Loading...</span>
//           </div>
//           <h4 className="text-muted">Loading comparison...</h4>
//         </div>
//       </div>
//     );
//   }

//   const comparisonsLeft = comparisons.length;
//   const progressPercent = Math.round(100 * (initialCount - comparisonsLeft) / initialCount);

//   return (
//     <div className="container-fluid min-vh-100 bg-light py-4">
//       <div className="container">
//         <div className="row justify-content-center">
//           <div className="col-12">

//             <div className="mb-3">
//               <label className="fw-bold mb-1">Progress</label>
//               <div className="progress" style={{ height: '1.25rem' }}>
//                 <div
//                   className="progress-bar bg-success"
//                   role="progressbar"
//                   style={{ width: `${progressPercent}%` }}
//                   aria-valuenow={progressPercent}
//                   aria-valuemin={0}
//                   aria-valuemax={100}
//                 >
//                   {progressPercent}%
//                 </div>
//               </div>
//               <small className="text-muted">{initialCount - comparisonsLeft} of {initialCount} comparisons completed</small>
//             </div>

//             <div className="text-center mb-4">
//               <h2 className="display-6 mb-2">Story Comparison</h2>
//               <h3 className="display-7 mb-2">{metricDescriptions[comparison.metric]}</h3>
//             </div>

//             <div className="row g-4">
//               {[leftStory, rightStory].map((story) => (
//                 <div key={story.id} className="col-lg-6">
//                   <div
//                     className={`card h-100 shadow-sm border-0`}
//                     onClick={() => handleContinue(story.id)}
//                     style={{ cursor: 'pointer', textAlign: 'center' }}
//                   >
//                     <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
//                       <div className="d-flex align-items-center">
//                         {selectedId === story.id && (
//                           <i className="bi bi-check-circle-fill text-success fs-5"></i>
//                         )}
//                       </div>
//                     </div>

//                     <div className="card-body">
//                       <h4 className="card-title mb-3 text-dark">{story.title}</h4>
//                       <div className="row col-12">
//                         <div style={{ display: 'inline-block' }}>
//                           <span className="badge bg-secondary fs-6">{story.category}</span>
//                         </div>
//                       </div>
//                     </div>

//                   </div>
//                 </div>
//               ))}
//             </div>

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ComparisonPage;