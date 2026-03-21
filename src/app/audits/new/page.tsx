'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewAudit() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, objective, status: 'In Progress' }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Audit</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Audit Title</label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Q3 Financial Audit"
            />
          </div>
          
          <div>
            <label htmlFor="objective" className="block text-sm font-medium text-gray-700 mb-1">Audit Objective</label>
            <textarea
              id="objective"
              rows={4}
              value={objective}
              onChange={e => setObjective(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Define the primary objective of this audit..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Link href="/" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
