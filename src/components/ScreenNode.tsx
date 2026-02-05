import { Handle, Position } from '@xyflow/react';
import { type UIElement } from '../db/butlerDB';

const Icons = {
    Input: <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">IN</span>,
    Var: <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded border border-green-100">VAR</span>,
    Event: <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1 rounded border border-orange-100">EVT</span>
};

export default function ScreenNode({ data }: { data: UIElement }) {
    const isScreen = data.type === 'Screen';
    const borderColor = isScreen ? 'border-green-600' : 'border-gray-500';
    const bgColor = isScreen ? 'bg-green-600' : 'bg-gray-600';

    return (
        // FIXED WIDTH: 250px to match UIFlow constants
        <div className={`w-[250px] bg-white border-2 ${borderColor} rounded-md shadow-md overflow-hidden flex flex-col relative`}>
            {/* Header */}
            <div className={`${bgColor} text-white px-3 py-1.5 font-bold text-xs flex justify-between items-center`}>
                <span className="truncate max-w-[160px]" title={data.name}>{data.name}</span>
                <span className="text-[8px] uppercase opacity-90 border border-white/30 px-1 rounded bg-black/10 whitespace-nowrap">
                    {data.archetype || 'Blank'}
                </span>
            </div>

            {/* Content Body */}
            <div className="p-2 bg-gray-50 flex-grow space-y-2 min-h-[40px]">

                {/* Inputs */}
                {data.inputs && data.inputs.length > 0 && (
                    <div className="border-b border-gray-200 pb-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Parameters</p>
                        {data.inputs.slice(0, 3).map(v => (
                            <div key={v.id} className="flex justify-between items-center text-[10px] py-0.5">
                                <div className="flex items-center gap-1 overflow-hidden">
                                    {Icons.Input}
                                    <span className="text-gray-700 truncate">{v.name}</span>
                                </div>
                                <span className="text-gray-400 shrink-0 scale-90 origin-right">{v.dataType}</span>
                            </div>
                        ))}
                        {data.inputs.length > 3 && <div className="text-[9px] text-gray-400 italic pl-1">+{data.inputs.length - 3} more...</div>}
                    </div>
                )}

                {/* Variables */}
                {data.localVariables && data.localVariables.length > 0 && (
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Variables</p>
                        {data.localVariables.slice(0, 3).map(v => (
                            <div key={v.id} className="flex justify-between items-center text-[10px] py-0.5">
                                <div className="flex items-center gap-1 overflow-hidden">
                                    {Icons.Var}
                                    <span className="text-gray-700 truncate">{v.name}</span>
                                </div>
                                <span className="text-gray-400 shrink-0 scale-90 origin-right">{v.dataType}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {(!data.inputs?.length && !data.localVariables?.length && !data.events?.length) && (
                    <div className="text-center py-2 text-gray-300 text-[10px] italic">
                        No parameters defined
                    </div>
                )}
            </div>

            {/* Connection Handles */}
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-gray-800 !border-2 !border-white z-50 -ml-1.5" />
            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-gray-800 !border-2 !border-white z-50 -mr-1.5" />
        </div>
    );
}