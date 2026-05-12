import { Component, signal, OnInit } from '@angular/core';


import { Sexe } from '../../../Core/Model/Enfant/Sexe';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActeService } from '../../../Core/Service/Acte/acte-service';
import { UtilisateurService } from '../../../Core/Service/Utilisateur/utilisateur-service';
import { ServerResponse } from '../../../Core/Model/Server/ServerResponse';
import { Declaration } from '../../../Core/Model/Acte/Declaration';
import { EtablissementService } from '../../../Core/Service/Etablissement/etablissement-service';
import { Hopital } from '../../../Core/Model/Etablissement/Hopital';

@Component({
  selector: 'app-hopital',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hopital.html',
  styleUrl: './hopital.css',
})
export class HopitalC  {

  // ─── ID de l'établissement connecté ─────────────────────────────────────────
  idHopital = signal<number>(0);
  hopitalConnected = signal<Hopital | null>(null);
  listeSexes = signal<Sexe[]>([]);

  // ─── État de la soumission ───────────────────────────────────────────────────
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // ─── Fichiers sélectionnés ───────────────────────────────────────────────────
  // TypePieceDeclaration IDs (à adapter selon ta base)
  // 1 = CNI Mère | 2 = Photo 4x4 | 3 = Certification de naissance
  cniMere: File | null = null;
  photo4x4: File | null = null;
  certificationNaissance: File | null = null;

  // Noms affichés dans le template
  cniMereNom = signal<string>('Aucun fichier sélectionné');
  photo4x4Nom = signal<string>('Aucun fichier sélectionné');
  certificationNaissanceNom = signal<string>('Aucun fichier sélectionné');

