# 🛠️ DOMORE.OS CODE RULES (Technical Standards)

## 1. Tech Stack (Strict Enforcement)
* **Framework:** React (Vite) + TypeScript.
* **Styling:** Tailwind CSS + **FlyonUI**.
    * *Rule:* Before writing custom CSS, check `node_modules/flyonui`. Use the component if it exists.
    * *Colors:* NEVER use hex codes (e.g., `#000`). ALWAYS use semantic variables: `bg-background`, `text-primary`, `border-neon-blue`.
* **State:** React Context for UI state. tRPC for Backend communication.

## 2. Component Architecture
* **The "SuperNode" Pattern:**
    * All major components must handle a "Frozen" (Idle) state and a "Thawed" (Active) state.
    * *Idle:* Render a lightweight `<div>` or Image.
    * *Active:* Render the heavy `MonacoEditor` or `DataGrid`.
* **The "AiButton" Standard:**
    * Every major interactive component (Editor, Terminal, Browser) MUST have a `<SuperAiButton contextId="..." />` embedded in its header.

## 3. File Structure
* `apps/ui/src/pages/`: Only for top-level Layout definitions (e.g., `FocusWorkspace.tsx`).
* `apps/ui/src/features/`: Feature-specific logic (e.g., `volcano/`, `creator-studio/`).
* `apps/ui/src/components/ui/`: Reusable primitives (Buttons, Inputs).

## 4. Coding Style
* **Comments:** Do not comment obvious code. Comment *why* a complex decision was made.
* **Exports:** Use Named Exports (`export const Foo = ...`), not Default Exports.
* **Icons:** Use `lucide-react`.
