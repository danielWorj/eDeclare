import { Component, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActeService } from '../../../../Core/Service/Acte/acte-service';
import { ActeNaissance } from '../../../../Core/Model/Acte/ActeNaissance';
import { Declaration } from '../../../../Core/Model/Acte/Declaration';


@Component({
  selector: 'app-acte-naissance',
  standalone: true,
  imports: [
    CommonModule,         // DatePipe, NgClass, @if/@for natifs
    ReactiveFormsModule,  // formGroup, formControlName, [formGroup]
  ],
  templateUrl: './acte-naissance.html',
  styleUrl: './acte-naissance.css',
})
export class ActeNaissanceC {

  // ── Identity ─────────────────────────────────────────────────────────────
  idMairie = signal<number>(0);

  // ── Data signals ─────────────────────────────────────────────────────────
  listActeNaissance  = signal<ActeNaissance[]>([]);
  acteSelected       = signal<ActeNaissance | null>(null);
  listDeclaration    = signal<Declaration[]>([]);

  // ── UI state signals ─────────────────────────────────────────────────────
  isLoading          = signal(false);
  isSubmitting       = signal(false);
  successMessage     = signal('');
  errorMessage       = signal('');

  // ── Search / pagination ───────────────────────────────────────────────────
  searchTerm         = signal('');
  currentPage        = signal(1);
  readonly pageSize  = 10;

  // ── Modal visibility ─────────────────────────────────────────────────────
  showModalAdd       = signal(false);
  showModalView      = signal(false);
  showModalEdit      = signal(false);

  // ── Fichiers — Création ───────────────────────────────────────────────────
  cniPere:      File | null = null;
  photo4x4Pere: File | null = null;

  cniPereNom      = signal('Aucun fichier sélectionné');
  photo4x4PereNom = signal('Aucun fichier sélectionné');

