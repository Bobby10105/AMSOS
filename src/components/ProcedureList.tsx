'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProcedureItem from './ProcedureItem';
import type { ProcedureWithRelations } from '@/lib/types';

const PHASE_MAP: Record<string, number> = {
  'Planning': 1,
  'Fieldwork': 2,
  'Reporting': 3
};

export default function ProcedureList({ 
  auditId, 
  phase, 
  initialProcedures,
  user
}: { 
  auditId: string, 
  phase: string, 
  initialProcedures: ProcedureWithRelations[],
  user?: { username: string; role: string }
}) {
  const [procedures, setProcedures] = useState(initialProcedures);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setProcedures(initialProcedures);
  }, [initialProcedures]);

  const phaseNum = PHASE_MAP[phase] || 0;

  const handleAddProcedure = async () => {
    setCreating(true);
    try {
      const nextIndex = procedures.length + 1;
      const nomenclature = `${phaseNum}.${nextIndex}`;
      
      const res = await fetch('/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          phase,
          title: `Procedure ${nomenclature}`,
          purpose: '',
          source: '',
          scope: '',
          methodology: '',
          results: '',
          conclusions: ''
        }),
      });
      if (res.ok) {
        const newProc = await res.json();
        setProcedures([...procedures, { ...newProc, attachments: [] }]);
        router.refresh();
      } else {
        const errorData = await res.json();
        console.error('Failed to create procedure:', errorData);
        alert('Failed to create procedure. Please try again.');
      }
    } catch (e) {
      console.error('Error creating procedure:', e);
      alert('An error occurred. Check the console for details.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProcedure = async (id: string) => {
    try {
      const res = await fetch(`/api/procedures/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProcedures(procedures.filter(p => p.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {procedures.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No procedures documented for this {phase} phase yet.</p>
          <button
            onClick={handleAddProcedure}
            disabled={creating}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Procedure ({phaseNum}.1)</span>
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {procedures.map((proc, index) => (
              <ProcedureItem 
                key={proc.id} 
                procedure={proc} 
                nomenclature={`${phaseNum}.${index + 1}`}
                onDelete={() => handleDeleteProcedure(proc.id)} 
                user={user}
              />
            ))}
          </div>
          <button
            onClick={handleAddProcedure}
            disabled={creating}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Procedure ({phaseNum}.{procedures.length + 1})</span>
          </button>
        </>
      )}
    </div>
  );
}
