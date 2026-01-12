import { Activity, Code } from 'lucide-react';

/**
 * This is the DNA of your application.
 * It defines the Navigation and the Views purely as data.
 */
export const SYSTEM_LAYOUT = {
  id: "root-shell",
  type: "Flex",
  props: { 
    direction: "column", 
    h: "100vh", 
    w: "100vw", 
    bg: "var(--colors-background)",
    overflow: "hidden"
  },
  children: [
    // 1. TOP NAVIGATION (Data-Driven)
    {
      type: "UnifiedMenuBar",
      props: {
        items: [
          { label: "Workbench", icon: "Activity", actionId: "nav-workbench", isActive: true },
          { label: "Nebula Creator", icon: "Code", actionId: "nav-creator", isActive: false }
        ]
      }
    },
    // 2. MAIN CONTENT AREA
    {
      type: "Box",
      props: { 
        flex: "1", 
        position: "relative",
        overflow: "hidden" 
      },
      children: [
        // The View Switcher logic will handle rendering strictly one of these
        { type: "AgentWorkbench", id: "view-workbench" },
        { type: "NebulaCreator", id: "view-creator" }
      ]
    },
    // 3. FLOATING NAVIGATION (Data-Driven)
    {
      type: "FloatingNavigation",
      props: {
        items: [
          { label: "Workbench", icon: "Activity", actionId: "nav-workbench" },
          { label: "Nebula Creator", icon: "Code", actionId: "nav-creator" }
        ]
      }
    }
  ]
};
