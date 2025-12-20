export interface ComponentCategory {
  name: string;
  components: string[];
}

export const ComponentLibrary: ComponentCategory[] = [
  {
    name: "Nebula Primitives",
    components: ["Box", "Container", "Grid", "Mosaic", "Text", "Icon", "Image"]
  },
  {
    name: "FlyonUI Components",
    components: [
      "btn", "card", "stat", "alert", "modal", "badge", "input", "textarea", 
      "checkbox", "toggle", "range", "dropdown", "navbar", "footer", "hero"
    ]
  },
  {
    name: "App Components",
    components: [
      "RoleCreatorPanel", "SwappableCard", "CompactRoleSelector", "ThemeEditorPanel",
      "DatabaseBrowser", "MonacoEditor", "XtermTerminal", "TipTapEditor"
    ]
  },
  {
    name: "AI & Intelligence",
    components: ["AiButton", "SuperAiButton"]
  }
];
