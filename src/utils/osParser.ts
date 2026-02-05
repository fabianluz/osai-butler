import { XMLParser } from 'fast-xml-parser';
import { v4 as uuidv4 } from 'uuid';
import { type Entity, type LogicAction, type FlowNode, type FlowEdge, type DataType, type Variable } from '../db/butlerDB';

// 1. Setup Parser
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    isArray: (name) => {
        return ["Entity", "EntityAttribute", "ServerAction", "ClientAction", "ServiceAction", "InputParameter", "OutputParameter", "Variable", "Link", "Assignment", "Case", "Parameters", "Parameter"].includes(name);
    }
});

const mapOsTypeToLocal = (osType: string): DataType => {
    if (!osType) return 'Text';
    const lower = osType.toLowerCase();
    if (lower.includes('text') || lower.includes('phone') || lower.includes('email')) return 'Text';
    if (lower.includes('longinteger')) return 'LongInteger';
    if (lower.includes('integer')) return 'Integer';
    if (lower.includes('decimal') || lower.includes('currency')) return 'Decimal';
    if (lower.includes('boolean')) return 'Boolean';
    if (lower.includes('datetime')) return 'DateTime';
    if (lower.includes('date')) return 'Date';
    if (lower.includes('binary')) return 'Binary';
    return 'Text';
};

// --- PARSING LOGIC ---

