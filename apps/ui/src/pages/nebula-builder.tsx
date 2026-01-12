
import { ThemeManager } from '../components/nebula/ThemeManager.js';

export default function NebulaBuilderPage() {
  return (
    <div className="h-full w-full p-6 bg-[var(--colors-background-secondary)]">
      <div className="max-w-7xl mx-auto h-full grid grid-cols-1 gap-6">
         {/* Render the Theme Manager so the user can edit the UI in real-time */}
         <ThemeManager />
      </div>
    </div>
  );
}
