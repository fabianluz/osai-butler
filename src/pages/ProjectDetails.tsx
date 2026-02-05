import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db, type Module, type LayerType, type Entity, type LogicAction, type UIElement, type ODCRole } from '../db/butlerDB';
import { validateArchitecture, validateODCArchitecture, type ArchitectureViolation } from '../utils/archValidator';


const Icons = {
  Back: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
  Add: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>,
  Trash: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Module: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  ODCApp: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Lib: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>,
  Open: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
  Check: <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Warning: <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Info: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Export: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Zip: <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
  File: <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Prompt: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
};

interface ConnectionLine { id: string; path: string; color: string; isInvalid: boolean; }

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false); 
  const [generatedContext, setGeneratedContext] = useState('');    
  const [newModuleName, setNewModuleName] = useState('');
  const [targetLayer, setTargetLayer] = useState<LayerType | 'ODC_App' | 'ODC_Lib'>('Core');
  const [detailsModuleId, setDetailsModuleId] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionLine[]>([]);
  const [violations, setViolations] = useState<ArchitectureViolation[]>([]);

  
  const project = useLiveQuery(() => db.projects.get(projectId!), [projectId]);
  const modules = useLiveQuery(() => db.modules.where({ projectId: projectId! }).toArray(), [projectId]);

  
  const isODC = project?.platform === 'ODC';

  const layers = useMemo(() => ({
    'End-User': modules?.filter(m => m.layer === 'End-User') || [],
    'Core': modules?.filter(m => m.layer === 'Core') || [],
    'Foundation': modules?.filter(m => m.layer === 'Foundation') || []
  }), [modules]);

  const odcGroups = useMemo(() => ({
    'Apps': modules?.filter(m => (m.odcRole || 'App') === 'App') || [],
    'Libraries': modules?.filter(m => m.odcRole === 'Library') || []
  }), [modules]);

  
  useLayoutEffect(() => {
    if (modules && project) {
      setViolations(isODC ? validateODCArchitecture(modules) : validateArchitecture(modules));
    }
  }, [modules, project, isODC]);

  useLayoutEffect(() => {
    calculateArrows();
    window.addEventListener('resize', calculateArrows);
    return () => window.removeEventListener('resize', calculateArrows);
  }, [modules, violations, odcGroups, layers]);

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

          if (isODC && Math.abs(verticalGap) < 50 && Math.abs(startX - endX) > 50) {
            const sRight = sRect.right - containerRect.left;
            const tLeft = tRect.left - containerRect.left;
            const midY = sRect.top + (sRect.height / 2) - containerRect.top;
            d = sRight < tLeft ? `M ${sRight} ${midY} L ${tLeft} ${midY}` : `M ${sRect.left - containerRect.left} ${midY} L ${tRect.right - containerRect.left} ${midY}`;
          } else if (verticalGap > 20) {
            const midY = startY + (verticalGap / 2);
            d = `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`;
          } else {
            const rightLaneX = Math.max(sRect.right, tRect.right) - containerRect.left + 20;
            d = `M ${startX} ${startY} V ${startY + 15} H ${rightLaneX} V ${endY - 15} H ${endX} V ${endY}`;
          }
          newConnections.push({ id: `${sourceMod.id}-${targetId}`, path: d, color, isInvalid });
        }
      });
    });
    setConnections(newConnections);
  };

  
  const handleGenerateContext = async () => {
    if (!project || !modules) return;

    let prompt = `ROLE: OutSystems Architect\n`;
    prompt += `CONTEXT: I am working on a project named "${project.name}" (${project.platform}).\n`;
    prompt += `DESCRIPTION: ${project.description}\n\n`;
    prompt += `GOAL: Understand the global architecture, module roles, and core data structures so you can assist with specific tasks later without losing the "Big Picture".\n\n`;

    prompt += `--- ARCHITECTURE OVERVIEW ---\n`;

    for (const mod of modules) {
      const ents = await db.entities.where({ moduleId: mod.id }).toArray();
      const acts = await db.actions.where({ moduleId: mod.id }).toArray();
      const uis = await db.uiElements.where({ moduleId: mod.id }).toArray();

      
      const typeLabel = isODC ? (mod.odcRole || 'App') : mod.layer;
      prompt += `\n📦 MODULE: ${mod.name} [${typeLabel}]\n`;
      prompt += `   Description: ${mod.description || "N/A"}\n`;

      
      if (ents.length > 0) {
        prompt += `   DATA (${ents.length}): ${ents.map(e => e.name + (e.isPublic ? '*' : '')).join(', ')}\n`;
      }

      
      if (acts.length > 0) {
        
        const server = acts.filter(a => a.type === 'Server').map(a => a.name);
        const service = acts.filter(a => a.type === 'Service').map(a => a.name);
        if (server.length) prompt += `   SERVER ACTIONS: ${server.join(', ')}\n`;
        if (service.length) prompt += `   SERVICE ACTIONS (API): ${service.join(', ')}\n`;
      }

      
      if (uis.length > 0) {
        const screens = uis.filter(u => u.type === 'Screen').map(u => u.name);
        if (screens.length) prompt += `   SCREENS: ${screens.join(', ')}\n`;
      }

      
      if (mod.dependencies && mod.dependencies.length > 0) {
        const depNames = mod.dependencies.map(d => {
          const prod = modules.find(m => m.id === d.producerModuleId);
          return prod ? prod.name : "Unknown";
        });
        prompt += `   CONSUMES: ${depNames.join(', ')}\n`;
      }
    }

    prompt += `\n--- INSTRUCTIONS ---\n`;
    prompt += `1. Store this architecture in your memory.\n`;
    prompt += `2. When I provide specific module details later (via .butler files), verify they fit into this architecture.\n`;
    prompt += `3. Acknowledge that you understand the "${project.name}" system structure.`;

    setGeneratedContext(prompt);
    setShowContextModal(true);
  };

  
  const handleExportFull = async () => {
    if (!project || !modules) return;

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

    const backupData = {
      version: 2,
      type: 'butler_project_backup',
      project,
      modules,
      entities: allEntities,
      actions: allActions,
      uiElements: allUI
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    saveAs(blob, `${project.name.replace(/\s+/g, '_')}_Full.butler`);
    setShowExportOptions(false);
  };

  
  const handleExportSplit = async () => {
    if (!project || !modules) return;
    const zip = new JSZip();

    for (const mod of modules) {
      const modEntities = await db.entities.where({ moduleId: mod.id }).toArray();
      const modActions = await db.actions.where({ moduleId: mod.id }).toArray();
      const modUI = await db.uiElements.where({ moduleId: mod.id }).toArray();

      const moduleData = {
        version: 2,
        type: 'butler_module_export',
        project,
        modules,
        target_module: mod.name,
        entities: modEntities,
        actions: modActions,
        uiElements: modUI
      };

      zip.file(`${mod.name}.butler`, JSON.stringify(moduleData, null, 2));
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${project.name.replace(/\s+/g, '_')}_Modules.zip`);
    setShowExportOptions(false);
  };

  const openAddModal = (type: LayerType | 'ODC_App' | 'ODC_Lib') => {
    setTargetLayer(type);
    setNewModuleName('');
    setIsModalOpen(true);
  };

  const handleAddModule = async () => {
    if (!newModuleName || !projectId) return;
    let layer: LayerType = 'Core';
    let role: ODCRole | undefined = undefined;

    if (isODC) {
      if (targetLayer === 'ODC_App') { role = 'App'; layer = 'Core'; }
      else { role = 'Library'; layer = 'Foundation'; }
    } else {
      layer = targetLayer as LayerType;
    }

    await db.modules.add({
      id: uuidv4(), projectId, name: newModuleName, layer, odcRole: role, description: '',
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

  if (!project) return <div className="p-10 text-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-gray-800 transition p-2 hover:bg-gray-100 rounded-full">{Icons.Back}</Link>
            <div className="h-6 w-px bg-gray-200"></div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {project.name}
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${isODC ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{project.platform}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {violations.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded text-xs font-bold border border-red-200 animate-pulse cursor-help" title={violations.map(v => v.message).join('\n')}>
                {Icons.Warning} {violations.length} Violations
              </div>
            )}

            {/* NEW CONTEXT BUTTON */}
            <button onClick={handleGenerateContext} className="flex items-center gap-2 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm">
              {Icons.Prompt} Prompt Context
            </button>

            <button onClick={() => setShowExportOptions(true)} className="flex items-center gap-2 bg-gray-900 text-white hover:bg-black px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm">{Icons.Export} Export</button>
          </div>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-grow max-w-[1400px] mx-auto w-full p-8 space-y-12 relative" ref={containerRef}>
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
          <div className={`p-2 rounded-full ${violations.length === 0 ? 'bg-green-100' : 'bg-red-100'}`}>{violations.length === 0 ? Icons.Check : Icons.Warning}</div>
          <div className="flex-grow">
            <h2 className={`text-lg font-bold ${violations.length === 0 ? 'text-green-800' : 'text-red-800'}`}>{violations.length === 0 ? 'Architecture is Valid' : `${violations.length} Architecture Violations`}</h2>
            <div className="mt-1 space-y-1">
              {violations.length === 0 ? <p className="text-green-700 text-sm">All dependencies follow the {isODC ? 'ODC' : '3-Layer'} rules.</p> : violations.map((v, i) => <div key={i} className="text-red-700 text-sm flex items-center gap-2 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{v.message}</div>)}
            </div>
          </div>
        </div>

        {/* --- RENDER LOGIC --- */}
        {isODC ? (
          <>
            <LayerSection
              title="Business Apps"
              description="Domain-driven Apps containing UI, Logic, and Data."
              color="yellow"
              modules={odcGroups.Apps}
              onAdd={() => openAddModal('ODC_App')}
              onDelete={handleDeleteModule}
              onOpen={(id: string) => navigate(`/module/${id}`)}
              onDetails={setDetailsModuleId}
              violations={violations}
              icon={Icons.ODCApp}
            />
            <LayerSection
              title="Libraries"
              description="Stateless, reusable components and connectors."
              color="blue"
              modules={odcGroups.Libraries}
              onAdd={() => openAddModal('ODC_Lib')}
              onDelete={handleDeleteModule}
              onOpen={(id: string) => navigate(`/module/${id}`)}
              onDetails={setDetailsModuleId}
              violations={violations}
              icon={Icons.Lib}
            />
          </>
        ) : (
          <>
            <LayerSection
              title="End-User Layer"
              description="Frontend UIs and Portals."
              color="green"
              modules={layers['End-User']}
              onAdd={() => openAddModal('End-User')}
              onDelete={handleDeleteModule}
              onOpen={(id: string) => navigate(`/module/${id}`)}
              onDetails={setDetailsModuleId}
              violations={violations}
              icon={Icons.Module}
            />
            <LayerSection
              title="Core Layer"
              description="Business Logic and Data."
              color="yellow"
              modules={layers['Core']}
              onAdd={() => openAddModal('Core')}
              onDelete={handleDeleteModule}
              onOpen={(id: string) => navigate(`/module/${id}`)}
              onDetails={setDetailsModuleId}
              violations={violations}
              icon={Icons.Module}
            />
            <LayerSection
              title="Foundation Layer"
              description="Reusable Libraries."
              color="blue"
              modules={layers['Foundation']}
              onAdd={() => openAddModal('Foundation')}
              onDelete={handleDeleteModule}
              onOpen={(id: string) => navigate(`/module/${id}`)}
              onDetails={setDetailsModuleId}
              violations={violations}
              icon={Icons.Module}
            />
          </>
        )}

      </div>

      {/* --- ADD MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">New {targetLayer.includes('ODC') ? (targetLayer === 'ODC_App' ? 'App' : 'Library') : targetLayer}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Name</label>
              <input autoFocus className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. Sales_App" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddModule()} />
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={handleAddModule} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-md">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EXPORT OPTIONS MODAL --- */}
      {showExportOptions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">Export Project</h3>
              <button onClick={() => setShowExportOptions(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div onClick={handleExportFull} className="border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 rounded-xl p-4 cursor-pointer transition group flex flex-col items-center text-center">
                <div className="mb-3 bg-green-100 text-green-600 p-3 rounded-full group-hover:scale-110 transition">{Icons.File}</div>
                <h4 className="font-bold text-gray-800 mb-1">Full Backup</h4>
                <p className="text-xs text-gray-500">Single .butler file containing everything. Best for backups and re-importing.</p>
              </div>
              <div onClick={handleExportSplit} className="border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-4 cursor-pointer transition group flex flex-col items-center text-center">
                <div className="mb-3 bg-blue-100 text-blue-600 p-3 rounded-full group-hover:scale-110 transition">{Icons.Zip}</div>
                <h4 className="font-bold text-gray-800 mb-1">Split Modules</h4>
                <p className="text-xs text-gray-500">ZIP file with separate JSONs per module. Best for feeding LLMs one context at a time.</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
              Choose "Split Modules" to avoid hitting token limits in ChatGPT/Claude.
            </div>
          </div>
        </div>
      )}

      {/* --- NEW CONTEXT PROMPT MODAL --- */}
      {showContextModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowContextModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">{Icons.Prompt} Global Architecture Context</h3>
              <button onClick={() => setShowContextModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                Use this prompt <b>first</b> to introduce the project structure to the AI. <br />
                Once the AI says "Acknowledged", you can upload specific <code>.butler</code> module files.
              </p>
              <div className="bg-gray-900 text-green-300 p-6 rounded-lg font-mono text-sm leading-relaxed whitespace-pre-wrap shadow-inner border border-gray-700">
                {generatedContext}
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => { navigator.clipboard.writeText(generatedContext); alert("Prompt copied!"); }}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition shadow-md flex items-center gap-2"
              >
                📋 Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}



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
  icon: React.ReactNode;
}

function LayerSection({
  title,
  description,
  color,
  modules,
  onAdd,
  onDelete,
  onOpen,
  onDetails,
  violations,
  icon
}: LayerSectionProps) {

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
            <span className="text-xs font-normal text-gray-400 bg-white border px-2 py-0.5 rounded-full">
              {modules.length}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition"
        >
          {Icons.Add} Add
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center text-gray-400 text-sm bg-white/50">
          Empty.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((mod: Module) => {
            const hasCritical = violations.some((v: ArchitectureViolation) => v.sourceId === mod.id);
            return (
              <div
                key={mod.id}
                id={`module-${mod.id}`}
                onClick={() => onOpen(mod.id)}
                className={`group bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all relative overflow-visible z-20 flex flex-col h-full ${hasCritical ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'}`}
              >
                {hasCritical && (
                  <div className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full border border-red-200 z-30 shadow-sm animate-bounce">
                    {Icons.Warning}
                  </div>
                )}
                <div className="pl-1 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className={`p-2 rounded-lg ${badgeColors[color]} inline-block`}>
                      {icon}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDetails(mod.id); }}
                        className="text-gray-400 hover:text-blue-500 p-1 hover:bg-blue-50 rounded transition"
                        title="Inspect Dependencies"
                      >
                        {Icons.Info}
                      </button>
                      <button
                        onClick={(e) => onDelete(e, mod.id)}
                        className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"
                        title="Delete"
                      >
                        {Icons.Trash}
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm truncate">{mod.name}</h3>
                  <div className="flex items-center gap-1 mt-3 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open {Icons.Open}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}