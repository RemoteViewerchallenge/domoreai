import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { trpc } from '../../utils/trpc.js';
import { Badge } from '../../components/ui/badge.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Users, GitBranch, CheckCircle } from 'lucide-react';

interface DepartmentNodeData {
  label: string;
  managerRole: string;
  hasGhostBranch?: boolean; // "Intern" status
  taskStatus?: 'Ready' | 'InProgress' | 'Blocked';
  departmentId: string;
  vfsToken?: string; // Needed for ratify
}

export const DepartmentNode = memo(function DepartmentNode({ data }: NodeProps<DepartmentNodeData>) {

  const ratifyMutation = trpc.git.ratifyBranch.useMutation();

  const handleRatify = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node click
    if (data.vfsToken) {
      ratifyMutation.mutate({
        vfsToken: data.vfsToken,
        branch: `${data.departmentId}-ghost` // emerging convention
      });
    }
  };

  const isReady = data.taskStatus === 'Ready';

  return (
    <Card className="min-w-[250px] border-2 shadow-lg bg-card hover:border-primary transition-colors">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          {data.label}
        </CardTitle>
        {data.hasGhostBranch && (
          <Badge variant="secondary" className="text-xs gap-1">
            <GitBranch className="h-3 w-3" />
            Intern
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="text-xs text-muted-foreground mb-4">
          Manager: <span className="font-mono text-foreground">{data.managerRole}</span>
        </div>
        
        <div className="flex items-center justify-between mt-2">
           <div className={`text-xs font-bold ${isReady ? 'text-green-500' : 'text-yellow-500'}`}>
             Status: {data.taskStatus || 'Idle'}
           </div>

           <Button 
             size="sm" 
             disabled={!isReady || ratifyMutation.isLoading}
             onClick={handleRatify}
             className={isReady ? "bg-green-600 hover:bg-green-700 text-white" : ""}
           >
             {ratifyMutation.isLoading ? 'Ratifying...' : 'RATIFY'}
             {isReady && !ratifyMutation.isLoading && <CheckCircle className="ml-2 h-3 w-3" />}
           </Button>
        </div>

        {ratifyMutation.isSuccess && (
           <div className="text-[10px] text-green-500 mt-1">
             Branch ratified!
           </div>
        )}
      </CardContent>

      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-muted-foreground" />
    </Card>
  );
});

DepartmentNode.displayName = "DepartmentNode";
