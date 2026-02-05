import { type Module } from '../db/butlerDB';

export interface ArchitectureViolation {
    sourceId: string;
    targetId: string;
    rule: string;
    message: string;
    severity: 'Critical' | 'Warning';
}


const LAYER_VALUE: Record<string, number> = {
    'End-User': 3,
    'Core': 2,
    'Foundation': 1
};


export function validateArchitecture(modules: Module[]): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];
    const moduleMap = new Map(modules.map(m => [m.id, m]));
    const adjList: Map<string, string[]> = new Map();

    
    modules.forEach(consumer => {
        if (!consumer.dependencies) return;

        consumer.dependencies.forEach(dep => {
            const producer = moduleMap.get(dep.producerModuleId);
            if (!producer) return;

            
            if (!adjList.has(consumer.id)) adjList.set(consumer.id, []);
            adjList.get(consumer.id)?.push(producer.id);

            const consumerVal = LAYER_VALUE[consumer.layer] || 0;
            const producerVal = LAYER_VALUE[producer.layer] || 0;

            
            if (producerVal > consumerVal) {
                violations.push({
                    sourceId: consumer.id,
                    targetId: producer.id,
                    rule: 'No Upward References',
                    message: `"${consumer.name}" (${consumer.layer}) should not consume "${producer.name}" (${producer.layer}).`,
                    severity: 'Critical'
                });
            }

            
            if (consumerVal === producerVal && consumer.layer === 'End-User') {
                violations.push({
                    sourceId: consumer.id,
                    targetId: producer.id,
                    rule: 'No Side References',
                    message: `"${consumer.name}" cannot consume sibling "${producer.name}" in the End-User layer.`,
                    severity: 'Warning'
                });
            }
        });
    });

    checkCycles(modules, adjList, violations, moduleMap);
    return violations;
}


export function validateODCArchitecture(modules: Module[]): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];
    const moduleMap = new Map(modules.map(m => [m.id, m]));
    const adjList: Map<string, string[]> = new Map();

    modules.forEach(consumer => {
        if (!consumer.dependencies) return;

        
        const consumerRole = consumer.odcRole || 'App';

        consumer.dependencies.forEach(dep => {
            const producer = moduleMap.get(dep.producerModuleId);
            if (!producer) return;
            const producerRole = producer.odcRole || 'App';

            
            if (!adjList.has(consumer.id)) adjList.set(consumer.id, []);
            adjList.get(consumer.id)?.push(producer.id);

            
            
            if (consumerRole === 'Library' && producerRole === 'App') {
                violations.push({
                    sourceId: consumer.id,
                    targetId: producer.id,
                    rule: 'Library Violation',
                    message: `Library "${consumer.name}" cannot depend on App "${producer.name}". Libraries must be stateless leaf nodes.`,
                    severity: 'Critical'
                });
            }

            
            if (consumerRole === 'App' && producerRole === 'App') {
                dep.elements.forEach(el => {

                    
                    
                    if (el.type === 'Entity') {
                        violations.push({
                            sourceId: consumer.id,
                            targetId: producer.id,
                            rule: 'Data Isolation',
                            message: `App "${consumer.name}" consumes Entity "${el.name}" from "${producer.name}". Apps must be isolated. Use Service Actions (APIs).`,
                            severity: 'Critical'
                        });
                    }

                    
                    
                    
                    if (el.type === 'Action' && el.subType !== 'ServiceAction') {
                        violations.push({
                            sourceId: consumer.id,
                            targetId: producer.id,
                            rule: 'Tight Coupling',
                            message: `App "${consumer.name}" directly calls Server Action "${el.name}" from "${producer.name}". Use Service Actions (Weak References) for App-to-App communication.`,
                            severity: 'Warning'
                        });
                    }
                });
            }
        });
    });

    checkCycles(modules, adjList, violations, moduleMap);
    return violations;
}


function checkCycles(
    modules: Module[],
    adjList: Map<string, string[]>,
    violations: ArchitectureViolation[],
    moduleMap: Map<string, Module>
) {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function detectCycle(currentId: string, path: string[]) {
        visited.add(currentId);
        recursionStack.add(currentId);

        const neighbors = adjList.get(currentId) || [];
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                detectCycle(neighborId, [...path, neighborId]);
            } else if (recursionStack.has(neighborId)) {
                
                if (currentId === path[path.length - 1]) {
                    const cycleNames = [...path, neighborId].map(id => moduleMap.get(id)?.name).join(' → ');
                    violations.push({
                        sourceId: currentId,
                        targetId: neighborId,
                        rule: 'Circular Dependency',
                        message: `Cycle Detected: ${cycleNames}`,
                        severity: 'Critical'
                    });
                }
            }
        }
        recursionStack.delete(currentId);
    }

    modules.forEach(m => {
        if (!visited.has(m.id)) detectCycle(m.id, [m.id]);
    });
}