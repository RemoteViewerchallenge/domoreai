import React from 'react';
import { cn } from '../lib/utils.js';
import { Button } from '@/components/ui/button.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.js';
import { Input } from '@/components/ui/input.js';
import { Badge } from '@/components/ui/badge.js';
import { ScrollArea } from '@/components/ui/scroll-area.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Label } from '@/components/ui/label.js';
import { Slider } from '@/components/ui/slider.js';
import { Textarea } from '@/components/ui/textarea.js';
import { AiButton } from '@/components/ui/AiButton.js';
import { SuperAiButton } from '@/components/ui/SuperAiButton.js';
import { Panel } from '@/components/ui/Panel.js';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.js';
import { DatabaseBrowser } from '@/components/DatabaseBrowser.js';
import XtermTerminal from '@/components/XtermTerminal.js';
import MonacoEditor from '@/components/MonacoEditor.js';
import { ErrorBoundary } from '@/components/ErrorBoundary.js';
import * as Icons from 'lucide-react';

// The "Nebula" wrapper for Icons to handle dynamic naming
interface DynamicIconProps {
  name: string;
  [key: string]: unknown;
}

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const Icon = (Icons as unknown as Record<string, React.FC<DynamicIconProps>>)[name] || Icons.HelpCircle;
  return <Icon name={name} {...props} />;
};

interface NebulaCompProps {
  className?: string;
  children?: React.ReactNode;
  content?: string;
  type?: string;
  [key: string]: unknown;
}

export const NebulaComponentMap: Record<string, React.FC<any>> = {
  // Primitives
  Box: ({ className, children, ...props }: NebulaCompProps) => <div className={className} {...props}>{children}</div>,
  Text: ({ content, children, type, className, ...props }: NebulaCompProps) => {
      const Tag = (type === 'h1' || type === 'h2' || type === 'h3') ? type : 'p';
      const FinalTag = Tag as keyof JSX.IntrinsicElements;
      return <FinalTag className={className} {...props}>{content || children}</FinalTag>;
  },
  
  // ShadCN Components (Mapped)
  Button: Button as React.FC<any>,
  Input: Input as React.FC<any>,
  Badge: Badge as React.FC<any>,
  ScrollArea: ScrollArea as React.FC<any>,
  Label: Label as React.FC<any>,
  Slider: Slider as React.FC<any>,
  Textarea: Textarea as React.FC<any>,
  
  // Tabs
  Tabs: Tabs as React.FC<any>,
  TabsList: TabsList as React.FC<any>,
  TabsTrigger: TabsTrigger as React.FC<any>,
  TabsContent: TabsContent as React.FC<any>,
  
  // Composites
  Card: Card as React.FC<any>,
  CardHeader: CardHeader as React.FC<any>,
  CardTitle: CardTitle as React.FC<any>,
  CardDescription: CardDescription as React.FC<any>,
  CardContent: CardContent as React.FC<any>,
  CardFooter: CardFooter as React.FC<any>,
  
  // AI Components
  AiButton: AiButton as React.FC<any>,
  SuperAiButton: SuperAiButton as React.FC<any>,
  
  // Containers & Overlays
  Panel: Panel as React.FC<any>,
  Dialog: Dialog as React.FC<any>,
  DialogTrigger: DialogTrigger as React.FC<any>,
  DialogContent: DialogContent as React.FC<any>,
  DialogHeader: DialogHeader as React.FC<any>,
  DialogTitle: DialogTitle as React.FC<any>,
  
  // FlyonUI (Base Mappings)
  btn: ({ className, type, ...props }: NebulaCompProps) => <button type={(type as 'button' | 'submit' | 'reset') || 'button'} className={cn('btn', className)} {...props} />,
  card: ({ className, ...props }: NebulaCompProps) => <div className={cn('card', className)} {...props} />,
  stat: ({ className, ...props }: NebulaCompProps) => <div className={cn('stat', className)} {...props} />,
  alert: ({ className, ...props }: NebulaCompProps) => <div className={cn('alert', className)} {...props} />,
  modal: ({ className, ...props }: NebulaCompProps) => <div className={cn('modal', className)} {...props} />,
  
  // System Components (Black Box Features)
  DatabaseBrowser: DatabaseBrowser as React.FC<any>,
  XtermTerminal: (props: any) => <XtermTerminal logs={[]} onInput={() => {}} {...props} />,
  MonacoEditor: (props: any) => <MonacoEditor content="" onChange={() => {}} {...props} />,
  ErrorBoundary: ErrorBoundary as unknown as React.FC<any>,
  
  // Special
  Icon: DynamicIcon,
};