  // ── Computed filtered list ────────────────────────────────────────────────
  filteredList = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    return this.listActeNaissance().filter(a => {
      const enfant     = a.declaration?.enfant;
      const nomComplet = `${enfant?.prenom ?? ''} ${enfant?.nom ?? ''}`.toLowerCase();
      return !term || nomComplet.includes(term) || (a.numeroActe ?? '').toLowerCase().includes(term);
    });
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  paginatedList = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredList().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredList().length / this.pageSize)));

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  // ── Forms ─────────────────────────────────────────────────────────────────
  acteNaissanceFb!: FormGroup;
  acteEditFb!:      FormGroup;

  constructor(private fb: FormBuilder, private acteService: ActeService) {
    const idStored = localStorage.getItem('etablissement');
    this.idMairie.set(idStored ? parseInt(idStored) : 0);
    this.initForms();
    this.loadPage();
  }

  loadPage(): void {
    this.getAllActe();
    this.getAllDeclarationByMairie();
  }

  // ── Form initialisation ───────────────────────────────────────────────────
  private initForms(): void {
    const pereGroup = () => ({
      nomPere:       new FormControl('', Validators.required),
      prenomPere:    new FormControl('', Validators.required),
      telephonePere: new FormControl('', Validators.required),
      emailPere:     new FormControl('', [Validators.required, Validators.email]),
      profession:    new FormControl('', Validators.required),
      domicile:      new FormControl('', Validators.required),
      dateNaissance: new FormControl('', Validators.required),
      lieuNaissance: new FormControl('', Validators.required),
    });

    this.acteNaissanceFb = this.fb.group({
      id:          new FormControl(null),
      date:        new FormControl('', Validators.required),
      declaration: new FormControl(null, Validators.required),
      ...pereGroup(),
    });

    this.acteEditFb = this.fb.group({
      id:          new FormControl(null),
      date:        new FormControl('', Validators.required),
      declaration: new FormControl(null, Validators.required),
      ...pereGroup(),
    });
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  getAllActe(): void {
    this.isLoading.set(true);
    this.acteService.getAllActeNaissanceByMairie(this.idMairie()).subscribe({
      next: (data: ActeNaissance[]) => {
        this.listActeNaissance.set(data);
        this.isLoading.set(false);
        this.currentPage.set(1);
      },
      error: () => {
        this.isLoading.set(false);
        this.notify('error', 'Impossible de charger les actes de naissance.');
      },
    });
  }

  getAllDeclarationByMairie(): void {
    this.acteService.getAllDeclarationByMairie(this.idMairie()).subscribe({
      next: (data: Declaration[]) => {
        this.listDeclaration.set(data);
      },
      error: () => {
        this.notify('error', 'Impossible de charger les déclarations.');
      },
    });
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  openModalAdd(): void {
    this.acteNaissanceFb.reset();
    this.supprimerCniPere();
    this.supprimerPhoto4x4Pere();
    this.showModalAdd.set(true);
  }

  closeModalAdd(): void {
    this.supprimerCniPere();
    this.supprimerPhoto4x4Pere();
    this.showModalAdd.set(false);
  }

  openModalView(acte: ActeNaissance): void {
    this.acteSelected.set(acte);
    this.showModalView.set(true);
  }

  closeModalView(): void {
    this.showModalView.set(false);
  }

  openModalEdit(acte: ActeNaissance): void {
    this.acteSelected.set(acte);
    this.acteEditFb.patchValue({
      id:            acte.id            ?? null,
      date:          acte.date          ?? '',
      declaration:   acte.declaration?.id ?? null,
      nomPere:       acte.pere?.nom       ?? '',
      prenomPere:    acte.pere?.prenom    ?? '',
      telephonePere: acte.pere?.telephone ?? '',
      emailPere:     acte.pere?.email     ?? '',
      profession:    acte.pere?.profession ?? '',
      domicile:      acte.pere?.domicile  ?? '',
      dateNaissance: acte.pere?.dateNaissance ?? '',
      lieuNaissance: acte.pere?.lieuNaissance ?? '',
    });
    this.showModalView.set(false);
    this.showModalEdit.set(true);
  }

  closeModalEdit(): void {
    this.showModalEdit.set(false);
  }

  // ── Sélection fichiers ────────────────────────────────────────────────────
  onSelectCniPere(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const typesAcceptes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (!typesAcceptes.includes(file.type)) {
      this.notify('error', 'CNI : format accepté — JPG, PNG ou PDF uniquement.');
      this.supprimerCniPere();
      return;
    }
    this.cniPere = file;
    this.cniPereNom.set(file.name);
    this.errorMessage.set('');
  }

  onSelectPhoto4x4Pere(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const typesAcceptes = ['image/jpeg', 'image/png'];

    if (!typesAcceptes.includes(file.type)) {
      this.notify('error', 'Photo 4×4 : format accepté — JPG ou PNG uniquement.');
      this.supprimerPhoto4x4Pere();
      return;
    }
    this.photo4x4Pere = file;
    this.photo4x4PereNom.set(file.name);
    this.errorMessage.set('');
  }

  // ── Suppression fichiers ──────────────────────────────────────────────────
  supprimerCniPere(): void {
    this.cniPere = null;
    this.cniPereNom.set('Aucun fichier sélectionné');
  }

  supprimerPhoto4x4Pere(): void {
    this.photo4x4Pere = null;
    this.photo4x4PereNom.set('Aucun fichier sélectionné');
  }

  // ── Validation fichiers ───────────────────────────────────────────────────
  private fichiersValides(): boolean {
    if (!this.cniPere) {
      this.notify('error', 'Veuillez fournir la CNI du père.');
      return false;
    }
    if (!this.photo4x4Pere) {
      this.notify('error', "Veuillez fournir la photo d'identité 4×4 du père.");
      return false;
    }
    return true;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  createActe(): void {
    if (this.acteNaissanceFb.invalid) {
      this.acteNaissanceFb.markAllAsTouched();
      return;
    }
    if (!this.fichiersValides()) return;

    this.isSubmitting.set(true);

    const dto = {
      ...this.acteNaissanceFb.value,
      typesPiecesJointes: [1, 2],
    };

    const formData = new FormData();
    formData.append('acte', JSON.stringify(dto));
    formData.append('fichiers', this.cniPere!);
    formData.append('fichiers', this.photo4x4Pere!);

    this.acteService.creationActeNaissance(formData).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.status) {
          this.notify('success', 'Acte de naissance créé avec succès !');
          this.closeModalAdd();
          this.getAllActe();
        } else {
          this.notify('error', res.message ?? 'Erreur lors de la création.');
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notify('error', 'Erreur serveur lors de la création.');
      },
    });
  }

  updateActe(): void {
    if (this.acteEditFb.invalid) {
      this.acteEditFb.markAllAsTouched();
      return;
    }
    const acte = this.acteSelected();
    if (!acte?.id) return;

    this.isSubmitting.set(true);
    const formData = new FormData();
    formData.append('acte', JSON.stringify(this.acteEditFb.value));

    this.acteService.misAjourActeNaissance(acte.id, formData).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.status) {
          this.notify('success', 'Acte mis à jour avec succès !');
          this.closeModalEdit();
          this.getAllActe();
        } else {
          this.notify('error', res.message ?? 'Erreur lors de la mise à jour.');
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notify('error', 'Erreur serveur lors de la mise à jour.');
      },
    });
  }

  deleteActe(acte: ActeNaissance, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Confirmer la suppression de l'acte ${acte.numeroActe} ?`)) return;
    if (!acte.id) return;
    this.acteService.deleteActeNaissance(acte.id).subscribe({
      next: (res) => {
        if (res.status) {
          this.notify('success', 'Acte supprimé avec succès.');
          this.getAllActe();
        } else {
          this.notify('error', res.message ?? 'Erreur lors de la suppression.');
        }
      },
      error: () => this.notify('error', 'Erreur serveur lors de la suppression.'),
    });
  }

  downloadActe(acte: ActeNaissance, event: Event): void {
    event.stopPropagation();
    this.acteService.downloadActeNaissance(acte.id!).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `acte_naissance_${acte.numeroActe}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify('error', 'Erreur lors du téléchargement du PDF.'),
    });
  }

  // ── Search / pagination ───────────────────────────────────────────────────
  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private notify(type: 'success' | 'error', msg: string): void {
    if (type === 'success') {
      this.successMessage.set(msg);
      setTimeout(() => this.successMessage.set(''), 4000);
    } else {
      this.errorMessage.set(msg);
      setTimeout(() => this.errorMessage.set(''), 5000);
    }
  }

  ctrl(form: FormGroup, name: string): FormControl {
    return form.get(name) as FormControl;
  }
}