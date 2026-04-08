import React, { useState, useRef, useEffect } from "react";
import { AuxNode } from "@/types/signage";
import * as LucideIcons from "lucide-react";

const generateId = () => Math.random().toString(36).substr(2, 9);

type EditorTab = "content" | "structure";

/* ─── Drag state shared via context ──────────────────────────────── */
interface DragCtx {
  draggedId: string | null;
  dragOverId: string | null;
  setDraggedId: (id: string | null) => void;
  setDragOverId: (id: string | null) => void;
  onDrop: (overId: string) => void;
}
const DragContext = React.createContext<DragCtx>({
  draggedId: null, dragOverId: null,
  setDraggedId: () => {}, setDragOverId: () => {}, onDrop: () => {},
});

/* ─── Edit state via context ──────────────────────────────────────── */
interface EditCtx {
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  updateNodeContent: (id: string, content: string) => void;
}
const EditContext = React.createContext<EditCtx>({
  editingId: null, setEditingId: () => {}, updateNodeContent: () => {},
});

/* ─── Main Editor ─────────────────────────────────────────────────── */

export default function AuxiliaryEditor({ layout, onChange }: { layout?: AuxNode; onChange: (l: AuxNode | undefined) => void }) {
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!layout) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-white/5 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent">
        <div className="bg-brand-accent/20 p-8 rounded-3xl mb-8 shadow-2xl">
          <LucideIcons.LayoutPanelTop className="w-12 h-12 text-brand-accent animate-pulse" />
        </div>
        <h3 className="text-2xl font-black mb-3 text-white tracking-tighter">Design Studio</h3>
        <p className="text-gray-500 text-sm mb-8 text-center max-w-sm font-medium leading-relaxed">Craft a secondary signage layout with full WYSIWYG precision.</p>
        <button
          onClick={() => onChange({ id: generateId(), type: 'col', children: [], flex: 1, padding: '0px', gap: 16 })}
          className="bg-brand-accent hover:shadow-[0_0_30px_rgba(255,102,0,0.4)] text-black font-black py-4 px-10 rounded-full transition-all active:scale-95 text-sm uppercase tracking-widest"
        >
          Begin Composition
        </button>
      </div>
    );
  }

  /* ── Tree utilities ─────────────────────────────────────────────── */

  const findNodeById = (node: AuxNode, id: string): AuxNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const findParentOf = (root: AuxNode, targetId: string): AuxNode | null => {
    if (!root.children) return null;
    for (const child of root.children) {
      if (child.id === targetId) return root;
      const found = findParentOf(child, targetId);
      if (found) return found;
    }
    return null;
  };

  const findAndReplaceNode = (root: AuxNode, id: string, newNode: AuxNode | null): AuxNode | null => {
    if (root.id === id) return newNode;
    if (root.children) {
      const newChildren = root.children
        .map(c => findAndReplaceNode(c, id, newNode))
        .filter((c): c is AuxNode => c !== null);
      return { ...root, children: newChildren };
    }
    return root;
  };

  const updateNode = (id: string, updates: Partial<AuxNode>) => {
    const root = findNodeById(layout, id);
    if (!root) return;
    const newLayout = findAndReplaceNode(layout, id, { ...root, ...updates });
    onChange(newLayout || undefined);
  };

  const removeNode = (id: string) => {
    const newLayout = findAndReplaceNode(layout, id, null);
    onChange(newLayout || undefined);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  /* ── Drag reorder ───────────────────────────────────────────────── */

  const handleDrop = (overId: string) => {
    if (!draggedId || draggedId === overId) { setDraggedId(null); setDragOverId(null); return; }
    const parent = findParentOf(layout, draggedId);
    const overParent = findParentOf(layout, overId);
    if (!parent || !overParent || parent.id !== overParent.id || !parent.children) {
      setDraggedId(null); setDragOverId(null); return;
    }
    const children = [...parent.children];
    const fromIdx = children.findIndex(c => c.id === draggedId);
    const toIdx   = children.findIndex(c => c.id === overId);
    if (fromIdx === -1 || toIdx === -1) { setDraggedId(null); setDragOverId(null); return; }
    const [pulled] = children.splice(fromIdx, 1);
    children.splice(toIdx, 0, pulled);
    const newLayout = findAndReplaceNode(layout, parent.id, { ...parent, children });
    onChange(newLayout || undefined);
    setDraggedId(null);
    setDragOverId(null);
  };

  /* ── Block / structure insertion ────────────────────────────────── */

  const addContentBlock = (type: AuxNode['type']) => {
    let targetNode = selectedNodeId ? findNodeById(layout, selectedNodeId) : layout;
    if (targetNode && targetNode.type !== 'col' && targetNode.type !== 'row') targetNode = layout;
    if (targetNode && (targetNode.type === 'col' || targetNode.type === 'row')) {
      const isContainer = type === 'row' || type === 'col';
      const newNode: AuxNode = {
        id: generateId(), type,
        children: isContainer ? [] : undefined,
        content: type === 'text' ? '<p style="color:white;font-size:1.5rem;font-weight:900;margin:0;">NEW TEXT</p>' : type === 'button' ? 'CLICK HERE' : '',
        flex: 1,
        ...(isContainer ? { padding: '0px', gap: 16 } : {}),
        ...(type === 'image' ? { objectFit: 'contain' } : {}),
      };
      const updatedTarget = { ...targetNode, children: [...(targetNode.children || []), newNode] };
      const newLayout = findAndReplaceNode(layout, targetNode.id, updatedTarget);
      onChange(newLayout || undefined);
      setSelectedNodeId(newNode.id);
    }
  };

  const addStructureRow = (colsCount: number) => {
    const children: AuxNode[] = Array.from({ length: colsCount }).map(() => ({
      id: generateId(), type: 'col', children: [], flex: 1, padding: '0px', gap: 16
    }));
    const newRow: AuxNode = { id: generateId(), type: 'row', children, flex: 1, gap: 16 };
    onChange({ ...layout, children: [...(layout.children || []), newRow] });
    setSelectedNodeId(newRow.id);
  };

  const selectedNode = selectedNodeId ? findNodeById(layout, selectedNodeId) : null;

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <DragContext.Provider value={{ draggedId, dragOverId, setDraggedId, setDragOverId, onDrop: handleDrop }}>
      <EditContext.Provider value={{ editingId, setEditingId, updateNodeContent: (id, content) => updateNode(id, { content }) }}>
        <div className="flex flex-col lg:flex-row gap-0 min-h-[900px] bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Sidebar */}
          <div className="w-full lg:w-80 flex flex-col bg-[#090909] border-r border-white/5 shrink-0">
            <div className="flex p-2 gap-1 border-b border-white/5 bg-black/30">
              <TabBtn active={activeTab === 'content'} onClick={() => setActiveTab('content')}>Blocks</TabBtn>
              <TabBtn active={activeTab === 'structure'} onClick={() => setActiveTab('structure')}>Rows</TabBtn>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {activeTab === 'content' && (
                <div className="grid grid-cols-2 gap-2">
                  <BlockBtn icon="Heading" label="Heading" onClick={() => addContentBlock('text')} />
                  <BlockBtn icon="Code" label="HTML" onClick={() => addContentBlock('text')} />
                  <BlockBtn icon="Image" label="Image" onClick={() => addContentBlock('image')} />
                  <BlockBtn icon="Video" label="Video" onClick={() => addContentBlock('video')} />
                  <BlockBtn icon="ExternalLink" label="Button" onClick={() => addContentBlock('button')} />
                  <BlockBtn icon="Minus" label="Divider" onClick={() => addContentBlock('divider')} />
                </div>
              )}

              {activeTab === 'structure' && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-1 mb-4">Click to insert a row</p>
                  <StructureRow cols={1} onClick={() => addStructureRow(1)} />
                  <StructureRow cols={2} onClick={() => addStructureRow(2)} />
                  <StructureRow cols={3} onClick={() => addStructureRow(3)} />
                </div>
              )}

              {selectedNode && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_6px_rgba(255,102,0,1)]" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Editing: {selectedNode.type}</span>
                    </div>
                    <button onClick={() => setSelectedNodeId(null)} className="text-gray-600 hover:text-brand-accent transition-colors"><LucideIcons.X size={16} /></button>
                  </div>
                  <div className="bg-white/[0.04] border border-white/5 rounded-xl p-4">
                    <PropertyPanel
                      node={selectedNode}
                      updateNode={(u) => updateNode(selectedNode.id, u)}
                      removeNode={() => removeNode(selectedNode.id)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-3 border-b border-white/5 bg-[#050505]">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Marquee Preview (WYSIWYG)</span>
                <span className="text-[9px] text-gray-700 italic">Double-click text to edit · Drag to reorder</span>
              </div>
              <button onClick={() => onChange(undefined)} className="text-[9px] text-red-500/50 hover:text-red-500 uppercase font-black tracking-widest flex items-center gap-1 transition-colors">
                <LucideIcons.Trash2 size={10} /> Clear
              </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-black p-8">
              <div className="w-full min-h-full">
                <CanvasNode
                  node={layout}
                  selectedId={selectedNodeId}
                  onSelect={setSelectedNodeId}
                  isRoot
                />
              </div>
            </div>
          </div>
        </div>
      </EditContext.Provider>
    </DragContext.Provider>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${active ? 'bg-brand-accent text-black' : 'text-gray-500 hover:text-white'}`}
    >{children}</button>
  );
}

function BlockBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  const Icon = (LucideIcons as any)[icon] || LucideIcons.HelpCircle;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-white/[0.03] border border-white/5 rounded-xl hover:border-brand-accent/40 hover:bg-brand-accent/5 transition-all group active:scale-95"
    >
      <Icon size={20} className="text-gray-500 group-hover:text-brand-accent mb-2" />
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white">{label}</span>
    </button>
  );
}

function StructureRow({ cols, onClick }: { cols: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full p-2.5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-brand-accent/20 hover:bg-brand-accent/5 transition-all group"
    >
      <div className="flex gap-1.5 h-8">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 bg-white/10 rounded border border-white/5 group-hover:bg-brand-accent/10" />
        ))}
      </div>
    </button>
  );
}

/* ─── Property Panel ─────────────────────────────────────────────── */

function PropertyPanel({ node, updateNode, removeNode }: { node: AuxNode; updateNode: (u: Partial<AuxNode>) => void; removeNode: () => void }) {
  return (
    <div className="space-y-6">
      <NumberField label="Flex Weight" value={node.flex ?? 1} step={0.5} onChange={v => updateNode({ flex: v })} hint="Proportional width share within parent" />
      <CSSStringField label="Padding" value={node.padding ?? '0px'} onChange={v => updateNode({ padding: v })} hint='CSS shorthand: "10px", "8px 16px"' />
      <CSSStringField label="Margin" value={node.margin ?? '0px'} onChange={v => updateNode({ margin: v })} hint='Supports negatives: "-20px auto"' />

      {(node.type === 'row' || node.type === 'col') && (
        <NumberField label="Gap between children (px)" value={node.gap ?? 0} step={2} onChange={v => updateNode({ gap: v })} />
      )}
      {node.type === 'row' && (
        <ToggleField label="Stack Vertically" hint="Force all columns to stack" value={!!node.stack} onChange={v => updateNode({ stack: v })} />
      )}

      {(node.type === 'text' || node.type === 'button') && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
            Content <span className="text-brand-accent/60 normal-case font-medium italic">HTML accepted · double-click canvas to edit inline</span>
          </label>
          <textarea
            value={node.content || ''}
            onChange={e => updateNode({ content: e.target.value })}
            className="w-full bg-black border border-white/10 rounded-lg p-3 text-[11px] text-gray-200 focus:border-brand-accent/50 focus:outline-none min-h-[140px] font-mono custom-scrollbar leading-relaxed"
            placeholder="<p style='color:white'>text...</p>"
          />
        </div>
      )}

      {node.type === 'image' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Image URL</label>
            <input type="text" value={node.content || ''} onChange={e => updateNode({ content: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-[11px] text-gray-200 focus:border-brand-accent/50 focus:outline-none" placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Object Fit</label>
            <select value={node.objectFit || 'contain'} onChange={e => updateNode({ objectFit: e.target.value as any })}
              className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-[11px] text-gray-200 focus:border-brand-accent/50 focus:outline-none">
              <option value="contain">Contain (show full image)</option>
              <option value="cover">Cover (fill &amp; crop)</option>
              <option value="fill">Stretch</option>
              <option value="none">Original size</option>
            </select>
          </div>
          {node.content && (
            <img src={node.content} alt="" className="w-full rounded-lg border border-white/5 shadow-xl" style={{ objectFit: node.objectFit || 'contain', maxHeight: 200 }} />
          )}
        </div>
      )}

      {node.type === 'video' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">YouTube URL</label>
            <input type="text" value={node.content || ''} onChange={e => updateNode({ content: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-[11px] text-gray-200 focus:border-brand-accent/50 focus:outline-none" placeholder="https://youtube.com/watch?v=..." />
          </div>
          <ToggleField label="Autoplay (muted)" value={!!node.autoplay} onChange={v => updateNode({ autoplay: v })} />
          <ToggleField label="Loop indefinitely" value={!!node.loop} onChange={v => updateNode({ loop: v })} />
        </div>
      )}

      <div className="pt-4 border-t border-white/5">
        <button
          onClick={removeNode}
          className="w-full py-2.5 bg-red-500/5 text-red-500/70 border border-red-500/10 hover:bg-red-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
        >
          Remove Block
        </button>
      </div>
    </div>
  );
}

/* ─── Form Atoms ─────────────────────────────────────────────────── */

function NumberField({ label, value, step = 1, onChange, hint }: { label: string; value: number; step?: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <input type="number" step={step} value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-[12px] text-white focus:border-brand-accent/50 focus:outline-none" />
      {hint && <p className="text-[9px] text-gray-600 italic">{hint}</p>}
    </div>
  );
}

function CSSStringField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-[12px] text-white font-mono focus:border-brand-accent/50 focus:outline-none" placeholder="0px" />
      {hint && <p className="text-[9px] text-gray-600 italic">{hint}</p>}
    </div>
  );
}

function ToggleField({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5">
      <div>
        <p className="text-[10px] font-black text-white uppercase tracking-widest">{label}</p>
        {hint && <p className="text-[9px] text-gray-600 mt-0.5 italic">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full relative transition-all shrink-0 ml-4 ${value ? 'bg-brand-accent' : 'bg-white/10'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-md ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

/* ─── Inline Text Editor ─────────────────────────────────────────── */

function InlineTextEditor({ node, initialHtml }: { node: AuxNode; initialHtml: string }) {
  const { setEditingId, updateNodeContent } = React.useContext(EditContext);
  const ref = useRef<HTMLDivElement>(null);

  // Set initial innerHTML once when entering edit mode
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = initialHtml;
      ref.current.focus();
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (ref.current) updateNodeContent(node.id, ref.current.innerHTML);
    setEditingId(null);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); } }}
      onClick={e => e.stopPropagation()}
      className="w-full outline-none min-h-[2em] ring-2 ring-brand-accent/60 rounded px-1"
      style={{ cursor: 'text', whiteSpace: 'pre-wrap' }}
    />
  );
}

/* ─── Canvas Node ────────────────────────────────────────────────── */

function CanvasNode({
  node, selectedId, onSelect, isRoot = false,
}: {
  node: AuxNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isRoot?: boolean;
}) {
  const { draggedId, dragOverId, setDraggedId, setDragOverId, onDrop } = React.useContext(DragContext);
  const { editingId, setEditingId } = React.useContext(EditContext);

  const isSelected = selectedId === node.id;
  const isContainer = node.type === 'row' || node.type === 'col';
  const isEditing = editingId === node.id;
  const isDragging = draggedId === node.id;
  const isDragOver = dragOverId === node.id && draggedId !== node.id;
  const isTextEditable = node.type === 'text' || node.type === 'button';

  const layoutClass =
    node.type === 'row'
      ? node.stack ? 'flex flex-col' : 'flex flex-row min-w-0'
      : node.type === 'col'
      ? 'flex flex-col flex-1 min-w-0'
      : '';

  /* Drag handlers — only on non-root nodes */
  const dragHandlers = isRoot ? {} : {
    draggable: !isEditing,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      setDraggedId(node.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd: () => { setDraggedId(null); setDragOverId(null); },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (draggedId && draggedId !== node.id) setDragOverId(node.id);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.stopPropagation();
      setDragOverId(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop(node.id);
    },
  };

  return (
    <div
      {...dragHandlers}
      onClick={e => { e.stopPropagation(); if (!isEditing) onSelect(node.id); }}
      onDoubleClick={e => {
        if (!isTextEditable) return;
        e.stopPropagation();
        setEditingId(node.id);
        onSelect(node.id);
      }}
      className={`relative transition-all duration-150
        ${layoutClass}
        ${isContainer ? 'border border-dashed border-white/[0.15]' : ''}
        ${isSelected ? '!border-brand-accent border-solid ring-2 ring-brand-accent/30 bg-brand-accent/[0.04]' : 'hover:border-white/25'}
        ${isRoot ? 'w-full min-h-full' : ''}
        ${isDragging ? 'opacity-40 scale-[0.98]' : ''}
        ${isDragOver ? '!border-brand-accent/60 border-solid bg-brand-accent/10 scale-[1.01]' : ''}
        ${isEditing ? 'cursor-text' : isTextEditable ? 'cursor-pointer' : isRoot ? '' : 'cursor-grab active:cursor-grabbing'}
      `}
      style={{
        flex: node.flex !== undefined ? node.flex : (node.type === 'col' ? 1 : 'none'),
        padding: node.padding || (isContainer ? '8px' : '0'),
        margin: node.margin || undefined,
        gap: node.gap !== undefined ? `${node.gap}px` : (isContainer ? '8px' : undefined),
      }}
    >
      {/* Block label */}
      {!isEditing && (
        <div className={`absolute -top-3 left-2 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider z-20 rounded pointer-events-none transition-opacity
          ${isSelected ? 'opacity-100 bg-brand-accent text-black' : 'opacity-30 bg-[#111] text-white border border-white/10'}`}>
          {node.type}
          {!isRoot && <span className="ml-1 opacity-60">⠿</span>}
        </div>
      )}

      {/* Inline edit hint */}
      {isSelected && isTextEditable && !isEditing && (
        <div className="absolute top-0 right-1 px-1 py-0.5 text-[7px] font-black uppercase tracking-wider z-20 text-brand-accent/70 pointer-events-none">
          dbl-click to edit
        </div>
      )}

      {/* Content renderers */}
      {node.type === 'text' && (
        isEditing
          ? <InlineTextEditor node={node} initialHtml={node.content || ''} />
          : <div className="text-white overflow-hidden w-full" dangerouslySetInnerHTML={{ __html: node.content || '<em class="text-gray-700 text-xs uppercase font-black tracking-widest">Text Block</em>' }} />
      )}

      {node.type === 'image' && (
        <div style={{ minWidth: 0, overflow: 'hidden', flex: node.flex !== undefined ? node.flex : 1 }}>
          {node.content
            ? <img src={node.content} alt="" style={{ display: 'block', width: '100%', height: 'auto', objectFit: node.objectFit || 'contain', objectPosition: 'center' }} />
            : <div className="w-full h-24 bg-white/5 border border-dashed border-white/10 rounded flex items-center justify-center text-gray-700 text-[9px] font-black uppercase tracking-widest"><LucideIcons.Image size={24} className="opacity-30 mr-2" /> No Image</div>
          }
        </div>
      )}

      {node.type === 'video' && (
        <div className="w-full bg-white/5 rounded border border-white/10 overflow-hidden aspect-video flex items-center justify-center">
          {node.content
            ? <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">▶  YouTube (live on display)</span>
            : <div className="flex flex-col items-center gap-2 text-gray-700"><LucideIcons.Video size={24} className="opacity-30" /><span className="text-[9px] font-black uppercase tracking-widest">Paste YouTube URL</span></div>
          }
        </div>
      )}

      {node.type === 'button' && (
        isEditing
          ? <InlineTextEditor node={node} initialHtml={node.content || 'CLICK HERE'} />
          : <div className="inline-block bg-brand-accent text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
              {node.content || 'ACTION'}
            </div>
      )}

      {node.type === 'divider' && <div className="w-full h-px bg-white/15 my-2" />}

      {/* Container children */}
      {isContainer && node.children?.map(child => (
        <CanvasNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
      ))}

      {isContainer && (!node.children || node.children.length === 0) && (
        <div className="flex-1 flex items-center justify-center text-[9px] text-gray-700 font-black uppercase tracking-widest opacity-50 pointer-events-none py-6">
          <LucideIcons.Plus size={14} className="mr-1" /> Empty
        </div>
      )}
    </div>
  );
}
