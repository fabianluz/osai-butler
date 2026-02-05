import { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Edge,
    type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/butlerDB';
import EntityNode from '../components/EntityNode';

const nodeTypes = { entity: EntityNode };

// Constants for Layout
const NODE_WIDTH = 256; // Matches w-64 tailwind class
const ROW_HEIGHT = 30;  // Height per attribute
const HEADER_HEIGHT = 45;

const getLayoutedElements = (nodes: any[], edges: any[]) => {
    try {
        const g = new dagre.graphlib.Graph();


        g.setGraph({
            rankdir: 'TB',
            nodesep: 80, // Horizontal space between nodes
            ranksep: 100 // Vertical space between tiers
        });

        g.setDefaultEdgeLabel(() => ({}));

        nodes.forEach((node) => {
            const height = HEADER_HEIGHT + ((node.data.attributes?.length || 0) * ROW_HEIGHT);
            g.setNode(node.id, { width: NODE_WIDTH, height: height });
        });

        edges.forEach((edge) => {
            g.setEdge(edge.source, edge.target);
        });

        dagre.layout(g);

        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = g.node(node.id);
            return {
                ...node,
                position: {

                    x: nodeWithPosition.x - (NODE_WIDTH / 2),
                    y: nodeWithPosition.y - (nodeWithPosition.height / 2),
                },
            };
        });

        return { nodes: layoutedNodes, edges };

    } catch (error) {
        console.error("Layout Engine Failed:", error);
        return { nodes, edges };
    }
};

export default function ModuleDiagram() {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const entities = useLiveQuery(() => db.entities.where({ moduleId: moduleId! }).toArray(), [moduleId]);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    useEffect(() => {
        if (!entities || entities.length === 0) return;

        const rawNodes: Node[] = [];
        const rawEdges: Edge[] = [];

        entities.forEach(ent => {
            rawNodes.push({
                id: ent.id,
                type: 'entity',
                data: { label: ent.name, attributes: ent.attributes },
                position: { x: 0, y: 0 }
            });

            ent.attributes.forEach(attr => {
                if (attr.name.endsWith('Id')) {
                    const targetName = attr.name.slice(0, -2);
                    const targetEntity = entities.find(e => e.name === targetName);

                    if (targetEntity) {
                        rawEdges.push({
                            id: `${ent.id}-${targetEntity.id}`,
                            source: targetEntity.id,
                            target: ent.id,
                            animated: true,
                            style: { stroke: '#64748b', strokeWidth: 2 },
                            type: 'smoothstep' // Better looking lines
                        });
                    }
                }
            });
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [entities]);

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    if (!entities) return <div className="h-screen flex items-center justify-center">Loading Diagram...</div>;

    return (
        <div className="h-screen w-screen bg-gray-50 flex flex-col relative">
            <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow-lg border border-gray-200 flex gap-4 items-center">
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-black font-medium">
                    &larr; Back
                </button>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="font-bold text-gray-700">Entity Diagram ({entities.length} Tables)</span>
            </div>

            <div className="flex-grow h-full w-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    minZoom={0.1}
                    className="bg-gray-100"
                >
                    <Background color="#94a3b8" gap={25} size={1} />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
}