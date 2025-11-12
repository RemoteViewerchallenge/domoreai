import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTable, useSortBy, useFilters } from 'react-table';
const API_BASE_URL = 'http://localhost:4000';
const RateLimitManagerPage = ({ provider: initialProvider, onClose }) => {
    const { providerId } = useParams();
    const [provider, setProvider] = useState(initialProvider || null);
    const [models, setModels] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (providerId) {
            const fetchProviderDetails = async () => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/llm/configurations/${providerId}`);
                    setProvider(response.data);
                    setModels(response.data.models || []);
                }
                catch (err) {
                    setError('Failed to fetch provider details.');
                    console.error(err);
                }
                finally {
                    setLoading(false);
                }
            };
            fetchProviderDetails();
        }
        else if (initialProvider) {
            setProvider(initialProvider);
            setModels(initialProvider.models || []);
            setLoading(false);
        }
    }, [providerId, initialProvider]);
    const data = useMemo(() => models, [models]);
    const handleModelChange = useCallback((modelId, field, value) => {
        setModels(currentModels => currentModels.map((m) => m.id === modelId ? { ...m, [field]: value } : m));
    }, []);
    const columns = useMemo(() => {
        if (models.length === 0) {
            return [];
        }
        // Analyze all models to find all unique keys to use as columns
        const allKeys = new Set();
        models.forEach((model) => {
            Object.keys(model).forEach(key => allKeys.add(key));
        });
        const modelKeys = Array.from(allKeys);
        // Ensure 'id' and 'is_enabled' are first if they exist
        const orderedKeys = ['id', 'is_enabled', ...modelKeys.filter(k => k !== 'id' && k !== 'is_enabled').sort()];
        return orderedKeys.map(key => {
            if (key === 'is_enabled') {
                return {
                    Header: 'Enabled',
                    accessor: 'is_enabled',
                    Cell: ({ row }) => (_jsx("input", { type: "checkbox" // checked={row.original.enabled}
                        , checked: row.original.is_enabled, onChange: (e) => handleModelChange(row.original.id, 'is_enabled', e.target.checked) })),
                };
            }
            if (key === 'id') {
                return { Header: 'Model ID', accessor: 'id' };
            }
            // Default column for other properties
            return {
                Header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                accessor: key,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Cell: ({ row }) => {
                    const modelKey = key;
                    const value = row.original[modelKey];
                    const isNumeric = typeof value === 'number' || key.includes('token') || key.includes('request') || key.includes('cost');
                    return (_jsx("input", { type: isNumeric ? 'number' : 'text', style: { width: '100%', minWidth: '80px', boxSizing: 'border-box' }, value: value ?? '', onChange: (e) => handleModelChange(row.original.id, key, isNumeric && e.target.value ? Number(e.target.value) : e.target.value), disabled: !row.original.is_enabled }));
                },
            };
        });
    }, [models, handleModelChange]);
    const handleSaveAll = async () => {
        try {
            await axios.post(`${API_BASE_URL}/llm/configurations/${providerId}/rate-limits`, { models });
            alert('All rate limits saved successfully!');
        }
        catch (error) {
            console.error('Failed to save rate limits:', error);
            alert('Failed to save rate limits. See console for details.');
        }
    };
    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow, } = useTable({ columns, data }, useFilters, useSortBy);
    if (loading) {
        return _jsx("div", { children: "Loading..." });
    }
    if (error) {
        return _jsx("div", { style: { color: 'red' }, children: error });
    }
    if (!provider) {
        return _jsx("div", { children: "Provider not found." });
    }
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-content", onClick: e => e.stopPropagation(), style: { padding: '20px', fontFamily: 'Arial, sans-serif' }, children: [_jsx(Link, { to: "/", children: "\u2190 Back to Providers" }), _jsxs("h2", { style: { marginTop: '20px' }, children: ["Rate Limit Manager for ", provider.displayName] }), _jsxs("table", { ...getTableProps(), style: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' }, children: [_jsx("thead", { children: headerGroups.map(headerGroup => (_jsx("tr", { ...headerGroup.getHeaderGroupProps(), children: headerGroup.headers.map(column => (_jsxs("th", { ...column.getHeaderProps(column.getSortByToggleProps()), style: { borderBottom: '2px solid black', padding: '8px', textAlign: 'left' }, children: [column.render('Header'), _jsx("span", { children: column.isSorted
                                                ? column.isSortedDesc
                                                    ? ' 🔽'
                                                    : ' 🔼'
                                                : '' })] }))) }))) }), _jsx("tbody", { ...getTableBodyProps(), children: rows.map(row => {
                                prepareRow(row);
                                return (_jsx("tr", { ...row.getRowProps(), children: row.cells.map(cell => (_jsx("td", { ...cell.getCellProps(), style: { borderBottom: '1px solid #ddd', padding: '8px' }, children: cell.render('Cell') }))) }));
                            }) })] }), _jsx("button", { onClick: handleSaveAll, style: { marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }, children: "Save All Changes" })] }) }));
};
export default RateLimitManagerPage;
