import React, { useState } from 'react';
import { FormSchema, FieldSchema } from '../schemas/types';
import { trpc } from '../utils/trpc';

interface HeadlessFormProps {
  schema: FormSchema;
  onSubmit?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  initialData?: Record<string, unknown>;
}

/**
 * HeadlessForm - A dynamic form component driven entirely by JSON schema
 * No coupling to entity schemas - completely data-driven
 */
export const HeadlessForm: React.FC<HeadlessFormProps> = ({
  schema,
  onSubmit,
  onCancel,
  initialData = {}
}) => {
  const [values, setValues] = useState<Record<string, unknown>>(
    initialData || schema.fields.reduce((acc, field) => {
      if (field.defaultValue !== undefined) {
        acc[field.name] = field.defaultValue;
      }
      return acc;
    }, {} as Record<string, unknown>)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC mutations
  const createMutation = trpc.basetool.createRow.useMutation();
  const updateMutation = trpc.basetool.updateRow.useMutation();

  const handleChange = (fieldName: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user types
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateField = (field: FieldSchema, value: unknown): string | null => {
    // Required validation
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} is required`;
    }

    // Type-specific validation
    if (value !== undefined && value !== null && value !== '') {
      if (field.type === 'email' && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
      }

      if (field.type === 'number' && typeof value !== 'number') {
        return 'Please enter a valid number';
      }

      // Custom pattern validation
      if (field.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return field.validation.message || 'Invalid format';
        }
      }

      // Min/max validation for numbers
      if (field.type === 'number' && typeof value === 'number') {
        if (field.validation?.min !== undefined && value < field.validation.min) {
          return `Value must be at least ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && value > field.validation.max) {
          return `Value must be at most ${field.validation.max}`;
        }
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    for (const field of schema.fields) {
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (schema.mode === 'edit' && schema.recordId) {
        // Update existing record
        await updateMutation.mutateAsync({
          tableName: schema.table,
          rowId: schema.recordId,
          values
        });
      } else {
        // Create new record
        await createMutation.mutateAsync({
          tableName: schema.table,
          values
        });
      }

      if (onSubmit) {
        onSubmit(values);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ _form: 'Failed to submit form. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FieldSchema) => {
    const value = values[field.name];
    const error = errors[field.name];

    const commonProps = {
      id: field.name,
      name: field.name,
      disabled: isSubmitting,
      className: `w-full px-3 py-2 border rounded-md ${
        error ? 'border-red-500' : 'border-gray-300'
      } focus:outline-none focus:ring-2 focus:ring-blue-500`
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <input
            {...commonProps}
            type={field.type}
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            value={(value as number) || ''}
            onChange={(e) => handleChange(field.name, parseFloat(e.target.value))}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'boolean':
        return (
          <input
            type="checkbox"
            id={field.name}
            name={field.name}
            checked={(value as boolean) || false}
            onChange={(e) => handleChange(field.name, e.target.checked)}
            disabled={isSubmitting}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            {...commonProps}
            type="date"
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
          />
        );

      case 'datetime':
        return (
          <input
            {...commonProps}
            type="datetime-local"
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
          />
        );

      case 'json':
        return (
          <textarea
            {...commonProps}
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange(field.name, parsed);
              } catch {
                // Allow invalid JSON during editing
                handleChange(field.name, e.target.value);
              }
            }}
            rows={6}
            placeholder={field.placeholder || '{}'}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{schema.title}</h2>
        {schema.description && (
          <p className="mt-2 text-sm text-gray-600">{schema.description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {schema.fields.map((field) => (
          <div key={field.name}>
            <label
              htmlFor={field.name}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
            {field.description && (
              <p className="mt-1 text-sm text-gray-500">{field.description}</p>
            )}
            {errors[field.name] && (
              <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
            )}
          </div>
        ))}

        {errors._form && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors._form}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : (schema.submitLabel || 'Submit')}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {schema.cancelLabel || 'Cancel'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
