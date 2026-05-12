import { Component, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../Core/Service/Auth/auth-service';
import { BasicAuthData } from '../../../Core/Model/Auth/BasicAuthData';

type Profil = 'parent' | 'hopital' | 'mairie';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {

  authForm!: FormGroup;
  isLoading = false;

  // ─── Signaux UI ──────────────────────────────────────────────────────────────
  profilActif   = signal<Profil>('parent');
  showPassword  = signal<boolean>(false);
  loginError    = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.authForm = this.fb.group({
      email:    new FormControl(''),
      password: new FormControl(''),
    });
  }

  roleRoutes: Record<number, string> = {
    1: '/mairie/dashboard',
    2: '/parent/dashboard',
    3: '/hopital/dashboard',
  };

  // ─── Sélection du profil ─────────────────────────────────────────────────────
  setProfilActif(profil: Profil): void {
    this.profilActif.set(profil);
    this.loginError.set(null);
  }

  // ─── Toggle visibilité mot de passe ─────────────────────────────────────────
  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  // ─── Connexion ───────────────────────────────────────────────────────────────
  login(): void {
    this.isLoading = true;
    this.loginError.set(null);

    const formData = new FormData();
    formData.append('auth', JSON.stringify(this.authForm.value));

    this.authService.login(formData).subscribe({
      next: (data: BasicAuthData) => {
        this.isLoading = false;
        if (data.id !== 0) {
          localStorage.setItem('id',           `${data.id}`);
          localStorage.setItem('role',         `${data.role}`);
          localStorage.setItem('etablissement',`${data.etablissement}`);

          const returnUrl    = this.route.snapshot.queryParamMap.get('returnUrl');
          const defaultRoute = this.roleRoutes[data.role] ?? '/login';
          const safeUrl      = returnUrl?.startsWith('/') ? returnUrl : defaultRoute;
          this.router.navigateByUrl(safeUrl);
        } else {
          this.loginError.set('Identifiants incorrects. Veuillez réessayer.');
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.loginError.set(
          err?.error?.message ?? 'Erreur de connexion. Veuillez réessayer.'
        );
      }
    });
  }
}