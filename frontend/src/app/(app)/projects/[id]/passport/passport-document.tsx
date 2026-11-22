import {
  EVIDENCE_KIND_LABELS,
  JURISDICTION_LABELS,
  MATERIAL_CATEGORY_LABELS,
  type MaterialCategory,
  type PassportContent,
} from '@greenforce/shared';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { Fact } from '@/components/ui/card';
import { VerdictBadge } from '@/components/verdict-badge';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid-page">
      <h3 className="mb-3 border-b border-line pb-1.5 text-sm font-semibold uppercase tracking-wide text-pine-800">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The passport as a document: readable on screen and printable as the formal statement. */
export function PassportDocument({
  content,
  fingerprint,
  label,
  issuedAt,
}: {
  content: PassportContent;
  fingerprint: string;
  label: string;
  issuedAt: string;
}) {
  const { property, statement, readiness, edition } = content;
  return (
    <article className="space-y-8 rounded-card border border-line bg-surface p-6 shadow-(--shadow-card) sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <Logo />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">Compliance Passport</h2>
          <p className="text-sm text-muted">{label}</p>
        </div>
        <dl className="space-y-1 text-right text-sm">
          <div>
            <dt className="text-xs text-muted">GreenForce ID</dt>
            <dd className="font-mono font-semibold">{content.greenforceId}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Generated</dt>
            <dd>{formatDateTime(issuedAt)}</dd>
          </div>
        </dl>
      </header>

      <Section title="Formal statement">
        <p className="font-semibold">{statement.headline}</p>
        <div className="mt-2 space-y-2 text-sm leading-relaxed">
          {statement.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Prepared for: {statement.audience.join(' · ')}</p>
      </Section>

      <Section title="Project & property">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Fact label="Project" value={content.projectName} />
          <Fact label="Address" value={property.address} />
          <Fact label="Parcel" value={property.parcelId} mono />
          <Fact label="Jurisdiction" value={JURISDICTION_LABELS[content.jurisdiction]} />
          <Fact label="Edition in force" value={edition?.name ?? 'Not resolved'} />
          <Fact label={edition?.basisLabel ?? 'Governing date'} value={formatDate(edition?.basisDate)} />
          <Fact label="Readiness" value={`${readiness.overall}%`} />
          <Fact label="Proof in" value={`${readiness.proofIn.done}/${readiness.proofIn.total}`} />
        </dl>
      </Section>

      <Section title={`Applicable rules (${content.applicableRules.length})`}>
        <ul className="divide-y divide-line text-sm">
          {content.applicableRules.map((rule) => (
            <li key={rule.ruleId} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {rule.title} <span className="font-mono text-xs text-muted">{rule.code}</span>
                </p>
                <p className="text-muted">{rule.reason}</p>
                {rule.check && <p className="text-muted">Check: {rule.check.explanation}</p>}
              </div>
              <VerdictBadge verdict={rule.verdict} />
            </li>
          ))}
        </ul>
      </Section>

      {content.undecidedRules.length > 0 && (
        <Section title={`Rules that cannot be decided yet (${content.undecidedRules.length})`}>
          <ul className="space-y-1.5 text-sm">
            {content.undecidedRules.map((rule) => (
              <li key={rule.ruleId}>
                <span className="font-medium">{rule.title}</span> —{' '}
                <span className="text-muted">{rule.reason}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Rules set aside (${content.setAsideRules.length})`}>
        <ul className="space-y-1.5 text-sm">
          {content.setAsideRules.map((rule) => (
            <li key={rule.ruleId}>
              <span className="font-medium">{rule.title}</span>{' '}
              <span className="font-mono text-xs text-muted">{rule.code}</span> —{' '}
              <span className="text-muted">{rule.reason}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Evidence (${content.evidence.length})`}>
        {content.evidence.length === 0 ? (
          <p className="text-sm text-muted">No evidence recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Document</th>
                  <th className="py-1.5 pr-3 font-medium">Kind</th>
                  <th className="py-1.5 pr-3 font-medium">Rule</th>
                  <th className="py-1.5 pr-3 font-medium">Status</th>
                  <th className="py-1.5 font-medium">SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {content.evidence.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-3 break-words">{item.fileName}</td>
                    <td className="py-2 pr-3">{EVIDENCE_KIND_LABELS[item.kind]}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{item.ruleId}</td>
                    <td className="py-2 pr-3">{item.verified ? 'Verified' : 'Provided'}</td>
                    <td className="py-2 font-mono text-[11px] break-all text-muted">{item.sha256}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {content.materials.length > 0 && (
        <Section title={`Selected materials (${content.materials.length})`}>
          <ul className="space-y-1.5 text-sm">
            {content.materials.map((material) => (
              <li key={material.id}>
                <span className="font-medium">{material.name}</span>{' '}
                <span className="text-muted">
                  · {MATERIAL_CATEGORY_LABELS[material.category as MaterialCategory] ?? material.category} ·{' '}
                  {material.supplier}
                  {material.epdNumber ? ` · EPD ${material.epdNumber}` : ''}
                  {material.gwp !== null ? ` · ${formatNumber(material.gwp, 2)} ${material.gwpUnit}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <footer className="space-y-2 border-t border-line pt-4 text-xs text-muted">
        <p>
          Record fingerprint (SHA-256 of the canonical passport content):{' '}
          <span className="font-mono break-all text-ink">{fingerprint}</span>
        </p>
        <p>{content.disclaimer}</p>
      </footer>
    </article>
  );
}
