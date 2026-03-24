'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader2, AlertCircle, CheckCircle, Info, ArrowUp, ArrowDown } from 'lucide-react';

interface TemplateProcedure {
  id?: string;
  phase: string;
  title: string;
  purpose: string | null;
  displayOrder: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  procedures: TemplateProcedure[];
}

const PHASES = ['Planning', 'Fieldwork', 'Reporting'];

export default function TemplateEditor({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activePhase, setActivePhase] = useState(PHASES[0]);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`);
      if (!res.ok) throw new Error('Failed to fetch template details');
      const data = await res.json();
      setTemplate(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save template');
      }
      setSuccess('Template saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addProcedure = () => {
    if (!template) return;
    const newProc: TemplateProcedure = {
      phase: activePhase,
      title: 'New Procedure',
      purpose: '',
      displayOrder: template.procedures.length
    };
    setTemplate({
      ...template,
      procedures: [...template.procedures, newProc]
    });
  };

  const updateProcedure = (index: number, field: keyof TemplateProcedure, value: any) => {
    if (!template) return;
    const updatedProcs = [...template.procedures];
    updatedProcs[index] = { ...updatedProcs[index], [field]: value };
    setTemplate({ ...template, procedures: updatedProcs });
  };

  const removeProcedure = (index: number) => {
    if (!template) return;
    const updatedProcs = template.procedures.filter((_, i) => i !== index);
    setTemplate({ ...template, procedures: updatedProcs });
  };

  const moveProcedure = (index: number, direction: 'up' | 'down') => {
    if (!template) return;
    const updatedProcs = [...template.procedures];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= updatedProcs.length) return;
    
    const temp = updatedProcs[index];
    updatedProcs[index] = updatedProcs[targetIndex];
    updatedProcs[targetIndex] = temp;
    
    // Update display orders
    const finalProcs = updatedProcs.map((p, i) => ({ ...p, displayOrder: i }));
    setTemplate({ ...template, procedures: finalProcs });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    );
  }

  if (!template) return null;

  const filteredProcedures = template.procedures
    .map((p, originalIndex) => ({ p, originalIndex }))
    .filter(({ p }) => p.phase === activePhase);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{template.name}</h2>
            <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Editor</div>
          </div>
          <p className="text-sm text-gray-500 font-medium">{template.description || "Defining standard procedures for this program."}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="px-6 border-b border-gray-200 bg-white sticky top-0 z-10">
        <nav className="-mb-px flex space-x-8">
          {PHASES.map((phase) => (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-colors
                ${activePhase === phase
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {phase}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-gray-400">
            <Info className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Defining {filteredProcedures.length} Procedures for {activePhase}</span>
          </div>
          <button
            onClick={addProcedure}
            className="flex items-center space-x-1 text-blue-600 font-bold hover:underline text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Step</span>
          </button>
        </div>

        <div className="space-y-4">
          {filteredProcedures.map(({ p, originalIndex }, displayIndex) => (
            <div key={displayIndex} className="group bg-gray-50 border border-gray-200 rounded-xl p-4 transition-all hover:bg-white hover:shadow-md hover:border-blue-200">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center space-y-1 mt-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase">{displayIndex + 1}</span>
                  <button onClick={() => moveProcedure(originalIndex, 'up')} className="p-1 text-gray-300 hover:text-blue-600 disabled:opacity-0" disabled={displayIndex === 0}>
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => moveProcedure(originalIndex, 'down')} className="p-1 text-gray-300 hover:text-blue-600 disabled:opacity-0" disabled={displayIndex === filteredProcedures.length - 1}>
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    value={p.title}
                    onChange={(e) => updateProcedure(originalIndex, 'title', e.target.value)}
                    className="w-full bg-transparent font-bold text-gray-900 border-none focus:ring-0 p-0 text-lg placeholder:font-normal"
                    placeholder="Procedure Title..."
                  />
                  <textarea
                    value={p.purpose || ''}
                    onChange={(e) => updateProcedure(originalIndex, 'purpose', e.target.value)}
                    rows={2}
                    className="w-full bg-transparent text-sm text-gray-600 border-none focus:ring-0 p-0 resize-none"
                    placeholder="Enter the purpose or standard instructions for this procedure..."
                  />
                </div>
                <button
                  onClick={() => removeProcedure(originalIndex)}
                  className="p-2 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredProcedures.length === 0 && (
            <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-xl">
              <p className="text-gray-400 text-sm font-medium">No procedures defined for {activePhase} yet.</p>
              <button onClick={addProcedure} className="mt-2 text-blue-600 font-bold hover:underline text-sm uppercase tracking-widest">
                + Add First Step
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
