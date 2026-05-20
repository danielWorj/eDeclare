import {
  Component,
  signal,
  computed,
  AfterViewInit,
  OnDestroy,
  effect,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActeService } from '../../../../Core/Service/Acte/acte-service';
import { Declaration, DeclarationPiece } from '../../../../Core/Model/Acte/Declaration';
import { PieceJointeDeclaration } from '../../../../Core/Model/Acte/PieceJointeDeclaration';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  Chart,
  ChartConfiguration,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

@Component({
  selector: 'app-tele-declaration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tele-declaration.html',
  styleUrl: './tele-declaration.css',
})
export class TeleDeclaration implements AfterViewInit, OnDestroy {

  // ── Références canvas Chart.js ────────────────────────────────────────────
  @ViewChild('chartDecl') chartDeclRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartMois') chartMoisRef!: ElementRef<HTMLCanvasElement>;

  private chartDecl: Chart | null = null;
  private chartMois: Chart | null = null;

  // ── Identité mairie (session) ─────────────────────────────────────────────
  idMairie = signal<number>(0);

  // ── Données ───────────────────────────────────────────────────────────────
  listDeclaration      = signal<Declaration[]>([]);
  declarationSelected  = signal<Declaration | null>(null);
  declarationPieceSelected = signal<DeclarationPiece | null>(null);

  // ── État UI ───────────────────────────────────────────────────────────────
  isLoading    = signal(false);
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage   = signal('');

  // ── Recherche / pagination ────────────────────────────────────────────────
  searchTerm        = signal('');
  currentPage       = signal(1);
  readonly pageSize = 10;

  // ── Visibilité modaux ─────────────────────────────────────────────────────
  showModalAdd  = signal(false);
  showModalView = signal(false);
  showModalEdit = signal(false);
  showModalDelete = signal(false);

  // ── Pièces jointes (création) ─────────────────────────────────────────────
  pieceJointe: File | null = null;
  pieceJointeNom = signal('Aucun fichier sélectionné');

  // ── Lightbox ──────────────────────────────────────────────────────────────
  showLightbox   = signal(false);
  lightboxPieces = signal<PieceJointeDeclaration[]>([]);
  lightboxIndex  = signal(0);

