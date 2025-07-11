import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    select,
    scaleLinear,
    axisBottom,
    axisLeft,
    quantile,
} from 'd3';
import { fetchAllStories } from './api/storyApi';
import { useAuth0 } from '@auth0/auth0-react';

const M = { top: 20, right: 30, bottom: 40, left: 70 };

const clampNorm = (v: number, minV: number, maxV: number): number =>
    maxV === minV ? 5 : 0.5 + 9 * (v - minV) / (maxV - minV);

const GraphPage: React.FC = () => {
    const { getAccessTokenSilently } = useAuth0();
    const { data: stories = [], isLoading, error } = useQuery({
        queryKey: ['stories'],
        queryFn: () => fetchAllStories(getAccessTokenSilently),
    });

    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const filteredStories = useMemo(() => {
        return categoryFilter === 'all'
            ? stories
            : stories.filter(s => s.category === categoryFilter);
    }, [stories, categoryFilter]);

    const categories = useMemo(() => {
        const set = new Set(stories.map(s => s.category));
        return ['all', ...Array.from(set)];
    }, [stories]);

    const enriched = useMemo(() => {
        if (!filteredStories.length) return [];

        const mKeys = ['impact', 'estimatedTime', 'risk', 'visibility'] as const;
        const min: Record<string, number> = {};
        const maxv: Record<string, number> = {};

        mKeys.forEach(k => {
            const vals = filteredStories.map(s => s.elo[k].rating);
            min[k] = Math.min(...vals);
            maxv[k] = Math.max(...vals);
        });

        return filteredStories.map(s => {
            const nImpact = clampNorm(s.elo.impact.rating, min.impact, maxv.impact);
            const nTime = clampNorm(s.elo.estimatedTime.rating, min.estimatedTime, maxv.estimatedTime);
            const nRisk = clampNorm(s.elo.risk.rating, min.risk, maxv.risk);
            const nVis = clampNorm(s.elo.visibility.rating, min.visibility, maxv.visibility);

            const xFormula = (nTime + (nRisk / 2)) / 1.5;
            return {
                ...s,
                nImpact,
                nTime,
                nRisk,
                nVis,
                x: xFormula,
                y: nImpact,
            };
        });
    }, [filteredStories]);

    const visThreshold = useMemo(() => {
        const vals = enriched.map(d => d.nVis).sort((a, b) => a - b);
        return vals.length ? (quantile(vals, 0.50) ?? 0) : 0;
    }, [enriched]);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [size, setSize] = useState({ w: 800, h: 600 });

    useEffect(() => {
        const onResize = () => {
            if (wrapperRef.current) {
                const { clientWidth, clientHeight } = wrapperRef.current;
                setSize({ w: clientWidth, h: clientHeight });
            }
        };
        setTimeout(() => onResize(), 10);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const x = scaleLinear().domain([0, 10]).range([M.left, size.w - M.right]);
    const y = scaleLinear().domain([0, 10]).range([size.h - M.bottom, M.top]);

    useEffect(() => {
        if (!enriched.length || !svgRef.current) return;
        const svg = select(svgRef.current);
        svg.selectAll('*').remove();

        svg.append('g')
            .attr('transform', `translate(0,${size.h - M.bottom})`)
            .call(axisBottom(x))
            .append('text')
            .attr('x', size.w - M.right).attr('y', 35)
            .attr('fill', '#000').attr('text-anchor', 'end')
            .attr('font-size', '40px')
            .text('Effort + (½ x Risk)');

        svg.append('g')
            .attr('transform', `translate(${M.left},0)`)
            .call(axisLeft(y))
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -M.top)
            .attr('y', -36)
            .attr('fill', '#000')
            .attr('text-anchor', 'end')
            .attr('font-size', '40px')
            .text('Impact');

        enriched.forEach(story => {
            const cx = x(story.x);
            const cy = y(story.y);
            const offsetX = 40;
            const offsetY = 30;
            const cardX = Math.min(size.w - M.right - 160, cx + offsetX);
            const cardY = Math.min(size.h - M.bottom - 60, cy + offsetY);

            svg.append('line')
                .attr('x1', cx).attr('y1', cy)
                .attr('x2', cardX).attr('y2', cardY)
                .attr('stroke', '#999').attr('stroke-width', 1);

            svg.append('text')
                .attr('x', cx).attr('y', cy)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('fill', 'black')
                .attr('font-weight', 'bold')
                .text('×');
        });
    }, [enriched, size]);

    if (isLoading) return <div className="container py-5 text-center">Loading…</div>;
    if (error) return <div className="container py-5 text-center text-danger">Failed to load stories</div>;

    return (
        <div className="position-relative w-100" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="position-absolute top-0 right-0 p-3 z-3 bg-white shadow-sm rounded">
                <label className="form-label fw-semibold">Filter by Category</label>
                <select
                    className="form-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                    ))}
                </select>
            </div>

            <div ref={wrapperRef} className="w-100 h-100">
                <svg ref={svgRef} width={size.w} height={size.h}
                    className="position-absolute top-0 start-0" />
                {enriched.map(story => {
                    const cx = x(story.x);
                    const cy = y(story.y);
                    const offsetX = 40;
                    const offsetY = 30;
                    const cardX = Math.min(size.w - M.right - 160, cx + offsetX);
                    const cardY = Math.min(size.h - M.bottom - 60, cy + offsetY);

                    return (
                        <div
                            key={story.id}
                            className={`position-absolute bg-white rounded p-2 shadow-sm small
                         ${story.nVis >= visThreshold ? 'border border-2 border-danger' : 'border border-secondary'}`}
                            style={{
                                left: `${cardX}px`,
                                top: `${cardY}px`,
                                minWidth: '120px',
                                maxWidth: '160px',
                                pointerEvents: 'auto',
                            }}
                            title={`${story.title}
Impact: ${story.nImpact.toFixed(1)}
Risk: ${story.nRisk.toFixed(1)}
Effort: ${story.nTime.toFixed(1)}
Visibility: ${story.nVis.toFixed(1)}`}
                        >
                            <div className="fw-semibold text-truncate">{story.title}</div>
                        </div>
                    );
                })}
            </div>

            <div className="container my-5">
                <h4 className="mb-3">📊 Story Rankings (Impact - (Effort + ½xRisk))</h4>
                <table className="table table-sm table-striped table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th className="text-end">Impact</th>
                            <th className="text-end">Effort</th>
                            <th className="text-end">Risk</th>
                            <th className="text-end">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...enriched]
                            .map(s => ({ ...s, score: s.y - s.x }))
                            .sort((a, b) => b.score - a.score)
                            .map(story => (
                                <tr key={story.id}>
                                    <td>{story.title}</td>
                                    <td>{story.category}</td>
                                    <td className="text-end">{story.nImpact.toFixed(1)}</td>
                                    <td className="text-end">{story.nTime.toFixed(1)}</td>
                                    <td className="text-end">{story.nRisk.toFixed(1)}</td>
                                    <td className="text-end fw-bold">{(story.y - story.x).toFixed(2)}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GraphPage;
