'use client';
import React, { useState, useEffect } from 'react';
import { useEditor } from '@/components/base/EditorProvider';
import { Download, Plus, Trash2 } from 'lucide-react';
import { LrcMetadata } from '@/lib/lyric-utils';

const InputRow = ({ label, mKey, placeholder, value, onChange, isDialog }: { label: string, mKey: keyof LrcMetadata, placeholder?: string, value: string, onChange: (key: string, val: string) => void, isDialog?: boolean }) => (
    <div className={`flex flex-col ${isDialog ? 'sm:flex-row sm:items-center py-2 gap-2 border-b border-[var(--app-border-light)] sm:border-transparent' : 'py-1 gap-1'}`}>
        <label className={`text-[10px] font-semibold text-[var(--app-text-secondary)] shrink-0 uppercase tracking-wider ${isDialog ? 'sm:text-xs sm:w-20' : 'pl-0.5'}`}>{label}</label>
        <div className="flex-1">
            <input 
                type="text" 
                value={value} 
                onChange={e => onChange(mKey as string, e.target.value)} 
                className={`w-full bg-[var(--app-bg-input)] text-xs border border-[var(--app-border-light)] rounded focus:outline-none focus:border-[var(--app-accent)] transition-colors placeholder:opacity-40 ${isDialog ? 'sm:text-sm px-2 sm:px-3 py-1.5' : 'px-2 py-1.5'}`}
                placeholder={placeholder}
            />
        </div>
    </div>
);

