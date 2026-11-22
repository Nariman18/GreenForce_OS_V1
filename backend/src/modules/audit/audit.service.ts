import { Inject, Injectable } from '@nestjs/common';
import type { AuditEvent } from '@greenforce/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { type Database, PRISMA } from '../../db/prisma.js';

export type AuditEventType =
  | 'project.created'
  | 'project.setup_updated'
  | 'project.measurements_updated'
  | 'evidence.uploaded'
  | 'evidence.linked'
  | 'evidence.verified'
  | 'evidence.unverified'
  | 'evidence.removed'
  | 'material.selected'
  | 'material.deselected'
  | 'passport.issued';

/** Append-only project history; feeds the passport and the History view. */
@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA) private readonly db: Database) {}

  async record(
    projectId: string,
    actorId: string,
    type: AuditEventType,
    summary: string,
    data?: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.db.auditEvent.create({ data: { projectId, actorId, type, summary, data } });
  }

  async list(projectId: string, limit = 100): Promise<AuditEvent[]> {
    const rows = await this.db.auditEvent.findMany({
      where: { projectId },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((event) => ({
      id: event.id,
      type: event.type,
      summary: event.summary,
      actor: event.actor.name,
      createdAt: event.createdAt.toISOString(),
    }));
  }
}
