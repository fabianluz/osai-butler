import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db, type Module, type LayerType, type Entity, type LogicAction, type UIElement } from '../db/butlerDB';
import { validateArchitecture, type ArchitectureViolation } from '../utils/archValidator';

// --- ICONS ---
const Icons = {
  Back: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
  Add: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>,
  Trash: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Module: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Open: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
  Check: <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Warning: <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Info: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Export: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
};

// Type for a calculated connection line
interface ConnectionLine {
  id: string;
  path: string;
  color: string;
  isInvalid: boolean;
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [targetLayer, setTargetLayer] = useState<LayerType>('Core');
  const [detailsModuleId, setDetailsModuleId] = useState<string | null>(null);

  // State for Drawn Lines
  const [connections, setConnections] = useState<ConnectionLine[]>([]);
  const [violations, setViolations] = useState<ArchitectureViolation[]>([]);

  // Data Fetching
  const project = useLiveQuery(() => db.projects.get(projectId!), [projectId]);
  const modules = useLiveQuery(() => db.modules.where({ projectId: projectId! }).toArray(), [projectId]);

  // Group Modules
  const layers = useMemo(() => {
    return {
      'End-User': modules?.filter(m => m.layer === 'End-User') || [],
      'Core': modules?.filter(m => m.layer === 'Core') || [],
      'Foundation': modules?.filter(m => m.layer === 'Foundation') || []
    };
  }, [modules]);

  // Architecture Validation
  useLayoutEffect(() => {
    if (modules) {
      setViolations(validateArchitecture(modules));
    }
  }, [modules]);

