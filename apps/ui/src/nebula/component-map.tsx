import React from "react";
import { cn } from "../lib/utils.js";
import { Button } from "@/components/ui/button.js";

import { Input } from "@/components/ui/input.js";
import { Badge } from "@/components/ui/badge.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.js";
import { Label } from "@/components/ui/label.js";
import { Slider } from "@/components/ui/slider.js";
import { Textarea } from "@/components/ui/textarea.js";
import { AiButton } from "@/components/ui/AiButton.js";
import { SuperAiButton } from "@/components/ui/SuperAiButton.js";
import { Panel } from "@/components/ui/Panel.js";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { DatabaseBrowser } from "@/components/DatabaseBrowser.js";
import XtermTerminal from "@/components/XtermTerminal.js";
import MonacoEditor from "@/components/MonacoEditor.js";
import SmartEditor from "@/components/SmartEditor.js";
import { ErrorBoundary } from "@/components/ErrorBoundary.js";
import * as Icons from "lucide-react";

// The "Nebula" wrapper for Icons to handle dynamic naming
interface DynamicIconProps {
  name?: string;
  [key: string]: unknown;
}

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const Icon =
    (Icons as unknown as Record<string, React.FC<any>>)[ // eslint-disable-line @typescript-eslint/no-explicit-any
      name || "HelpCircle"
    ] || Icons.HelpCircle;
  return <Icon {...props} />;
};

interface NebulaCompProps {
  className?: string;
  children?: React.ReactNode;
  content?: string;
  type?: string;
  [key: string]: unknown;
}

export const NebulaComponentMap: Record<string, React.ComponentType<Record<string, unknown>>> = {
  // Primitives
  Box: ({ className, children, ...props }: NebulaCompProps) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  Container: ({ className, children, ...props }: NebulaCompProps) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),

  Grid: ({
    className,
    children,
    cols = 3,
    gap = "gap-1",
    ...props
  }: NebulaCompProps & { cols?: number; gap?: string }) => (
    <div
      className={cn(
        `grid grid-cols-${cols} ${gap} border border-dashed border-slate-300/50`,
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => (
        <div className="border border-slate-200/30 min-h-[40px]">{child}</div>
      ))}
    </div>
  ),
  Mosaic: ({ className, children, ...props }: NebulaCompProps) => (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 auto-rows-auto border border-dashed border-slate-300/50",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => (
        <div className="border border-slate-200/30 min-h-[40px]">{child}</div>
      ))}
    </div>
  ),
  Text: ({ content, children, type, className, ...props }: NebulaCompProps) => {
    const Tag = type === "h1" || type === "h2" || type === "h3" ? type : "p";
    const FinalTag = Tag as keyof JSX.IntrinsicElements;
    return (
      <FinalTag className={className} {...props}>
        {content || children}
      </FinalTag>
    );
  },

  // ShadCN Components (Mapped)
  Button: Button as React.ComponentType<Record<string, unknown>>,
  Input: Input as React.ComponentType<Record<string, unknown>>,
  Badge: Badge as React.ComponentType<Record<string, unknown>>,
  ScrollArea: ScrollArea as React.ComponentType<Record<string, unknown>>,
  Label: Label as React.ComponentType<Record<string, unknown>>,
  Slider: Slider as React.ComponentType<Record<string, unknown>>,
  Textarea: Textarea as React.ComponentType<Record<string, unknown>>,

  // Tabs
  Tabs: Tabs as unknown as React.ComponentType<Record<string, unknown>>,
  TabsList: TabsList as unknown as React.ComponentType<Record<string, unknown>>,
  TabsTrigger: TabsTrigger as unknown as React.ComponentType<Record<string, unknown>>,
  TabsContent: TabsContent as unknown as React.ComponentType<Record<string, unknown>>,

  // Composites - Already defined above as imports
  // Card: Card as React.FC<any>,
  // CardHeader: CardHeader as React.FC<any>,
  // CardTitle: CardTitle as React.FC<any>,
  // CardDescription: CardDescription as React.FC<any>,
  // CardContent: CardContent as React.FC<any>,
  // CardFooter: CardFooter as React.FC<any>,

  // AI Components
  AiButton: AiButton as unknown as React.ComponentType<Record<string, unknown>>,
  SuperAiButton: SuperAiButton as unknown as React.ComponentType<Record<string, unknown>>,

  // Containers & Overlays
  Panel: Panel as unknown as React.ComponentType<Record<string, unknown>>,
  Dialog: Dialog as unknown as React.ComponentType<Record<string, unknown>>,
  DialogTrigger: DialogTrigger as unknown as React.ComponentType<Record<string, unknown>>,
  DialogContent: DialogContent as unknown as React.ComponentType<Record<string, unknown>>,
  DialogHeader: DialogHeader as unknown as React.ComponentType<Record<string, unknown>>,
  DialogTitle: DialogTitle as unknown as React.ComponentType<Record<string, unknown>>,

  // FlyonUI (Base Mappings)
  btn: ({ className, type, ...props }: NebulaCompProps) => (
    <button
      type={(type as "button" | "submit" | "reset") || "button"}
      className={cn("btn", className)}
      {...props}
    />
  ),
  card: ({ className, ...props }: NebulaCompProps) => (
    <div className={cn("card", className)} {...props} />
  ),
  stat: ({ className, ...props }: NebulaCompProps) => (
    <div className={cn("stat", className)} {...props} />
  ),
  alert: ({ className, ...props }: NebulaCompProps) => (
    <div className={cn("alert", className)} {...props} />
  ),
  modal: ({ className, ...props }: NebulaCompProps) => (
    <div className={cn("modal", className)} {...props} />
  ),

  // System Components (Black Box Features)
  DatabaseBrowser: DatabaseBrowser as React.ComponentType<Record<string, unknown>>,
  XtermTerminal: (props: Record<string, unknown>) => (
    <XtermTerminal logs={[]} onInput={() => {}} {...props} />
  ),
  MonacoEditor: (props: Record<string, unknown>) => (
    <MonacoEditor value="" onChange={() => {}} {...props} />
  ),
  TipTapEditor: (props: Record<string, unknown>) => (
    <SmartEditor
      fileName="document.md"
      content=""
      onChange={() => {}}
      {...props}
    />
  ),
  ErrorBoundary: ErrorBoundary as unknown as React.ComponentType<Record<string, unknown>>,

  // Special
  Icon: DynamicIcon as unknown as React.ComponentType<Record<string, unknown>>,
  Image: ({ src, alt, className, ...props }: Record<string, unknown>) => (
    <img src={src as string} alt={alt as string} className={className as string} {...props} />
  ),
};
