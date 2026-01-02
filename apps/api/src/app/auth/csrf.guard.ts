import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CsrfService } from './csrf.service';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrfService: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only protect mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    // Skip CSRF check if API key authentication is used
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      return true;
    }

    // Get CSRF token from header
    const token = request.headers['x-csrf-token'] as string;
    if (!token) {
      throw new ForbiddenException('CSRF token is required in x-csrf-token header');
    }

    // Get CSRF secret from cookie
    const csrfSecret = request.cookies?.['csrf-secret'];
    if (!csrfSecret) {
      throw new ForbiddenException('CSRF secret cookie is missing');
    }

    // Verify token matches secret
    const isValid = this.csrfService.verifyToken(csrfSecret, token);
    if (!isValid) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}

