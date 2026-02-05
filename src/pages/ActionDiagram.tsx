import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType, 
    type Edge,  
    type Node   
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/butlerDB';
import LogicNode from '../components/LogicNode';

const nodeTypes = { logic: LogicNode };

const getLayoutedElements = (nodes: any[], edges: any[]) => {
    try {
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 50 });
        g.setDefaultEdgeLabel(() => ({}));

        nodes.forEach((node) => {
            g.setNode(node.id, { width: 100, height: 60 });
        });

        edges.forEach((edge) => {
            g.setEdge(edge.source, edge.target);
        });

        dagre.layout(g);

        return {
            nodes: nodes.map((node) => {
                const pos = g.node(node.id);
                return { ...node, position: { x: pos.x - 50, y: pos.y - 30 } };
            }),
            edges
        };
    } catch (error) {
        console.error("Layout Error:", error);
        return { nodes, edges };
    }
};

export default function ActionDiagram() {
    const { actionId } = useParams();
    const navigate = useNavigate();
    const action = useLiveQuery(() => db.actions.get(actionId!), [actionId]);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    useEffect(() => {
        if (!action || !action.nodes) return;

        const rawNodes: Node[] = action.nodes.map(n => ({
            id: n.id,
            type: 'logic',
            data: { label: n.label, type: n.type },
            position: { x: 0, y: 0 }
        }));

        const rawEdges: Edge[] = action.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            animated: true,
            style: { stroke: '#64748b' },
            markerEnd: { type: MarkerType.ArrowClosed }
        }));

        const layout = getLayoutedElements(rawNodes, rawEdges);
        setNodes(layout.nodes);
        setEdges(layout.edges);

    }, [action]);

    if (!action) return <div>Loading...</div>;

    return (
        <div className="h-screen w-screen bg-gray-50 flex flex-col relative">
            <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow flex gap-4 items-center">
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-black">&larr; Back</button>
                <span className="font-bold text-gray-700">{action.name}</span>
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background color="#ccc" gap={20} />
                <Controls />
            </ReactFlow>
        </div>
    );
}