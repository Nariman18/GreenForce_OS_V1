'use client';

import { type LoginRequest, LoginRequestSchema } from '@greenforce/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { useLogin } from '@/lib/queries';

const safeNext = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : '/';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, { onSuccess: () => router.replace(safeNext(params.get('next'))) }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
      {login.isError && <Alert tone="danger">{login.error.message}</Alert>}
      <Field label="Email" error={errors.email?.message}>
        {(props) => (
          <Input
            type="email"
            autoComplete="email"
            placeholder="demo@greenforce.dev"
            {...props}
            {...register('email')}
          />
        )}
      </Field>
      <Field label="Password" error={errors.password?.message}>
        {(props) => (
          <Input type="password" autoComplete="current-password" {...props} {...register('password')} />
        )}
      </Field>
      <Button type="submit" className="w-full" loading={login.isPending || login.isSuccess}>
        Sign in
      </Button>
    </form>
  );
}
