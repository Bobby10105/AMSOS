import type { Audit, Procedure, Attachment, TeamMember, ProcedureMessage } from '@prisma/client';

export type ProcedureWithRelations = Procedure & { 
  attachments: Attachment[],
  messages: ProcedureMessage[]
};

export type AuditWithRelations = Audit & { 
  procedures: ProcedureWithRelations[],
  teamMembers: TeamMember[] 
};
