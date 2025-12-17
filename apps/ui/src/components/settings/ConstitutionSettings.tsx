import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, BookOpen, Scale } from 'lucide-react';
import { trpc } from '../../utils/trpc';

interface GlossaryEntry {
  key: string;
  value: string;
}

/**
 * Parse a markdown table from GLOSSARY.md into key-value pairs
 */
function parseGlossaryMarkdown(markdown: string): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    // Skip header lines and separator lines
    if (line.startsWith('|') && !line.includes('---') && !line.includes('Term')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2) {
        const key = parts[0].replace(/\*\*/g, ''); // Remove markdown bold
        const value = parts[1].replace(/\*\*/g, '');
        if (key && value) {
          entries.push({ key, value });
        }
      }
    }
  }
  
  return entries;
}

export function ConstitutionSettings() {
  const [codeRules, setCodeRules] = useState('');
  const [glossaryEntries, setGlossaryEntries] = useState<GlossaryEntry[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Fetch constitution settings on mount
  useEffect(() => {
    const fetchConstitution = async () => {
      try {
        // TODO: Get actual workspace ID from context/state
        const mockWorkspaceId = 'default-workspace';
        setWorkspaceId(mockWorkspaceId);
        
        // Load default values from Constitution files
        // These will be overridden if database has values
        try {
          // Load CODE_RULES.md as default codeRules
          const codeRulesResponse = await fetch('/docs/CODE_RULES.md');
          if (codeRulesResponse.ok) {
            const codeRulesText = await codeRulesResponse.text();
            setCodeRules(codeRulesText);
          }
        } catch (e) {
          console.warn('Could not load CODE_RULES.md, using empty default');
        }

        // Load GLOSSARY.md and parse into key-value pairs
        try {
          const glossaryResponse = await fetch('/docs/GLOSSARY.md');
          if (glossaryResponse.ok) {
            const glossaryText = await glossaryResponse.text();
            // Parse markdown table into entries
            const entries = parseGlossaryMarkdown(glossaryText);
            setGlossaryEntries(entries);
          }
        } catch (e) {
          console.warn('Could not load GLOSSARY.md, using empty default');
        }
        
        // Uncomment when API is ready to override with database values:
        // const data = await trpc.project.getConstitution.query({ workspaceId: mockWorkspaceId });
        // if (data.codeRules) setCodeRules(data.codeRules);
        // if (data.glossary) {
        //   const entries = Object.entries(data.glossary).map(([key, value]) => ({ key, value: value as string }));
        //   setGlossaryEntries(entries);
        // }
      } catch (error) {
        console.error('Failed to fetch constitution:', error);
      }
    };

    fetchConstitution();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const glossary = glossaryEntries.reduce((acc, entry) => {
        if (entry.key.trim()) {
          acc[entry.key] = entry.value;
        }
        return acc;
      }, {} as Record<string, string>);

      // Uncomment when API is ready:
      // await trpc.project.updateConstitution.mutate({
      //   workspaceId,
      //   codeRules,
      //   glossary,
      // });

      setSaveMessage('✓ Constitution saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('✗ Failed to save constitution');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addGlossaryEntry = () => {
    setGlossaryEntries([...glossaryEntries, { key: '', value: '' }]);
  };

  const updateGlossaryEntry = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...glossaryEntries];
    updated[index][field] = value;
    setGlossaryEntries(updated);
  };

  const deleteGlossaryEntry = (index: number) => {
    setGlossaryEntries(glossaryEntries.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-primary)] uppercase tracking-wider flex items-center gap-2">
            <Scale size={20} />
            Constitution - Global Agent Rules
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Define code rules and terminology that will be injected into EVERY agent's system prompt
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-black rounded text-xs font-bold uppercase shadow-[var(--glow-primary)] transition-all disabled:opacity-50"
        >
          <Save size={14} />
          {isSaving ? 'Saving...' : 'Save Constitution'}
        </button>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded border ${
          saveMessage.includes('✓') 
            ? 'bg-green-500/10 border-green-500/50 text-green-400' 
            : 'bg-red-500/10 border-red-500/50 text-red-400'
        } text-xs font-bold`}>
          {saveMessage}
        </div>
      )}

      {/* Code Rules Section */}
      <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={16} className="text-[var(--color-primary)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase">Code Rules (The Law)</h3>
        </div>
        <p className="text-[10px] text-[var(--color-text-secondary)] mb-3">
          Define strict coding conventions and rules that all agents MUST follow. Examples:
          <br />• "Always use FlyonUI components, never raw Tailwind"
          <br />• "No Git Diffs - Always use feature branches"
          <br />• "Prefer functional components over class components"
        </p>
        <textarea
          value={codeRules}
          onChange={(e) => setCodeRules(e.target.value)}
          className="w-full h-64 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded font-mono text-xs focus:border-[var(--color-primary)] focus:outline-none resize-none"
          placeholder="Enter your code rules here, one per line or as paragraphs..."
        />
      </div>

      {/* Glossary Section */}
      <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase">Glossary (Project Language)</h3>
          </div>
          <button
            onClick={addGlossaryEntry}
            className="flex items-center gap-1 px-2 py-1 bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text)] rounded text-[10px] font-bold uppercase transition-all"
          >
            <Plus size={12} />
            Add Term
          </button>
        </div>
        <p className="text-[10px] text-[var(--color-text-secondary)] mb-4">
          Define project-specific terminology so agents use consistent language. Examples:
          <br />• "SuperNode" = "A file visualizer component"
          <br />• "Lootbox" = "The tool execution service"
        </p>

        <div className="space-y-2">
          {glossaryEntries.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-secondary)] italic text-xs">
              No glossary terms defined. Click "Add Term" to create one.
            </div>
          ) : (
            glossaryEntries.map((entry, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-[var(--color-background)] p-2 rounded border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors group"
              >
                <input
                  type="text"
                  value={entry.key}
                  onChange={(e) => updateGlossaryEntry(index, 'key', e.target.value)}
                  className="flex-1 bg-transparent border-none text-[var(--color-primary)] font-bold focus:outline-none text-xs"
                  placeholder="Term (e.g., SuperNode)"
                />
                <span className="text-[var(--color-text-secondary)]">=</span>
                <input
                  type="text"
                  value={entry.value}
                  onChange={(e) => updateGlossaryEntry(index, 'value', e.target.value)}
                  className="flex-[2] bg-transparent border-none text-[var(--color-text)] focus:outline-none text-xs"
                  placeholder="Definition (e.g., A file visualizer component)"
                />
                <button
                  onClick={() => deleteGlossaryEntry(index)}
                  className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-background-secondary)] rounded transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="border border-[var(--color-primary)]/30 rounded-lg p-4 bg-[var(--color-primary)]/5">
        <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase mb-2">⚡ How It Works</h4>
        <ul className="text-[10px] text-[var(--color-text-secondary)] space-y-1">
          <li>• Constitution rules are prepended to EVERY agent's system prompt</li>
          <li>• Changes take effect immediately for all newly spawned agents</li>
          <li>• Existing agent sessions will not be affected until they restart</li>
          <li>• Code Rules appear first (highest priority) in the prompt hierarchy</li>
          <li>• Glossary terms help agents maintain consistent terminology</li>
        </ul>
      </div>
    </div>
  );
}
