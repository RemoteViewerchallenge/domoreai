import React from 'react';
import { PageType } from '../../types';
import VFS from '../pages/VFS';
import Terminal from '../pages/Terminal';
import Spreadsheet from '../pages/Spreadsheet';

const PAGE_REGISTRY: { [key in PageType]: React.FC } = {
  VFS,
  TERMINAL: Terminal,
  SPREADSHEET: Spreadsheet,
};

interface PageRendererProps {
  pageType: PageType;
}

const PageRenderer: React.FC<PageRendererProps> = ({ pageType }) => {
  const Component = PAGE_REGISTRY[pageType];
  return Component ? <Component /> : null;
};

export default PageRenderer;
