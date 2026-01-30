import { type Entity, type Module, type LogicAction, type UIElement } from '../db/butlerDB';

export function generateModuleContext(
    module: Module,
    entities: Entity[],
    actions: LogicAction[] = [],
    uiElements: UIElement[] = [], // <--- NEW PARAM
    projectModules: Module[] = []
) {

    // Resolve Dependencies into Human Readable Format
    const dependenciesReadable = (module.dependencies || []).map(dep => {
        const producer = projectModules.find(m => m.id === dep.producerModuleId);
        return {
            producer_module: producer ? producer.name : "Unknown",
            producer_layer: producer ? producer.layer : "Unknown",
            consumed_elements: dep.elements.map(e => `${e.type}: ${e.name}`)
        };
    });

    const context = {
        context_type: "OutSystems_Module_Definition",
        module_name: module.name,
        module_description: module.description || "No description provided.",
        layer: module.layer,

        // 0. ARCHITECTURE & DEPENDENCIES
        architecture_dependencies: dependenciesReadable,

        // 1. DATA LAYER
        database: entities.map(ent => ({
            name: ent.name,
            description: ent.description,
            is_public: ent.isPublic,
            columns: ent.attributes.map(a =>
                `${a.name} (${a.dataType})${a.isIdentifier ? ' [PK]' : ''}${a.isMandatory ? ' *' : ''}`
            )
        })),

        // 2. LOGIC LAYER
        logic: actions.map(act => ({
            name: act.name,
            type: act.type,
            description: act.description,
            is_public: act.isPublic,
            inputs: act.inputs.map(v => `${v.name} (${v.dataType})`),
            outputs: act.outputs.map(v => `${v.name} (${v.dataType})`),
            flow_summary: act.flowSummary
        })),

        // 3. UI LAYER (NEW)
        ui_screens_blocks: uiElements.map(ui => ({
            name: ui.name,
            type: ui.type,
            description: ui.description,
            is_public: ui.isPublic
        }))
    };

    return JSON.stringify(context, null, 2);
}