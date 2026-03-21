'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Calendar } from 'lucide-react';
import type { Audit } from '@prisma/client';

export default function MilestonesTab({ audit }: { audit: Audit }) {
  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const getInitialState = (a: Audit) => ({
    planningDate: formatDateForInput(a.planningDate),
    fieldworkStartDate: formatDateForInput(a.fieldworkStartDate),
    fieldworkEndDate: formatDateForInput(a.fieldworkEndDate),
    reportIssuedDate: formatDateForInput(a.reportIssuedDate),
  });

  const [data, setData] = useState(getInitialState(audit));
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setData(getInitialState(audit));
  }, [audit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!audit.id) {
      alert("Error: Audit ID is missing.");
      return;
    }
    
    setSaving(true);
    console.log(`Attempting to save milestones for audit ${audit.id}:`, data);
    
    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        console.log("Milestones saved successfully.");
        router.refresh();
      } else {
        const errorData = await res.json();
        console.error('Failed to save milestones:', errorData);
        alert(`Failed to save milestones: ${errorData.message || 'Server error'} (Status: ${res.status})`);
      }
    } catch (error) {
      const e = error as Error;
      console.error('Network or unexpected error:', e);
      alert(`An error occurred: ${e.message || 'Check connection'}`);
    } finally {
      setSaving(false);
    }
  };

  const milestones = [
    { name: 'planningDate', label: 'Planning Date' },
    { name: 'fieldworkStartDate', label: 'Fieldwork Start Date' },
    { name: 'fieldworkEndDate', label: 'Fieldwork End Date' },
    { name: 'reportIssuedDate', label: 'Report Issued Date' },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {milestones.map((milestone) => (
          <div key={milestone.name} className="flex flex-col">
            <label className="text-sm font-bold text-gray-700 mb-2 tracking-wide uppercase flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              {milestone.label}
            </label>
            <input
              name={milestone.name}
              type="date"
              value={data[milestone.name as keyof typeof data]}
              onChange={handleChange}
              className="max-w-xs w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors text-gray-800"
            />
          </div>
        ))}
      </div>

      <div className="flex pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Saving...' : 'Save Milestones'}</span>
        </button>
      </div>
    </div>
  );
}
