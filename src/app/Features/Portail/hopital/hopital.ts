import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { Sexe } from '../../../Core/Model/Enfant/Sexe';
import { ActeService } from '../../../Core/Service/Acte/acte-service';
import { UtilisateurService } from '../../../Core/Service/Utilisateur/utilisateur-service';
import { EtablissementService } from '../../../Core/Service/Etablissement/etablissement-service';
import { ServerResponse } from '../../../Core/Model/Server/ServerResponse';
import { Declaration } from '../../../Core/Model/Acte/Declaration';
import { Hopital } from '../../../Core/Model/Etablissement/Hopital';

@Component({
  selector: 'app-hopital',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hopital.html',
  styleUrl: './hopital.css',
})
export class HopitalC {

  // ─── ID de l'établissement connecté ─────────────────────────────────────────
  idHopital        = signal<number>(0);
  hopitalConnected = signal<Hopital | null>(null);
  listeSexes       = signal<Sexe[]>([]);

  // ─── État soumission ─────────────────────────────────────────────────────────
  isLoading      = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage   = signal<string | null>(null);

  // ─── UI signals ──────────────────────────────────────────────────────────────
  /** Contrôle l'ouverture de la modale déclaration */
  isModalOpen    = signal<boolean>(false);
  /** Contrôle le menu mobile navbar */
  mobileMenuOpen = signal<boolean>(false);

  // ─── Fichiers sélectionnés ───────────────────────────────────────────────────
  cniMere              : File | null = null;
  photo4x4             : File | null = null;
  certificationNaissance: File | null = null;

  cniMereNom               = signal<string>('Aucun fichier sélectionné');
  photo4x4Nom              = signal<string>('Aucun fichier sélectionné');
  certificationNaissanceNom = signal<string>('Aucun fichier sélectionné');

  // ─── Données ─────────────────────────────────────────────────────────────────
  listDeclaration          = signal<Declaration[]>([]);
  numberOfDeclaration      = signal<number>(0);
  numberOfDeclarationMale  = signal<number>(0);
  numberOfDeclarationFemale= signal<number>(0);

