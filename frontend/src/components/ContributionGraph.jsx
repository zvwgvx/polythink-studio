import React, { useState } from 'react';

const ContributionGraph = ({ stats, summary }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    if (!stats || stats.length === 0) return null;

    // Dimensions
    const width = 800;
    const height = 350;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Find Max Y
    const maxVal = Math.max(
        ...stats.map(d => Math.max(d.total, d.merged, d.rejected)),
        5 // Minimum scale
    );

    // Scales
    const xScale = (index) => padding + (index / (stats.length - 1)) * chartWidth;
    const yScale = (value) => height - padding - (value / maxVal) * chartHeight;

    // Smooth Curve Generator (Catmull-Rom Spline)
    const getPoint = (i, key) => {
        const d = stats[i];
        return [xScale(i), yScale(d[key])];
    };

    const createSmoothPath = (key) => {
        if (stats.length === 0) return "";
        if (stats.length === 1) return `M ${xScale(0)} ${yScale(stats[0][key])}`;

        let path = `M ${xScale(0)} ${yScale(stats[0][key])}`;

        for (let i = 0; i < stats.length - 1; i++) {
            const p0 = getPoint(Math.max(i - 1, 0), key);
            const p1 = getPoint(i, key);
            const p2 = getPoint(i + 1, key);
            const p3 = getPoint(Math.min(i + 2, stats.length - 1), key);

            const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
            const cp1y = p1[1] + (p2[1] - p0[1]) / 6;

            const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
            const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
        }
        return path;
    };

    // Axis Points
    const yTicks = [0, Math.ceil(maxVal / 2), maxVal];
    const xTicks = stats.filter((_, i) => i % 5 === 0); // Show every 5th date

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();

        // Calculate scale factor (SVG viewBox width / actual rendered width)
        const scaleX = width / rect.width;

        // Calculate X position relative to SVG coordinate system
        const x = (e.clientX - rect.left) * scaleX;

        // Find nearest index
        const rawIndex = ((x - padding) / chartWidth) * (stats.length - 1);
        const index = Math.max(0, Math.min(Math.round(rawIndex), stats.length - 1));

        setHoveredIndex(index);
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
    };

    const hoveredData = hoveredIndex !== null ? stats[hoveredIndex] : null;

    return (
        <div className="mt-8">
            <div className="flex justify-between items-end mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contribution Activity (Last 30 Days)</h3>
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-blue-400 rounded-full"></div>
                        <span className="text-blue-400">Total Created</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-green-400 rounded-full"></div>
                        <span className="text-green-400">Accepted Samples</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-red-400 rounded-full"></div>
                        <span className="text-red-400">Rejected Samples</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#121212] border border-[#333] rounded p-4 overflow-hidden relative">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto cursor-crosshair"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Grid Lines (Y-Axis) */}
                    {yTicks.map(tick => (
                        <g key={tick}>
                            <line
                                x1={padding}
                                y1={yScale(tick)}
                                x2={width - padding}
                                y2={yScale(tick)}
                                stroke="#333"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                            <text
                                x={padding - 10}
                                y={yScale(tick) + 4}
                                textAnchor="end"
                                className="fill-gray-500 text-[10px] font-mono"
                            >
                                {tick}
                            </text>
                        </g>
                    ))}

                    {/* Grid Lines (X-Axis) - Vertical Lines for every day */}
                    {stats.map((d, i) => (
                        <line
                            key={`grid-${d.date}`}
                            x1={xScale(i)}
                            y1={0}
                            x2={xScale(i)}
                            y2={height - padding}
                            stroke="#333"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                            opacity="0.1"
                        />
                    ))}

                    {/* X-Axis Labels */}
                    {xTicks.map((d, i) => {
                        const index = stats.indexOf(d);
                        return (
                            <text
                                key={d.date}
                                x={xScale(index)}
                                y={height - 10}
                                textAnchor="middle"
                                className="fill-gray-500 text-[10px] font-mono"
                            >
                                {d.date.slice(5)}
                            </text>
                        );
                    })}

                    {/* Data Lines (Smooth) */}
                    <path
                        d={createSmoothPath('total')}
                        fill="none"
                        stroke="#60A5FA"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-lg"
                    />
                    <path
                        d={createSmoothPath('merged')}
                        fill="none"
                        stroke="#4ADE80"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d={createSmoothPath('rejected')}
                        fill="none"
                        stroke="#F87171"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Hover Overlay & Tooltip */}
                    {hoveredIndex !== null && hoveredData && (
                        <g>
                            {/* Vertical Cursor Line */}
                            <line
                                x1={xScale(hoveredIndex)}
                                y1={0}
                                x2={xScale(hoveredIndex)}
                                y2={height - padding}
                                stroke="white"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                                opacity="0.5"
                            />

                            {/* Active Dots */}
                            <circle cx={xScale(hoveredIndex)} cy={yScale(hoveredData.total)} r="5" fill="#60A5FA" stroke="#121212" strokeWidth="2" />
                            <circle cx={xScale(hoveredIndex)} cy={yScale(hoveredData.merged)} r="5" fill="#4ADE80" stroke="#121212" strokeWidth="2" />
                            {hoveredData.rejected > 0 && (
                                <circle cx={xScale(hoveredIndex)} cy={yScale(hoveredData.rejected)} r="5" fill="#F87171" stroke="#121212" strokeWidth="2" />
                            )}

                            {/* Tooltip Box */}
                            <g transform={`translate(${Math.min(xScale(hoveredIndex) + 10, width - 160)}, 20)`}>
                                <rect width="150" height="90" rx="4" fill="#1E1E1E" stroke="#333" strokeWidth="1" className="shadow-xl" />
                                <text x="10" y="20" className="fill-white text-xs font-bold uppercase tracking-wider">{hoveredData.date}</text>

                                <g transform="translate(10, 40)">
                                    <circle cx="4" cy="-3" r="3" fill="#60A5FA" />
                                    <text x="15" y="0" className="fill-gray-300 text-[10px] font-mono">Total: {hoveredData.total}</text>
                                </g>
                                <g transform="translate(10, 55)">
                                    <circle cx="4" cy="-3" r="3" fill="#4ADE80" />
                                    <text x="15" y="0" className="fill-gray-300 text-[10px] font-mono">Accepted: {hoveredData.merged}</text>
                                </g>
                                <g transform="translate(10, 70)">
                                    <circle cx="4" cy="-3" r="3" fill="#F87171" />
                                    <text x="15" y="0" className="fill-gray-300 text-[10px] font-mono">Rejected: {hoveredData.rejected}</text>
                                </g>
                            </g>
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
};

export default ContributionGraph;
