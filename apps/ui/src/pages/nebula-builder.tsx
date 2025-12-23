import React, { useState, useEffect, useRef } from "react";
import { NebulaOps, DEFAULT_NEBULA_TREE } from "@repo/nebula";
import type { NebulaTree } from "@repo/nebula";
import { NebulaRendererRoot } from "../features/nebula-renderer/NebulaRenderer.js";
import { Button } from "@/components/ui/button.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.js";
import {
  Sparkles,
  Code,
  Play,
  Send,
  Upload,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeEditorPanel } from "@/components/nebula/ThemeEditorPanel.js";
import { trpc } from "@/utils/trpc.js";
import { Textarea } from "@/components/ui/textarea.js";
import CompactRoleSelector from "@/components/CompactRoleSelector.js";
import { ComponentLibrary } from "@/nebula/library.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { Input } from "@/components/ui/input.js";
import { Search } from "lucide-react";
import type { NodeType } from "@repo/nebula";

// Tree Node Component - Compact
const TreeNode = ({
  nodeId,
  tree,
  level,
}: {
  nodeId: string;
  tree: NebulaTree;
  level: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const node = tree.nodes[nodeId];
  if (!node) return null;
  const hasChildren = node.children.length > 0;
  const indent = level * 10;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 px-1.5 hover:bg-purple-600/10 rounded cursor-pointer text-[10px] transition-colors"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown size={10} />
          ) : (
            <ChevronRight size={10} />
          )
        ) : (
          <span className="w-2.5" />
        )}
        <span className="font-mono text-purple-400">{node.type}</span>
        <span className="text-slate-500 text-[9px]">
          #{node.id.slice(0, 4)}
        </span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((childId: string) => (
            <TreeNode
              key={childId}
              nodeId={childId}
              tree={tree}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function NebulaBuilderPage() {
  const [tree, setTree] = useState<NebulaTree>(DEFAULT_NEBULA_TREE);
  const [prompt, setPrompt] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [lastResponse, setLastResponse] = useState<{
    status: string;
    message: string;
    logs?: string[];
  } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("structure");
  const [searchQuery, setSearchQuery] = useState("");

  const opsRef = useRef<NebulaOps | null>(null);

  useEffect(() => {
    opsRef.current = new NebulaOps(tree, (newTree: NebulaTree) => {
      console.log(
        "[NebulaBuilder] Tree updated:",
        newTree.nodes ? Object.keys(newTree.nodes).length : 0,
        "nodes"
      );
      setTree(newTree);
    });
  }, [tree, setTree]);

  const ops = opsRef.current || new NebulaOps(tree, setTree);
  const targetParentId = selectedNodeId || tree.rootId;

  const dispatchMutation = trpc.orchestrator.dispatch.useMutation({
    onSuccess: (data: { success: boolean; message: string; output: unknown; logs?: string[] }) => {
      console.log("[Nebula UI] Dispatch success! Full response:", data);
      if (data.success) {
        toast.success(`Dispatched!`);
        setLastResponse({
          status: "success",
          message: `Success`,
          logs: data.logs,
        });
        setPrompt("");

        let parsedOutput = data.output;
        if (typeof data.output === "string") {
          try {
            parsedOutput = JSON.parse(data.output);
          } catch {
            // Not JSON
          }
        }

        const addNodeActions: { parentId: string; node: { type: NodeType; props?: Record<string, unknown> } }[] = [];
        const otherActions: { tool: string; action: string; nodeId?: string; update?: Record<string, unknown>; newParentId?: string; index?: number }[] = [];

        const processObject = (obj: unknown) => {
          if (obj && typeof obj === "object" && "ui_action" in obj) {
            const uiAction = (obj as { ui_action: { tool: string; action: string; nodeId?: string; update?: Record<string, unknown>; newParentId?: string; index?: number; parentId?: string; node: { type: NodeType; props?: Record<string, unknown> } } }).ui_action;
            if (uiAction.tool === "nebula" && uiAction.action === "addNode") {
              addNodeActions.push({
                parentId: uiAction.parentId || tree.rootId,
                node: uiAction.node,
              });
            } else {
              otherActions.push(uiAction);
            }
          }
        };

        if (Array.isArray(parsedOutput)) {
          parsedOutput.forEach((item) => processObject(item));
        } else if (parsedOutput) {
          processObject(parsedOutput);
        }

        // Process batch addNode actions first
        if (addNodeActions.length > 0) {
          try {
            const newIds = ops.addNodes(addNodeActions);
            console.log("[NebulaBuilder] Added nodes with IDs:", newIds);

            // Force re-render by updating tree manually
            setTree((currentTree: NebulaTree) => {
              const updatedTree = { ...currentTree };
              console.log(
                "[NebulaBuilder] Tree now has",
                Object.keys(updatedTree.nodes).length,
                "nodes"
              );
              return updatedTree;
            });

            toast.success(`Added ${addNodeActions.length} nodes.`);
          } catch (err) {
            console.error(`[Nebula UI] Failed to apply batch addNodes:`, err);
            toast.error(`UI Error: Failed to execute batch addNodes`);
          }
        }

        // Process other actions individually
        otherActions.forEach((uiAction) => {
          try {
            const { action, nodeId, update, newParentId, index } = uiAction;
            if (action === "updateNode" && nodeId && update) {
              ops.updateNode(nodeId, update);
            } else if (action === "deleteNode" && nodeId) {
              ops.deleteNode(nodeId);
            } else if (action === "moveNode" && nodeId && newParentId) {
              ops.moveNode(nodeId, newParentId, index || 0);
            }
          } catch (err) {
            console.error(
              `[Nebula UI] Failed to apply action: ${uiAction.action}`,
              err
            );
            toast.error(`UI Error: Failed to execute ${uiAction.action}`);
          }
        });
      } else {
        toast.error(`Failed: ${data.message}`);
        setLastResponse({
          status: "error",
          message: data.message,
          logs: data.logs,
        });
      }
    },
    onError: (err: { message: string }) => {
      toast.error(`Error: ${err.message}`);
      setLastResponse({ status: "error", message: `Error: ${err.message}` });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        ops.ingest(tree.rootId, content);
        toast.success(`Imported ${file.name}`);
      } catch (error) {
        toast.error(
          `Failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };
    reader.onerror = () => toast.error(`Failed to read ${file.name}`);
    reader.readAsText(file);
  };

  const handleAiCommand = (promptText: string) => {
    if (!selectedRoleId) {
      toast.error("Select a role first.");
      return;
    }
    if (!promptText.trim()) return;
    setLastResponse(null);
    dispatchMutation.mutate({ prompt: promptText, roleId: selectedRoleId });
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 pointer-events-none" />

      {/* Compact Header */}
      <header className="h-11 border-b border-white/10 flex items-center px-3 justify-between bg-slate-900/50 backdrop-blur-xl relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Nebula
          </span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="file"
            accept=".tsx,.jsx,.ts,.js"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] px-2 cursor-pointer"
              asChild
            >
              <span>
                <Upload className="w-3 h-3 mr-1" />
                Import
              </span>
            </Button>
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={() => {
              const json = JSON.stringify(tree, null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "nebula-tree.json";
              a.click();
            }}
          >
            <Code className="w-3 h-3 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            className="h-7 text-[10px] px-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30"
          >
            <Play className="w-3 h-3 mr-1" />
            Preview
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative z-10 min-h-0">
        {/* Left: Compact Sidebar */}
        <aside className="w-56 border-r border-white/10 bg-slate-900/30 backdrop-blur-xl flex flex-col shrink-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="w-full h-8 bg-slate-800/50 m-1 p-0.5 gap-0.5 shrink-0">
              <TabsTrigger
                value="structure"
                className="flex-1 text-[9px] h-full data-[state=active]:bg-purple-600"
              >
                Tree
              </TabsTrigger>
              <TabsTrigger
                value="components"
                className="flex-1 text-[9px] h-full data-[state=active]:bg-purple-600"
              >
                Add
              </TabsTrigger>
              <TabsTrigger
                value="theme"
                className="flex-1 text-[9px] h-full data-[state=active]:bg-purple-600"
              >
                Theme
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="structure"
              className="flex-1 p-2 overflow-auto m-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0"
            >
              {/* Debug Info */}
              <div className="mb-2 p-1.5 bg-purple-900/20 rounded border border-purple-500/20 text-[8px] font-mono">
                <div className="text-purple-400">
                  Nodes: {Object.keys(tree.nodes).length}
                </div>
                <div className="text-purple-400">
                  Root children: {tree.nodes[tree.rootId]?.children.length || 0}
                </div>
              </div>

              <div className="space-y-0.5">
                <TreeNode nodeId={tree.rootId} tree={tree} level={0} />
              </div>
              <div className="mt-2 pt-2 border-t border-white/10">
                <h4 className="font-semibold text-[8px] mb-1 uppercase text-purple-400 tracking-wider">
                  Imports
                </h4>
                <div className="bg-black/40 text-green-400 font-mono text-[8px] p-1 rounded border border-white/5 max-h-20 overflow-auto">
                  {tree.imports && tree.imports.length > 0 ? (
                    tree.imports.map((imp: string, i: number) => (
                      <div key={i} className="truncate">
                        {imp}
                      </div>
                    ))
                  ) : (
                    <span className="text-neutral-600">None</span>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="components"
              className="flex-1 overflow-hidden flex flex-col m-0 data-[state=active]:flex min-h-0"
            >
              <div className="p-2 space-y-1.5 shrink-0">
                <div className="relative">
                  <Search className="absolute left-1.5 top-1.5 w-2.5 h-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-6 h-6 text-[10px] bg-black/20 border-white/10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="text-[8px] text-purple-400 font-mono">
                  Target:{" "}
                  <span className="text-blue-400">
                    #
                    {targetParentId === tree.rootId
                      ? "ROOT"
                      : targetParentId.slice(0, 4)}
                  </span>
                </div>
              </div>

              <ScrollArea className="flex-1 px-2 min-h-0">
                <div className="space-y-2 pb-2">
                  {ComponentLibrary.map((category, idx) => {
                    const filteredComps = category.components.filter((c) =>
                      c.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    if (filteredComps.length === 0) return null;

                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    const [isExpanded, setIsExpanded] = React.useState(
                      idx === 0
                    ); // Only first category expanded by default

                    return (
                      <section
                        key={category.name}
                        className="border border-white/10 rounded-md overflow-hidden bg-slate-800/30"
                      >
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="w-full flex items-center justify-between px-1.5 py-1 hover:bg-purple-600/10 transition-colors"
                        >
                          <h4 className="text-[8px] uppercase font-bold text-purple-400/70 tracking-wider">
                            {category.name}
                          </h4>
                          <ChevronDown
                            className={`w-2.5 h-2.5 text-purple-400/50 transition-transform ${
                              isExpanded ? "" : "-rotate-90"
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="grid grid-cols-2 gap-0.5 p-1">
                            {filteredComps.map((comp) => (
                              <Button
                                key={comp}
                                variant="outline"
                                size="sm"
                                className="justify-start text-[9px] h-5 px-1 bg-slate-800/50 hover:bg-purple-600/20 border-white/10 hover:border-purple-500/50 transition-all"
                                onClick={() =>
                                  ops.addNode(targetParentId, {
                                    type: comp as NodeType,
                                    props:
                                      comp === "Text"
                                        ? { content: "Edit me" }
                                        : {},
                                  })
                                }
                              >
                                {comp}
                              </Button>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                  <section className="border border-pink-500/20 rounded-md overflow-hidden bg-pink-900/10">
                    <div className="px-1.5 py-1">
                      <h4 className="text-[8px] uppercase font-bold text-pink-400/70 tracking-wider flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2" />
                        Logic
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-0.5 p-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[9px] h-5 bg-slate-800/50 border-white/10"
                        onClick={() =>
                          ops.addNode(targetParentId, {
                            type: "Loop",
                            logic: { loopData: "items", iterator: "item" },
                          })
                        }
                      >
                        Loop
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[9px] h-5 bg-slate-800/50 border-white/10"
                        onClick={() =>
                          ops.addNode(targetParentId, {
                            type: "Condition",
                            logic: { condition: "isActive" },
                          })
                        }
                      >
                        If
                      </Button>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="theme"
              className="flex-1 p-0 overflow-auto m-0 min-h-0"
            >
              <ThemeEditorPanel />
            </TabsContent>
          </Tabs>
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 p-4 flex items-center justify-center overflow-auto min-w-0">
          <div className="w-full h-full bg-white shadow-2xl rounded-xl border border-gray-200 overflow-auto">
            <NebulaRendererRoot
              tree={tree}
            />
          </div>
        </main>

        {/* Right: Properties & AI */}
        <aside className="w-64 border-l border-white/10 bg-slate-900/30 backdrop-blur-xl flex flex-col shrink-0">
          <div className="flex-1 overflow-auto p-2 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-[10px] text-purple-400 uppercase tracking-wider">
                Properties
              </h3>
              {selectedNodeId && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-5 text-[9px] px-1.5"
                  onClick={() => {
                    ops.deleteNode(selectedNodeId);
                    setSelectedNodeId(null);
                  }}
                >
                  Delete
                </Button>
              )}
            </div>

            {selectedNodeId && tree.nodes[selectedNodeId] ? (
              <div className="space-y-2">
                <div className="p-2 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-lg border border-purple-500/20">
                  <div className="text-[8px] text-purple-400 uppercase font-bold mb-0.5">
                    Type
                  </div>
                  <div className="text-xs font-bold text-white">
                    {tree.nodes[selectedNodeId].type}
                  </div>
                  <div className="text-[8px] text-purple-300 font-mono mt-0.5">
                    #{selectedNodeId.slice(0, 8)}
                  </div>
                </div>

                {tree.nodes[selectedNodeId].type === "Text" && (
                  <div className="space-y-1">
                    <label className="text-[8px] font-medium text-purple-400 uppercase">
                      Content
                    </label>
                    <Textarea
                      className="text-[10px] min-h-[50px] bg-black/20 border-white/10"
                      value={tree.nodes[selectedNodeId].props.content || ""}
                      onChange={(e) =>
                        ops.updateNode(selectedNodeId, {
                          props: {
                            ...tree.nodes[selectedNodeId].props,
                            content: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[8px] font-medium text-purple-400 uppercase">
                    Props (JSON)
                  </label>
                  <Textarea
                    className="text-[8px] font-mono min-h-[60px] bg-black/40 text-green-400 border-white/10"
                    defaultValue={JSON.stringify(
                      tree.nodes[selectedNodeId].props || {},
                      null,
                      2
                    )}
                    onBlur={(e) => {
                      try {
                        const newProps = JSON.parse(e.target.value);
                        ops.updateNode(selectedNodeId, { props: newProps });
                        toast.success("Props updated");
                      } catch {
                        toast.error("Invalid JSON");
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/30 p-2 rounded-lg text-[9px] text-slate-400 italic text-center border border-white/5">
                Select a component
              </div>
            )}
          </div>

          {/* AI Chat */}
          <div className="border-t border-white/10 bg-slate-900/50 p-2 space-y-1.5 shrink-0">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Architect
              </span>
            </div>

            <div className="border border-white/10 rounded-md overflow-hidden bg-black/20">
              <CompactRoleSelector
                selectedRoleId={selectedRoleId}
                onSelect={(id: string) => setSelectedRoleId(id)}
              />
            </div>

            <Textarea
              placeholder="Describe your UI..."
              className="min-h-[120px] text-[10px] font-mono resize-none bg-black/20 border-white/10 focus:border-purple-500/50 transition-colors"
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setPrompt(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (prompt.trim()) handleAiCommand(prompt);
                }
              }}
            />

            <Button
              size="sm"
              className="w-full h-7 text-[10px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30"
              onClick={() => handleAiCommand(prompt)}
              disabled={!prompt.trim() || dispatchMutation.isLoading}
            >
              {dispatchMutation.isLoading ? (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                  Processing
                </>
              ) : (
                <>
                  <Send className="w-2.5 h-2.5 mr-1.5" />
                  Execute
                </>
              )}
            </Button>

            {lastResponse && (
              <div
                className={`p-1.5 rounded-md text-[8px] border ${
                  lastResponse.status === "success"
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                <div className="font-semibold truncate">
                  {lastResponse.message}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
