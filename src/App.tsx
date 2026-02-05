import React, { useState, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Project, type Module, type Entity, type LogicAction, type UIElement } from './db/butlerDB';

// Pages
import ProjectDetails from './pages/ProjectDetails';
import ModuleDetails from './pages/ModuleDetails';
import EntityEditor from './pages/EntityEditor';
import ActionEditor from './pages/ActionEditor';
import ModuleDiagram from './pages/ModuleDiagram';
import ActionDiagram from './pages/ActionDiagram';
import UIEditor from './pages/UIEditor';
import UIFlow from './pages/UIFlow';

// --- ICONS ---
const Icons = {
  Logo: <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Add: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Import: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Export: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Trash: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Help: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Robot: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>,
  ODC: <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  O11: <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
};

// --- THE MASTER PROMPT ---
const MASTER_PROMPT = `I am going to provide you with the JSON Context of an OutSystems application module. This JSON represents a "Digital Twin" of the codebase.

It contains:
1. **Database Entities:** Defines the table schema, attributes, and relationships.
2. **Logic Actions:** Defines Server/Client actions. The logic flows are described as a graph of "Nodes" (Steps) and "Connections" (Arrows).
3. **UI Elements:** Defines the Screens and Blocks in the module, including Inputs, Local Variables, and Navigation Links.
4. **Dependencies:** Lists exactly which Actions/Entities are consumed from other modules.

**Your Task:**
1. Analyze the JSON structure I paste next.
2. Reconstruct the application architecture in your mind.
3. **Summarize the Full Context back to me.** Tell me:
   - What is the domain of this app? (e.g., E-Commerce, HR).
   - What are the core tables?
   - What are the complex logic flows doing? (Trace the "nodes" and "connections").
   - How do the screens connect? (Trace the "links").
   - How do the modules interact via dependencies?

Confirm you are ready to receive the JSON context.`;

