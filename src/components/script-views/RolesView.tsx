"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Pencil, Save, X, Upload, Check } from "lucide-react";

interface ScriptRole {
  name: string;
  tag: string;
  description: string;
  lines: number;
  appearance: string;
  costume: string;
  feature: string;
}

interface RolesViewProps {
  roles: ScriptRole[];
  isExtracting: boolean;
  onExtractRoles: () => void;
  onApplyToLibrary: (roles: ScriptRole[]) => Promise<void>;
}

export default function RolesView({
  roles,
  isExtracting,
  onExtractRoles,
  onApplyToLibrary,
}: RolesViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<ScriptRole | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const handleEdit = (role: ScriptRole, index: number) => {
    setEditRole({ ...role });
    setEditingIndex(index);
  };

  const handleSave = () => {
    if (editRole && editingIndex !== null) {
      // 保存逻辑 - 这里可以添加更新roles的逻辑
      setEditingIndex(null);
      setEditRole(null);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditRole(null);
  };

  const toggleSelectRole = (index: number) => {
    setSelectedRoles(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRoles.length === roles.length) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(roles.map((_, i) => i));
    }
  };

  const handleApplySelected = async () => {
    if (selectedRoles.length === 0) return;
    
    setIsApplying(true);
    try {
      const selectedItems = selectedRoles.map(i => roles[i]);
      await onApplyToLibrary(selectedItems);
      setSelectedRoles([]);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyAll = async () => {
    setIsApplying(true);
    try {
      await onApplyToLibrary(roles);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading">角色设定</h2>
        <div className="flex items-center gap-2">
          {roles && roles.length > 0 && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={toggleSelectAll}
                className="gap-1"
              >
                {selectedRoles.length === roles.length ? <Check className="w-3 h-3" /> : null}
                {selectedRoles.length > 0 ? `已选${selectedRoles.length}` : '全选'}
              </Button>
              <Button 
                size="sm" 
                onClick={selectedRoles.length > 0 ? handleApplySelected : handleApplyAll}
                disabled={isApplying || roles.length === 0}
                className="gap-1"
              >
                {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {selectedRoles.length > 0 ? '应用选中' : '全部应用'}
              </Button>
            </>
          )}
          <Button size="sm" onClick={onExtractRoles} disabled={isExtracting}>
            {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            提取角色
          </Button>
        </div>
      </div>
      
      {roles && roles.length > 0 ? (
        <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roles.map((role, index) => (
            <div 
              key={index} 
              className={`bg-[#141414] border rounded-xl p-5 space-y-3 ${
                selectedRoles.includes(index) ? 'border-[#0ABAB5] ring-1 ring-[#0ABAB5]/30' : 'border-[#333]'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSelectRole(index)}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    selectedRoles.includes(index) 
                      ? 'bg-[#0ABAB5] border-[#0ABAB5]' 
                      : 'border-[#333] hover:border-[#0ABAB5]'
                  }`}
                >
                  {selectedRoles.includes(index) && <Check className="w-3 h-3 text-black" />}
                </button>
                <div className="w-10 h-10 rounded-full bg-[#0ABAB5]/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#0ABAB5]" />
                </div>
                <div className="flex-1">
                  {editingIndex === index ? (
                    <input
                      type="text"
                      value={editRole?.name || ''}
                      onChange={(e) => setEditRole(prev => prev ? { ...prev, name: e.target.value } : prev)}
                      className="bg-[#1A1A1A] border border-[#0ABAB5] rounded px-2 py-1 text-sm text-foreground focus:outline-none w-full"
                    />
                  ) : (
                    <h3 className="font-ui text-foreground">{role.name}</h3>
                  )}
                  <Badge variant="secondary" className="text-xs bg-[#1A1A1A] text-[#888888] border-none">{role.tag}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  {editingIndex === index ? (
                    <>
                      <button onClick={handleSave} className="p-1.5 hover:bg-[#222] rounded">
                        <Save className="w-4 h-4 text-green-400" />
                      </button>
                      <button onClick={handleCancel} className="p-1.5 hover:bg-[#222] rounded">
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleEdit(role, index)} 
                      className="p-1.5 hover:bg-[#222] rounded"
                    >
                      <Pencil className="w-4 h-4 text-[#888]" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {editingIndex === index ? (
                  <>
                    <div>
                      <span className="text-[#0ABAB5]">性格：</span>
                      <input
                        type="text"
                        value={editRole?.description || ''}
                        onChange={(e) => setEditRole(prev => prev ? { ...prev, description: e.target.value } : prev)}
                        className="bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-[#0ABAB5] ml-1 w-2/3"
                      />
                    </div>
                    <div>
                      <span className="text-[#0ABAB5]">外貌：</span>
                      <input
                        type="text"
                        value={editRole?.appearance || ''}
                        onChange={(e) => setEditRole(prev => prev ? { ...prev, appearance: e.target.value } : prev)}
                        className="bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-[#0ABAB5] ml-1 w-2/3"
                      />
                    </div>
                    <div>
                      <span className="text-[#0ABAB5]">服装：</span>
                      <input
                        type="text"
                        value={editRole?.costume || ''}
                        onChange={(e) => setEditRole(prev => prev ? { ...prev, costume: e.target.value } : prev)}
                        className="bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-[#0ABAB5] ml-1 w-2/3"
                      />
                    </div>
                    <div>
                      <span className="text-[#0ABAB5]">关系：</span>
                      <input
                        type="text"
                        value={editRole?.feature || ''}
                        onChange={(e) => setEditRole(prev => prev ? { ...prev, feature: e.target.value } : prev)}
                        className="bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-[#0ABAB5] ml-1 w-2/3"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {role.description && <p className="text-muted-foreground"><span className="text-[#0ABAB5]">性格：</span>{role.description}</p>}
                    {role.appearance && <p className="text-muted-foreground"><span className="text-[#0ABAB5]">外貌：</span>{role.appearance}</p>}
                    {role.costume && <p className="text-muted-foreground"><span className="text-[#0ABAB5]">服装：</span>{role.costume}</p>}
                    {role.feature && <p className="text-muted-foreground"><span className="text-[#0ABAB5]">关系：</span>{role.feature}</p>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          暂无角色数据，点击右上角&ldquo;提取角色&rdquo;按钮生成
        </div>
      )}
    </div>
  );
}
