import { Layout } from 'react-grid-layout';

export interface Model {
  id: string;
  is_enabled: boolean;
  [key: string]: any; // Allow other properties
}

export type PageType = 'VFS' | 'TERMINAL' | 'SPREADSHEET';

export interface Page {
  id: string;
  type: PageType;
  title: string;
}