  // ── Computed ──────────────────────────────────────────────────────────────
  filteredList = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    return this.listDeclaration().filter(d => {
      const enfant     = d.enfant;
      const nomComplet = `${enfant?.prenom ?? ''} ${enfant?.nom ?? ''}`.toLowerCase();
      const mere       = `${d.mere?.prenom ?? ''} ${d.mere?.nom ?? ''}`.toLowerCase();
      return !term || nomComplet.includes(term) || mere.includes(term);
    });
  });

  paginatedList = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredList().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredList().length / this.pageSize)));
  pages      = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  // ── KPI ───────────────────────────────────────────────────────────────────
  totalDeclarations = computed(() => this.listDeclaration().length);

  declarationsDuMois = computed(() => {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();
    return this.listDeclaration().filter(d => {
      if (!d.date) return false;
      const dd = new Date(d.date);
      return dd.getMonth() === month && dd.getFullYear() === year;
    }).length;
  });

  declarationsDeLaSemaine = computed(() => {
    const now    = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return this.listDeclaration().filter(d => {
      if (!d.date) return false;
      return new Date(d.date) >= monday;
    }).length;
  });

  declarationsFiltered = computed(() => this.filteredList().length);

  // ── Pièces jointes groupées par type ─────────────────────────────────────
  piecesJointesParType = computed(() => {
    const pieces = this.declarationPieceSelected()?.pieces ?? [];
    const map = new Map<string, { type: string; isPdf: boolean; pieces: PieceJointeDeclaration[] }>();
    for (const pj of pieces) {
      const typeName = pj.type?.nom ?? 'Autres';
      if (!map.has(typeName)) {
        map.set(typeName, { type: typeName, isPdf: this.isPdf(pj.chemin), pieces: [] });
      }
      map.get(typeName)!.pieces.push(pj);
    }
    return Array.from(map.values());
  });

  // ── Formulaires ───────────────────────────────────────────────────────────
  declarationAddFb!: FormGroup;
  declarationEditFb!: FormGroup;

  constructor(private fb: FormBuilder, private acteService: ActeService, private sanitizer: DomSanitizer) {
    const idStored = localStorage.getItem('etablissement');
    this.idMairie.set(idStored ? parseInt(idStored) : 0);
    this.initForms();
    this.loadPage();

    effect(() => {
      this.listDeclaration(); // réactif
      setTimeout(() => this.buildCharts(), 0);
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.buildCharts();
  }

  ngOnDestroy(): void {
    this.chartDecl?.destroy();
    this.chartMois?.destroy();
  }

  // ── Charts ────────────────────────────────────────────────────────────────
  private buildCharts(): void {
    this.buildChartDeclarations();
    this.buildChartMois();
  }

  private buildMonthlyStats(dates: string[]): { labels: string[]; data: number[] } {
    const months: string[] = [];
    const counts: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      months.push(label);
      const count = dates.filter(dateStr => {
        if (!dateStr) return false;
        const dd = new Date(dateStr);
        return dd.getMonth() === d.getMonth() && dd.getFullYear() === d.getFullYear();
      }).length;
      counts.push(count);
    }
    return { labels: months, data: counts };
  }

  private buildChartDeclarations(): void {
    if (!this.chartDeclRef?.nativeElement) return;
    const dates = this.listDeclaration().map(d => d.date ?? '');
    const { labels, data } = this.buildMonthlyStats(dates);

    if (this.chartDecl) {
      this.chartDecl.data.labels = labels;
      (this.chartDecl.data.datasets[0] as any).data = data;
      this.chartDecl.update();
      return;
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Télédéclarations',
          data,
          borderColor: '#003189',
          backgroundColor: 'rgba(0,49,137,.10)',
          borderWidth: 2.5,
          pointBackgroundColor: '#003189',
          pointRadius: 4,
          tension: 0.4,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} déclaration(s)` } } },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { stepSize: 1, font: { size: 11 } } },
        },
      },
    };
    this.chartDecl = new Chart(this.chartDeclRef.nativeElement, config);
  }

  private buildChartMois(): void {
    if (!this.chartMoisRef?.nativeElement) return;
    const dates = this.listDeclaration().map(d => d.date ?? '');
    const { labels, data } = this.buildMonthlyStats(dates);

    if (this.chartMois) {
      this.chartMois.data.labels = labels;
      (this.chartMois.data.datasets[0] as any).data = data;
      this.chartMois.update();
      return;
    }

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Déclarations/mois',
          data,
          backgroundColor: 'rgba(200,168,75,.75)',
          borderColor: '#c8a84b',
          borderWidth: 1.5,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} déclaration(s)` } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { stepSize: 1, font: { size: 11 } } },
        },
      },
    };
    this.chartMois = new Chart(this.chartMoisRef.nativeElement, config);
  }

  // ── Initialisation formulaires ────────────────────────────────────────────
  private initForms(): void {
    const enfantGroup = () => ({
      nomEnfant:            new FormControl('', Validators.required),
      prenomEnfant:         new FormControl('', Validators.required),
      dateNaissanceEnfant:  new FormControl('', Validators.required),
      lieuNaissanceEnfant:  new FormControl('', Validators.required),
      sexeEnfant:           new FormControl(null, Validators.required),
    });

    const parentGroup = () => ({
      nomMere:    new FormControl('', Validators.required),
      prenomMere: new FormControl('', Validators.required),
      telephoneMere: new FormControl('', Validators.required),
    });

    this.declarationAddFb = this.fb.group({
      date: new FormControl('', Validators.required),
      hopital: new FormControl(null, Validators.required),
      mairie: new FormControl(this.idMairie()),
      ...enfantGroup(),
      ...parentGroup(),
    });

    this.declarationEditFb = this.fb.group({
      id: new FormControl(null),
      date: new FormControl('', Validators.required),
      hopital: new FormControl(null, Validators.required),
      mairie: new FormControl(this.idMairie()),
      ...enfantGroup(),
      ...parentGroup(),
    });
  }

  // ── Chargement ────────────────────────────────────────────────────────────
  loadPage(): void {
    this.getAllDeclarations();
  }

  getAllDeclarations(): void {
    this.isLoading.set(true);
    this.acteService.getAllDeclarationByMairie(this.idMairie()).subscribe({
      next: (data: Declaration[]) => {
        this.listDeclaration.set(data.reverse());
        this.isLoading.set(false);
        this.currentPage.set(1);
      },
      error: () => {
        this.isLoading.set(false);
        this.notify('error', 'Impossible de charger les déclarations.');
      },
    });
  }

  // ── Modaux ────────────────────────────────────────────────────────────────
  openModalAdd(): void {
    this.declarationAddFb.reset({ mairie: this.idMairie() });
    this.supprimerPieceJointe();
    this.showModalAdd.set(true);
  }

  closeModalAdd(): void {
    this.supprimerPieceJointe();
    this.showModalAdd.set(false);
  }

  listPieceJointe = signal<PieceJointeDeclaration[]>([]); 
  openModalView(decl: Declaration): void {
    this.declarationSelected.set(decl);
    this.declarationPieceSelected.set(null); // reset en attendant le chargement
    this.showModalView.set(true);
    // Chargement des pièces jointes liées à cette déclaration
    this.acteService.findPieceJointes(decl.id).subscribe({
      next: (dp: PieceJointeDeclaration[]) => {
        this.listPieceJointe.set(dp); 
        const c : DeclarationPiece={
          declaration: decl, 
          pieces:dp
        }; 
        this.declarationPieceSelected.set(c); 
      },
      error: () => this.declarationPieceSelected.set({ declaration: decl, pieces: [] }),
    });
  }

  closeModalView(): void {
    this.showModalView.set(false);
    this.declarationPieceSelected.set(null);
  }

  openModalEdit(decl: Declaration): void {
    this.declarationSelected.set(decl);
    this.declarationEditFb.patchValue({
      id:                   decl.id,
      date:                 decl.date              ?? '',
      hopital:              decl.hopital?.id        ?? null,
      mairie:               decl.mairie?.id         ?? this.idMairie(),
      nomEnfant:            decl.enfant?.nom        ?? '',
      prenomEnfant:         decl.enfant?.prenom     ?? '',
      dateNaissanceEnfant:  decl.enfant?.dateNaissance ?? '',
      lieuNaissanceEnfant:  decl.enfant?.lieuNaissance ?? '',
      sexeEnfant:           decl.enfant?.sexe?.id   ?? null,
      nomMere:              decl.mere?.nom          ?? '',
      prenomMere:           decl.mere?.prenom       ?? '',
      telephoneMere:        decl.mere?.telephone    ?? '',
    });
    this.showModalView.set(false);
    this.showModalEdit.set(true);
  }

  closeModalEdit(): void { this.showModalEdit.set(false); }

  openModalDelete(decl: Declaration, event: Event): void {
    event.stopPropagation();
    this.declarationSelected.set(decl);
    this.showModalDelete.set(true);
  }

  closeModalDelete(): void {
    this.declarationSelected.set(null);
    this.showModalDelete.set(false);
  }

  // ── Pièces jointes ────────────────────────────────────────────────────────
  onSelectPieceJointe(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const typesAcceptes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!typesAcceptes.includes(file.type)) {
      this.notify('error', 'Format accepté : JPG, PNG ou PDF uniquement.');
      return;
    }
    this.pieceJointe = file;
    this.pieceJointeNom.set(file.name);
    this.errorMessage.set('');
  }

  supprimerPieceJointe(): void {
    this.pieceJointe = null;
    this.pieceJointeNom.set('Aucun fichier sélectionné');
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  createDeclaration(): void {
    if (this.declarationAddFb.invalid) {
      this.declarationAddFb.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formData = new FormData();
    formData.append('declaration', JSON.stringify(this.declarationAddFb.value));
    if (this.pieceJointe) {
      formData.append('fichiers', this.pieceJointe);
    }

    this.acteService.declarationActeNaissance(formData).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.status) {
          this.notify('success', 'Déclaration enregistrée avec succès !');
          this.closeModalAdd();
          this.getAllDeclarations();
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

  updateDeclaration(): void {
    if (this.declarationEditFb.invalid) {
      this.declarationEditFb.markAllAsTouched();
      return;
    }
    const decl = this.declarationSelected();
    if (!decl?.id) return;

    this.isSubmitting.set(true);
    const formData = new FormData();
    formData.append('declaration', JSON.stringify(this.declarationEditFb.value));

    this.acteService.misAjourDeclarationActeNaissance(formData).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.status) {
          this.notify('success', 'Déclaration mise à jour avec succès !');
          this.closeModalEdit();
          this.getAllDeclarations();
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

  confirmDelete(): void {
    const decl = this.declarationSelected();
    if (!decl?.id) return;

    this.isSubmitting.set(true);
    this.acteService.deleteDeclaration(decl.id).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.status) {
          this.notify('success', 'Déclaration supprimée avec succès.');
          this.closeModalDelete();
          this.getAllDeclarations();
        } else {
          this.notify('error', res.message ?? 'Erreur lors de la suppression.');
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notify('error', 'Erreur serveur lors de la suppression.');
      },
    });
  }

  // ── Recherche / pagination ────────────────────────────────────────────────
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

  // ── Helpers pièces jointes ────────────────────────────────────────────────

  /** Retourne true si le chemin est un PDF */
  isPdf(chemin: string): boolean {
    return chemin?.toLowerCase().endsWith('.pdf') ?? false;
  }

  /** Extrait le nom de fichier depuis un chemin ou URL */
  fileNameFromPath(chemin: string): string {
    if (!chemin) return '';
    return chemin.split('/').pop()?.split('?')[0] ?? chemin;
  }

  /** Gestion erreur d'image (placeholder) */
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  /** Retourne une URL sécurisée pour l'iframe PDF */
  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────

  openLightbox(pieces: PieceJointeDeclaration[], index: number): void {
    this.lightboxPieces.set(pieces);
    this.lightboxIndex.set(index);
    this.showLightbox.set(true);
  }

  closeLightbox(): void {
    this.showLightbox.set(false);
  }

  lightboxPrev(): void {
    const i = this.lightboxIndex();
    if (i > 0) this.lightboxIndex.set(i - 1);
  }

  lightboxNext(): void {
    const i = this.lightboxIndex();
    if (i < this.lightboxPieces().length - 1) this.lightboxIndex.set(i + 1);
  }
}