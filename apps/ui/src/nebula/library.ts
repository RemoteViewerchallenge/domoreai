export interface ComponentCategory {
  name: string;
  components: string[];
}

export const ComponentLibrary: ComponentCategory[] = [
  {
    name: "Standard UI (Shadcn)",
    components: [
      "Button", "Input", "Textarea", "Badge", "Slider", "Label", "ScrollArea", 
      "Card", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter",
      "Tabs", "TabsList", "TabsTrigger", "TabsContent"
    ]
  },
  {
    name: "FlyonUI / Daisy",
    components: [
      "btn", "card", "stat", "alert", "modal", "badge", "input", "textarea", "checkbox", "toggle", "range"
    ]
  },
  {
    name: "Nebula Primitives",
    components: ["Box", "Text", "Icon", "Image"]
  },
  {
    name: "AI & Intelligence",
    components: ["AiButton", "SuperAiButton", "AiActionTrigger"]
  },
  {
    name: "System Components",
    components: ["Panel", "ErrorBoundary", "MonacoEditor", "XtermTerminal", "DatabaseBrowser"]
  }
];
