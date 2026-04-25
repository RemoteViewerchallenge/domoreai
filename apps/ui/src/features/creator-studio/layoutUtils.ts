import dagre from 'dagre';
import { type Node, type Edge, Position } from 'reactflow';

const nodeWidth = 370;
const nodeHeight = 280;

/**
 * Auto-layouts React Flow nodes using dagre.
 * Gracefully handles flat structures and hierarchical relationships.
 */
export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB'): { nodes: Node[], edges: Edge[] } => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 50,
    ranksep: 100,
    marginx: 50,
    marginy: 50
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      // We are shifting the dagre node position (which is center-based) to top-left
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      // Add animation hint for React Flow
      style: { opacity: 1 },
    };
  });

  return { nodes: layoutedNodes, edges };
};
