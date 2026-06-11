import { useEffect, useRef, useState } from 'react';
import { useAIStore } from '../store/aiStore';
import { useEditorStore } from '../store/editorStore';
import { useHistoryStore } from '../store/historyStore';
import { Logo } from './Logo';
import { Icon, ICONS } from './icons';

interface MenuItem {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface MenuDef {
  label: string;
  items: MenuItem[];
}

export function TopMenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);
  const selection = useEditorStore((s) => s.selection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const width = useEditorStore((s) => s.width);
  const height = useEditorStore((s) => s.height);
  const openFilter = useEditorStore((s) => s.openFilter);
  const activeLayer = useEditorStore((s) => s.layers.find((l) => l.id === s.activeLayerId));
  const layerEditable = Boolean(activeLayer && !activeLayer.locked && activeLayer.visible);
  const openNewDocumentDialog = useEditorStore((s) => s.openNewDocumentDialog);
  const openCanvasSizeDialog = useEditorStore((s) => s.openCanvasSizeDialog);
  const openImageSizeDialog = useEditorStore((s) => s.openImageSizeDialog);
  const openExportDialog = useEditorStore((s) => s.openExportDialog);
  const importImageFile = useEditorStore((s) => s.importImageFile);
  const activePreset = useEditorStore((s) => s.activePreset);
  const showSafeZone = useEditorStore((s) => s.showSafeZone);
  const toggleSafeZone = useEditorStore((s) => s.toggleSafeZone);
  const aiPanelOpen = useAIStore((s) => s.panelOpen);
  const toggleAIPanel = useAIStore((s) => s.togglePanel);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New…', onClick: openNewDocumentDialog },
        { label: 'Open…', onClick: () => fileInputRef.current?.click() },
        { label: 'Export As…', onClick: openExportDialog },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: undo, disabled: !canUndo },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', onClick: redo, disabled: !canRedo },
        { label: 'Deselect', shortcut: 'Ctrl+D', onClick: clearSelection, disabled: !selection },
      ],
    },
    {
      label: 'Image',
      items: [
        { label: 'Canvas Size…', onClick: openCanvasSizeDialog },
        { label: 'Image Size…', onClick: openImageSizeDialog },
      ],
    },
    {
      label: 'Filter',
      items: [
        { label: 'Brightness / Contrast…', onClick: () => openFilter('brightness-contrast'), disabled: !layerEditable },
        { label: 'Hue / Saturation…', onClick: () => openFilter('hue-saturation'), disabled: !layerEditable },
        { label: 'Gaussian Blur…', onClick: () => openFilter('gaussian-blur'), disabled: !layerEditable },
        { label: 'Grayscale', onClick: () => openFilter('grayscale'), disabled: !layerEditable },
        { label: 'Invert', onClick: () => openFilter('invert'), disabled: !layerEditable },
        { label: 'Sepia', onClick: () => openFilter('sepia'), disabled: !layerEditable },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: 'Ctrl++', onClick: () => setZoom(zoom * 1.25) },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', onClick: () => setZoom(zoom / 1.25) },
        { label: 'Reset Zoom', shortcut: 'Ctrl+0', onClick: () => setZoom(1) },
        {
          label: showSafeZone ? 'Hide Safe Zone ✓' : 'Show Safe Zone',
          onClick: toggleSafeZone,
          disabled: !activePreset,
        },
      ],
    },
  ];

  return (
    <header className="h-10 shrink-0 flex items-center justify-between px-3 bg-[#18181b] border-b border-black/40 text-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importImageFile(file);
          e.target.value = '';
        }}
      />
      <div className="flex items-center gap-4">
        <Logo />
        <nav ref={containerRef} className="flex items-center gap-0.5">
          {menus.map((menu) => (
            <div key={menu.label} className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((cur) => (cur === menu.label ? null : menu.label))}
                className={`px-2.5 py-1 rounded text-zinc-300 hover:bg-white/5 hover:text-white transition-colors ${
                  openMenu === menu.label ? 'bg-white/5 text-white' : ''
                }`}
              >
                {menu.label}
              </button>
              {openMenu === menu.label && (
                <div className="absolute left-0 top-full mt-1 min-w-[200px] bg-[#1f1f23] border border-black/40 rounded-md shadow-xl py-1 z-50">
                  {menu.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => {
                        item.onClick?.();
                        setOpenMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-left text-zinc-200 hover:bg-[#7c5cff]/20 hover:text-white disabled:text-zinc-600 disabled:hover:bg-transparent transition-colors"
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="mono text-[11px] text-zinc-500">{item.shortcut}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 text-zinc-400">
        <span className="mono text-xs text-zinc-500">
          {width} × {height} px
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Undo (Ctrl+Z)"
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Icon path={ICONS.undo} />
          </button>
          <button
            type="button"
            title="Redo (Ctrl+Shift+Z)"
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Icon path={ICONS.redo} />
          </button>
        </div>
        <span className="mono text-xs w-12 text-right text-zinc-500">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          title="AI Assistant"
          onClick={toggleAIPanel}
          className={`p-1.5 rounded hover:bg-white/5 transition-colors ${
            aiPanelOpen ? 'text-[#7c5cff]' : 'hover:text-white'
          }`}
        >
          <Icon path={ICONS.sparkles} />
        </button>
      </div>
    </header>
  );
}
