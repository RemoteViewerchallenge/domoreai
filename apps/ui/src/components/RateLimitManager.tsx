<<<<<<< HEAD
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTable, useSortBy, type Column, type CellProps, useFilters } from 'react-table';
import type { Model } from '../types';

const API_BASE_URL = 'http://localhost:4000';

interface Provider {
    id: string;
    displayName: string;
    providerType: string;
    config: {
        apiKey: string;
        baseURL?: string;
    };
    models: Model[];
}

interface RateLimitManagerPageProps {
    provider?: Provider | null;
    onClose: () => void;
}

/**
 * A component for managing rate limits for a specific LLM provider.
 * It displays a table of models for the provider, allowing the user to enable/disable models
 * and configure rate limit settings.
 * @param {RateLimitManagerPageProps} props - The component props.
 * @param {Provider | null} [props.provider] - The initial provider data.
 * @param {() => void} props.onClose - A function to call when the manager is closed.
 * @returns {JSX.Element} The rendered rate limit manager page.
 */
const RateLimitManagerPage: React.FC<RateLimitManagerPageProps> = ({ provider: initialProvider, onClose }) => {
    const { providerId } = useParams<{ providerId: string }>();
    const [provider, setProvider] = useState<Provider | null>(initialProvider || null);
    const [models, setModels] = useState<Model[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (providerId) {
            const fetchProviderDetails = async () => {
                try {
                    const response = await axios.get<Provider>(`${API_BASE_URL}/llm/configurations/${providerId}`);
                    setProvider(response.data);
                    setModels(response.data.models || []);
                } catch (err) {
                    setError('Failed to fetch provider details.');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProviderDetails();
        } else if (initialProvider) {
            setProvider(initialProvider);
            setModels(initialProvider.models || []);
            setLoading(false);
        }
    }, [providerId, initialProvider]);

    const data = useMemo(() => models, [models]);
    
    const handleModelChange = useCallback((modelId: string, field: string, value: string | number | boolean) => {
        setModels(currentModels =>
            currentModels.map((m: Model) =>
                m.id === modelId ? { ...m, [field]: value } : m
            )
        );
    }, []);

    const columns: readonly Column<Model>[] = useMemo(() => {
        if (models.length === 0) {
            return [];
        }

        // Analyze all models to find all unique keys to use as columns
        const allKeys = new Set<string>();
        models.forEach((model: Model) => {
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
                    Cell: ({ row }: CellProps<Model>) => (
                        <input
                            type="checkbox" // checked={row.original.enabled}
                            checked={row.original.is_enabled}
                            onChange={(e) => handleModelChange(row.original.id, 'is_enabled', e.target.checked)}
                        />
                    ),
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
                Cell: ({ row }: CellProps<Model>) => {
                    const modelKey = key as keyof Model;
                    const value = row.original[modelKey];
                    const isNumeric = typeof value === 'number' || key.includes('token') || key.includes('request') || key.includes('cost');
                    return (
                        <input
                            type={isNumeric ? 'number' : 'text'}
                            style={{ width: '100%', minWidth: '80px', boxSizing: 'border-box' }}
                            value={value ?? ''}
                            onChange={(e) => handleModelChange(row.original.id, key, isNumeric && e.target.value ? Number(e.target.value) : e.target.value)}
                            disabled={!row.original.is_enabled}
                        />
                    );
                },
            };
        });
    }, [models, handleModelChange]);

    const handleSaveAll = async () => {
        try {
            await axios.post(`${API_BASE_URL}/llm/configurations/${providerId}/rate-limits`, { models });
            alert('All rate limits saved successfully!');
        } catch (error) {
            console.error('Failed to save rate limits:', error);
            alert('Failed to save rate limits. See console for details.');
        }
    };
=======
import React, { useMemo, useState, useEffect } from 'react';
import { useTable, useSortBy, useFilters } from 'react-table';
import axios from 'axios';
import './RateLimitManager.css';

const RateLimitManager = ({ provider, onClose }) => {
    const [models, setModels] = useState([]);
    const [editingModel, setEditingModel] = useState(null);

    useEffect(() => {
        // Fetch models for the selected provider
        axios.get(`/llm/configurations/${provider.id}`)
            .then(response => {
                setModels(response.data.models);
            })
            .catch(error => {
                console.error('Error fetching models:', error);
            });
    }, [provider]);

    const columns = useMemo(
        () => [
            {
                Header: 'Model Name',
                accessor: row => {
                    if (provider.providerType === 'openai' || provider.providerType === 'mistral') {
                        return row.model_id;
                    }
                    return row.name;
                },
            },
            {
                Header: 'RPM',
                accessor: 'rpm',
                Cell: ({ row }) => (
                    <input
                        type="number"
                        value={row.original.rpm || ''}
                        onChange={(e) => handleInputChange(e, row.original, 'rpm')}
                    />
                ),
            },
            {
                Header: 'TPM',
                accessor: 'tpm',
                Cell: ({ row }) => (
                    <input
                        type="number"
                        value={row.original.tpm || ''}
                        onChange={(e) => handleInputChange(e, row.original, 'tpm')}
                    />
                ),
            },
            {
                Header: 'RPD',
                accessor: 'rpd',
                Cell: ({ row }) => (
                    <input
                        type="number"
                        value={row.original.rpd || ''}
                        onChange={(e) => handleInputChange(e, row.original, 'rpd')}
                    />
                ),
            },
            {
                Header: 'Enabled',
                accessor: 'is_enabled',
                Cell: ({ row }) => (
                    <input
                        type="checkbox"
                        checked={row.original.is_enabled}
                        onChange={() => handleToggleEnabled(row.original)}
                    />
                ),
            },
            {
                Header: 'Actions',
                Cell: ({ row }) => (
                    <button onClick={() => handleSave(row.original)}>Save</button>
                ),
            },
        ],
        [provider]
    );
>>>>>>> feature-rate-limiter

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
<<<<<<< HEAD
    } = useTable({ columns, data }, useFilters, useSortBy);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }

    if (!provider) {
        return <div>Provider not found.</div>;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <Link to="/">&larr; Back to Providers</Link>
            <h2 style={{ marginTop: '20px' }}>Rate Limit Manager for {provider.displayName}</h2>
            <table {...getTableProps()} style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <thead>
                    {headerGroups.map(headerGroup => (
                        <tr {...headerGroup.getHeaderGroupProps()} >
                            {headerGroup.headers.map(column => (
                                <th {...column.getHeaderProps((column as any).getSortByToggleProps())} style={{ borderBottom: '2px solid black', padding: '8px', textAlign: 'left' }}>
                                    {column.render('Header')}
                                    <span>
                                        {(column as any).isSorted
                                            ? (column as any).isSortedDesc
                                                ? ' 🔽'
                                                : ' 🔼'
                                            : ''}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody {...getTableBodyProps()}>
                    {rows.map(row => {
                        prepareRow(row);
                        return (
                            <tr {...row.getRowProps()}>
                                {row.cells.map(cell => (
                                    <td {...cell.getCellProps()} style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>
                                        {cell.render('Cell')}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <button onClick={handleSaveAll} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
                Save All Changes
            </button>
=======
    } = useTable({ columns, data: models }, useFilters, useSortBy);

    const handleInputChange = (e, model, field) => {
        const updatedModel = { ...model, [field]: e.target.value };
        setModels(models.map(m => m.id === model.id ? updatedModel : m));
    };

    const handleToggleEnabled = (model) => {
        const updatedModel = { ...model, is_enabled: !model.is_enabled };
        setModels(models.map(m => m.id === model.id ? updatedModel : m));
    };

    const handleSave = (model) => {
        axios.put(`/llm/models/${model.id}`, {
            providerType: provider.providerType,
            rpm: model.rpm,
            tpm: model.tpm,
            rpd: model.rpd,
            is_enabled: model.is_enabled,
        })
        .then(() => {
            alert('Model updated successfully');
        })
        .catch(error => {
            console.error('Error updating model:', error);
            alert('Error updating model');
        });
    };

    return (
        <div className="rate-limit-manager-modal">
            <div className="rate-limit-manager-content">
                <h2>{provider.displayName} Rate Limits</h2>
                <button onClick={onClose} className="close-button">Close</button>
                <table {...getTableProps()}>
                    <thead>
                        {headerGroups.map(headerGroup => (
                            <tr {...headerGroup.getHeaderGroupProps()}>
                                {headerGroup.headers.map(column => (
                                    <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                                        {column.render('Header')}
                                        <span>
                                            {column.isSorted
                                                ? column.isSortedDesc
                                                    ? ' 🔽'
                                                    : ' 🔼'
                                                : ''}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody {...getTableBodyProps()}>
                        {rows.map(row => {
                            prepareRow(row);
                            return (
                                <tr {...row.getRowProps()}>
                                    {row.cells.map(cell => (
                                        <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
>>>>>>> feature-rate-limiter
            </div>
        </div>
    );
};

<<<<<<< HEAD
export default RateLimitManagerPage;
=======
export default RateLimitManager;
>>>>>>> feature-rate-limiter
