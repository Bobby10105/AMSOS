'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Edit2, X } from 'lucide-react';
import StatusToggleButton from './StatusToggleButton';
import DeleteAuditButton from './DeleteAuditButton';
import ExportAuditButton from './ExportAuditButton';
import BackupAuditButton from './BackupAuditButton';
import type { AuditWithRelations } from '@/lib/types';

export default function EditableAuditHeader({ 
  audit, 
  userRole 
}: { 
  audit: AuditWithRelations, 
  userRole?: string 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(audit.title);
  const [objective, setObjective] = useState(audit.objective || '');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, objective }),
      });

      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        const errorData = await res.json();
        console.error('Failed to update audit:', errorData);
        alert('Failed to save changes. Please try again.');
      }
    } catch (error) {
      console.error('Error updating audit:', error);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">Audit Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">Audit Objective</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
              placeholder="Define the primary objective of this audit..."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8 group relative">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{audit.title}</h1>
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              title="Edit Title and Objective"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
          <div className="mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Objective</h2>
            <p className="text-gray-600 max-w-3xl whitespace-pre-wrap">
              {audit.objective || <span className="italic text-gray-400">No objective defined yet. Click edit to add one.</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-3">
          <div className="flex space-x-2">
            <ExportAuditButton audit={audit} />
            <BackupAuditButton auditId={audit.id} auditTitle={audit.title} />
          </div>
          <StatusToggleButton auditId={audit.id} currentStatus={audit.status} />
          <DeleteAuditButton auditId={audit.id} userRole={userRole} />
        </div>
      </div>
    </div>
  );
}
