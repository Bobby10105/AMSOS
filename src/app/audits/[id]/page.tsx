import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import AuditTabs from '@/components/AuditTabs';
import EditableAuditHeader from '@/components/EditableAuditHeader';
import { getSession } from '@/lib/auth';

export default async function AuditDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  const userRole = session?.user?.role || 'User';

  try {
    // 1. Fetch Audit via standard Prisma
    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
    });

    if (!audit) {
      notFound();
    }

    // 2. Fetch Team Members
    const teamMembers = await prisma.teamMember.findMany({
      where: { auditId: audit.id }
    });

    // 3. Fetch Procedures with RAW logic to avoid schema mismatch errors
    const rawProcedures: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Procedure WHERE auditId = ?`,
      audit.id
    );

    // 4. For each procedure, fetch attachments and messages
    const proceduresWithRelations = await Promise.all(rawProcedures.map(async (proc) => {
      const attachments: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM Attachment WHERE procedureId = ? ORDER BY displayOrder ASC`,
        proc.id
      );
      
      const messages: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM ProcedureMessage WHERE procedureId = ? ORDER BY createdAt ASC`,
        proc.id
      );

      return {
        ...proc,
        attachments,
        messages
      };
    }));

    const finalAuditData = {
      ...audit,
      teamMembers,
      procedures: proceduresWithRelations
    };

    return (
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <EditableAuditHeader audit={finalAuditData as any} userRole={userRole} />

        <AuditTabs audit={finalAuditData as any} user={session?.user} />
      </div>
    );
  } catch (error: any) {
    console.error("Critical Error loading audit:", error);
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200 text-red-800">
        <h1 className="text-2xl font-bold mb-2">Error Loading Audit</h1>
        <p className="mb-4">The system encountered an error while retrieving the audit data.</p>
        <code className="text-xs bg-red-100 p-2 rounded">{error.message}</code>
        <div className="mt-6">
          <Link href="/" className="text-blue-600 underline font-medium">Return to Dashboard</Link>
        </div>
      </div>
    );
  }
}
