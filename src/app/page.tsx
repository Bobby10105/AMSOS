import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { PlusCircle, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const audits = await prisma.audit.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audits Dashboard</h1>
        <Link href="/audits/new" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm">
          <PlusCircle className="w-5 h-5" />
          <span>New Audit</span>
        </Link>
      </div>

      {audits.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No audits found. Create a new one to get started.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {audits.map(audit => (
            <Link key={audit.id} href={`/audits/${audit.id}`} className="block group">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
                    {audit.title}
                  </h2>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                </div>
                <p className="text-gray-600 mb-4 line-clamp-3 flex-1 text-sm">
                  {audit.objective || audit.description || "No objective defined."}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 mt-auto pt-4 border-t border-gray-50">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${audit.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {audit.status}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(audit.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
