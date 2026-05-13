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
import { ActeNaissance } from '../../../../Core/Model/Acte/ActeNaissance';
import { Declaration } from '../../../../Core/Model/Acte/Declaration';
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

// Enregistrement des modules Chart.js nécessaires
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
  selector: 'app-acte-naissance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './acte-naissance.html',
  styleUrl: './acte-naissance.css',
})
export class ActeNaissanceC implements AfterViewInit, OnDestroy {

  // ── Références canvas pour Chart.js ──────────────────────────────────────
  @ViewChild('chartActes')    chartActesRef!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDecl')     chartDeclRef!:     ElementRef<HTMLCanvasElement>;

  private chartActes: Chart | null = null;
  private chartDecl:  Chart | null = null;

  // ── Identity ─────────────────────────────────────────────────────────────
  idMairie = signal<number>(0);

  // ── Data signals ─────────────────────────────────────────────────────────
  listActeNaissance  = signal<ActeNaissance[]>([]);
  acteSelected       = signal<ActeNaissance | null>(null);
  listDeclaration    = signal<Declaration[]>([]);

  // ── UI state signals ─────────────────────────────────────────────────────
  isLoading      = signal(false);
  isSubmitting   = signal(false);
  successMessage = signal('');
  errorMessage   = signal('');

  // ── Search / pagination ───────────────────────────────────────────────────
  searchTerm        = signal('');
  currentPage       = signal(1);
  readonly pageSize = 10;

  // ── Modal visibility ─────────────────────────────────────────────────────
  showModalAdd  = signal(false);
  showModalView = signal(false);
  showModalEdit = signal(false);

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
  pages      = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  // ── Métriques (KPI) ───────────────────────────────────────────────────────
  /** Nombre total d'actes créés */
  totalActes = computed(() => this.listActeNaissance().length);

  /** Actes créés ce mois-ci */
  actesDuMois = computed(() => {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();
    return this.listActeNaissance().filter(a => {
      if (!a.date) return false;
      const d = new Date(a.date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  });

  /** Actes créés cette semaine (lun→dim) */
  actesDeLaSemaine = computed(() => {
    const now     = new Date();
    const monday  = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return this.listActeNaissance().filter(a => {
      if (!a.date) return false;
      return new Date(a.date) >= monday;
    }).length;
  });

  /** Nombre de déclarations en attente (non encore converties en acte) */
  declarationsEnAttente = computed(() => {
    const acteDeclarationIds = new Set(
      this.listActeNaissance()
        .map(a => a.declaration?.id)
        .filter(Boolean),
    );
    return this.listDeclaration().filter(d => !acteDeclarationIds.has(d.id)).length;
  });

  // ── Données graphiques ────────────────────────────────────────────────────
  /** Retourne {labels, data} regroupés par mois sur les 6 derniers mois */
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

  // ── Forms ─────────────────────────────────────────────────────────────────
  acteNaissanceFb!: FormGroup;
  acteEditFb!:      FormGroup;

  constructor(private fb: FormBuilder, private acteService: ActeService) {
    const idStored = localStorage.getItem('etablissement');
    this.idMairie.set(idStored ? parseInt(idStored) : 0);
    this.initForms();
    this.loadPage();

    // Effet réactif : reconstruire les graphiques quand les données changent
    effect(() => {
      // lecture des signals pour déclencher l'effet
      const actes = this.listActeNaissance();
      const decls = this.listDeclaration();
      // Timeout pour s'assurer que la vue est initialisée
      setTimeout(() => this.buildCharts(), 0);
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.buildCharts();
  }

  ngOnDestroy(): void {
    this.chartActes?.destroy();
    this.chartDecl?.destroy();
  }

  // ── Construction des graphiques ───────────────────────────────────────────
  private buildCharts(): void {
    this.buildChartActes();
    this.buildChartDeclarations();
  }

  private buildChartActes(): void {
    if (!this.chartActesRef?.nativeElement) return;

    const dates = this.listActeNaissance().map(a => a.date ?? '');
    const { labels, data } = this.buildMonthlyStats(dates);

    if (this.chartActes) {
      this.chartActes.data.labels = labels;
      (this.chartActes.data.datasets[0] as any).data = data;
      this.chartActes.update();
      return;
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Actes de naissance',
            data,
            borderColor: '#003189',
            backgroundColor: 'rgba(0,49,137,.10)',
            borderWidth: 2.5,
            pointBackgroundColor: '#003189',
            pointRadius: 4,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} acte(s)`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,.05)' },
            ticks: { font: { family: 'DM Sans', size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.05)' },
            ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 } },
          },
        },
      },
    };

    this.chartActes = new Chart(this.chartActesRef.nativeElement, config);
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
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Déclarations',
            data,
            backgroundColor: 'rgba(200,168,75,.75)',
            borderColor: '#c8a84b',
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} déclaration(s)`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'DM Sans', size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.05)' },
            ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 } },
          },
        },
      },
    };

    this.chartDecl = new Chart(this.chartDeclRef.nativeElement, config);
  }

  // ── Form initialisation ───────────────────────────────────────────────────
  loadPage(): void {
    this.getAllActe();
    this.getAllDeclarationByMairie();
  }

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

  closeModalView(): void { this.showModalView.set(false); }

  openModalEdit(acte: ActeNaissance): void {
    this.acteSelected.set(acte);
    this.acteEditFb.patchValue({
      id:            acte.id              ?? null,
      date:          acte.date            ?? '',
      declaration:   acte.declaration?.id ?? null,
      nomPere:       acte.pere?.nom        ?? '',
      prenomPere:    acte.pere?.prenom     ?? '',
      telephonePere: acte.pere?.telephone  ?? '',
      emailPere:     acte.pere?.email      ?? '',
      profession:    acte.pere?.profession ?? '',
      domicile:      acte.pere?.domicile   ?? '',
      dateNaissance: acte.pere?.dateNaissance ?? '',
      lieuNaissance: acte.pere?.lieuNaissance ?? '',
    });
    this.showModalView.set(false);
    this.showModalEdit.set(true);
  }

  closeModalEdit(): void { this.showModalEdit.set(false); }

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
    const dto = { ...this.acteNaissanceFb.value, typesPiecesJointes: [1, 2] };
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
        const a   = document.createElement('a');
        a.href    = url;
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