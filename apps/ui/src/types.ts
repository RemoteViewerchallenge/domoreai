export interface Model {
  id: string;
  is_enabled: boolean;
  [key: string]: unknown; // Allow other properties
}