// --- COMPONENT: Project Dashboard ---
function ProjectList() {
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'O11' | 'ODC'>('O11');
  const [showHelp, setShowHelp] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const navigate = useNavigate();
  const projects = useLiveQuery(() => db.projects.toArray());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    const id = uuidv4();
    await db.projects.add({
      id,
      name: newProjectName,
      platform: selectedPlatform,
      description: '',
      createdAt: new Date(),
    });
    setNewProjectName('');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure? This will delete the project and all its modules.")) return;

    await db.projects.delete(id);
    const modules = await db.modules.where({ projectId: id }).toArray();
    for (const mod of modules) {
      await db.entities.where({ moduleId: mod.id }).delete();
      await db.actions.where({ moduleId: mod.id }).delete();
      await db.uiElements.where({ moduleId: mod.id }).delete();
    }
    await db.modules.where({ projectId: id }).delete();
  };

  const handleExportProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const modules = await db.modules.where({ projectId: project.id }).toArray();

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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_Backup.butler`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  // --- FIXED IMPORT LOGIC ---
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.type !== 'butler_project_backup') throw new Error("Invalid file format");

        const newProjId = uuidv4();
        const oldToNewModId: Record<string, string> = {};
        const oldToNewUIId: Record<string, string> = {}; // 1. Create Lookup for UI

        // Create Project
        await db.projects.add({
          ...data.project,
          id: newProjId,
          name: `${data.project.name} (Imported)`,
          createdAt: new Date()
        });

        // Map Modules
        const newModules: Module[] = [];
        for (const mod of data.modules) {
          const newModId = uuidv4();
          oldToNewModId[mod.id] = newModId;
          newModules.push({ ...mod, id: newModId, projectId: newProjId });
        }

        // Map UI IDs (Pre-calculation)
        if (data.uiElements) {
          data.uiElements.forEach((ui: any) => {
            oldToNewUIId[ui.id] = uuidv4();
          });
        }

        // Save Modules (Fix Dependencies)
        for (const mod of newModules) {
          if (mod.dependencies) {
            // @ts-ignore
            mod.dependencies = mod.dependencies.map(dep => {
              // Legacy support + Object support
              if (typeof dep === 'string') return oldToNewModId[dep] || dep;
              return {
                ...dep,
                producerModuleId: oldToNewModId[dep.producerModuleId] || dep.producerModuleId
              };
            });
          }
          await db.modules.add(mod);
        }

        // Save Content
        for (const ent of data.entities) if (oldToNewModId[ent.moduleId]) await db.entities.add({ ...ent, id: uuidv4(), moduleId: oldToNewModId[ent.moduleId] });
        for (const act of data.actions) if (oldToNewModId[act.moduleId]) await db.actions.add({ ...act, id: uuidv4(), moduleId: oldToNewModId[act.moduleId] });

        // Save UI (Fix Links)
        if (data.uiElements) {
          for (const ui of data.uiElements) {
            if (oldToNewModId[ui.moduleId]) {
              // Remap the 'links' array to use the new IDs
              const newLinks = ui.links?.map((oldLink: string) => oldToNewUIId[oldLink]).filter(Boolean) || [];

              await db.uiElements.add({
                ...ui,
                id: oldToNewUIId[ui.id], // Use mapped ID
                moduleId: oldToNewModId[ui.moduleId],
                links: newLinks
              });
            }
          }
        }

        alert("Project imported successfully! Links preserved.");
        window.location.reload(); // Refresh to ensure IDs settle
      } catch (err) {
        alert("Failed to import project.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-[1400px] mx-auto py-10 px-6">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start mb-1">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">{Icons.Logo}</div>
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">AI Butler</h1>
          </div>
          <p className="text-gray-500 text-sm ml-1">OutSystems Context Manager & Digital Twin</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => setShowPromptModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 border border-purple-700 text-white rounded-lg hover:bg-purple-700 transition shadow-sm font-bold">{Icons.Robot} Master Prompt</button>
          <button onClick={() => setShowHelp(!showHelp)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium">{Icons.Help} Help</button>
          <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition shadow-sm font-medium">{Icons.Import} Import Project</button>
          <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".butler,.json" className="hidden" />
        </div>
      </header>

      {/* HELP BANNER */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-start">
            <h3 className="text-blue-900 font-bold mb-2">🚀 Getting Started</h3>
            <button onClick={() => setShowHelp(false)} className="text-blue-400 hover:text-blue-700">✕</button>
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-blue-800">
            <div><strong className="block mb-1 text-blue-900">1. Create a Twin</strong><p>Create a <b>Project</b> and a <b>Module</b> here to match your OutSystems environment (O11/ODC).</p></div>
            <div><strong className="block mb-1 text-blue-900">2. Define or Paste</strong><p>Inside a module, use <b>"Import"</b> to paste XML from Service Studio, or define Entities/Logic manually.</p></div>
            <div><strong className="block mb-1 text-blue-900">3. Generate Prompt</strong><p>Click <b>"Copy for AI"</b> to get a perfect context prompt for ChatGPT, preventing hallucinations.</p></div>
          </div>
        </div>
      )}

      {/* CREATE BAR */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 mb-10 flex flex-col md:flex-row gap-2">
        <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value as 'O11' | 'ODC')} className="bg-gray-50 border-r border-gray-100 text-gray-700 font-semibold px-4 py-3 rounded-lg md:rounded-none md:rounded-l-lg outline-none focus:bg-gray-100 min-w-[100px]">
          <option value="O11">O11</option>
          <option value="ODC">ODC</option>
        </select>
        <input type="text" placeholder="Enter new project name..." className="flex-grow px-4 py-3 outline-none text-gray-700 placeholder-gray-400" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddProject()} />
        <button onClick={handleAddProject} className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-black transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg">{Icons.Add} Create</button>
      </div>

      {/* PROJECT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((proj) => (
          <div key={proj.id} onClick={() => navigate(`/project/${proj.id}`)} className="group relative bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden flex flex-col min-h-[160px]">
            <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold rounded-bl-lg uppercase tracking-wider ${proj.platform === 'ODC' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>{proj.platform}</div>
            <div className="p-6 flex-grow">
              <div className="mb-2">{proj.platform === 'ODC' ? Icons.ODC : Icons.O11}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition">{proj.name}</h3>
              <p className="text-xs text-gray-400">Created {proj.createdAt.toLocaleDateString()}</p>
              <div className="mt-2 text-xs text-gray-400 line-clamp-2">{proj.description}</div>
            </div>
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex justify-between items-center opacity-80 group-hover:opacity-100 transition">
              <button onClick={(e) => handleExportProject(e, proj)} className="text-xs font-bold text-gray-500 hover:text-blue-600 flex items-center gap-1 transition">{Icons.Export} Backup</button>
              <button onClick={(e) => handleDelete(e, proj.id)} className="text-gray-300 hover:text-red-500 transition p-1 hover:bg-red-50 rounded">{Icons.Trash}</button>
            </div>
          </div>
        ))}
      </div>

      {/* MASTER PROMPT MODAL */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPromptModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">🤖 The Master Prompt</h3>
              <button onClick={() => setShowPromptModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">Paste this into ChatGPT/Claude <b>BEFORE</b> you paste your module context.</p>
              <div className="bg-gray-900 text-green-300 p-6 rounded-lg font-mono text-sm leading-relaxed whitespace-pre-wrap shadow-inner border border-gray-700">{MASTER_PROMPT}</div>
            </div>
            <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end">
              <button onClick={() => { navigator.clipboard.writeText(MASTER_PROMPT); alert("Prompt copied to clipboard!"); }} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition shadow-md flex items-center gap-2">📋 Copy to Clipboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN APP ROUTING ---
function App() {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/project/:projectId" element={<ProjectDetails />} />
        <Route path="/module/:moduleId" element={<ModuleDetails />} />
        <Route path="/module/:moduleId/entity/:entityId" element={<EntityEditor />} />
        <Route path="/module/:moduleId/action/:actionId" element={<ActionEditor />} />
        <Route path="/module/:moduleId/ui/:uiId" element={<UIEditor />} />
        <Route path="/module/:moduleId/diagram" element={<ModuleDiagram />} />
        <Route path="/module/:moduleId/action/:actionId/diagram" element={<ActionDiagram />} />
        <Route path="/module/:moduleId/ui-flow" element={<UIFlow />} />
      </Routes>
    </div>
  );
}

export default App;