  // ─── Formulaire ─────────────────────────────────────────────────────────────
  declarationFb!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private etablissementService: EtablissementService,
    private acteService: ActeService,
    private utilisateurService : UtilisateurService
  ) {
    const idStored = localStorage.getItem('etablissement');
    this.idHopital.set(idStored ? parseInt(idStored) : 0);

    this.declarationFb = this.fb.group({
      // ── Enfant ──────────────────────────────────────────────────────────────
      nomEnfant:       new FormControl('', [Validators.required]),
      prenomEnfant:    new FormControl('', [Validators.required]),
      sexe:            new FormControl('', [Validators.required]),
      dateNaissance:   new FormControl('', [Validators.required]),
      lieuNaissance:   new FormControl('', [Validators.required]),

      // ── Mère (Parent déclarant) ──────────────────────────────────────────────
      nomParent:       new FormControl('', [Validators.required]),
      prenomParent:    new FormControl('', [Validators.required]),
      telephone:       new FormControl('', [Validators.required]),
      profession:       new FormControl('', [Validators.required]),
      email:           new FormControl('', [Validators.required, Validators.email]),
      localisation:    new FormControl(''),
      dateNaissanceM:    new FormControl(''),
      lieuNaissanceM:    new FormControl(''),

      // ── Structure (injectée automatiquement) ────────────────────────────────
      hopital:       new FormControl(),
      mairie:       new FormControl(),
    });

    this.loadPage(); 
  }

  loadPage(): void {
    this.getHopitalById(this.idHopital());
    this.getAllSexes();
    this.getAllDeclaration(); 
  }

  // ─── Chargement des données de référence ────────────────────────────────────

  getHopitalById(id: number): void {
    this.etablissementService.getHopitalByid(id).subscribe({
      next: (response: Hopital) => {
        this.hopitalConnected.set(response);
        // Injecter l'ID de la structure dans le formulaire
        this.declarationFb.get('structure')?.setValue(response.id);
        
      },
      error: (error:any) => {
        console.error('Erreur chargement établissement :', error);
      }
    });
  }

  listDeclaration = signal<Declaration[]>([]); 
  getAllDeclaration(){
    this.acteService.getAllDeclarationByHopital(this.idHopital()).subscribe({
      next:(data:Declaration[])=>{
        this.listDeclaration.set(data); 
        this.getNumbers()
      }, 
      error:()=>{
        console.log('Fecth list declaeation : failed');
      }
    }); 
  }

  numberOfDeclaration = signal<number>(0); 
  numberOfDeclarationMale = signal<number>(0); 
  numberOfDeclarationFemale = signal<number>(0); 

  getNumbers(){
    this.numberOfDeclaration.set(this.listDeclaration().length); 

    this.numberOfDeclarationMale.set(
      this.listDeclaration().filter(d => d.enfant.sexe.id==1).length
    )

    this.numberOfDeclarationFemale.set(
      this.listDeclaration().filter(d => d.enfant.sexe.id==2).length
    )
  }

  getAllSexes(): void {
    this.utilisateurService.getAllSexe().subscribe({
      next: (response: Sexe[]) => {
        this.listeSexes.set(response);
      },
      error: (error) => {
        console.error('Erreur chargement sexes :', error);
      }
    });
  }

  // ─── Sélection des fichiers ──────────────────────────────────────────────────

  /**
   * Sélection de la CNI de la mère (image ou PDF)
   */
  onSelectCniMere(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const typesAcceptes = ['image/jpeg', 'image/png', 'application/pdf'];

      if (!typesAcceptes.includes(file.type)) {
        this.errorMessage.set('CNI : format accepté — JPG, PNG ou PDF uniquement.');
        this.cniMere = null;
        this.cniMereNom.set('Aucun fichier sélectionné');
        return;
      }

      this.cniMere = file;
      this.cniMereNom.set(file.name);
      this.errorMessage.set(null);
    }
  }

  /**
   * Sélection de la photo 4x4 (image uniquement)
   */
  onSelectPhoto4x4(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const typesAcceptes = ['image/jpeg', 'image/png'];

      if (!typesAcceptes.includes(file.type)) {
        this.errorMessage.set('Photo 4x4 : format accepté — JPG ou PNG uniquement.');
        this.photo4x4 = null;
        this.photo4x4Nom.set('Aucun fichier sélectionné');
        return;
      }

      this.photo4x4 = file;
      this.photo4x4Nom.set(file.name);
      this.errorMessage.set(null);
    }
  }

  /**
   * Sélection de la certification de naissance (image ou PDF)
   */
  onSelectCertificationNaissance(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const typesAcceptes = ['image/jpeg', 'image/png', 'application/pdf'];

      if (!typesAcceptes.includes(file.type)) {
        this.errorMessage.set('Certification : format accepté — JPG, PNG ou PDF uniquement.');
        this.certificationNaissance = null;
        this.certificationNaissanceNom.set('Aucun fichier sélectionné');
        return;
      }

      this.certificationNaissance = file;
      this.certificationNaissanceNom.set(file.name);
      this.errorMessage.set(null);
    }
  }

  // ─── Suppression d'un fichier sélectionné ───────────────────────────────────

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

  // ─── Validation avant envoi ──────────────────────────────────────────────────

  private fichiersValides(): boolean {
    if (!this.cniMere) {
      this.errorMessage.set('Veuillez fournir la CNI de la mère.');
      return false;
    }
    if (!this.photo4x4) {
      this.errorMessage.set('Veuillez fournir la photo 4x4.');
      return false;
    }
    if (!this.certificationNaissance) {
      this.errorMessage.set('Veuillez fournir la certification de naissance.');
      return false;
    }
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

    // Construction du DTO (partie JSON)
    // typesPiecesJointes correspond aux IDs TypePieceDeclaration dans le même ordre que les fichiers
    // Construction du FormData (JSON + fichiers)
    this.declarationFb.controls['hopital'].setValue(this.hopitalConnected()?.id); 
    this.declarationFb.controls['mairie'].setValue(this.hopitalConnected()?.mairie.id);
    
    const dto = {
      ...this.declarationFb.value,
      typesPiecesJointes: [1, 2, 3]  // 1=CNI | 2=Photo4x4 | 3=Certification
    };

     

    console.log('data a creer:', this.declarationFb.value)
    const formData = new FormData();
    formData.append('declaration', JSON.stringify(dto));
    formData.append('fichiers', this.cniMere!);
    formData.append('fichiers', this.photo4x4!);
    formData.append('fichiers', this.certificationNaissance!);

    this.acteService.declarationActeNaissance(formData).subscribe({
      next: (response:ServerResponse) => {
        this.isLoading.set(false);
        if (response.status) {
          this.loadPage(); 
          this.successMessage.set('Déclaration créée avec succès !');
          this.resetFormulaire();
        } else {
          this.errorMessage.set(response.message ?? 'Erreur lors de la création.');
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set('Erreur serveur : ' + (error?.error?.message ?? error.message));
        console.error('Erreur création déclaration :', error);
      }
    });
  }

  // ─── Réinitialisation ────────────────────────────────────────────────────────

  resetFormulaire(): void {
    this.declarationFb.reset();
    this.declarationFb.get('structure')?.setValue(this.idHopital());
    this.supprimerCni();
    this.supprimerPhoto();
    this.supprimerCertification();
  }

  // ─── Helpers template ────────────────────────────────────────────────────────

  champInvalide(nom: string): boolean {
    const ctrl = this.declarationFb.get(nom);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}