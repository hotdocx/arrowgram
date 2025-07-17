import React, { useMemo } from 'react';

const editorStyles = {
    container: { padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', height: '100%', overflowY: 'auto', fontSize: '14px' },
    header: { fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px' },
    section: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '500' },
    input: { width: '100%', padding: '6px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '3px' },
    select: { width: '100%', padding: '6px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '3px' },
    info: { color: '#666', fontStyle: 'italic', fontSize: '12px', marginTop: '10px' }
};

function NodeEditor({ node, nodes, arrows, onSpecChange }) {
    const handleChange = (e) => {
        const { name, value } = e.target;
        const newNodes = nodes.map(n => n.name === node.name ? { ...n, [name]: value } : n);
        onSpecChange(JSON.stringify({ nodes: newNodes, arrows }, null, 2));
    };

    return (
        <div>
            <div style={editorStyles.section}>
                <label style={editorStyles.label}>Label</label>
                <input style={editorStyles.input} type="text" name="label" value={node.label || ''} onChange={handleChange} />
            </div>
        </div>
    );
}

function ArrowEditor({ arrow, nodes, arrows, onSpecChange }) {
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? Number(value) : value;
        const newArrows = arrows.map(a => {
            const key = `${a.from}-${a.to}-${a.name || `_arrow_${arrows.indexOf(a)}`}`;
            return key === arrow.key ? { ...a, [name]: val } : a;
        });
        onSpecChange(JSON.stringify({ nodes, arrows: newArrows }, null, 2));
    };

    const handleStyleChange = (part, name, value) => {
        const newArrows = arrows.map(a => {
            const key = `${a.from}-${a.to}-${a.name || `_arrow_${arrows.indexOf(a)}`}`;
            if (key === arrow.key) {
                const newStyle = { ...a.style };
                if (value !== undefined) { 
                    newStyle[part] = { ...(a.style?.[part] || {}), [name]: value };
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
        onSpecChange(JSON.stringify({ nodes, arrows: newArrows }, null, 2));
    }

    return (
        <div>
            <div style={editorStyles.section}>
                <label style={editorStyles.label}>Label</label>
                <input style={editorStyles.input} type="text" name="label" value={arrow.label || ''} onChange={handleChange} />
            </div>
            <div style={editorStyles.section}>
                <h4 style={editorStyles.header}>Label Style</h4>
                <label style={editorStyles.label}>Alignment</label>
                <select style={editorStyles.select} name="label_alignment" value={arrow.label_alignment || 'over'} onChange={handleChange}>
                    <option value="over">Over</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                </select>
            </div>
            <div style={editorStyles.section}>
                <h4 style={editorStyles.header}>Geometry</h4>
                <label style={editorStyles.label}>Curve</label>
                <input style={editorStyles.input} type="number" name="curve" value={arrow.curve || 0} onChange={handleChange} />
                <label style={editorStyles.label}>Shift</label>
                <input style={editorStyles.input} type="number" name="shift" value={arrow.shift || 0} onChange={handleChange} />
                 <label style={editorStyles.label}>Level (for parallel lines)</label>
                <input style={editorStyles.input} type="number" name="level" value={arrow.style?.level || 1} min="1" onChange={(e) => handleStyleChange('level', 'level', e.target.valueAsNumber)} />
            </div>
            <div style={editorStyles.section}>
                <h4 style={editorStyles.header}>Style</h4>
                <label style={editorStyles.label}>Body</label>
                <select style={editorStyles.select} value={arrow.style?.body?.name || 'solid'} onChange={(e) => handleStyleChange('body', 'name', e.target.value)}>
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                </select>
                <label style={editorStyles.label}>Head</label>
                <select style={editorStyles.select} value={arrow.style?.head?.name || 'normal'} onChange={(e) => handleStyleChange('head', 'name', e.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="epi">Epi (↠)</option>
                    <option value="none">None</option>
                </select>
                <label style={editorStyles.label}>Tail</label>
                <select style={editorStyles.select} value={arrow.style?.tail?.name || 'none'} onChange={(e) => handleStyleChange('tail', 'name', e.target.value)}>
                    <option value="none">None</option>
                    <option value="mono">Mono (↣)</option>
                </select>
            </div>
        </div>
    );
}


export function PropertyEditor({ selection, spec: specString, onSpecChange }) {
    const { nodes, arrows } = useMemo(() => {
        try {
            const spec = JSON.parse(specString);
            return { nodes: spec.nodes || [], arrows: spec.arrows || [] };
        } catch (e) {
            return { nodes: [], arrows: [] };
        }
    }, [specString]);

    const selectedItem = useMemo(() => {
        if (!selection?.key || !selection?.item) return null;
        
        const { key, item } = selection;

        // The item passed in the selection object is from the spec, which is what we want to edit.
        // We just need to determine if it's a node or an arrow.
        if (nodes.some(n => n.name === key)) {
            return { type: 'node', data: item };
        }
        
        // For arrows, we now have the spec and the key, so no complex lookup is needed.
        // We find the arrow in the spec list to ensure we're modifying the right one.
        // Note: this assumes arrow names are unique if present. A more robust solution might
        // need to rely on indices if names are not guaranteed unique by the editor.
        const arrowSpec = arrows.find(a => (a.name && a.name === item.name) || JSON.stringify(a) === JSON.stringify(item));
        if (arrowSpec) {
             return { type: 'arrow', data: { ...arrowSpec, key } };
        }

        return null;
    }, [selection, nodes, arrows]);

    if (!selectedItem) {
        return (
            <div style={editorStyles.container}>
                <div style={editorStyles.info}>
                    {!selection?.key ? 'Select a node or arrow to edit its properties.' : 'Multiple items selected.'}
                </div>
            </div>
        );
    }
    
    return (
        <div style={editorStyles.container}>
            <h3 style={editorStyles.header}>
                Edit {selectedItem.type}: {selectedItem.data.name || selectedItem.data.label || selectedItem.data.key}
            </h3>
            {selectedItem.type === 'node' && (
                <NodeEditor node={selectedItem.data} nodes={nodes} arrows={arrows} onSpecChange={onSpecChange} />
            )}
            {selectedItem.type === 'arrow' && (
                <ArrowEditor arrow={selectedItem.data} nodes={nodes} arrows={arrows} onSpecChange={onSpecChange} />
            )}
        </div>
    );
} 