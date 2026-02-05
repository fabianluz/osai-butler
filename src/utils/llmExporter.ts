import { type Entity, type Module, type LogicAction, type UIElement, type FlowNode, type FlowEdge } from '../db/butlerDB';


const summarizeFlow = (nodes: FlowNode[], edges: FlowEdge[]): string => {
    if (!nodes || nodes.length === 0) return "Empty Logic.";

    
    const labelMap = new Map(nodes.map(n => [n.id, n.label || n.type]));

    
    const steps = nodes.map(n => {
        const outs = edges.filter(e => e.source === n.id);
        let outText = "";

        if (outs.length > 0) {
            outText = " -> goes to: " + outs.map(e => {
                const targetName = labelMap.get(e.target) || "Unknown";
                return e.label ? `[${e.label}] ${targetName}` : targetName;
            }).join(", ");
        }

        
        let details = "";
        if (n.type === 'If') details = " (Decision)";
        if (n.type === 'Switch') details = " (Multiple Choice)";
        if (n.type === 'Aggregate' || n.type === 'SQL') details = " (Data Fetch)";

        
        return `- Step "${n.label}" (${n.type})${details}${outText}`;
    }).join("\n");

    return steps;
};

export function generateModuleContext(
    module: Module,
    entities: Entity[],
    actions: LogicAction[] = [],
    uiElements: UIElement[] = [],
    projectModules: Module[] = [],
    mode: 'Verbose' | 'Summary' = 'Verbose' 
) {

    
    const dependenciesReadable = (module.dependencies || []).map(dep => {
        const producer = projectModules.find(m => m.id === dep.producerModuleId);
        return {
            from: producer ? producer.name : "Unknown",
            items: dep.elements.map(e => e.name) 
        };
    });

    
    if (mode === 'Summary') {
        return JSON.stringify({
            context_type: "OutSystems_Module_Summary",
            module: module.name,
            description: module.description,
            dependencies: dependenciesReadable,

            
            entities: entities.map(e => `${e.name}: ${e.description} (${e.attributes.length} fields)`),

            
            logic: actions.map(act => ({
                name: act.name,
                description: act.description,
                inputs: act.inputs.map(i => i.name),
                outputs: act.outputs.map(o => o.name),
                flow_narrative: summarizeFlow(act.nodes, act.edges) 
            })),

            
            ui: uiElements.map(ui => ({
                name: ui.name,
                type: ui.type,
                navigates_to: ui.links
                    ? ui.links.map(id => uiElements.find(e => e.id === id)?.name)
                    : []
            }))
        }, null, 2);
    }

    
    const context = {
        context_type: "OutSystems_Module_Definition_Full",
        module_name: module.name,
        module_description: module.description,
        layer: module.layer,
        platform: module.odcRole ? "ODC" : "O11",

        architecture_dependencies: dependenciesReadable,

        database: entities.map(ent => ({
            name: ent.name,
            description: ent.description,
            is_public: ent.isPublic,
            columns: ent.attributes.map(a =>
                `${a.name} (${a.dataType})${a.isIdentifier ? ' [PK]' : ''}${a.isMandatory ? ' *' : ''}`
            )
        })),

        logic: actions.map(act => ({
            name: act.name,
            type: act.type,
            description: act.description,
            is_public: act.isPublic,
            inputs: act.inputs.map(v => `${v.name} (${v.dataType})`),
            outputs: act.outputs.map(v => `${v.name} (${v.dataType})`),
            flow_summary: act.flowSummary,
            
            nodes: act.nodes.map(n => ({ type: n.type, label: n.label, data: n.data })),
            edges: act.edges.map(e => ({ source_node: e.source, target_node: e.target, label: e.label }))
        })),

        ui_screens_blocks: uiElements.map(ui => {
            const linkedScreenNames = ui.links
                ? ui.links.map(linkId => uiElements.find(e => e.id === linkId)?.name || "UnknownScreen")
                : [];

            return {
                name: ui.name,
                type: ui.type,
                archetype: ui.archetype || "Blank",
                description: ui.description,
                is_public: ui.isPublic,
                inputs: ui.inputs?.map(v => `${v.name} (${v.dataType})`) || [],
                local_vars: ui.localVariables?.map(v => `${v.name} (${v.dataType})`) || [],
                events: ui.events?.map(e => e.name) || [],
                navigates_to: linkedScreenNames
            };
        })
    };

    return JSON.stringify(context, null, 2);
}