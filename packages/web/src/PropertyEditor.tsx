import React, { useMemo } from 'react';
import { formatSpec } from './utils/specFormatter';
import { Input } from './components/ui/Input';
import { Select } from './components/ui/Select';
import { Label } from './components/ui/Label';
import { Button } from './components/ui/Button';
import { MousePointer2, Trash2 } from 'lucide-react';
import { DiagramSpec, NodeSpec, ArrowSpec, normalizeAngle } from '@hotdocx/arrowgram';
import { SelectionState, useDiagramStore } from './store/diagramStore';

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
            <div>
                <Label>Color</Label>
                <div className="flex gap-2">
                    <Input type="color" name="color" value={node.color || '#000000'} onChange={handleChange} className="w-12 h-10 p-1" />
                    <Input type="text" name="color" value={node.color || ''} onChange={handleChange} placeholder="#000000" />
                </div>
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
        let val = type === 'number' ? Number(value) : value;

        if (name === 'angle' && typeof val === 'number' && !isNaN(val)) {
            val = normalizeAngle(val);
        }

        const newArrows = arrows.map((a, index) => {
            const key = a.name || `_arrow_${index}`;
            return key === arrow.key ? { ...a, [name]: val } : a;
        });
        onSpecChange(formatSpec({ nodes, arrows: newArrows }));
    };

    const handleShortenChange = (prop: 'source' | 'target', value: number) => {
        const newArrows = arrows.map((a, index) => {
            const key = a.name || `_arrow_${index}`;
            if (key === arrow.key) {
                const currentShorten = a.shorten || {};
                return { ...a, shorten: { ...currentShorten, [prop]: value } };
            }
            return a;
        });
        onSpecChange(formatSpec({ nodes, arrows: newArrows }));
    };

    const handleStyleChange = (part: string, name: string, value: any) => {
        const newArrows = arrows.map((a, index) => {
            const key = a.name || `_arrow_${index}`;
            if (key === arrow.key) {
                const newStyle: any = { ...a.style };
                if (part === 'level') {
                    newStyle.level = value;
                } else if (part === 'mode') {
                    newStyle.mode = value;
                } else if (value !== undefined) {
                    const subStyle = (newStyle[part] || {}) as Record<string, any>;
                    newStyle[part] = { ...subStyle, [name]: value };
                } else {
                    newStyle[part] = name;
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
                <Label>Colors</Label>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs">Arrow</Label>
                        <div className="flex gap-2">
                            <Input type="color" name="color" value={arrow.color || '#000000'} onChange={handleChange} className="w-8 h-8 p-0" />
                            <Input type="text" name="color" value={arrow.color || ''} onChange={handleChange} placeholder="Arrow Color" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Label</Label>
                        <div className="flex gap-2">
                            <Input type="color" name="label_color" value={arrow.label_color || '#000000'} onChange={handleChange} className="w-8 h-8 p-0" />
                            <Input type="text" name="label_color" value={arrow.label_color || ''} onChange={handleChange} placeholder="Label Color" />
                        </div>
                    </div>
                </div>
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
                    {arrow.from === arrow.to ? (
                        <>
                            <div>
                                <Label>Radius</Label>
                                <Input type="number" name="radius" value={arrow.radius || 0} onChange={handleChange} />
                            </div>
                            <div>
                                <Label>Angle</Label>
                                <Input type="number" name="angle" value={arrow.angle || 0} min={-180} max={180} onChange={handleChange} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <Label>Curve</Label>
                                <Input type="number" name="curve" value={arrow.curve || 0} onChange={handleChange} />
                            </div>
                            <div>
                                <Label>Shift</Label>
                                <Input type="number" name="shift" value={arrow.shift || 0} onChange={handleChange} />
                            </div>
                        </>
                    )}
                    <div>
                        <Label>Shorten Start</Label>
                        <Input type="number" value={arrow.shorten?.source || 0} onChange={(e) => handleShortenChange('source', e.target.valueAsNumber)} />
                    </div>
                    <div>
                        <Label>Shorten End</Label>
                        <Input type="number" value={arrow.shorten?.target || 0} onChange={(e) => handleShortenChange('target', e.target.valueAsNumber)} />
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
                        <Label>Type</Label>
                        <Select value={arrow.style?.mode || 'arrow'} onChange={(e) => handleStyleChange('mode', 'arrow', e.target.value)}>
                            <option value="arrow">Arrow</option>
                            <option value="adjunction">Adjunction (⊣)</option>
                            <option value="corner">Pullback (⌟)</option>
                            <option value="corner_inverse">Pushout (⌜)</option>
                        </Select>
                    </div>
                    {(!arrow.style?.mode || arrow.style.mode === 'arrow') && (
                        <>
                            <div>
                                <Label>Body Style</Label>
                                <Select value={arrow.style?.body?.name || 'solid'} onChange={(e) => handleStyleChange('body', 'name', e.target.value)}>
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                    <option value="none">None</option>
                                    <option value="squiggly">Squiggly</option>
                                    <option value="barred">Barred</option>
                                    <option value="double_barred">Double Barred</option>
                                    <option value="bullet_solid">Bullet (Solid)</option>
                                    <option value="bullet_hollow">Bullet (Hollow)</option>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Head</Label>
                                    <Select value={arrow.style?.head?.name || 'normal'} onChange={(e) => handleStyleChange('head', 'name', e.target.value)}>
                                        <option value="normal">Normal</option>
                                        <option value="epi">Epi (↠)</option>
                                        <option value="none">None</option>
                                        <option value="maps_to">Bar (|)</option>
                                        <option value="hook">Hook (↪)</option>
                                        <option value="harpoon">Harpoon (⇀)</option>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Tail</Label>
                                    <Select value={arrow.style?.tail?.name || 'none'} onChange={(e) => handleStyleChange('tail', 'name', e.target.value)}>
                                        <option value="none">None</option>
                                        <option value="mono">Mono (↣)</option>
                                        <option value="maps_to">Maps to (|)</option>
                                        <option value="hook">Hook (↩)</option>
                                    </Select>
                                </div>
                            </div>
                        </>
                    )}
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
    const deleteSelection = useDiagramStore(state => state.deleteSelection);

    const { nodes, arrows } = useMemo(() => {
        try {
            const spec: DiagramSpec = JSON.parse(specString);
            return { nodes: spec.nodes || [], arrows: spec.arrows || [] };
        } catch (e) {
            return { nodes: [], arrows: [] };
        }
    }, [specString]);

    const selectedItem = useMemo(() => {
        if (!selection?.key) return null;

        const { key } = selection;

        const foundNode = nodes.find(n => n.name === key);
        if (foundNode) {
            return { type: 'node' as const, data: foundNode };
        }

        const foundArrow = arrows.find((a, index) => {
            const uniqueId = a.name || `_arrow_${index}`;
            return uniqueId === key;
        });

        if (foundArrow) {
            return { type: 'arrow' as const, data: { ...foundArrow, key } };
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

    // @ts-ignore
    const displayName = selectedItem.type === 'node' ? selectedItem.data.name : (selectedItem.data.name || selectedItem.data.key);

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="capitalize">{selectedItem.type}</span>
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full max-w-[150px] truncate">
                        {displayName}
                    </span>
                </h3>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={deleteSelection} title="Delete">
                    <Trash2 size={18} />
                </Button>
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
