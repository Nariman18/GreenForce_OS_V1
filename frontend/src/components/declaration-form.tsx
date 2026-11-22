'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { type FieldValues, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from './ui/button';
import { Alert } from './ui/feedback';
import { Field, Input, Select } from './ui/field';

export type FieldDef =
  | { name: string; label: string; hint?: string; type: 'select'; options: Record<string, string> }
  | { name: string; label: string; hint?: string; type: 'boolean'; trueLabel: string; falseLabel: string }
  | { name: string; label: string; hint?: string; type: 'number'; unit: string; step?: string }
  | { name: string; label: string; hint?: string; type: 'date' };

/** Empty inputs mean "not declared" — the shared schemas model that as an absent (undefined) field. */
const toOptional = (value: unknown) => (value === '' || value === null ? undefined : value);
const toNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);
const toBoolean = (value: unknown) => (value === 'true' ? true : value === 'false' ? false : undefined);

interface DeclarationFormProps<T extends FieldValues> {
  schema: z.ZodType<T, FieldValues>;
  fields: FieldDef[];
  defaultValues: T;
  submitLabel: string;
  onSubmit: (values: T) => Promise<unknown>;
  successMessage: string;
}

/**
 * Renders a jurisdiction's declaration fields from config and validates them with the shared Zod schema,
 * so the browser and the API enforce exactly the same rules.
 */
export function DeclarationForm<T extends FieldValues>({
  schema,
  fields,
  defaultValues,
  submitLabel,
  onSubmit,
  successMessage,
}: DeclarationFormProps<T>) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful, isDirty },
    reset,
    setError,
  } = useForm<FieldValues, unknown, T>({ resolver: zodResolver(schema), defaultValues });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      reset(values, { keepIsSubmitSuccessful: true });
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Could not save' });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        {fields.map((field) => {
          const error = errors[field.name]?.message;
          return (
            <Field
              key={field.name}
              label={field.label}
              hint={field.hint}
              error={typeof error === 'string' ? error : undefined}
            >
              {(props) => {
                switch (field.type) {
                  case 'select':
                    return (
                      <Select {...props} {...register(field.name, { setValueAs: toOptional })}>
                        <option value="">Not declared</option>
                        {Object.entries(field.options).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    );
                  case 'boolean':
                    return (
                      <Select {...props} {...register(field.name, { setValueAs: toBoolean })}>
                        <option value="">Not declared</option>
                        <option value="true">{field.trueLabel}</option>
                        <option value="false">{field.falseLabel}</option>
                      </Select>
                    );
                  case 'number':
                    return (
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step={field.step ?? 'any'}
                          className="pr-24"
                          {...props}
                          {...register(field.name, { setValueAs: toNumber })}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                          {field.unit}
                        </span>
                      </div>
                    );
                  case 'date':
                    return (
                      <Input type="date" {...props} {...register(field.name, { setValueAs: toOptional })} />
                    );
                }
              }}
            </Field>
          );
        })}
      </div>
      {errors.root?.message && <Alert tone="danger">{errors.root.message}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
        {isSubmitSuccessful && !isDirty && !errors.root && (
          <span role="status" className="flex items-center gap-1.5 text-sm text-pine-700">
            <CheckCircle2 className="size-4" aria-hidden /> {successMessage}
          </span>
        )}
      </div>
    </form>
  );
}
