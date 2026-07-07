import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator.js';

interface SupabaseUser {
  id: string;
  email?: string;
}

// Cache simple token -> email para no llamar a Supabase en cada request.
const tokenCache = new Map<string, { email: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: { email: string } }>();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de autenticacion');
    }
    const token = authHeader.slice('Bearer '.length).trim();

    const email = await this.resolveEmail(token);
    if (!email) throw new UnauthorizedException('Token invalido o expirado');

    const allowed = this.allowedEmails();
    if (allowed.length > 0 && !allowed.includes(email.toLowerCase())) {
      throw new ForbiddenException('Cuenta no autorizada');
    }

    req.user = { email };
    return true;
  }

  private allowedEmails(): string[] {
    return (process.env['ALLOWED_EMAILS'] ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  private async resolveEmail(token: string): Promise<string | null> {
    const now = Date.now();
    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > now) return cached.email;

    const supabaseUrl = process.env['SUPABASE_URL'];
    const anonKey = process.env['SUPABASE_ANON_KEY'];
    if (!supabaseUrl || !anonKey) {
      throw new UnauthorizedException('Autenticacion no configurada en el servidor');
    }

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;

    const user = (await res.json()) as SupabaseUser;
    if (!user?.email) return null;

    tokenCache.set(token, { email: user.email, expiresAt: now + CACHE_TTL_MS });
    return user.email;
  }
}
