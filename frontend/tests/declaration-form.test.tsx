import { DkSetupSchema, type ProjectSetup } from '@greenforce/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeclarationForm } from '@/components/declaration-form';
import { DK_SETUP_FIELDS } from '@/app/(app)/projects/[id]/setup/fields';

function renderForm(
  onSubmit = vi.fn().mockResolvedValue(undefined),
  defaults: ProjectSetup = { jurisdiction: 'DK' },
) {
  render(
    <DeclarationForm<ProjectSetup>
      schema={DkSetupSchema}
      fields={DK_SETUP_FIELDS}
      defaultValues={defaults}
      submitLabel="Save setup"
      successMessage="Saved"
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

describe('DeclarationForm with the shared DK setup schema', () => {
  it('renders every brief §3 declaration with a "Not declared" option', () => {
    renderForm();
    for (const label of [
      'Project nature',
      'Building type',
      'Heating',
      'Funding route',
      'Construction class',
      'Fire class',
      'Exempt use',
      'Application date',
      'Gross floor area',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Project nature')).toHaveValue('');
  });

  it('blocks invalid values using the shared schema message', async () => {
    const onSubmit = renderForm();
    await userEvent.type(screen.getByLabelText('Gross floor area'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save setup' }));
    expect(await screen.findByText('Must be greater than 0')).toBeInTheDocument();
    expect(screen.getByLabelText('Gross floor area')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits typed values and omits undeclared fields', async () => {
    const onSubmit = renderForm();
    await userEvent.selectOptions(screen.getByLabelText('Project nature'), 'new_build');
    await userEvent.type(screen.getByLabelText('Gross floor area'), '4200');
    await userEvent.click(screen.getByRole('button', { name: 'Save setup' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(values).toMatchObject({ jurisdiction: 'DK', projectNature: 'new_build', grossFloorAreaM2: 4200 });
    expect(values.heating).toBeUndefined();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('shows API errors without losing input', async () => {
    renderForm(vi.fn().mockRejectedValue(new Error('This project is in DE')));
    await userEvent.selectOptions(screen.getByLabelText('Heating'), 'oil');
    await userEvent.click(screen.getByRole('button', { name: 'Save setup' }));
    expect(await screen.findByText('This project is in DE')).toBeInTheDocument();
    expect(screen.getByLabelText('Heating')).toHaveValue('oil');
  });
});
