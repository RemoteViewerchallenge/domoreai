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

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
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
            </div>
        </div>
    );
};

export default RateLimitManager;
