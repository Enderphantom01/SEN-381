// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ApiService } from '../services/api.service';

export const authGuard: CanActivateFn = (route, state) => {
  const apiService = inject(ApiService);
  const router = inject(Router);

  if (apiService.isLoggedIn()) {
    return true;
  } else {
    // Redirect to login page with return url
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};