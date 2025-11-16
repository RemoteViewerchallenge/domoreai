export interface Model {
  id: string;
  is_enabled: boolean;
  [key: string]: any; // Allow other properties
}