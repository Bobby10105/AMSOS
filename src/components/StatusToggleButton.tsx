'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock } from 'lucide-react';

export default function StatusToggleButton({ auditId, currentStatus }: { auditId: string, currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleStatus = async () => {
    const newStatus = status === 'Completed' ? 'In Progress' : 'Completed';
    setLoading(true);
    
    try {
      const res = await fetch(`/api/audits/${auditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setStatus(newStatus);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleStatus}
      disabled={loading}
      className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        status === 'Completed' 
          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      } disabled:opacity-50`}
    >
      {status === 'Completed' ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <Clock className="w-4 h-4" />
      )}
      <span>{loading ? 'Updating...' : status}</span>
    </button>
  );
}