export function LrcMetadataEditor({ onClose }: { onClose?: () => void }) {
  const { lrcMetadata, setLrcMetadata, metadata } = useEditor();
  const [formData, setFormData] = useState<LrcMetadata>({});
  const [customKeys, setCustomKeys] = useState<{key: string, value: string}[]>([]);
  const isDialog = !!onClose;

  const importFromAudio = () => {
     if (metadata) {
         setFormData(prev => {
             const newData = {
                 ...prev,
                 ti: metadata.title || prev.ti,
                 ar: metadata.artist || prev.ar,
                 al: metadata.album || prev.al
             };
             applyChanges(newData, customKeys);
             return newData;
         });
     }
  };

  useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
     setFormData({ ...lrcMetadata });
      
     const predefinedKeys = ['ti', 'ar', 'al', 'au', 'by', 'offset', 're', 've'];
     const currentCustom: {key: string, value: string}[] = [];
     for (const [key, value] of Object.entries(lrcMetadata)) {
         if (!predefinedKeys.includes(key) && value) {
             currentCustom.push({ key, value });
         }
     }
     setCustomKeys(currentCustom);
  }, [lrcMetadata]);

  const applyChanges = (currentFormData: LrcMetadata, currentCustomKeys: typeof customKeys) => {
    const finalData: LrcMetadata = {};
    const predefinedKeys = ['ti', 'ar', 'al', 'au', 'by', 'offset', 're', 've'];
    predefinedKeys.forEach(k => {
        if (currentFormData[k]) finalData[k] = currentFormData[k];
    });
    currentCustomKeys.forEach(({ key, value }) => {
        if (key && value) finalData[key] = value;
    });
    setLrcMetadata(finalData);
  };

  const handleChange = (key: string, value: string) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    applyChanges(newData, customKeys);
  };
  
  const handleCustomChange = (index: number, newKey: string, newValue: string) => {
      const next = [...customKeys];
      next[index] = { key: newKey, value: newValue };
      setCustomKeys(next);
      applyChanges(formData, next);
  };
  
  const removeCustom = (index: number) => {
      const next = customKeys.filter((_, i) => i !== index);
      setCustomKeys(next);
      applyChanges(formData, next);
  };
  
  const addCustom = () => {
      setCustomKeys(prev => [...prev, { key: '', value: '' }]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar space-y-4 pb-4 select-text">
            <div className="flex flex-col gap-3">
                <button 
                  onClick={importFromAudio}
                  disabled={!metadata}
                  className={`text-xs shrink-0 flex justify-center items-center gap-1.5 px-3 py-1.5 rounded transition-colors border ${metadata ? 'bg-[var(--app-bg-input)] hover:bg-[var(--app-bg-hover)] border-[var(--app-border-light)] text-[var(--app-text-secondary)]' : 'bg-transparent border-[var(--app-border-base)] text-[var(--app-text-muted)] opacity-50 cursor-not-allowed'}`}
                >
                  <Download className="w-3.5 h-3.5" /> 由音檔 ID3/Vorbis 標籤匯入
                </button>
            </div>
            
            <div className={`p-3 ${isDialog ? 'space-y-1' : 'space-y-2'}`}>
                <div className={`border-b border-[var(--app-border-base)] pb-3 ${isDialog ? 'space-y-1' : 'space-y-2'}`}>
                    <InputRow isDialog={isDialog} label="標題 [ti]" mKey="ti" placeholder="歌名" value={(formData.ti as string) || ''} onChange={handleChange} />
                    <InputRow isDialog={isDialog} label="歌手 [ar]" mKey="ar" placeholder="演出者" value={(formData.ar as string) || ''} onChange={handleChange} />
                    <InputRow isDialog={isDialog} label="專輯 [al]" mKey="al" placeholder="唱片集" value={(formData.al as string) || ''} onChange={handleChange} />
                    <InputRow isDialog={isDialog} label="作者 [au]" mKey="au" placeholder="作詞/作曲" value={(formData.au as string) || ''} onChange={handleChange} />
                    <InputRow isDialog={isDialog} label="建立者 [by]" mKey="by" placeholder="LRC創作者" value={(formData.by as string) || ''} onChange={handleChange} />
                    <InputRow isDialog={isDialog} label="位移 [offset]" mKey="offset" placeholder="+/- 毫秒 (+向後, -向前)" value={(formData.offset as string) || ''} onChange={handleChange} />
                    <InputRow isDialog={isDialog} label="編輯器 [re]" mKey="re" placeholder="LRC Maker Enhanced" value={(formData.re as string) || ''} onChange={handleChange} />
                    <InputRow isDialog={isDialog} label="版本 [ve]" mKey="ve" placeholder="1.0" value={(formData.ve as string) || ''} onChange={handleChange} />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--app-text-secondary)]">自訂標籤</h3>
                        <button 
                            onClick={addCustom}
                            className="text-[10px] flex items-center gap-1 bg-[var(--app-bg-input)] hover:bg-[var(--app-bg-hover)] border border-[var(--app-border-light)] px-2 py-1 rounded transition-colors"
                        >
                            <Plus className="w-3 h-3" /> 新增
                        </button>
                    </div>
                    
                    {customKeys.length === 0 ? (
                        <div className="text-[10px] text-[var(--app-text-muted)] text-center py-4 bg-[var(--app-bg-base)] rounded border border-[var(--app-border-light)] border-dashed">
                            尚無自訂標籤
                        </div>
                    ) : (
                        <div className="space-y-2 bg-[var(--app-bg-base)] p-3 rounded-lg border border-[var(--app-border-base)] overflow-x-auto custom-scrollbar">
                            {customKeys.map((item, i) => (
                                <div key={i} className={`flex ${isDialog ? 'items-center gap-1.5 min-w-[200px]' : 'flex-col gap-1 items-start w-full relative pt-4'}`}>
                                    <div className={`flex items-center w-full ${isDialog ? 'w-auto' : 'gap-1'}`}>
                                        <div className="text-xs font-mono text-[var(--app-text-muted)] hidden sm:block">[</div>
                                        <input 
                                            type="text" 
                                            value={item.key} 
                                            onChange={e => handleCustomChange(i, e.target.value.trim(), item.value)} 
                                            className={`bg-[var(--app-bg-input)] text-xs border border-[var(--app-border-light)] rounded px-1.5 py-1 focus:outline-none focus:border-[var(--app-accent)] ${isDialog ? 'w-12 sm:w-16' : 'w-full flex-1'}`}
                                            placeholder="key"
                                        />
                                        {isDialog && <div className="text-xs font-mono text-[var(--app-text-muted)]">:</div>}
                                    </div>
                                    <div className={`flex items-center w-full ${isDialog ? 'w-auto flex-1' : 'gap-1'}`}>
                                        <input 
                                            type="text" 
                                            value={item.value} 
                                            onChange={e => handleCustomChange(i, item.key, e.target.value)} 
                                            className={`min-w-[80px] bg-[var(--app-bg-input)] text-xs border border-[var(--app-border-light)] rounded px-1.5 py-1 focus:outline-none focus:border-[var(--app-accent)] ${isDialog ? 'flex-1' : 'w-full flex-1'}`}
                                            placeholder="value"
                                        />
                                        {isDialog && <div className="text-xs font-mono text-[var(--app-text-muted)]">]</div>}
                                    </div>
                                    <button 
                                        onClick={() => removeCustom(i)}
                                        className={`p-1 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded transition-colors shrink-0 ${isDialog ? '' : 'absolute top-0 right-0'}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>    
            </div>
        </div>
        {onClose && (
            <div className="pt-4 border-t border-[var(--app-border-base)] shrink-0 flex justify-end">
                  <button 
                    onClick={onClose}
                    className="px-6 py-2 rounded text-sm font-medium bg-[var(--app-accent)] text-black hover:bg-[var(--app-accent-hover)] transition-colors shadow-sm"
                  >
                    完成
                  </button>
            </div>
        )}
    </div>
  );
}