  // ─── Formulaire ─────────────────────────────────────────────────────────────
  declarationFb!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private etablissementService: EtablissementService,
    private acteService: ActeService,
    private utilisateurService: UtilisateurService,
  ) {
    const idStored = localStorage.getItem('etablissement');
    this.idHopital.set(idStored ? parseInt(idStored) : 0);

    this.declarationFb = this.fb.group({
      // Enfant
      nomEnfant    : new FormControl('', [Validators.required]),
      prenomEnfant : new FormControl('', [Validators.required]),
      sexe         : new FormControl('', [Validators.required]),
      dateNaissance: new FormControl('', [Validators.required]),
      lieuNaissance: new FormControl('', [Validators.required]),

      // Mère
      nomParent     : new FormControl('', [Validators.required]),
      prenomParent  : new FormControl('', [Validators.required]),
      telephone     : new FormControl('', [Validators.required]),
      profession    : new FormControl('', [Validators.required]),
      email         : new FormControl('', [Validators.required, Validators.email]),
      localisation  : new FormControl(''),
      dateNaissanceM: new FormControl(''),
      lieuNaissanceM: new FormControl(''),

      // Structure (injectée automatiquement)
      hopital: new FormControl(),
      mairie : new FormControl(),
    });

    this.loadPage();
  }

  // ─── Chargement ──────────────────────────────────────────────────────────────

  loadPage(): void {
    this.getHopitalById(this.idHopital());
    this.getAllSexes();
    this.getAllDeclaration();
  }

  getHopitalById(id: number): void {
    this.etablissementService.getHopitalByid(id).subscribe({
      next: (response: Hopital) => {
        this.hopitalConnected.set(response);
        this.declarationFb.get('hopital')?.setValue(response.id);
        this.declarationFb.get('mairie')?.setValue(response.mairie?.id);
      },
      error: (err: any) => console.error('Erreur chargement établissement :', err),
    });
  }

  getAllDeclaration(): void {
    this.acteService.getAllDeclarationByHopital(this.idHopital()).subscribe({
      next: (data: Declaration[]) => {
        this.listDeclaration.set(data);
        this.getNumbers();
      },
      error: () => console.error('Fetch liste déclarations : échec'),
    });
  }

  getNumbers(): void {
    this.numberOfDeclaration.set(this.listDeclaration().length);
    this.numberOfDeclarationMale.set(
      this.listDeclaration().filter(d => d.enfant.sexe.id === 1).length
    );
    this.numberOfDeclarationFemale.set(
      this.listDeclaration().filter(d => d.enfant.sexe.id === 2).length
    );
  }

  getAllSexes(): void {
    this.utilisateurService.getAllSexe().subscribe({
      next: (response: Sexe[]) => this.listeSexes.set(response),
      error: (err: any) => console.error('Erreur chargement sexes :', err),
    });
  }

  // ─── UI : modale & menu mobile ───────────────────────────────────────────────

  ouvrirModal(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isModalOpen.set(true);
  }

  fermerModal(): void {
    this.isModalOpen.set(false);
    this.resetFormulaire();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  // ─── Sélection des fichiers ──────────────────────────────────────────────────

  onSelectCniMere(event: Event): void {
    const file = this.extraireFile(event, ['image/jpeg','image/png','application/pdf']);
    if (!file) { this.errorMessage.set('CNI : format accepté — JPG, PNG ou PDF.'); return; }
    this.cniMere = file;
    this.cniMereNom.set(file.name);
    this.errorMessage.set(null);
  }

  onSelectPhoto4x4(event: Event): void {
    const file = this.extraireFile(event, ['image/jpeg','image/png']);
    if (!file) { this.errorMessage.set('Photo 4×4 : format accepté — JPG ou PNG.'); return; }
    this.photo4x4 = file;
    this.photo4x4Nom.set(file.name);
    this.errorMessage.set(null);
  }

  onSelectCertificationNaissance(event: Event): void {
    const file = this.extraireFile(event, ['image/jpeg','image/png','application/pdf']);
    if (!file) { this.errorMessage.set('Certification : format accepté — JPG, PNG ou PDF.'); return; }
    this.certificationNaissance = file;
    this.certificationNaissanceNom.set(file.name);
    this.errorMessage.set(null);
  }

  private extraireFile(event: Event, types: string[]): File | null {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return null;
    const file = input.files[0];
    return types.includes(file.type) ? file : null;
  }

  // ─── Suppression fichiers ────────────────────────────────────────────────────

  supprimerCni(): void {
    this.cniMere = null;
    this.cniMereNom.set('Aucun fichier sélectionné');
  }
  supprimerPhoto(): void {
    this.photo4x4 = null;
    this.photo4x4Nom.set('Aucun fichier sélectionné');
  }
  supprimerCertification(): void {
    this.certificationNaissance = null;
    this.certificationNaissanceNom.set('Aucun fichier sélectionné');
  }

  // ─── Validation fichiers ─────────────────────────────────────────────────────

  private fichiersValides(): boolean {
    if (!this.cniMere)               { this.errorMessage.set('Veuillez fournir la CNI de la mère.');              return false; }
    if (!this.photo4x4)              { this.errorMessage.set('Veuillez fournir la photo 4×4.');                   return false; }
    if (!this.certificationNaissance){ this.errorMessage.set('Veuillez fournir la certification de naissance.');  return false; }
    return true;
  }

  // ─── Soumission ──────────────────────────────────────────────────────────────

  soumettre(): void {
    if (this.declarationFb.invalid) {
      this.declarationFb.markAllAsTouched();
      this.errorMessage.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!this.fichiersValides()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.declarationFb.controls['hopital'].setValue(this.hopitalConnected()?.id);
    this.declarationFb.controls['mairie'].setValue(this.hopitalConnected()?.mairie?.id);

    const dto = { ...this.declarationFb.value, typesPiecesJointes: [1, 2, 3] };

    const formData = new FormData();
    formData.append('declaration', JSON.stringify(dto));
    formData.append('fichiers', this.cniMere!);
    formData.append('fichiers', this.photo4x4!);
    formData.append('fichiers', this.certificationNaissance!);

    this.acteService.declarationActeNaissance(formData).subscribe({
      next: (response: ServerResponse) => {
        this.isLoading.set(false);
        if (response.status) {
          this.successMessage.set('Déclaration créée avec succès !');
          this.fermerModal();
          this.loadPage();
        } else {
          this.errorMessage.set(response.message ?? 'Erreur lors de la création.');
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set('Erreur serveur : ' + (err?.error?.message ?? err.message));
      },
    });
  }

  // ─── Réinitialisation ────────────────────────────────────────────────────────

  resetFormulaire(): void {
    this.declarationFb.reset();
    this.supprimerCni();
    this.supprimerPhoto();
    this.supprimerCertification();
  }

  // ─── Helpers template ────────────────────────────────────────────────────────

  champInvalide(nom: string): boolean {
    const ctrl = this.declarationFb.get(nom);
    return !!(ctrl?.invalid && ctrl.touched);
  }
}