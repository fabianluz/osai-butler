import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type UIElement, type Variable, type DataType, type UIArchetype, type UIEvent } from '../db/butlerDB';

const DATA_TYPES: DataType[] = ['Text', 'Integer', 'LongInteger', 'Decimal', 'Boolean', 'DateTime', 'Date', 'Identifier', 'Binary', 'Record', 'List'];
const ARCHETYPES: UIArchetype[] = ['Blank', 'CRUD_List', 'CRUD_Detail', 'Dashboard', 'Home', 'Login', 'Popup', 'Other'];

export default function UIEditor() {
    const { moduleId, uiId } = useParams();
    const navigate = useNavigate();
    const isNew = uiId === 'new';

    
    const [name, setName] = useState('');
    const [type, setType] = useState<'Screen' | 'Block'>('Screen');
    const [description, setDescription] = useState('');
    const [archetype, setArchetype] = useState<UIArchetype>('Blank');
    const [isPublic, setIsPublic] = useState(false);

    const [inputs, setInputs] = useState<Variable[]>([]);
    const [localVariables, setLocalVariables] = useState<Variable[]>([]);
    const [events, setEvents] = useState<UIEvent[]>([]);
    const [links, setLinks] = useState<string[]>([]); 

    
    const moduleScreens = useLiveQuery(() =>
        db.uiElements.where({ moduleId: moduleId! }).toArray()
        , [moduleId]);

    
    useEffect(() => {
        if (!isNew && uiId) {
            db.uiElements.get(uiId).then((ui) => {
                if (ui) {
                    setName(ui.name);
                    setType(ui.type);
                    setDescription(ui.description);
                    setArchetype(ui.archetype || 'Blank');
                    setIsPublic(ui.isPublic);
                    setInputs(ui.inputs || []);
                    setLocalVariables(ui.localVariables || []);
                    setEvents(ui.events || []);
                    setLinks(ui.links || []);
                }
            });
        }
    }, [uiId, isNew]);

    const handleSave = async () => {
        if (!name || !moduleId) return;

        const uiData: UIElement = {
            id: isNew ? uuidv4() : uiId!,
            moduleId,
            name,
            type,
            description,
            isPublic,
            archetype,
            inputs,
            localVariables,
            events,
            links
        };

        await db.uiElements.put(uiData);
        navigate(-1);
    };

    const toggleLink = (targetId: string) => {
        setLinks(prev => prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[85vh]">

                {/* Header */}
                <div className="bg-gray-800 text-white p-6 flex justify-between items-center shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {isNew ? 'New' : 'Edit'} {type}
                            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded font-normal text-gray-300 border border-gray-600">{archetype}</span>
                        </h1>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => navigate(-1)} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
                        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-bold transition">Save</button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-8 flex gap-8">

                    {/* LEFT COLUMN: Metadata & Flow */}
                    <div className="w-1/3 space-y-6 border-r pr-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded focus:ring-2 ring-blue-500 outline-none" placeholder="e.g. ProductDetail" autoFocus />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded h-24 text-sm resize-none" placeholder="What does this screen do?" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Archetype</label>
                                <select value={archetype} onChange={e => setArchetype(e.target.value as UIArchetype)} className="w-full border p-2 rounded text-sm bg-white">
                                    {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Settings</label>
                                <div className="flex items-center gap-2 mt-2">
                                    <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="accent-blue-600" />
                                    <span className="text-sm">Is Public?</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t">
                            <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">🔗 Navigation Links</h3>
                            <p className="text-xs text-gray-500 mb-3">Which screens can the user navigate to directly from here?</p>

                            <div className="bg-gray-50 border rounded-lg h-48 overflow-y-auto p-2 space-y-1">
                                {moduleScreens?.filter(s => s.id !== uiId).map(s => (
                                    <div key={s.id} onClick={() => toggleLink(s.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border transition ${links.includes(s.id) ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                                        <input type="checkbox" checked={links.includes(s.id)} readOnly className="pointer-events-none accent-blue-600" />
                                        <span className={`w-1.5 h-1.5 rounded-full ${s.type === 'Screen' ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                                        <span>{s.name}</span>
                                    </div>
                                ))}
                                {moduleScreens?.length === 0 && <div className="text-xs text-gray-400 p-2 italic">No other screens in this module.</div>}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Signature */}
                    <div className="w-2/3 space-y-6">
                        <VariableList title="📥 Input Parameters" vars={inputs} setVars={setInputs} />
                        <VariableList title="📦 Local Variables" vars={localVariables} setVars={setLocalVariables} />

                        {type === 'Block' && (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">⚡ Events</span>
                                    <button onClick={() => setEvents([...events, { id: uuidv4(), name: 'OnNotify' }])} className="text-blue-600 text-xs hover:underline">+ Add Event</button>
                                </div>
                                <div className="space-y-1 bg-gray-50 p-2 rounded border border-gray-100 min-h-[50px]">
                                    {events.map((ev, idx) => (
                                        <div key={ev.id} className="flex gap-1 items-center">
                                            <input value={ev.name} onChange={e => { const n = [...events]; n[idx].name = e.target.value; setEvents(n); }} className="flex-grow border p-1 rounded text-xs" placeholder="Event Name" />
                                            <button onClick={() => setEvents(events.filter(e => e.id !== ev.id))} className="text-red-400 hover:text-red-600 text-xs px-1">×</button>
                                        </div>
                                    ))}
                                    {events.length === 0 && <span className="text-xs text-gray-400 italic pl-1">No events defined.</span>}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}


function VariableList({ title, vars, setVars }: { title: string, vars: Variable[], setVars: React.Dispatch<React.SetStateAction<Variable[]>> }) {
    const add = () => setVars(prev => [...prev, { id: uuidv4(), name: 'NewVar', dataType: 'Text', isList: false, isMandatory: false }]);
    const update = (id: string, field: string, val: any) => setVars(prev => prev.map(v => v.id === id ? { ...v, [field]: val } : v));
    const remove = (id: string) => setVars(prev => prev.filter(v => v.id !== id));

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-gray-500 uppercase">{title}</span>
                <button onClick={add} className="text-blue-600 text-xs hover:underline">+ Add</button>
            </div>
            <div className="space-y-1 bg-gray-50 p-2 rounded border border-gray-100 min-h-[50px]">
                {vars.map(v => (
                    <div key={v.id} className="flex gap-1 items-center">
                        <input value={v.name} onChange={e => update(v.id, 'name', e.target.value)} className="flex-grow border p-1 rounded text-xs" placeholder="Name" />
                        <select value={v.dataType} onChange={e => update(v.id, 'dataType', e.target.value)} className="w-24 border p-1 rounded text-[10px]">
                            {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="flex items-center gap-1">
                            <input type="checkbox" checked={v.isMandatory} onChange={e => update(v.id, 'isMandatory', e.target.checked)} title="Is Mandatory?" />
                            <span className="text-[9px] text-gray-400">M</span>
                        </div>
                        <button onClick={() => remove(v.id)} className="text-red-400 hover:text-red-600 text-xs px-1">×</button>
                    </div>
                ))}
                {vars.length === 0 && <span className="text-xs text-gray-400 italic pl-1">No variables defined.</span>}
            </div>
        </div>
    );
}