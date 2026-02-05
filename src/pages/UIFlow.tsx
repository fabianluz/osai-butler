import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    MarkerType,
    type Node,
    type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/butlerDB';
import ScreenNode from '../components/ScreenNode';

const nodeTypes = { screen: ScreenNode }; 


const NODE_WIDTH = 250;
const NODE_HEIGHT = 150;

export default function UIFlow() {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const uiElements = useLiveQuery(() => db.uiElements.where({ moduleId: moduleId! }).toArray(), [moduleId]);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    useEffect(() => {
        if (!uiElements || uiElements.length === 0) return;

        const g = new dagre.graphlib.Graph();

        
        g.setGraph({
            rankdir: 'LR',
            nodesep: 50,
            ranksep: 100,
            marginx: 50,
            marginy: 50
        });

        g.setDefaultEdgeLabel(() => ({}));

        
        uiElements.forEach(ui => {
            
            const inputs = ui.inputs?.length || 0;
            const vars = ui.localVariables?.length || 0;
            const height = 60 + ((inputs + vars) * 25);
            g.setNode(ui.id, { width: NODE_WIDTH, height: height });
        });

        
        const flowEdges: Edge[] = [];
        uiElements.forEach(ui => {
            if (ui.links) {
                ui.links.forEach(targetId => {
                    if (uiElements.find(e => e.id === targetId)) {
                        g.setEdge(ui.id, targetId);
                        flowEdges.push({
                            id: `${ui.id}-${targetId}`,
                            source: ui.id,
                            target: targetId,
                            animated: true,
                            type: 'smoothstep', 
                            style: { stroke: '#2563eb', strokeWidth: 2 },
                            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#2563eb' }
                        });
                    }
                });
            }
        });

        
        dagre.layout(g);

        
        const flowNodes: Node[] = uiElements.map(ui => {
            const pos = g.node(ui.id);
            return {
                id: ui.id,
                type: 'screen', 
                position: {
                    x: pos.x - (NODE_WIDTH / 2),
                    y: pos.y - (pos.height / 2)
                },
                data: ui as any
            };
        });

        setNodes(flowNodes);
        setEdges(flowEdges);

    }, [uiElements, setNodes, setEdges]);

    return (
        <div className="h-screen w-screen bg-gray-50 flex flex-col relative">
            <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow flex gap-4 items-center border border-gray-200">
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-black font-bold">&larr; Back</button>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="font-bold text-gray-700">User Interface Flow</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{nodes.length} Screens</span>
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes} 
                fitView
                minZoom={0.5}
                maxZoom={1.2}
            >
                <Background color="#cbd5e1" gap={20} />
                <Controls />
            </ReactFlow>
        </div>
    );
}