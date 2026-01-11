import React, { useMemo } from 'react';
import { formatSpec } from './utils/specFormatter';
import { Input } from './components/ui/Input';
import { Select } from './components/ui/Select';
import { Label } from './components/ui/Label';
import { MousePointer2 } from 'lucide-react';
import { DiagramSpec, NodeSpec, ArrowSpec } from 'arrowgram';
import { SelectionState } from './store/diagramStore';

interface NodeEditorProps {
    node: NodeSpec;
    nodes: NodeSpec[];
    arrows: ArrowSpec[];
    onSpecChange: (spec: string) => void;
}

function NodeEditor({ node, nodes, arrows, onSpecChange }: NodeEditorProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newNodes = nodes.map(n => n.name === node.name ? { ...n, [name]: value } : n);
        onSpecChange(formatSpec({ nodes: newNodes, arrows }));
    };

    return (
        <div className="space-y-4">
            <div>
                <Label>Label</Label>
                <Input type="text" name="label" value={node.label || ''} onChange={handleChange} />
            </div>
        </div>
    );
}

interface ArrowEditorProps {
    arrow: ArrowSpec & { key?: string };
    nodes: NodeSpec[];
    arrows: ArrowSpec[];
    onSpecChange: (spec: string) => void;
}

function ArrowEditor({ arrow, nodes, arrows, onSpecChange }: ArrowEditorProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? Number(value) : value;
        const newArrows = arrows.map((a, index) => {
            const key = `${a.from}-${a.to}-${a.name || `_arrow_${index}`}`;
            return key === arrow.key ? { ...a, [name]: val } : a;
        });
        onSpecChange(formatSpec({ nodes, arrows: newArrows }));
    };

    const handleStyleChange = (part: string, name: string, value: any) => {
        const newArrows = arrows.map((a, index) => {
            const key = `${a.from}-${a.to}-${a.name || `_arrow_${index}`}`;
            if (key === arrow.key) {
                const newStyle: any = { ...a.style };
                if (value !== undefined) { 
                    newStyle[part] = { ...(a.style?.[part as keyof typeof a.style] || {}), [name]: value };
                } else {
                    newStyle[part] = name;
                }
                if (part === 'level') {
                  newStyle.level = value;
                  return { ...a, style: newStyle };
                }
                return { ...a, style: newStyle };
            }
            return a;
        });
        onSpecChange(formatSpec({ nodes, arrows: newArrows }));
    }

    return (
        <div className="space-y-6">
            <div>
                <Label>Content</Label>
                <Input type="text" name="label" value={arrow.label || ''} onChange={handleChange} placeholder="Label text" />
            </div>

            <div>
                <div className="pb-2 border-b border-gray-100 mb-3 font-semibold text-gray-700 text-sm">Label Placement</div>
                <div className="space-y-3">
                    <div>
                        <Label>Alignment</Label>
                        <Select name="label_alignment" value={arrow.label_alignment || 'over'} onChange={handleChange}>
                            <option value="over">Over</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                        </Select>
                    </div>
                </div>
            </div>

            <div>
                <div className="pb-2 border-b border-gray-100 mb-3 font-semibold text-gray-700 text-sm">Geometry</div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>Curve</Label>
                        <Input type="number" name="curve" value={arrow.curve || 0} onChange={handleChange} />
                    </div>
                    <div>
                        <Label>Shift</Label>
                        <Input type="number" name="shift" value={arrow.shift || 0} onChange={handleChange} />
                    </div>
                    <div className="col-span-2">
                        <Label>Level (Parallel)</Label>
                        <Input type="number" name="level" value={arrow.style?.level || 1} min={1} onChange={(e) => handleStyleChange('level', 'level', e.target.valueAsNumber)} />
                    </div>
                </div>
            </div>

            <div>
                <div className="pb-2 border-b border-gray-100 mb-3 font-semibold text-gray-700 text-sm">Styling</div>
                <div className="space-y-3">
                    <div>
                        <Label>Body Style</Label>
                        <Select value={arrow.style?.body?.name || 'solid'} onChange={(e) => handleStyleChange('body', 'name', e.target.value)}>
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Head</Label>
                            <Select value={arrow.style?.head?.name || 'normal'} onChange={(e) => handleStyleChange('head', 'name', e.target.value)}>
                                <option value="normal">Normal</option>
                                <option value="epi">Epi (↠)</option>
                                <option value="none">None</option>
                            </Select>
                        </div>
                        <div>
                            <Label>Tail</Label>
                            <Select value={arrow.style?.tail?.name || 'none'} onChange={(e) => handleStyleChange('tail', 'name', e.target.value)}>
                                <option value="none">None</option>
                                <option value="mono">Mono (↣)</option>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface PropertyEditorProps {
    selection: SelectionState;
    spec: string;
    onSpecChange: (spec: string) => void;
}

export function PropertyEditor({ selection, spec: specString, onSpecChange }: PropertyEditorProps) {
    const { nodes, arrows } = useMemo(() => {
        try {
            const spec: DiagramSpec = JSON.parse(specString);
            return { nodes: spec.nodes || [], arrows: spec.arrows || [] };
        } catch (e) {
            return { nodes: [], arrows: [] };
        }
    }, [specString]);

    const selectedItem = useMemo(() => {
        if (!selection?.key || !selection?.item) return null;
        
        const { key, item } = selection;

        if (nodes.some(n => n.name === key)) {
            return { type: 'node' as const, data: item as NodeSpec };
        }
        
        // Match arrow by name or deep equality if needed, but we rely on key passing from store mostly
        // Here we just ensure we have the fresh spec object corresponding to the selection
        const arrowSpec = arrows.find(a => (a.name && a.name === (item as ArrowSpec).name) || JSON.stringify(a) === JSON.stringify(item));
        if (arrowSpec) {
             return { type: 'arrow' as const, data: { ...arrowSpec, key } };
        }

        return null;
    }, [selection, nodes, arrows]);

    if (!selectedItem) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                    <MousePointer2 size={32} />
                </div>
                <p className="text-sm font-medium">No item selected</p>
                <p className="text-xs mt-1">Select a node or arrow on the canvas to edit its properties.</p>
            </div>
        );
    }
    
    return (
        <div>
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="capitalize">{selectedItem.type}</span>
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {selectedItem.data.name || selectedItem.data.key}
                    </span>
                </h3>
            </div>
            
            {selectedItem.type === 'node' && (
                <NodeEditor node={selectedItem.data} nodes={nodes} arrows={arrows} onSpecChange={onSpecChange} />
            )}
            {selectedItem.type === 'arrow' && (
                <ArrowEditor arrow={selectedItem.data} nodes={nodes} arrows={arrows} onSpecChange={onSpecChange} />
            )}
        </div>
    );
}