export const parseClipboardData = (xmlString: string, moduleId: string): { entities: Entity[], actions: LogicAction[] } => {
    const resultEntities: Entity[] = [];
    const resultActions: LogicAction[] = [];

    try {
        const jsonObj = parser.parse(xmlString);

        // Helper to recursively find objects by tag name
        const findObjects = (obj: any, tagNames: string[]): any[] => {
            let found: any[] = [];
            if (!obj) return found;
            if (Array.isArray(obj)) {
                obj.forEach(item => found = found.concat(findObjects(item, tagNames)));
            } else if (typeof obj === 'object') {
                tagNames.forEach(tag => { if (obj[tag]) found = found.concat(obj[tag]); });
                Object.keys(obj).forEach(key => {
                    if (!tagNames.includes(key)) found = found.concat(findObjects(obj[key], tagNames));
                });
            }
            return found;
        };

        // 1. Parse Entities
        const rawEntities = findObjects(jsonObj, ['Entity']);
        rawEntities.forEach((raw: any) => {
            const newEntity: Entity = {
                id: uuidv4(),
                moduleId: moduleId,
                name: raw.Name || 'Unknown',
                description: raw.Description || '',
                isStatic: raw.IsStatic === 'true',
                isPublic: raw.IsPublic === 'true',
                attributes: []
            };
            if (raw.Attributes && raw.Attributes.EntityAttribute) {
                raw.Attributes.EntityAttribute.forEach((attr: any) => {
                    newEntity.attributes.push({
                        id: uuidv4(),
                        name: attr.Name,
                        dataType: mapOsTypeToLocal(attr.Type),
                        length: attr.Length ? parseInt(attr.Length) : undefined,
                        isMandatory: attr.IsMandatory === 'true',
                        isIdentifier: attr.IsIdentifier === 'true'
                    });
                });
            }
            resultEntities.push(newEntity);
        });

        // 2. Parse Actions
        const rawActions = findObjects(jsonObj, ['ServerAction', 'ClientAction', 'ServiceAction']);

        rawActions.forEach((raw: any) => {
            const actionId = uuidv4();
            const nodes: FlowNode[] = [];
            const edges: FlowEdge[] = [];
            const inputs: Variable[] = [];
            const outputs: Variable[] = [];

            // Parse Parameters
            if (raw.InputParameter) raw.InputParameter.forEach((p: any) => inputs.push(mapVar(p)));
            if (raw.OutputParameter) raw.OutputParameter.forEach((p: any) => outputs.push(mapVar(p)));

            // Detect Flow Container
            let flowSource = raw;
            if (raw.Flow) {
                flowSource = Array.isArray(raw.Flow) ? raw.Flow[0] : raw.Flow;
            }

            // --- EXTRACT NODES ---
            const flowTags = ['Start', 'End', 'Assign', 'If', 'Switch', 'ExecuteServerAction', 'RunServerAction', 'RunClientAction', 'Aggregate', 'SQL', 'JavaScript', 'ForEach', 'Comment', 'RaiseException', 'Message', 'Download', 'Destination'];

            flowTags.forEach(tag => {
                if (flowSource[tag]) {
                    const items = Array.isArray(flowSource[tag]) ? flowSource[tag] : [flowSource[tag]];
                    items.forEach((item: any) => {

                        const nodeData: any = {};

                        // 1. IF Node
                        if (tag === 'If' && item.Condition) {
                            nodeData.condition = item.Condition;
                        }

                        // 2. ASSIGN Node
                        if (tag === 'Assign' && item.Assignment) {
                            const assigns = Array.isArray(item.Assignment) ? item.Assignment : [item.Assignment];
                            nodeData.assignments = assigns.map((a: any) => ({
                                variable: a.Variable,
                                value: a.Value
                            }));
                        }

                        // 3. EXECUTE / RUN ACTION
                        if (['ExecuteServerAction', 'RunServerAction', 'RunClientAction'].includes(tag)) {
                            if (item.Action && item.Action.Name) {
                                nodeData.action_name = item.Action.Name;
                            } else if (item.ActionName) {
                                nodeData.action_name = item.ActionName;
                            } else if (item.Name) {
                                nodeData.action_name = item.Name;
                            }
                        }

                        // 4. SWITCH
                        if (tag === 'Switch' && item.Case) {
                            const cases = Array.isArray(item.Case) ? item.Case : [item.Case];
                            nodeData.cases = cases.map((c: any) => c.Condition);
                        }

                        // 5. COMMENT
                        if (tag === 'Comment') {
                            nodeData.text = item.Text || "";
                        }

                        // 6. EXCEPTION
                        if (tag === 'RaiseException') {
                            nodeData.exception = item.Exception || item.Name;
                            nodeData.message = item.ExceptionMessage || "";
                        }

                        // 7. SQL 
                        if (tag === 'SQL') {
                            // Service Studio often stores the SQL in a Property named 'SQL' or 'CommandText'
                            nodeData.query = item.SQL || item.CommandText || item.Name || "SELECT ...";
                        }

                        // 8. JavaScript 
                        if (tag === 'JavaScript') {
                            nodeData.code = item.Script || item.Code || "// JS Code";
                        }

                        // 9. Message
                        if (tag === 'Message') {
                            nodeData.message = item.Message || "";
                            nodeData.msgType = item.Type || "Info";
                        }

                        nodes.push({
                            id: item.Name || uuidv4(),
                            type: tag,
                            label: item.Name || tag,
                            posX: 0,
                            posY: 0,
                            data: nodeData
                        });
                    });
                }
            });

            // --- EXTRACT LINKS (EDGES) ---
            if (flowSource.Link) {
                const links = Array.isArray(flowSource.Link) ? flowSource.Link : [flowSource.Link];
                links.forEach((link: any) => {
                    edges.push({
                        id: uuidv4(),
                        source: link.Source,
                        target: link.Target,
                        label: link.Label || ''
                    });
                });
            }

            resultActions.push({
                id: actionId,
                moduleId,
                name: raw.Name || 'NewAction',
                type: raw.OriginalName || raw.tag === 'ClientAction' ? 'Client' : 'Server',
                description: raw.Description || '',
                isFunction: raw.IsFunction === 'true',
                isPublic: raw.IsPublic === 'true',
                inputs,
                outputs,
                flowSummary: `Logic with ${nodes.length} nodes.`,
                nodes,
                edges
            });
        });

    } catch (error) {
        console.error("XML Parse Error:", error);
        throw new Error("Could not parse XML.");
    }

    return { entities: resultEntities, actions: resultActions };
};

const mapVar = (raw: any): Variable => ({
    id: uuidv4(),
    name: raw.Name,
    dataType: mapOsTypeToLocal(raw.Type),
    isList: false,
    isMandatory: raw.IsMandatory === 'true'
});