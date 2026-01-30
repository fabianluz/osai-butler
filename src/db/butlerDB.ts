import Dexie, { type EntityTable } from 'dexie';

// --- Types ---
export type DataType = 'Text' | 'Integer' | 'LongInteger' | 'Decimal' | 'Boolean' | 'DateTime' | 'Date' | 'Binary' | 'Identifier' | 'Record' | 'List';

export interface Attribute {
  id: string;
  name: string;
  dataType: DataType;
  length?: number;
  isMandatory: boolean;
  isIdentifier: boolean;
}

export interface Variable {
  id: string;
  name: string;
  dataType: DataType;
  isList: boolean;
  isMandatory: boolean;
  description?: string;
}

export interface Entity {
  id: string;
  moduleId: string;
  name: string;
  description: string;
  isStatic: boolean;
  isPublic: boolean;
  attributes: Attribute[];
}

// --- LOGIC STRUCTURES ---
export interface FlowNode {
  id: string;
  type: string;
  label: string;
  posX: number;
  posY: number;
  data?: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface LogicAction {
  id: string;
  moduleId: string;
  name: string;
  type: 'Server' | 'Service' | 'Client';
  description: string;
  isFunction: boolean;
  isPublic: boolean;
  inputs: Variable[];
  outputs: Variable[];
  flowSummary: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface UIElement {
  id: string;
  moduleId: string;
  name: string;
  type: 'Screen' | 'Block';
  description: string;
  isPublic: boolean;
}

// --- DEPENDENCIES ---
export interface DependencyElement {
  id: string;
  name: string;
  type: 'Entity' | 'Action' | 'UI';
}

export interface ModuleDependency {
  producerModuleId: string;
  elements: DependencyElement[];
}

export interface Project {
  id: string;
  name: string;
  platform: 'O11' | 'ODC';
  description: string;
  createdAt: Date;
}

// STRICT 3-LAYER ARCHITECTURE
export type LayerType = 'End-User' | 'Core' | 'Foundation';

export interface Module {
  id: string;
  projectId: string;
  name: string;
  layer: LayerType;
  description: string;
  dependencies?: ModuleDependency[];
}

// --- Database Setup ---
const db = new Dexie('OutSystemsButlerDB') as Dexie & {
  projects: EntityTable<Project, 'id'>;
  modules: EntityTable<Module, 'id'>;
  entities: EntityTable<Entity, 'id'>;
  actions: EntityTable<LogicAction, 'id'>;
  uiElements: EntityTable<UIElement, 'id'>;
};

db.version(1).stores({
  projects: 'id, name, platform',
  modules: 'id, projectId, name, layer'
});
db.version(2).stores({ entities: 'id, moduleId, name' });
db.version(3).stores({ actions: 'id, moduleId, name' });
db.version(4).stores({ uiElements: 'id, moduleId, name' });

export { db };