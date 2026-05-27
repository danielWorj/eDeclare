import {
  Component,
  signal,
  computed,
  AfterViewInit,
  OnDestroy,
  effect,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActeNaissance } from '../../../../Core/Model/Acte/ActeNaissance';
import { Declaration } from '../../../../Core/Model/Acte/Declaration';
import {
  Chart,
  ChartConfiguration,
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { ActeService } from '../../../../Core/Service/Acte/acte-service';

Chart.register(
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements AfterViewInit, OnDestroy {

  // ── Canvas refs ───────────────────────────────────────────────────────────
  @ViewChild('chartTrend')    chartTrendRef!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('chartComparaison') chartComparaisonRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDonut')    chartDonutRef!:    ElementRef<HTMLCanvasElement>;

  private chartTrend:       Chart | null = null;
  private chartComparaison: Chart | null = null;
  private chartDonut:       Chart | null = null;

  private acteService = inject(ActeService);

  // ── Identity ──────────────────────────────────────────────────────────────
  idMairie = signal<number>(0);

  // ── Data ──────────────────────────────────────────────────────────────────
  listDeclarations = signal<Declaration[]>([]);
  listActes        = signal<ActeNaissance[]>([]);
  isLoading        = signal(true);
  lastRefresh      = signal<Date>(new Date());

  // ── KPI computed ──────────────────────────────────────────────────────────
  totalDeclarations = computed(() => this.listDeclarations().length);
  totalActes        = computed(() => this.listActes().length);

  tauxConversion = computed(() => {
    const t = this.totalDeclarations();
    if (!t) return 0;
    return Math.round((this.totalActes() / t) * 100);
  });

  declarationsEnAttente = computed(() => {
    const acteIds = new Set(
      this.listActes().map(a => a.declaration?.id).filter(Boolean)
    );
    return this.listDeclarations().filter(d => !acteIds.has(d.id)).length;
  });

  declarationsDuMois = computed(() => {
    const { month, year } = this.currentMonthYear();
    return this.listDeclarations().filter(d => {
      if (!d.date) return false;
      const dd = new Date(d.date);
      return dd.getMonth() === month && dd.getFullYear() === year;
    }).length;
  });

  actesDuMois = computed(() => {
    const { month, year } = this.currentMonthYear();
    return this.listActes().filter(a => {
      if (!a.date) return false;
      const dd = new Date(a.date);
      return dd.getMonth() === month && dd.getFullYear() === year;
    }).length;
  });

  declarationsDeLaSemaine = computed(() => {
    const monday = this.getMondayOfCurrentWeek();
    return this.listDeclarations().filter(d => {
      if (!d.date) return false;
      return new Date(d.date) >= monday;
    }).length;
  });

  actesDeLaSemaine = computed(() => {
    const monday = this.getMondayOfCurrentWeek();
    return this.listActes().filter(a => {
      if (!a.date) return false;
      return new Date(a.date) >= monday;
    }).length;
  });

  // Répartition par sexe (déclarations)
  repartitionSexe = computed(() => {
    const declarations = this.listDeclarations();
    const masculin = declarations.filter(d =>
      d.enfant?.sexe?.libelle?.toLowerCase().includes('masc') ||
      d.enfant?.sexe?.libelle?.toLowerCase() === 'm' ||
      d.enfant?.sexe?.id === 1
    ).length;
    const feminin = declarations.length - masculin;
    const pctM = declarations.length ? Math.round((masculin / declarations.length) * 100) : 0;
    const pctF = declarations.length ? 100 - pctM : 0;
    return { masculin, feminin, pctM, pctF };
  });

  // Activité récente : 5 dernières déclarations
  activiteRecente = computed(() =>
    [...this.listDeclarations()]
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
      .slice(0, 5)
      .map(d => {
        const hasActe = this.listActes().some(a => a.declaration?.id === d.id);
        return { ...d, hasActe };
      })
  );

  // Mois courant formaté
  moisCourant = computed(() => {
    return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  // ── Constructor ───────────────────────────────────────────────────────────
  constructor() {
    const stored = localStorage.getItem('etablissement');
    this.idMairie.set(stored ? parseInt(stored) : 0);

    this.loadData();

    // Reconstruction des graphiques quand les données changent
    effect(() => {
      this.listDeclarations();
      this.listActes();
      setTimeout(() => this.buildAllCharts(), 0);
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.buildAllCharts();
  }

  ngOnDestroy(): void {
    this.chartTrend?.destroy();
    this.chartComparaison?.destroy();
    this.chartDonut?.destroy();
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  loadData(): void {
    this.isLoading.set(true);
    let loaded = 0;
    const done = () => { if (++loaded === 2) { this.isLoading.set(false); this.lastRefresh.set(new Date()); } };

    this.acteService.getAllDeclarationByMairie(this.idMairie()).subscribe({
      next: (data: Declaration[]) => { this.listDeclarations.set(data); done(); },
      error: () => done(),
    });

    this.acteService.getAllActeNaissanceByMairie(this.idMairie()).subscribe({
      next: (data: ActeNaissance[]) => { this.listActes.set(data); done(); },
      error: () => done(),
    });
  }

  refresh(): void {
    this.loadData();
  }

  // ── Charts ────────────────────────────────────────────────────────────────
  private buildAllCharts(): void {
    this.buildChartTrend();
    this.buildChartComparaison();
    this.buildChartDonut();
  }

  private buildMonthlyStats(dates: string[]): { labels: string[]; data: number[] } {
    const months: string[] = [];
    const counts: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
      counts.push(dates.filter(ds => {
        if (!ds) return false;
        const dd = new Date(ds);
        return dd.getMonth() === d.getMonth() && dd.getFullYear() === d.getFullYear();
      }).length);
    }
    return { labels: months, data: counts };
  }

  private buildChartTrend(): void {
    if (!this.chartTrendRef?.nativeElement) return;

    const datesDecl  = this.listDeclarations().map(d => d.date ?? '');
    const datesActes = this.listActes().map(a => a.date ?? '');
    const { labels, data: dataDecl }  = this.buildMonthlyStats(datesDecl);
    const { data: dataActes } = this.buildMonthlyStats(datesActes);

    if (this.chartTrend) {
      this.chartTrend.data.labels = labels;
      (this.chartTrend.data.datasets[0] as any).data = dataDecl;
      (this.chartTrend.data.datasets[1] as any).data = dataActes;
      this.chartTrend.update();
      return;
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Déclarations',
            data: dataDecl,
            borderColor: '#003189',
            backgroundColor: 'rgba(0,49,137,.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#003189',
            pointRadius: 4,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Actes émis',
            data: dataActes,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,.07)',
            borderWidth: 2.5,
            pointBackgroundColor: '#16a34a',
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
          legend: { position: 'top', labels: { font: { size: 12 }, boxWidth: 12, padding: 16 } },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: { font: { size: 11 }, stepSize: 1 },
          },
        },
      },
    };

    this.chartTrend = new Chart(this.chartTrendRef.nativeElement, config);
  }

  private buildChartComparaison(): void {
    if (!this.chartComparaisonRef?.nativeElement) return;

    const datesDecl  = this.listDeclarations().map(d => d.date ?? '');
    const datesActes = this.listActes().map(a => a.date ?? '');
    const { labels, data: dataDecl }  = this.buildMonthlyStats(datesDecl);
    const { data: dataActes } = this.buildMonthlyStats(datesActes);

    if (this.chartComparaison) {
      this.chartComparaison.data.labels = labels;
      (this.chartComparaison.data.datasets[0] as any).data = dataDecl;
      (this.chartComparaison.data.datasets[1] as any).data = dataActes;
      this.chartComparaison.update();
      return;
    }

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Déclarations',
            data: dataDecl,
            backgroundColor: 'rgba(0,49,137,.75)',
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: 'Actes émis',
            data: dataActes,
            backgroundColor: 'rgba(22,163,74,.75)',
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 12 }, boxWidth: 12, padding: 16 } },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: { font: { size: 11 }, stepSize: 1 },
          },
        },
      },
    };

    this.chartComparaison = new Chart(this.chartComparaisonRef.nativeElement, config);
  }

  private buildChartDonut(): void {
    if (!this.chartDonutRef?.nativeElement) return;

    const { masculin, feminin } = this.repartitionSexe();
    const enAttente = this.declarationsEnAttente();
    const emis      = this.totalActes();

    if (this.chartDonut) {
      (this.chartDonut.data.datasets[0] as any).data = [emis, enAttente];
      this.chartDonut.update();
      return;
    }

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Actes émis', 'En attente'],
        datasets: [{
          data: [emis, enAttente],
          backgroundColor: ['#16a34a', '#f59e0b'],
          borderColor: ['#fff', '#fff'],
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 12 }, boxWidth: 12, padding: 16 } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + (b as number), 0);
                const pct   = total ? Math.round(((ctx.parsed as number) / total) * 100) : 0;
                return ` ${ctx.label} : ${ctx.parsed} (${pct}%)`;
              },
            },
          },
        },
      },
    };

    this.chartDonut = new Chart(this.chartDonutRef.nativeElement, config);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private currentMonthYear() {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  }

  private getMondayOfCurrentWeek(): Date {
    const now    = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  nomEnfant(d: Declaration): string {
    return `${d.enfant?.prenom ?? ''} ${d.enfant?.nom ?? ''}`.trim() || '—';
  }
}