import {
  type Applicability,
  type EvidenceStatus,
  EVIDENCE_STATUS_LABELS,
  type Verdict,
  VERDICT_LABELS,
} from '@greenforce/shared';
import {
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Clock,
  FileQuestion,
  HelpCircle,
  PackageCheck,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Badge, type BadgeTone } from './ui/badge';

/** Presentation mapping for verdicts — the only place verdicts get colours/icons. */
export const VERDICT_STYLE: Record<Verdict, { tone: BadgeTone; Icon: typeof CheckCircle2 }> = {
  CONFIRMED: { tone: 'info', Icon: ShieldCheck },
  PASSES: { tone: 'success', Icon: CheckCircle2 },
  FAILS: { tone: 'danger', Icon: XCircle },
  PROOF_MISSING: { tone: 'warning', Icon: FileQuestion },
  PROOF_IN_PROGRESS: { tone: 'progress', Icon: Clock },
  PACK_COMPLETE: { tone: 'brand', Icon: PackageCheck },
  CANT_DECIDE: { tone: 'neutral', Icon: HelpCircle },
};

export function VerdictBadge({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) {
    return (
      <Badge tone="outline" icon={<CircleSlash className="size-3.5" aria-hidden />}>
        Set aside
      </Badge>
    );
  }
  const { tone, Icon } = VERDICT_STYLE[verdict];
  return (
    <Badge tone={tone} icon={<Icon className="size-3.5" aria-hidden />}>
      {VERDICT_LABELS[verdict]}
    </Badge>
  );
}

export function ApplicabilityBadge({ applicability }: { applicability: Applicability }) {
  if (applicability === 'APPLIES') return <Badge tone="brand">Applies</Badge>;
  if (applicability === 'SET_ASIDE') return <Badge tone="outline">Set aside</Badge>;
  return <Badge tone="neutral">Undecided</Badge>;
}

const EVIDENCE_TONES: Record<EvidenceStatus, { tone: BadgeTone; Icon: typeof CheckCircle2 }> = {
  MISSING: { tone: 'warning', Icon: CircleDashed },
  PROVIDED: { tone: 'progress', Icon: CheckCircle2 },
  VERIFIED: { tone: 'success', Icon: BadgeCheck },
};

export function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  const { tone, Icon } = EVIDENCE_TONES[status];
  return (
    <Badge tone={tone} icon={<Icon className="size-3.5" aria-hidden />}>
      {EVIDENCE_STATUS_LABELS[status]}
    </Badge>
  );
}
