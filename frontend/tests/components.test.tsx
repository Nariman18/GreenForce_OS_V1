import type { FixItem } from '@greenforce/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { validateEvidenceFile } from '@/app/(app)/projects/[id]/evidence/requirement-row';
import { FixList } from '@/components/fix-list';
import { ReadinessPanel } from '@/components/readiness-panel';
import { VerdictBadge } from '@/components/verdict-badge';

describe('VerdictBadge', () => {
  it('uses the brief wording for verdicts and set-aside rules', () => {
    render(
      <>
        <VerdictBadge verdict="FAILS" />
        <VerdictBadge verdict="CANT_DECIDE" />
        <VerdictBadge verdict={null} />
      </>,
    );
    expect(screen.getByText('Fails — fix needed')).toBeInTheDocument();
    expect(screen.getByText("Can't decide yet")).toBeInTheDocument();
    expect(screen.getByText('Set aside')).toBeInTheDocument();
  });
});

describe('FixList', () => {
  const items: FixItem[] = [
    {
      ruleId: 'DK-LCA-LIMIT',
      code: 'BR18 §298',
      title: 'Climate limit',
      verdict: 'FAILS',
      action: 'Reduce climate impact',
    },
    {
      ruleId: 'DK-FIRE',
      code: 'BR18 §493',
      title: 'Fire',
      verdict: 'PROOF_MISSING',
      action: 'Provide: Fire strategy',
    },
    {
      ruleId: 'DK-STRUCT',
      code: 'BR18 §483',
      title: 'Structure',
      verdict: 'CANT_DECIDE',
      action: 'Declare in Setup: Construction class.',
    },
  ];

  it('links each action to the screen that resolves it', () => {
    render(<FixList projectId="p1" items={items} />);
    expect(screen.getByRole('link', { name: /Climate limit/ })).toHaveAttribute(
      'href',
      '/projects/p1/requirements#DK-LCA-LIMIT',
    );
    expect(screen.getByRole('link', { name: /Fire/ })).toHaveAttribute(
      'href',
      '/projects/p1/evidence#DK-FIRE',
    );
    expect(screen.getByRole('link', { name: /Structure/ })).toHaveAttribute('href', '/projects/p1/setup');
  });

  it('celebrates an empty list and truncates long ones', () => {
    const { rerender } = render(<FixList projectId="p1" items={[]} />);
    expect(screen.getByText(/Nothing to fix/)).toBeInTheDocument();
    rerender(<FixList projectId="p1" items={items} limit={1} />);
    expect(screen.getByRole('link', { name: 'View all 3 actions' })).toBeInTheDocument();
  });
});

describe('ReadinessPanel', () => {
  it('shows the three readiness components', () => {
    render(
      <ReadinessPanel
        readiness={{
          rulesDecided: { done: 10, total: 10, pct: 100 },
          proofIn: { done: 2, total: 12, pct: 17 },
          checksPassing: { done: 3, total: 4, pct: 75 },
          overall: 64,
        }}
      />,
    );
    expect(screen.getByRole('img', { name: 'Compliance readiness: 64%' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Proof in' })).toHaveAttribute('aria-valuenow', '17');
  });
});

describe('validateEvidenceFile', () => {
  it('accepts PDFs and rejects oversized or unsupported files', () => {
    expect(validateEvidenceFile(new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }))).toBeNull();
    expect(validateEvidenceFile(new File(['x'], 'a.exe', { type: 'application/x-msdownload' }))).toMatch(
      /Upload a PDF/,
    );
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
    expect(validateEvidenceFile(big)).toMatch(/larger than/);
  });
});
