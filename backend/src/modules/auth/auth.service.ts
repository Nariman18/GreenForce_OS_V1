import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginRequest, User } from '@greenforce/shared';
import bcrypt from 'bcryptjs';
import type { User as UserRow } from '../../generated/prisma/client.js';
import { type Database, PRISMA } from '../../db/prisma.js';

interface SessionPayload {
  sub: string;
}

export const BCRYPT_ROUNDS = 12;

/** Comparing unknown emails against a real hash keeps login timing similar for both cases. */
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA) private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  async login({ email, password }: LoginRequest): Promise<{ user: User; token: string }> {
    const row = await this.db.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, row?.passwordHash ?? DUMMY_HASH);
    if (!row || !valid) throw new UnauthorizedException('Invalid email or password');

    const token = await this.jwt.signAsync({ sub: row.id } satisfies SessionPayload);
    return { user: toUser(row), token };
  }

  /** Resolves a session token to its user; null for invalid, expired or orphaned tokens. */
  async userFromToken(token: string): Promise<User | null> {
    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      return null;
    }
    const row = await this.db.user.findUnique({ where: { id: payload.sub } });
    return row ? toUser(row) : null;
  }
}

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, organization: row.organization };
}
