export interface VFile {
  path: string;
  content?: string;
  type: 'file' | 'dir';
  children?: VFile[];
}

export type FileSystemProviderType = 'local' | 'ssh';
