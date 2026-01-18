/**
 * Headless UI Schema Types
 * Define the structure for JSON-driven UI components
 */

// Field types for forms
export type FieldType = 
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'json';

// Field definition
export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string | number }[]; // For select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Form schema
export interface FormSchema {
  type: 'form';
  title: string;
  description?: string;
  table: string; // The Basetool table this form operates on
  fields: FieldSchema[];
  submitLabel?: string;
  cancelLabel?: string;
  mode?: 'create' | 'edit';
  recordId?: string; // For edit mode
}

// Column definition for tables
export interface ColumnSchema {
  name: string;
  label: string;
  type: FieldType;
  sortable?: boolean;
  filterable?: boolean;
  width?: number | string;
  render?: 'text' | 'badge' | 'date' | 'boolean' | 'json'; // How to render the value
}

// Table schema
export interface TableSchema {
  type: 'table';
  title: string;
  description?: string;
  table: string; // The Basetool table to query
  columns: ColumnSchema[];
  actions?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    view?: boolean;
    custom?: {
      label: string;
      action: string; // Action identifier
      icon?: string;
    }[];
  };
  pagination?: {
    enabled: boolean;
    pageSize: number;
  };
  filters?: {
    enabled: boolean;
    fields: string[]; // Which fields can be filtered
  };
  sorting?: {
    enabled: boolean;
    defaultField?: string;
    defaultDirection?: 'asc' | 'desc';
  };
}

// Detail view schema
export interface DetailViewSchema {
  type: 'detail';
  title: string;
  description?: string;
  table: string;
  recordId: string;
  sections: {
    title: string;
    fields: {
      name: string;
      label: string;
      type: FieldType;
      render?: 'text' | 'badge' | 'date' | 'boolean' | 'json';
    }[];
  }[];
  actions?: {
    edit?: boolean;
    delete?: boolean;
    custom?: {
      label: string;
      action: string;
      icon?: string;
    }[];
  };
}

// Page schema - union of all schema types
export type PageSchema = FormSchema | TableSchema | DetailViewSchema;

// Page metadata
export interface PageMetadata {
  id: string;
  name: string;
  path: string;
  schema: PageSchema;
  createdAt?: string;
  updatedAt?: string;
}

// Schema validator result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a page schema
 */
export function validatePageSchema(schema: unknown): ValidationResult {
  const errors: string[] = [];

  if (!schema || typeof schema !== 'object') {
    errors.push('Schema must be an object');
    return { valid: false, errors };
  }

  const s = schema as Record<string, unknown>;

  // Check for required type field
  if (!s.type || typeof s.type !== 'string') {
    errors.push('Schema must have a type field');
  } else if (!['form', 'table', 'detail'].includes(s.type as string)) {
    errors.push('Schema type must be one of: form, table, detail');
  }

  // Check for required title
  if (!s.title || typeof s.title !== 'string') {
    errors.push('Schema must have a title');
  }

  // Check for required table
  if (!s.table || typeof s.table !== 'string') {
    errors.push('Schema must have a table name');
  }

  // Type-specific validation
  if (s.type === 'form') {
    if (!Array.isArray(s.fields)) {
      errors.push('Form schema must have a fields array');
    }
  } else if (s.type === 'table') {
    if (!Array.isArray(s.columns)) {
      errors.push('Table schema must have a columns array');
    }
  } else if (s.type === 'detail') {
    if (!s.recordId || typeof s.recordId !== 'string') {
      errors.push('Detail schema must have a recordId');
    }
    if (!Array.isArray(s.sections)) {
      errors.push('Detail schema must have a sections array');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
