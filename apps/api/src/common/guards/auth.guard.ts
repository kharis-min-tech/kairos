import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // TODO: Implement JWT token validation
    // For now, this is a placeholder
    const token = request.headers.authorization;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // TODO: Validate JWT token
    return true;
  }
}
