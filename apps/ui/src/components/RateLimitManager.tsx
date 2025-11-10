import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTable, useSortBy, type Column, type CellProps, useFilters } from 'react-table';

const API_BASE_URL = 'http://localhost:4000';

interface Provider {
    id: string;
    displayName: string;
    providerType: string;
    config: {
        apiKey: string;
        baseURL?: string;
    };
    models: any[];
}

interface RateLimitManagerPageProps {
    provider: Provider;
    onClose: () => void;
}

const RateLimitManagerPage: React.FC<RateLimitManagerPageProps> = ({ provider: initialProvider, onClose }) => {
    const { providerId } = useParams<{ providerId: string }>();
    const [provider, setProvider] = useState<Provider | null>(initialProvider);
    const [models, setModels] = useState<any[]>([]);
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
    
    const handleModelChange = (modelId: string, field: string, value: any) => {
        setModels(currentModels =>
            currentModels.map((m: any) =>
                m.id === modelId ? { ...m, [field]: value } : m
            )
        );
    };

    const columns: readonly Column<any>[] = useMemo(() => {
        if (models.length === 0) {
            return [];
        }

        // Analyze all models to find all unique keys to use as columns
        const allKeys = new Set<string>();
        models.forEach((model: any) => {
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
                    Cell: ({ row }: CellProps<any>) => (
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
                Cell: ({ row }: CellProps<any>) => {
                    const value = row.original[key];
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

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
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
            </div>
        </div>
    );
};

export default RateLimitManagerPage;
