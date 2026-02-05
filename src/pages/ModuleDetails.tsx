import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db, type DependencyElement } from '../db/butlerDB';
import { generateModuleContext } from '../utils/llmExporter';

// --- ICONS ---
const Icons = {
    Back: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
    Entity: <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>,
    Logic: <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Screen: <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    Edit: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
    Help: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
};

export default function ModuleDetails() {
    const { moduleId } = useParams();
    const navigate = useNavigate();

    // UI State
    const [showDependenciesModal, setShowDependenciesModal] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState('');
    const [exportMode, setExportMode] = useState<'Verbose' | 'Summary'>('Summary');

    // Data Fetching
    const module = useLiveQuery(() => db.modules.get(moduleId!), [moduleId]);
    const entities = useLiveQuery(() => db.entities.where({ moduleId: moduleId! }).toArray(), [moduleId]);
    const actions = useLiveQuery(() => db.actions.where({ moduleId: moduleId! }).toArray(), [moduleId]);
    const uiElements = useLiveQuery(() => db.uiElements.where({ moduleId: moduleId! }).toArray(), [moduleId]);

    const projectModules = useLiveQuery(
        () => module ? db.modules.where({ projectId: module.projectId }).toArray() : [],
        [module]
    );

    useEffect(() => { if (module) setTempDesc(module.description); }, [module]);

    const saveDescription = async () => {
        if (!module) return;
        await db.modules.update(module.id, { description: tempDesc });
        setIsEditingDesc(false);
    };

    // --- DEPENDENCY LOGIC ---
    const [availablePublicElements, setAvailablePublicElements] = useState<any[]>([]);

    const loadDependencyData = async () => {
        if (!projectModules) return;
        const siblings = projectModules.filter(m => m.id !== moduleId);

        const data = await Promise.all(siblings.map(async (mod) => {
            const ents = await db.entities.where({ moduleId: mod.id }).toArray();
            const acts = await db.actions.where({ moduleId: mod.id }).toArray();
            const uis = await db.uiElements.where({ moduleId: mod.id }).toArray();

            return {
                module: mod,
                elements: [
                    ...ents.filter(e => e.isPublic).map(e => ({
                        id: e.id, name: e.name, type: 'Entity'
                    })),
                    // Map Action Type to SubType (Crucial for ODC validation)
                    ...acts.filter(a => a.isPublic).map(a => ({
                        id: a.id, name: a.name, type: 'Action',
                        subType: a.type === 'Service' ? 'ServiceAction' : 'ServerAction'
                    })),
                    ...uis.filter(u => u.isPublic).map(u => ({
                        id: u.id, name: u.name, type: 'UI'
                    }))
                ]
            };
        }));
        setAvailablePublicElements(data);
    };

    const toggleDependencyElement = async (producerId: string, element: DependencyElement) => {
        if (!module) return;

        let currentDeps = module.dependencies || [];
        let producerDep = currentDeps.find(d => d.producerModuleId === producerId);

        if (!producerDep) {
            producerDep = { producerModuleId: producerId, elements: [element] };
            currentDeps = [...currentDeps, producerDep];
        } else {
            const exists = producerDep.elements.find(e => e.id === element.id);
            if (exists) {
                producerDep.elements = producerDep.elements.filter(e => e.id !== element.id);
                if (producerDep.elements.length === 0) {
                    currentDeps = currentDeps.filter(d => d.producerModuleId !== producerId);
                } else {
                    currentDeps = currentDeps.map(d => d.producerModuleId === producerId ? producerDep! : d);
                }
            } else {
                producerDep.elements.push(element);
                currentDeps = currentDeps.map(d => d.producerModuleId === producerId ? producerDep! : d);
            }
        }
        await db.modules.update(module.id, { dependencies: currentDeps });
    };

    const handleAddUI = async (type: 'Screen' | 'Block') => {
        navigate(`/module/${moduleId}/ui/new`);
    };

    const handleDeleteUI = async (id: string) => { if (confirm('Delete?')) await db.uiElements.delete(id); };
    const togglePublicUI = async (ui: any) => { await db.uiElements.update(ui.id, { isPublic: !ui.isPublic }); };

    const handleCopyContext = () => {
        if (!module) return;
        const jsonContext = generateModuleContext(module, entities || [], actions || [], uiElements || [], projectModules || [], exportMode);
        navigator.clipboard.writeText(jsonContext);
        alert(`Context copied! (${exportMode} Mode)`);
    };

    if (!module) return <div className="p-10 text-center text-gray-500">Loading...</div>;

    const roleLabel = module.odcRole ? module.odcRole : module.layer;
    const roleColor = module.odcRole === 'Library' ? 'bg-purple-50 text-purple-700' : (module.layer === 'End-User' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700');

    return (
        <div className="min-h-screen bg-[#F3F4F6] pb-20">
            {/* HEADER */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-800 transition p-2 rounded-full hover:bg-gray-100">{Icons.Back}</button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-800">{module.name}</h1>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${roleColor}`}>
                                    {roleLabel}
                                </span>
                            </div>
                            {isEditingDesc ? (
                                <div className="flex gap-2 mt-1">
                                    <input className="border rounded px-2 py-0.5 text-xs w-96 outline-none focus:ring-1 focus:ring-blue-500" value={tempDesc} onChange={e => setTempDesc(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveDescription()} />
                                    <button onClick={saveDescription} className="text-green-600 text-xs font-bold hover:underline">Save</button>
                                </div>
                            ) : (
                                <div className="group flex items-center gap-2 mt-1 cursor-pointer" onClick={() => setIsEditingDesc(true)}>
                                    <p className="text-xs text-gray-500 italic hover:text-gray-700 transition">{module.description || "Click to add a description..."}</p>
                                    <span className="opacity-0 group-hover:opacity-100 text-gray-400">{Icons.Edit}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { loadDependencyData(); setShowDependenciesModal(true); }} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition shadow-sm flex items-center gap-2"><span>🔗</span> Dependencies</button>
                        <div className="h-8 w-px bg-gray-200 mx-1"></div>

                        {/* EXPORT MODE TOGGLE & HELP */}
                        <div className="flex flex-col items-end">
                            <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-bold">
                                <button onClick={() => setExportMode('Summary')} className={`px-3 py-1 rounded transition ${exportMode === 'Summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Summary</button>
                                <button onClick={() => setExportMode('Verbose')} className={`px-3 py-1 rounded transition ${exportMode === 'Verbose' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Full</button>
                            </div>
                            <span className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-1">
                                {exportMode === 'Summary' ? '⚡ Saves tokens. Best for questions.' : '📝 Full detail. Best for coding.'}
                            </span>
                        </div>

                        <button onClick={handleCopyContext} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-md flex items-center gap-2"><span>✨</span> Copy for AI</button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 mt-8 space-y-8">
                {/* DEPENDENCIES SUMMARY */}
                {module.dependencies && module.dependencies.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">Consumed Dependencies</h3>
                        <div className="flex flex-wrap gap-4">
                            {module.dependencies.map(dep => {
                                const prodName = projectModules?.find(m => m.id === dep.producerModuleId)?.name || "Unknown";
                                return (
                                    <div key={dep.producerModuleId} className="bg-gray-50 border border-gray-200 rounded-lg p-3 min-w-[200px]">
                                        <div className="font-bold text-sm text-gray-800 mb-2 border-b pb-1 flex justify-between">
                                            {prodName}
                                            <span className="text-xs text-gray-400 font-normal">{dep.elements.length} items</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {dep.elements.map(el => (
                                                <span key={el.id} className={`text-[10px] px-2 py-0.5 rounded border ${el.type === 'Entity' ? 'bg-blue-50 text-blue-700 border-blue-100' : el.type === 'Action' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                                    {el.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 3 COLUMN LAYOUT */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* DATA */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[650px]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                            <div className="flex items-center gap-2 font-bold text-gray-800"><div className="p-1.5 bg-blue-100 text-blue-600 rounded">{Icons.Entity}</div> Data</div>
                            <div className="flex gap-2">
                                <Link to={`/module/${moduleId}/diagram`} className="text-indigo-600 text-xs font-bold hover:bg-indigo-50 px-2 py-1 rounded transition">ERD</Link>
                                <Link to={`/module/${moduleId}/entity/new`} className="text-blue-600 text-xs font-bold hover:bg-blue-50 px-2 py-1 rounded transition">+ Entity</Link>
                            </div>
                        </div>
                        <div className="p-3 overflow-y-auto flex-grow space-y-2">
                            {entities?.map(ent => (
                                <Link key={ent.id} to={`/module/${moduleId}/entity/${ent.id}`} className="group block p-3 border border-gray-100 rounded-lg hover:border-blue-400 hover:shadow-sm transition bg-white">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-sm text-gray-700 group-hover:text-blue-600">{ent.name}</span>
                                        {ent.isPublic && <span className="text-[9px] bg-gray-100 px-1 rounded border text-gray-500">Public</span>}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">{ent.attributes.length} fields</div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* LOGIC */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[650px]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                            <div className="flex items-center gap-2 font-bold text-gray-800"><div className="p-1.5 bg-orange-100 text-orange-600 rounded">{Icons.Logic}</div> Logic</div>
                            <Link to={`/module/${moduleId}/action/new`} className="text-orange-600 text-xs font-bold hover:bg-orange-50 px-2 py-1 rounded transition">+ Action</Link>
                        </div>
                        <div className="p-3 overflow-y-auto flex-grow space-y-2">
                            {actions?.map(act => (
                                <div key={act.id} className="group p-3 border border-gray-100 rounded-lg hover:border-orange-400 hover:shadow-sm transition bg-white relative">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-sm text-gray-700">{act.name}</span>
                                        <div className="flex gap-1">
                                            <span className="text-[9px] bg-gray-100 px-1 rounded">{act.type}</span>
                                            {act.isPublic && <span className="text-[9px] bg-orange-50 text-orange-600 px-1 rounded border border-orange-100">Public</span>}
                                        </div>
                                    </div>
                                    <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link to={`/module/${moduleId}/action/${act.id}`} className="text-[10px] bg-gray-50 border px-2 py-1 rounded hover:bg-white font-bold text-gray-600">Edit</Link>
                                        <Link to={`/module/${moduleId}/action/${act.id}/diagram`} className="text-[10px] bg-gray-50 border px-2 py-1 rounded hover:bg-white font-bold text-gray-600">Flow</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* INTERFACE (UPDATED LIST) */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[650px]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                            <div className="flex items-center gap-2 font-bold text-gray-800"><div className="p-1.5 bg-green-100 text-green-600 rounded">{Icons.Screen}</div> Interface</div>
                            <div className="flex gap-2">
                                <Link to={`/module/${moduleId}/ui-flow`} className="text-indigo-600 text-xs font-bold hover:bg-indigo-50 px-2 py-1 rounded transition">User Flow</Link>
                                <button onClick={() => handleAddUI('Screen')} className="text-green-600 text-xs font-bold hover:bg-green-50 px-2 py-1 rounded transition">+ UI</button>
                            </div>
                        </div>
                        <div className="p-3 overflow-y-auto flex-grow space-y-3">
                            {uiElements?.map(ui => (
                                <div key={ui.id} className="group p-3 border border-gray-100 rounded-lg hover:border-green-400 hover:shadow-sm transition bg-white relative flex flex-col gap-2">
                                    {/* Header Row */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-gray-800">{ui.name}</span>
                                                <span className={`text-[9px] uppercase border px-1 rounded ${ui.type === 'Screen' ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-500 border-gray-200 bg-gray-50'}`}>{ui.type}</span>
                                            </div>
                                            {ui.archetype && ui.archetype !== 'Blank' && <span className="text-[10px] text-gray-400">{ui.archetype}</span>}
                                        </div>
                                        <button onClick={() => handleDeleteUI(ui.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">✕</button>
                                    </div>

                                    {/* Inputs & Vars Preview */}
                                    {(ui.inputs?.length || 0) + (ui.localVariables?.length || 0) > 0 && (
                                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 bg-gray-50 p-2 rounded">
                                            {ui.inputs && ui.inputs.length > 0 && (
                                                <div className="flex items-center gap-1" title="Input Parameters">
                                                    <span className="font-bold text-blue-600">IN:</span>
                                                    {ui.inputs.map(i => i.name).join(', ')}
                                                </div>
                                            )}
                                            {ui.localVariables && ui.localVariables.length > 0 && (
                                                <div className="flex items-center gap-1" title="Local Variables">
                                                    <span className="font-bold text-green-600">VAR:</span>
                                                    {ui.localVariables.length} defined
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer / Edit */}
                                    <div className="flex justify-between items-center mt-1">
                                        <label className="text-[10px] flex items-center gap-1 cursor-pointer text-gray-400 hover:text-green-600">
                                            <input type="checkbox" checked={ui.isPublic} onChange={() => togglePublicUI(ui)} className="accent-green-600" />
                                            Public
                                        </label>
                                        <Link to={`/module/${moduleId}/ui/${ui.id}`} className="text-[10px] bg-gray-50 border px-2 py-1 rounded hover:bg-white font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition">Edit Specs</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* DEPENDENCY MODAL */}
            {showDependenciesModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg">Manage Dependencies</h3>
                            <button onClick={() => setShowDependenciesModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="flex flex-grow overflow-hidden">
                            <div className="w-1/3 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Producers</h4>
                                {availablePublicElements.map((prod) => (
                                    <div key={prod.module.id} className="mb-6">
                                        <div className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-2">
                                            {prod.module.name}
                                            {/* Show ODC Role if available, else Layer */}
                                            <span className="text-[9px] bg-gray-200 px-1 rounded font-normal">{prod.module.odcRole || prod.module.layer}</span>
                                        </div>
                                        <div className="space-y-1">
                                            {prod.elements.length === 0 && <p className="text-xs text-gray-400 italic">No public elements.</p>}
                                            {prod.elements.map((el: any) => {
                                                const isSelected = module?.dependencies?.find(d => d.producerModuleId === prod.module.id)?.elements.some(e => e.id === el.id);
                                                return (
                                                    <div key={el.id} onClick={() => toggleDependencyElement(prod.module.id, el)} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border transition ${isSelected ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                                                        <input type="checkbox" checked={!!isSelected} readOnly className="pointer-events-none accent-blue-600" />
                                                        <span className={`w-1.5 h-1.5 rounded-full ${el.type === 'Entity' ? 'bg-blue-400' : el.type === 'Action' ? 'bg-orange-400' : 'bg-green-400'}`}></span>
                                                        <span className="truncate">{el.name}</span>
                                                        {el.subType && <span className="ml-auto text-[8px] bg-gray-100 border text-gray-500 px-1 rounded">{el.subType === 'ServiceAction' ? 'SVC' : 'SVR'}</span>}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="w-2/3 p-8 flex flex-col items-center justify-center text-center text-gray-500">
                                <span className="text-6xl mb-4">🔗</span>
                                <h3 className="text-xl font-bold text-gray-700 mb-2">Dependency Manager</h3>
                                <p className="max-w-md">Select public elements to consume in <b>{module.name}</b>. Service Actions (SVC) are preferred for ODC cross-app communication.</p>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setShowDependenciesModal(false)} className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition shadow-md">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}