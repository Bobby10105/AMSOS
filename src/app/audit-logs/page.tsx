import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ClipboardList, Shield, Trash2, PlusCircle, FileUp, AlertTriangle } from 'lucide-react';

export default async function AuditLogsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  let logs = [];
  try {
    logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return (
      <div className="max-w-6xl mx-auto p-8 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-4 text-red-700">
        <AlertTriangle className="w-8 h-8" />
        <div>
          <h2 className="text-xl font-bold">Error loading logs</h2>
          <p>There was a problem connecting to the database. Please try again later.</p>
        </div>
      </div>
    );
  }

  const getActionIcon = (action: string, entityType: string) => {
    if (action === 'DELETE') return <Trash2 className="w-4 h-4 text-red-500" />;
    if (entityType === 'ATTACHMENT') return <FileUp className="w-4 h-4 text-blue-500" />;
    return <PlusCircle className="w-4 h-4 text-green-500" />;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-900 p-2 rounded-lg shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Immutable Audit Logs</h1>
            <p className="text-sm text-gray-500 font-medium">Tracking major system events for accountability</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Timestamp</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Entity</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Details</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                  No logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 tabular-nums">
                    {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      log.action === 'DELETE' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {getActionIcon(log.action, log.entityType)}
                      <span>{log.action}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded uppercase tracking-wider border border-gray-200">
                      {log.entityType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-700 font-bold border border-blue-200">
                        {log.performedBy?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <span>{log.performedBy || 'System'}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex items-center space-x-2 text-xs text-gray-400 italic bg-gray-100/50 p-3 rounded-lg border border-dashed border-gray-200">
        <ClipboardList className="w-3 h-3" />
        <span>This log is immutable and serves as the official record of major structural changes within AMSOS.</span>
      </div>
    </div>
  );
}