  // --- EXPORT FUNCTIONALITY ---
  const handleExportProject = async () => {
    if (!project || !modules) return;

    // 1. Fetch All Sub-Elements
    const allEntities: Entity[] = [];
    const allActions: LogicAction[] = [];
    const allUI: UIElement[] = [];

    for (const mod of modules) {
      const ents = await db.entities.where({ moduleId: mod.id }).toArray();
      const acts = await db.actions.where({ moduleId: mod.id }).toArray();
      const uis = await db.uiElements.where({ moduleId: mod.id }).toArray();

      allEntities.push(...ents);
      allActions.push(...acts);
      allUI.push(...uis);
    }

    // 2. Construct Complete JSON
    const backupData = {
      version: 2,
      type: 'butler_project_backup',
      project,
      modules, // Includes granular dependencies & descriptions
      entities: allEntities,
      actions: allActions,
      uiElements: allUI
    };

    // 3. Trigger Download
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_FullContext.butler`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- ARROW CALCULATION ---
  const calculateArrows = () => {
    if (!modules || modules.length === 0 || !containerRef.current) return;

    const newConnections: ConnectionLine[] = [];
    const containerRect = containerRef.current.getBoundingClientRect();

    modules.forEach(sourceMod => {
      if (!sourceMod.dependencies) return;

      sourceMod.dependencies.forEach(dep => {
        const targetId = dep.producerModuleId;
        const sourceEl = document.getElementById(`module-${sourceMod.id}`);
        const targetEl = document.getElementById(`module-${targetId}`);

        if (sourceEl && targetEl) {
          const sRect = sourceEl.getBoundingClientRect();
          const tRect = targetEl.getBoundingClientRect();

          const violation = violations.find(v => v.sourceId === sourceMod.id && v.targetId === targetId);
          const isInvalid = !!violation;
          const color = isInvalid ? "#ef4444" : "#94a3b8";

          const startX = sRect.left + sRect.width / 2 - containerRect.left;
          const startY = sRect.bottom - containerRect.top;
          const endX = tRect.left + tRect.width / 2 - containerRect.left;
          const endY = tRect.top - containerRect.top;

          let d = "";
          const verticalGap = endY - startY;

          if (verticalGap > 20) {
            const midY = startY + (verticalGap / 2);
            d = `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`;
          } else if (Math.abs(verticalGap) <= 20) {
            const bridgeY = startY + 30;
            d = `M ${startX} ${startY} V ${bridgeY} H ${endX} V ${endY}`;
          } else {
            const rightLaneX = Math.max(sRect.right, tRect.right) - containerRect.left + 40;
            d = `M ${startX} ${startY} V ${startY + 15} H ${rightLaneX} V ${endY - 15} H ${endX} V ${endY}`;
          }

          newConnections.push({ id: `${sourceMod.id}-${targetId}`, path: d, color, isInvalid });
        }
      });
    });
    setConnections(newConnections);
  };

  useLayoutEffect(() => {
    calculateArrows();
    window.addEventListener('resize', calculateArrows);
    return () => window.removeEventListener('resize', calculateArrows);
  }, [modules, violations, layers]);

  // --- DEPENDENCY HELPERS ---
  const getProducers = (modId: string) => {
    const mod = modules?.find(m => m.id === modId);
    if (!mod || !mod.dependencies) return [];
    return mod.dependencies.map(dep => {
      const producer = modules?.find(m => m.id === dep.producerModuleId);
      return {
        name: producer?.name || "Unknown",
        layer: producer?.layer || "Unknown",
        elements: dep.elements
      };
    });
  };

  const getConsumers = (modId: string) => {
    if (!modules) return [];
    return modules.filter(m => m.dependencies?.some(d => d.producerModuleId === modId))
      .map(consumer => {
        const dependency = consumer.dependencies?.find(d => d.producerModuleId === modId);
        return {
          name: consumer.name,
          layer: consumer.layer,
          elements: dependency?.elements || []
        };
      });
  };

  // Handlers
  const openAddModal = (layer: LayerType) => {
    setTargetLayer(layer);
    setNewModuleName('');
    setIsModalOpen(true);
  };

  const handleAddModule = async () => {
    if (!newModuleName || !projectId) return;
    await db.modules.add({
      id: uuidv4(),
      projectId,
      name: newModuleName,
      layer: targetLayer,
      description: '',
    });
    setIsModalOpen(false);
  };

  const handleDeleteModule = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this module?")) return;
    await db.modules.delete(id);
    await db.entities.where({ moduleId: id }).delete();
    await db.actions.where({ moduleId: id }).delete();
    await db.uiElements.where({ moduleId: id }).delete();
  };

  if (!project) return <div className="p-10 text-center text-gray-500">Loading Architecture...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* --- TOP BAR --- */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-gray-800 transition p-2 hover:bg-gray-100 rounded-full">
              {Icons.Back}
            </Link>
            <div className="h-6 w-px bg-gray-200"></div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {project.name}
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${project.platform === 'ODC' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {project.platform}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {violations.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded text-xs font-bold border border-red-200 animate-pulse cursor-help" title={violations.map(v => v.message).join('\n')}>
                {Icons.Warning} {violations.length} Violations
              </div>
            )}

            <button
              onClick={handleExportProject}
              className="flex items-center gap-2 bg-gray-900 text-white hover:bg-black px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm"
              title="Export entire project to JSON"
            >
              {Icons.Export} Export Project
            </button>
          </div>
        </div>
      </div>

      {/* --- ARCHITECTURE CANVAS --- */}
      <div className="flex-grow max-w-[1400px] mx-auto w-full p-8 space-y-12 relative" ref={containerRef}>

        {/* SVG LAYER */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            <marker id="arrow-gray" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" /></marker>
            <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#ef4444" /></marker>
          </defs>
          {connections.map(conn => (
            <path key={conn.id} d={conn.path} stroke={conn.color} strokeWidth={conn.isInvalid ? 2.5 : 2} fill="none" strokeDasharray={conn.isInvalid ? "5,5" : ""} markerEnd={`url(#arrow-${conn.isInvalid ? 'red' : 'gray'})`} className="transition-all duration-300" />
          ))}
        </svg>

        {/* STATUS BOX */}
        <div className={`rounded-xl border shadow-sm p-5 transition-all flex items-start gap-4 z-20 relative bg-white ${violations.length === 0 ? 'border-green-200' : 'border-red-200'}`}>
          <div className={`p-2 rounded-full ${violations.length === 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            {violations.length === 0 ? Icons.Check : Icons.Warning}
          </div>
          <div className="flex-grow">
            <h2 className={`text-lg font-bold ${violations.length === 0 ? 'text-green-800' : 'text-red-800'}`}>
              {violations.length === 0 ? 'The architecture canvas looks correct' : `${violations.length} Architecture Violations Detected`}
            </h2>
            <div className="mt-1 space-y-1">
              {violations.length === 0 ? (
                <p className="text-green-700 text-sm">All module dependencies follow the OutSystems 3-Layer Canvas rules.</p>
              ) : (
                violations.map((v, i) => (
                  <div key={i} className="text-red-700 text-sm flex items-center gap-2 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{v.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* LAYERS */}
        {['End-User', 'Core', 'Foundation'].map((layer) => (
          <LayerSection
            key={layer}
            title={`${layer} Layer`}
            description={layer === 'End-User' ? "Frontend UIs and Portals." : layer === 'Core' ? "Business Logic and Data." : "Reusable Libraries."}
            color={layer === 'End-User' ? 'green' : layer === 'Core' ? 'yellow' : 'blue'}
            // @ts-ignore
            modules={layers[layer]}
            // @ts-ignore
            onAdd={() => openAddModal(layer)}
            onDelete={handleDeleteModule}
            onOpen={(id) => navigate(`/module/${id}`)}
            onDetails={(id) => setDetailsModuleId(id)}
            violations={violations}
          />
        ))}
      </div>

      {/* --- DEPENDENCY INSPECTOR MODAL --- */}
      {detailsModuleId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  {modules?.find(m => m.id === detailsModuleId)?.name}
                  <span className="text-xs font-normal text-gray-500 bg-white border px-2 py-0.5 rounded">Dependency Analysis</span>
                </h3>
              </div>
              <button onClick={() => setDetailsModuleId(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="flex-grow overflow-hidden flex divide-x divide-gray-100">
              <div className="w-1/2 flex flex-col bg-white">
                <div className="p-4 bg-gray-50 border-b font-bold text-gray-600 uppercase text-xs tracking-wider flex items-center gap-2"><span>👈</span> Uses (Consumes)</div>
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  {getProducers(detailsModuleId).length === 0 && <div className="text-center text-gray-400 italic mt-10">No dependencies.</div>}
                  {getProducers(detailsModuleId).map((prod, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-center mb-2 border-b pb-2">
                        <span className="font-bold text-gray-800">{prod.name}</span>
                        <span className="text-[10px] bg-gray-100 px-1.5 rounded">{prod.layer}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {prod.elements.map((el: any) => (<span key={el.id} className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${el.type === 'Entity' ? 'bg-blue-50 text-blue-700 border-blue-100' : el.type === 'Action' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>{el.name}</span>))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-1/2 flex flex-col bg-white">
                <div className="p-4 bg-gray-50 border-b font-bold text-gray-600 uppercase text-xs tracking-wider flex items-center gap-2"><span>👉</span> Used By (Consumed By)</div>
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  {getConsumers(detailsModuleId).length === 0 && <div className="text-center text-gray-400 italic mt-10">Not used by any module.</div>}
                  {getConsumers(detailsModuleId).map((cons, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 shadow-sm bg-gray-50/50">
                      <div className="flex justify-between items-center mb-2 border-b pb-2">
                        <span className="font-bold text-gray-800">{cons.name}</span>
                        <span className="text-[10px] bg-gray-100 px-1.5 rounded">{cons.layer}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cons.elements.map((el: any) => (<span key={el.id} className={`text-[10px] px-2 py-0.5 rounded border opacity-75 ${el.type === 'Entity' ? 'bg-blue-50 text-blue-700 border-blue-100' : el.type === 'Action' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>{el.name}</span>))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button onClick={() => setDetailsModuleId(null)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-sm font-bold">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD MODULE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">New {targetLayer} Module</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Module Name</label>
              <input autoFocus className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. Order_CS" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddModule()} />
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={handleAddModule} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-md">Create Module</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- LAYER SECTION COMPONENT ---
interface LayerSectionProps {
  title: string;
  description: string;
  color: 'green' | 'yellow' | 'blue';
  modules: Module[];
  onAdd: () => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onOpen: (id: string) => void;
  onDetails: (id: string) => void;
  violations: ArchitectureViolation[];
}

function LayerSection({ title, description, color, modules, onAdd, onDelete, onOpen, onDetails, violations }: LayerSectionProps) {

  const colors: Record<string, string> = {
    green: 'border-t-4 border-t-green-500 bg-green-50/50',
    yellow: 'border-t-4 border-t-orange-400 bg-orange-50/50',
    blue: 'border-t-4 border-t-blue-500 bg-blue-50/50',
  };

  const badgeColors: Record<string, string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-orange-100 text-orange-700 border-orange-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <div className={`relative rounded-xl border border-gray-200 shadow-sm ${colors[color]} p-6 transition-all z-20`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {title}
            <span className="text-xs font-normal text-gray-400 bg-white border px-2 py-0.5 rounded-full">{modules.length}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 bg-white border border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition">{Icons.Add} Add Module</button>
      </div>

      {modules.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center text-gray-400 text-sm bg-white/50">No modules in this layer yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((mod: Module) => {
            const modViolations = violations.filter(v => v.sourceId === mod.id);
            const hasCritical = modViolations.length > 0;

            return (
              <div
                key={mod.id}
                id={`module-${mod.id}`}
                onClick={() => onOpen(mod.id)}
                className={`group bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all relative overflow-visible z-20 flex flex-col h-full ${hasCritical ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'}`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${hasCritical ? 'bg-red-500' : (color === 'green' ? 'bg-green-500' : (color === 'yellow' ? 'bg-orange-400' : 'bg-blue-500'))}`}></div>

                {hasCritical && (
                  <div className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full border border-red-200 z-30 shadow-sm animate-bounce" title={modViolations[0].message}>{Icons.Warning}</div>
                )}

                <div className="pl-3 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className={`p-2 rounded-lg ${badgeColors[color]} inline-block`}>{Icons.Module}</div>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); onDetails(mod.id); }} className="text-gray-400 hover:text-blue-500 p-1 hover:bg-blue-50 rounded transition" title="Inspect Dependencies">{Icons.Info}</button>
                      <button onClick={(e) => onDelete(e, mod.id)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition" title="Delete">{Icons.Trash}</button>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-800 text-sm truncate" title={mod.name}>{mod.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-tight flex-grow">{mod.description || "No description provided."}</p>

                  {mod.dependencies && mod.dependencies.length > 0 && (
                    <div className="mt-3 flex gap-1">
                      {mod.dependencies.map((d, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-300" title="Consumed Dependency"></div>))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-3 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">Open Module {Icons.Open}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}