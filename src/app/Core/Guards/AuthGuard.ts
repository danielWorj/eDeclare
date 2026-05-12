import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Service/Auth/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  } else {
    // On mémorise l'URL demandée dans le queryParam
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }
};