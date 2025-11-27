export interface VFile {
  path: string;
  content?: string;
  type: 'file' | 'directory';
  children?: VFile[];
}

export type FileSystemProviderType = 'local' | 'ssh';
