import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';

export interface JSpreadsheetHandle {
  getInstance: () => unknown;
  wrapper: HTMLDivElement | null;
}

interface JSpreadsheetWrapperProps {
  options: Record<string, unknown>;
  className?: string;
}

const JSpreadsheetWrapper = forwardRef<JSpreadsheetHandle, JSpreadsheetWrapperProps>(
  ({ options, className }, ref) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<unknown>(null);

    useImperativeHandle(ref, () => ({
      getInstance: () => instanceRef.current,
      wrapper: wrapperRef.current,
    }));

    useEffect(() => {
      if (!wrapperRef.current) return;

      // Initialize JSpreadsheet
      const config = {
        ...options,
        // Ensure we don't have conflicting CSS
        // style: { ...options.style }, 
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instanceRef.current = jspreadsheet(wrapperRef.current, config as any);

      const elementToClean = wrapperRef.current;
      // Cleanup on unmount
      return () => {
        if (instanceRef.current && elementToClean) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jspreadsheet.destroy(elementToClean as any, true);
            instanceRef.current = null;
        }
        if (elementToClean) {
            elementToClean.innerHTML = '';
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options]); // Re-initialize if options change significantly (be careful with object identity)

    return <div ref={wrapperRef} className={`jspreadsheet-container ${className || ''}`} />;
  }
);

JSpreadsheetWrapper.displayName = 'JSpreadsheetWrapper';

export default JSpreadsheetWrapper;
