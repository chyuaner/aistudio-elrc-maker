import React, { useState, useEffect } from 'react';
import { useEditor } from './EditorProvider';
import { X, Plus, Trash2 } from 'lucide-react';
import { LrcMetadata } from '@/lib/lyric-utils';

const InputRow = ({ label, mKey, placeholder, value, onChange }: { label: string, mKey: keyof LrcMetadata, placeholder?: string, value: string, onChange: (key: string, val: string) => void }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 gap-2 border-b border-[var(--app-border-light)] sm:border-transparent">
        <label className="text-xs font-semibold text-[var(--app-text-secondary)] sm:w-24 shrink-0 uppercase tracking-wider">{label}</label>
        <div className="flex-1">
            <input 
                type="text" 
                value={value} 
                onChange={e => onChange(mKey as string, e.target.value)} 
                className="w-full bg-[var(--app-bg-input)] text-sm border border-[var(--app-border-light)] rounded px-3 py-1.5 focus:outline-none focus:border-[var(--app-accent)] transition-colors placeholder:text-[var(--app-text-muted)]"
                placeholder={placeholder}
            />
        </div>
    </div>
);

export function LrcMetadataDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { lrcMetadata, setLrcMetadata } = useEditor();
  const [formData, setFormData] = useState<LrcMetadata>({});
  
  // Custom keys that users have added
  const [customKeys, setCustomKeys] = useState<{key: string, value: string}[]>([]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({ ...lrcMetadata });
      
      const predefinedKeys = ['ti', 'ar', 'al', 'au', 'by', 'offset', 're', 've'];
      const currentCustom: {key: string, value: string}[] = [];
      for (const [key, value] of Object.entries(lrcMetadata)) {
          if (!predefinedKeys.includes(key) && value) {
              currentCustom.push({ key, value });
          }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomKeys(currentCustom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };
  
  const handleCustomChange = (index: number, newKey: string, newValue: string) => {
      setCustomKeys(prev => {
          const next = [...prev];
          next[index] = { key: newKey, value: newValue };
          return next;
      });
  };
  
  const removeCustom = (index: number) => {
      setCustomKeys(prev => prev.filter((_, i) => i !== index));
  };
  
  const addCustom = () => {
      setCustomKeys(prev => [...prev, { key: '', value: '' }]);
  };

  const handleSave = () => {
    const finalData: LrcMetadata = {};
    const predefinedKeys = ['ti', 'ar', 'al', 'au', 'by', 'offset', 're', 've'];
    
    // Copy populated predefined keys
    predefinedKeys.forEach(k => {
        if (formData[k]) {
            finalData[k] = formData[k];
        }
    });
    
    // Copy populated custom keys
    customKeys.forEach(({ key, value }) => {
        if (key && value) {
            finalData[key.toLowerCase()] = value;
        }
    });

    setLrcMetadata(finalData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--app-bg-panel)] border border-[var(--app-border-base)] rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--app-border-base)] bg-[var(--app-bg-panel-alt)] shrink-0">
          <h2 className="text-lg font-bold">歌詞屬性定義 (LRC Metadata)</h2>
          <button 
            onClick={onClose}
            className="text-[var(--app-text-muted)] hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
            <p className="text-sm text-[var(--app-text-muted)] leading-relaxed">
                這些標籤將會寫入 LRC 檔案首部，做為整首歌的通用資訊。
            </p>
            
            <div className="bg-[var(--app-bg-base)] p-4 rounded-lg border border-[var(--app-border-base)] space-y-2">
                <InputRow label="標題 [ti]" mKey="ti" placeholder="歌名" value={(formData.ti as string) || ''} onChange={handleChange} />
                <InputRow label="歌手 [ar]" mKey="ar" placeholder="演出者" value={(formData.ar as string) || ''} onChange={handleChange} />
                <InputRow label="專輯 [al]" mKey="al" placeholder="唱片集" value={(formData.al as string) || ''} onChange={handleChange} />
                <InputRow label="作者 [au]" mKey="au" placeholder="作詞/作曲" value={(formData.au as string) || ''} onChange={handleChange} />
                <InputRow label="建立者 [by]" mKey="by" placeholder="LRC創作者" value={(formData.by as string) || ''} onChange={handleChange} />
                <InputRow label="位移 [offset]" mKey="offset" placeholder="+/- 毫秒 (+向後, -向前)" value={(formData.offset as string) || ''} onChange={handleChange} />
                <InputRow label="編輯器 [re]" mKey="re" placeholder="LRC Maker Enhanced" value={(formData.re as string) || ''} onChange={handleChange} />
                <InputRow label="版本 [ve]" mKey="ve" placeholder="1.0" value={(formData.ve as string) || ''} onChange={handleChange} />
            </div>

            <div className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--app-text-secondary)]">自訂標籤</h3>
                    <button 
                        onClick={addCustom}
                        className="text-xs flex items-center gap-1 bg-[var(--app-bg-input)] hover:bg-[var(--app-bg-hover)] border border-[var(--app-border-light)] px-2 py-1 rounded transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" /> 新增
                    </button>
                </div>
                
                {customKeys.length === 0 ? (
                     <div className="text-xs text-[var(--app-text-muted)] text-center py-4 bg-[var(--app-bg-base)] rounded border border-[var(--app-border-light)] border-dashed">
                         尚無自訂標籤
                     </div>
                ) : (
                    <div className="space-y-2 bg-[var(--app-bg-base)] p-4 rounded-lg border border-[var(--app-border-base)]">
                        {customKeys.map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <div className="text-sm font-mono text-[var(--app-text-muted)]">[</div>
                                <input 
                                    type="text" 
                                    value={item.key} 
                                    onChange={e => handleCustomChange(i, e.target.value.replace(/[^a-zA-Z]/g, '').toLowerCase(), item.value)} 
                                    className="w-20 bg-[var(--app-bg-input)] text-sm border border-[var(--app-border-light)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)]"
                                    placeholder="key"
                                />
                                <div className="text-sm font-mono text-[var(--app-text-muted)]">:</div>
                                <input 
                                    type="text" 
                                    value={item.value} 
                                    onChange={e => handleCustomChange(i, item.key, e.target.value)} 
                                    className="flex-1 bg-[var(--app-bg-input)] text-sm border border-[var(--app-border-light)] rounded px-2 py-1 focus:outline-none focus:border-[var(--app-accent)]"
                                    placeholder="value"
                                />
                                <div className="text-sm font-mono text-[var(--app-text-muted)]">]</div>
                                <button 
                                    onClick={() => removeCustom(i)}
                                    className="p-1.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        
        <div className="p-4 border-t border-[var(--app-border-base)] bg-[var(--app-bg-panel-alt)] flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium hover:bg-[var(--app-bg-hover)] transition-colors border border-transparent"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 rounded text-sm font-medium bg-[var(--app-accent)] text-black hover:bg-[var(--app-accent-hover)] transition-colors shadow-sm"
          >
            套用
          </button>
        </div>
      </div>
    </div>
  );
}
