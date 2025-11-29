import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from './Layout';
import Card from './Card';
import Button from './Button';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import InputModal from './InputModal';
import { api } from '../services/api';

const AutoResizeTextarea = ({ value, onChange, className, placeholder }) => {
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            className={`${className} overflow-hidden resize-none`}
            placeholder={placeholder}
            rows={1}
        />
    );
};

function DatasetViewer({ user, onLogout, isAdmin }) {
    const [datasets, setDatasets] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [content, setContent] = useState(null);
    const [isFork, setIsFork] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Toast state
    const [toast, setToast] = useState(null);

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        onDiscard: null,
        onCancel: null,
        confirmText: 'Save',
        discardText: 'Discard',
        cancelText: 'Cancel',
        confirmVariant: 'success'
    });

    // Input Modal State
    const [inputModalConfig, setInputModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        value: '',
        onConfirm: () => { },
        onCancel: () => { }
    });

    // Edit states
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'json_edit'
    const [jsonContent, setJsonContent] = useState('');

    // Item-Level Edit State
    const [editingItemIndex, setEditingItemIndex] = useState(null); // Global index of item being edited
    const [tempItemData, setTempItemData] = useState(null); // Temporary state for the item being edited

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Graph hover state
    const [hoveredIndex, setHoveredIndex] = useState(null);

    useEffect(() => {
        loadDatasets();
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const loadDatasets = async () => {
        try {
            const data = await api.getDatasets();
            setDatasets(data.datasets);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSelectDataset = async (dataset) => {
        // Check for unsaved changes before switching
        if (editingItemIndex !== null) {
            setModalConfig({
                isOpen: true,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Discard them and switch dataset?',
                onConfirm: null, // No save option here based on original logic
                onDiscard: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    proceedSelectDataset(dataset);
                },
                onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
                discardText: 'Discard & Switch',
                cancelText: 'Cancel'
            });
            return;
        }
        proceedSelectDataset(dataset);
    };

    const proceedSelectDataset = async (dataset) => {
        setSelectedDataset(dataset);
        setLoading(true);
        setError(null);
        setViewMode('list');
        setEditingItemIndex(null);
        setTempItemData(null);
        setCurrentPage(1);
        try {
            const filename = dataset.path.split('/')[1];
            // Always try to get fork first
            const data = await api.getDatasetContent(dataset.type, filename, true);

            if (Array.isArray(data.content)) {
                setContent(data.content);
            } else {
                console.error("Dataset content is not an array:", data.content);
                setContent([]);
                setError("Invalid dataset format: Content must be an array.");
            }

            setIsFork(data.is_fork);
            setHasChanges(data.has_changes);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePR = () => {
        if (!selectedDataset) return;
        setInputModalConfig({
            isOpen: true,
            title: 'Create Pull Request',
            message: 'Enter a description for your Pull Request:',
            value: '',
            onConfirm: (description) => submitPR(description),
            onCancel: () => setInputModalConfig(prev => ({ ...prev, isOpen: false }))
        });
    };

    const submitPR = async (description) => {
        setInputModalConfig(prev => ({ ...prev, isOpen: false }));
        try {
            await api.createPR(selectedDataset.path, description);
            showToast("Pull Request created successfully!", "success");
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    const handleEnterJsonMode = () => {
        setJsonContent(JSON.stringify(content, null, 2));
        setViewMode('json_edit');
        setEditingItemIndex(null); // Cancel any active item edit
    };

    const handleExitJsonMode = () => {
        setViewMode('list');
    };

    const handleSaveJson = async () => {
        if (!selectedDataset) return;
        setSaving(true);
        try {
            const filename = selectedDataset.path.split('/')[1];
            const dataToSave = JSON.parse(jsonContent);

            await api.saveDatasetContent(selectedDataset.type, filename, dataToSave);

            setContent(dataToSave);
            setIsFork(true); // Now it's definitely a fork
            setViewMode('list');
            showToast('Saved to your fork!', 'success');
        } catch (err) {
            showToast('Error saving: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const startEditingItem = (globalIdx) => {
        if (editingItemIndex !== null && editingItemIndex !== globalIdx) {
            setModalConfig({
                isOpen: true,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes in another item. Discard them?',
                onConfirm: null,
                onDiscard: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    proceedStartEditingItem(globalIdx);
                },
                onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
                discardText: 'Discard',
                cancelText: 'Cancel'
            });
            return;
        }
        proceedStartEditingItem(globalIdx);
    };

    const proceedStartEditingItem = (globalIdx) => {
        setEditingItemIndex(globalIdx);
        // Deep copy to avoid mutating state directly
        setTempItemData(JSON.parse(JSON.stringify(content[globalIdx])));
    };

    const cancelEditingItem = () => {
        setEditingItemIndex(null);
        setTempItemData(null);
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const saveEditingItem = async () => {
        if (!selectedDataset || editingItemIndex === null) return;
        setSaving(true);
        setModalConfig(prev => ({ ...prev, isOpen: false })); // Close modal if open
        try {
            const filename = selectedDataset.path.split('/')[1];

            // Create new content array with updated item
            const newContent = [...content];
            newContent[editingItemIndex] = tempItemData;

            await api.saveDatasetContent(selectedDataset.type, filename, newContent);

            setContent(newContent);
            setIsFork(true); // Now it's definitely a fork
            setHasChanges(true);
            setEditingItemIndex(null);
            setTempItemData(null);
            showToast('Item saved to your fork!', 'success');
        } catch (err) {
            showToast('Error saving item: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // Temp Item Updates
    const updateTempMessage = (msgIdx, field, value) => {
        const newItem = { ...tempItemData };
        const newMessages = [...newItem.messages];
        newMessages[msgIdx] = { ...newMessages[msgIdx], [field]: value };
        newItem.messages = newMessages;
        setTempItemData(newItem);
    };

    const addTempMessage = () => {
        const newItem = { ...tempItemData };
        newItem.messages = [...newItem.messages, { role: 'user', content: '', thinking: null }];
        setTempItemData(newItem);
    };

    const removeTempMessage = (msgIdx) => {
        const newItem = { ...tempItemData };
        newItem.messages = newItem.messages.filter((_, i) => i !== msgIdx);
        setTempItemData(newItem);
    };

    const toggleTempThinking = (msgIdx) => {
        const newItem = { ...tempItemData };
        const newMessages = [...newItem.messages];
        const msg = newMessages[msgIdx];

        if (msg.thinking === undefined || msg.thinking === null) {
            newMessages[msgIdx] = { ...msg, thinking: '' };
        } else {
            newMessages[msgIdx] = { ...msg, thinking: null };
        }

        newItem.messages = newMessages;
        setTempItemData(newItem);
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    const getCurrentItems = (allContent) => {
        if (!allContent) return [];
        return allContent.slice(indexOfFirstItem, indexOfLastItem);
    };

    const totalPages = (totalItems) => Math.ceil(totalItems / itemsPerPage);

    const PaginationControls = ({ totalItems }) => {
        const pages = totalPages(totalItems);
        if (pages <= 1) return null;

        return (
            <div className="flex justify-center items-center space-x-4 py-4 px-6 bg-[#1E1E1E] border border-[#333] rounded-lg sticky bottom-0 z-10">
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}
                >
                    Previous
                </Button>

                <span className="font-bold text-sm text-gray-400">
                    Page <span className="text-white">{currentPage}</span> of <span className="text-white">{pages}</span>
                </span>

                <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === pages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pages))}
                    className={currentPage === pages ? 'opacity-50 cursor-not-allowed' : ''}
                >
                    Next
                </Button>

                <div className="flex items-center ml-4 space-x-2 border-l border-[#333] pl-4">
                    <span className="text-xs font-bold uppercase text-gray-500">Go to:</span>
                    <input
                        type="number"
                        min="1"
                        max={pages}
                        className="w-16 p-1 bg-[#2D2D2D] border border-[#444] rounded text-white font-bold text-center focus:border-white outline-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = parseInt(e.target.value);
                                if (val >= 1 && val <= pages) setCurrentPage(val);
                            }
                        }}
                    />
                </div>
            </div>
        );
    };

    // Click Outside and Esc Logic
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (editingItemIndex !== null && !modalConfig.isOpen) {
                const card = document.getElementById('editing-card');
                if (card && !card.contains(e.target) && document.body.contains(e.target)) {
                    // Trigger Modal
                    setModalConfig({
                        isOpen: true,
                        title: 'Unsaved Changes',
                        message: 'You have unsaved changes. Do you want to save them before leaving?',
                        onConfirm: () => saveEditingItemRef.current(),
                        onDiscard: () => cancelEditingItemRef.current(),
                        onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                    });
                }
            }
        };

        const handleEscKey = (e) => {
            if (editingItemIndex !== null && e.key === 'Escape' && !modalConfig.isOpen) {
                setModalConfig({
                    isOpen: true,
                    title: 'Unsaved Changes',
                    message: 'You have unsaved changes. Do you want to save them before leaving?',
                    onConfirm: () => saveEditingItemRef.current(),
                    onDiscard: () => cancelEditingItemRef.current(),
                    onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscKey);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [editingItemIndex, modalConfig.isOpen]);

    // Refs to hold latest functions/data for event handlers
    const saveEditingItemRef = useRef(saveEditingItem);
    const cancelEditingItemRef = useRef(cancelEditingItem);

    useEffect(() => {
        saveEditingItemRef.current = saveEditingItem;
        cancelEditingItemRef.current = cancelEditingItem;
    }, [saveEditingItem, cancelEditingItem]);


    const Sidebar = (
        <div className="flex flex-col h-full">
            <div className="space-y-8 flex-1 overflow-y-auto">
                <div>
                    <h2 className="font-bold mb-3 text-gray-500 text-xs uppercase tracking-widest">Multi-Turn</h2>
                    <div className="space-y-1">
                        {datasets.filter(d => d.type === 'multi-turn').map(d => (
                            <div
                                key={d.path}
                                onClick={() => handleSelectDataset(d)}
                                className={`cursor-pointer px-3 py-2 rounded text-sm transition-all ${selectedDataset?.path === d.path ? 'bg-white text-black font-bold' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
                            >
                                {d.name}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="font-bold mb-3 text-gray-500 text-xs uppercase tracking-widest">Single-Turn</h2>
                    <div className="space-y-1">
                        {datasets.filter(d => d.type === 'single-turn').map(d => (
                            <div
                                key={d.path}
                                onClick={() => handleSelectDataset(d)}
                                className={`cursor-pointer px-3 py-2 rounded text-sm transition-all ${selectedDataset?.path === d.path ? 'bg-white text-black font-bold' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
                            >
                                {d.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-4 mt-auto border-t border-[#333] space-y-2">
                {isAdmin && (
                    <Link to="/admin" className="w-full flex items-center gap-3 px-3 py-2 text-purple-400 hover:text-white hover:bg-purple-900/20 rounded transition-all group">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm font-bold">Admin Dashboard</span>
                    </Link>
                )}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-[#333] rounded transition-all group"
                >
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm font-medium">Sign Out</span>
                </button>
            </div>
        </div>
    );

    // Contribution Line Chart Helper (SVG)
    const renderContributionGraph = () => {
        const stats = user?.contribution_stats?.daily_stats;
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
            const x = e.clientX - rect.left;

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
                            <span className="text-green-400">Merged</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-1 bg-red-400 rounded-full"></div>
                            <span className="text-red-400">Rejected</span>
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
                                        <text x="15" y="0" className="fill-gray-300 text-[10px] font-mono">Merged: {hoveredData.merged}</text>
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

    return (
        <Layout sidebar={Sidebar}>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onDiscard={modalConfig.onDiscard}
                onCancel={modalConfig.onCancel}
                confirmText={modalConfig.confirmText}
                discardText={modalConfig.discardText}
                cancelText={modalConfig.cancelText}
                confirmVariant={modalConfig.confirmVariant}
            />

            <InputModal
                isOpen={inputModalConfig.isOpen}
                title={inputModalConfig.title}
                message={inputModalConfig.message}
                value={inputModalConfig.value}
                onChange={(val) => setInputModalConfig(prev => ({ ...prev, value: val }))}
                onConfirm={() => inputModalConfig.onConfirm(inputModalConfig.value)}
                onCancel={inputModalConfig.onCancel}
            />

            {!selectedDataset ? (
                <div className="space-y-4">
                    <Card className="text-center py-10 bg-transparent border-none shadow-none">
                        <h2 className="text-4xl font-black mb-4 text-white tracking-tight">Welcome, {user?.full_name || user?.username}</h2>
                        <p className="text-gray-500">Select a dataset from the sidebar to start reviewing.</p>
                    </Card>

                    {/* Contribution Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="text-center py-4 bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
                            <div className="text-4xl font-black text-blue-400 mb-2">{user?.contribution_stats?.total_prs || 0}</div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Pull Requests</div>
                        </Card>
                        <Card className="text-center py-4 bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
                            <div className="text-4xl font-black text-green-400 mb-2">{user?.contribution_stats?.merged_prs || 0}</div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Merged Contributions</div>
                        </Card>
                        <Card className="text-center py-4 bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
                            <div className="text-4xl font-black text-red-400 mb-2">
                                {user?.contribution_stats?.rejected_prs || 0}
                            </div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rejected Contributions</div>
                        </Card>
                    </div>

                    {/* Contribution Graph */}
                    <Card>
                        {renderContributionGraph()}
                    </Card>
                </div>
            ) : (
                <div className="space-y-6 pb-20">
                    {/* Header */}
                    <div className="flex justify-between items-center sticky top-0 bg-[#121212]/95 backdrop-blur z-20 py-6 px-6 border border-[#333] rounded-lg">
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black uppercase truncate max-w-md text-white tracking-tight">{selectedDataset.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isFork ? 'bg-purple-900/30 text-purple-200 border border-purple-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                    {isFork ? 'Your Fork' : 'Main Repo'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {isFork && (
                                <Button
                                    onClick={handleCreatePR}
                                    size="sm"
                                    variant="primary"
                                    disabled={!hasChanges}
                                    className={`flex items-center gap-2 shadow-lg transition-all ${!hasChanges ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-blue-500/20'}`}
                                    title={!hasChanges ? "No changes to submit" : "Submit Pull Request"}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Submit Pull Request
                                </Button>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded font-medium">
                            Error: {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-32 font-bold text-xl animate-pulse text-gray-500">Loading...</div>
                    ) : (
                        <>
                            {viewMode === 'json_edit' ? (
                                <Card>
                                    <textarea
                                        className="w-full h-[800px] font-mono text-sm p-4 bg-[#121212] text-gray-300 border border-[#333] rounded focus:border-white outline-none resize-none"
                                        value={jsonContent}
                                        onChange={(e) => setJsonContent(e.target.value)}
                                    />
                                </Card>
                            ) : (
                                <div className="space-y-8">
                                    {/* Pagination Top */}
                                    <PaginationControls totalItems={content?.length || 0} />

                                    {getCurrentItems(content).map((item, idx) => {
                                        if (!item) return null; // Safety check for null items

                                        const globalIdx = indexOfFirstItem + idx;
                                        const isEditingThis = editingItemIndex === globalIdx;
                                        const displayItem = isEditingThis ? tempItemData : item;

                                        if (!displayItem) return null; // Safety check for displayItem

                                        return (
                                            <div key={globalIdx} id={isEditingThis ? "editing-card" : undefined}>
                                                <Card
                                                    title={`Item ${item.id || globalIdx + 1}`}
                                                    className={`relative group transition-all duration-300 ${isEditingThis ? 'ring-2 ring-white shadow-2xl scale-[1.01] z-10' : 'hover:border-gray-500'}`}
                                                >
                                                    {/* Edit Header Actions */}
                                                    <div className={`absolute right-6 flex gap-2 z-20 ${isEditingThis ? 'top-4' : 'top-6'}`}>
                                                        {isEditingThis ? (
                                                            <Button
                                                                variant="success"
                                                                size="sm"
                                                                onClick={saveEditingItem}
                                                                disabled={saving}
                                                                className="shadow-lg flex items-center gap-2"
                                                            >
                                                                {saving ? (
                                                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                                <span>Save</span>
                                                            </Button>
                                                        ) : (
                                                            <button
                                                                onClick={() => startEditingItem(globalIdx)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black px-3 py-1.5 rounded text-xs font-bold shadow-lg"
                                                            >
                                                                EDIT
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Double Click Handler Wrapper */}
                                                    <div onDoubleClick={() => !isEditingThis && startEditingItem(globalIdx)}>

                                                        {isEditingThis ? (
                                                            // EDIT MODE FOR THIS ITEM
                                                            <div className="space-y-6 animate-fade-in">
                                                                {displayItem.messages && displayItem.messages.map((msg, msgIdx) => (
                                                                    <div key={msgIdx} className={`p-4 rounded border relative transition-colors ${msg.role === 'user' ? 'bg-[#1A2332] border-[#2A3B55]' :
                                                                        msg.role === 'assistant' ? 'bg-[#1A2E26] border-[#2A4B3D]' :
                                                                            'bg-[#252525] border-[#333]'
                                                                        }`}>
                                                                        {/* Message Header */}
                                                                        <div className="flex justify-between items-center mb-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <select
                                                                                    value={msg.role || 'user'}
                                                                                    onChange={(e) => updateTempMessage(msgIdx, 'role', e.target.value)}
                                                                                    className="font-bold uppercase bg-transparent border-b border-gray-600 text-gray-300 outline-none focus:border-white pb-1"
                                                                                >
                                                                                    <option value="system">System</option>
                                                                                    <option value="user">User</option>
                                                                                    <option value="assistant">Assistant</option>
                                                                                </select>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={() => toggleTempThinking(msgIdx)}
                                                                                    className={`text-xs font-bold px-2 py-1 rounded border transition-colors ${msg.thinking !== null
                                                                                        ? 'bg-yellow-900/30 text-yellow-200 border-yellow-700'
                                                                                        : 'bg-[#333] text-gray-400 border-[#444] hover:bg-[#444]'
                                                                                        }`}
                                                                                >
                                                                                    {msg.thinking !== null ? 'Thinking: ON' : 'Thinking: OFF'}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => removeTempMessage(msgIdx)}
                                                                                    className="text-red-400 hover:text-red-300 px-2"
                                                                                >
                                                                                    ✕
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Thinking Field */}
                                                                        {msg.thinking !== null && (
                                                                            <div className="mb-3">
                                                                                <label className="block text-xs font-bold text-yellow-600/80 mb-1 uppercase tracking-wider">Thinking Process</label>
                                                                                <AutoResizeTextarea
                                                                                    value={msg.thinking || ''}
                                                                                    onChange={(e) => updateTempMessage(msgIdx, 'thinking', e.target.value)}
                                                                                    className="w-full p-3 text-sm bg-yellow-900/10 text-yellow-100 border border-yellow-900/30 rounded focus:border-yellow-700 outline-none min-h-[60px]"
                                                                                    placeholder="Add thinking process..."
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        {/* Content Field */}
                                                                        <div>
                                                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Content</label>
                                                                            <AutoResizeTextarea
                                                                                value={msg.content || ''}
                                                                                onChange={(e) => updateTempMessage(msgIdx, 'content', e.target.value)}
                                                                                className="w-full p-3 text-[15px] leading-relaxed bg-[#121212] text-gray-300 border border-[#333] rounded focus:border-white outline-none min-h-[80px]"
                                                                                placeholder="Message content..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="w-full border-dashed border-[#444] bg-transparent hover:bg-[#252525]"
                                                                    onClick={addTempMessage}
                                                                >
                                                                    + Add Message
                                                                </Button>

                                                                <div className="flex justify-end gap-3 pt-4 border-t border-[#333]">
                                                                    <Button variant="secondary" size="sm" onClick={cancelEditingItem}>Cancel</Button>
                                                                    <Button
                                                                        variant="success"
                                                                        size="sm"
                                                                        onClick={saveEditingItem}
                                                                        disabled={saving}
                                                                        className="min-w-[100px]"
                                                                    >
                                                                        {saving ? 'Saving...' : 'Save Item'}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // READ ONLY MODE
                                                            <div className="space-y-4 cursor-pointer" title="Double click to edit">
                                                                {Array.isArray(displayItem.messages) ? (
                                                                    displayItem.messages.map((msg, mIdx) => (
                                                                        <div key={mIdx} className={`p-4 rounded border ${msg.role === 'user' ? 'bg-[#1A2332] border-[#2A3B55] ml-auto w-fit max-w-[85%]' :
                                                                            msg.role === 'assistant' ? 'bg-[#1A2E26] border-[#2A4B3D] mr-auto w-fit max-w-[85%]' :
                                                                                'bg-[#252525] border-[#333] w-full'
                                                                            }`}>
                                                                            <div className="font-bold text-xs uppercase mb-2 flex justify-between text-gray-400">
                                                                                <span>{msg.role || 'unknown'}</span>
                                                                            </div>
                                                                            {msg.thinking !== null && (
                                                                                <div className="mb-3 p-3 bg-yellow-900/10 border-l-2 border-yellow-700 text-sm text-yellow-200/80 italic rounded-r">
                                                                                    <span className="font-bold not-italic text-xs text-yellow-600 block mb-1">THINKING:</span>
                                                                                    {msg.thinking || "(Empty thinking)"}
                                                                                </div>
                                                                            )}
                                                                            <div className="whitespace-pre-wrap text-gray-200 text-[15px] leading-relaxed">{msg.content || ''}</div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <pre className="whitespace-pre-wrap text-sm text-gray-400">{JSON.stringify(displayItem, null, 2)}</pre>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </Layout>
    );
}

export default DatasetViewer;
