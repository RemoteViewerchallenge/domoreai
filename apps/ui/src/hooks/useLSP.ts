import { useState, useEffect, useCallback } from 'react';
// import { trpc } from '../utils/trpc'; // Unused in this mock version but good to have prepared

export interface Diagnostic {
  message: string;
  line: number;
  severity: 'error' | 'warning';
}

export const useLSP = (filePath: string, content: string) => {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [imports, setImports] = useState<string[]>([]);
  
  // Mock LSP Check (Replace with trpc.lsp.validate later)
  const validate = useCallback((code: string) => {
    // Log filePath to silence unused variable warning and simulate usage
    // console.log(`Validating ${filePath}`); 
    
    // Actually, let's just ignore it for now or rely on the fact that we might use it later.
    // To silence the linter strictly:
    void filePath; 

    const errors: Diagnostic[] = [];
    const foundImports: string[] = [];
    
    if (!code) return;

    const lines = code.split('\n');
    lines.forEach((line, i) => {
      // 1. Detect Imports
      if (line.trim().startsWith('import ')) {
        const match = line.match(/from ['"](.+)['"]/);
        if (match) foundImports.push(match[1]);
        
        // 2. Mock "Missing Import" logic for demo
        if (line.includes('./missing-file')) {
          errors.push({ 
            message: 'Module not found: ./missing-file', 
            line: i + 1, 
            severity: 'error' 
          });
        }
      }
    });

    setDiagnostics(errors);
    setImports(foundImports);
  }, [filePath]);

  // Debounce validation
  useEffect(() => {
    const timer = setTimeout(() => {
      validate(content);
    }, 500);
    return () => clearTimeout(timer);
  }, [content, validate]);

  return { diagnostics, imports };
};
