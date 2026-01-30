import { type Module } from '../db/butlerDB';

export interface ArchitectureViolation {
    sourceId: string;
    targetId: string;
    rule: string;
    message: string;
    severity: 'Critical' | 'Warning';
}

// Layer Hierarchy Values (Higher = Top of Canvas)
const LAYER_VALUE: Record<string, number> = {
    'End-User': 3,
    'Core': 2,
    'Foundation': 1
};

export function validateArchitecture(modules: Module[]): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];
    const moduleMap = new Map(modules.map(m => [m.id, m]));
    const adjList: Map<string, string[]> = new Map();

    // 1. BUILD GRAPH & CHECK DIRECT RULES
    modules.forEach(consumer => {
        if (!consumer.dependencies) return;

        consumer.dependencies.forEach(dep => {
            const producer = moduleMap.get(dep.producerModuleId);

            // Skip if producer is missing/deleted
            if (!producer) return;

            // Add to Adjacency List for Cycle Detection
            if (!adjList.has(consumer.id)) adjList.set(consumer.id, []);
            adjList.get(consumer.id)?.push(producer.id);

            const consumerVal = LAYER_VALUE[consumer.layer] || 0;
            const producerVal = LAYER_VALUE[producer.layer] || 0;

            // --- RULE #1: NO UPWARD REFERENCES ---
            // "A lower layer module cannot consume a higher layer module."
            if (producerVal > consumerVal) {
                violations.push({
                    sourceId: consumer.id,
                    targetId: producer.id,
                    rule: 'No Upward References',
                    message: `"${consumer.name}" (${consumer.layer}) should not consume "${producer.name}" (${producer.layer}).`,
                    severity: 'Critical'
                });
            }

            // --- RULE #2: NO SIDE REFERENCES (TOP LAYERS) ---
            // "End-User modules should not reference siblings."
            // FIX: Removed Orchestration check to align with strict 3-Layer Schema
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

    // --- RULE #3: NO CYCLES (SPAGHETTI CODE) ---
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
                // Cycle Detected
                // Only report if this is the closing link of the cycle
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
        if (!visited.has(m.id)) {
            detectCycle(m.id, [m.id]);
        }
    });

    return violations;
}