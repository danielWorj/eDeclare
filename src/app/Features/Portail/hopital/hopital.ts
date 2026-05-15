import { Component, signal, AfterViewInit, OnDestroy, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { Sexe } from '../../../Core/Model/Enfant/Sexe';
import { ActeService } from '../../../Core/Service/Acte/acte-service';
import { UtilisateurService } from '../../../Core/Service/Utilisateur/utilisateur-service';
import { EtablissementService } from '../../../Core/Service/Etablissement/etablissement-service';
import { ServerResponse } from '../../../Core/Model/Server/ServerResponse';
import { Declaration } from '../../../Core/Model/Acte/Declaration';
import { Hopital } from '../../../Core/Model/Etablissement/Hopital';

import {
  Chart,
  ChartConfiguration,
  LineController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Enregistrement explicite de tous les modules nécessaires
Chart.register(
  LineController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

@Component({
  selector: 'app-hopital',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hopital.html',
  styleUrl: './hopital.css',
})
export class HopitalC implements AfterViewInit, OnDestroy {

  // ─── Références canvas pour Chart.js ────────────────────────────────────────
  @ViewChild('chartEvolution') chartEvolutionRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartSexe')      chartSexeRef!:      ElementRef<HTMLCanvasElement>;

  private chartEvolution: Chart | null = null;
  private chartSexe: Chart | null      = null;

  // ─── ID de l'établissement connecté ─────────────────────────────────────────
  idHopital        = signal<number>(0);
  hopitalConnected = signal<Hopital | null>(null);
  listeSexes       = signal<Sexe[]>([]);

  // ─── État soumission ─────────────────────────────────────────────────────────
  isLoading      = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage   = signal<string | null>(null);

  // ─── UI signals ──────────────────────────────────────────────────────────────
  isModalOpen    = signal<boolean>(false);
  mobileMenuOpen = signal<boolean>(false);

  // ─── Fichiers sélectionnés ───────────────────────────────────────────────────
  cniMere              : File | null = null;
  photo4x4             : File | null = null;
  certificationNaissance: File | null = null;

  cniMereNom               = signal<string>('Aucun fichier sélectionné');
  photo4x4Nom              = signal<string>('Aucun fichier sélectionné');
  certificationNaissanceNom = signal<string>('Aucun fichier sélectionné');

  // ─── Données déclarations ────────────────────────────────────────────────────
  listDeclaration          = signal<Declaration[]>([]);
  numberOfDeclaration      = signal<number>(0);
  numberOfDeclarationMale  = signal<number>(0);
  numberOfDeclarationFemale= signal<number>(0);

  // ─── Métriques supplémentaires ───────────────────────────────────────────────
  /** Déclarations du mois courant */
  numberOfDeclarationThisMonth = signal<number>(0);
  /** Déclarations de cette semaine */
  numberOfDeclarationThisWeek  = signal<number>(0);
  /** Taux masculin (%) */
  ratioMale   = signal<number>(0);
  /** Taux féminin (%) */
  ratioFemale = signal<number>(0);
  /** Jour ayant le plus de naissances */
  topDay      = signal<string>('—');

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
      sexe         : new FormControl(null, [Validators.required]),
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

    // Effet réactif : reconstruire les graphiques quand les données changent
    effect(() => {
      const _decls = this.listDeclaration();
      setTimeout(() => this.renderCharts(), 0);
    });

    console.log('id hopital:',this.idHopital()); 
  }

  ngAfterViewInit(): void {
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.chartEvolution?.destroy();
    this.chartSexe?.destroy();
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
        console.log('response :', response); 
        this.hopitalConnected.set(response);
        console.log('hopital recu', this.hopitalConnected()); 
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
        this.renderCharts();
      },
      error: () => console.error('Fetch liste déclarations : échec'),
    });
  }

  getNumbers(): void {
    const list = this.listDeclaration();
    const now  = new Date();
    const y    = now.getFullYear();
    const m    = now.getMonth();

    // ── Totaux ────────────────────────────────────────────────────────────────
    this.numberOfDeclaration.set(list.length);

    const males   = list.filter(d => d.enfant.sexe.id === 1);
    const females = list.filter(d => d.enfant.sexe.id === 2);
    this.numberOfDeclarationMale.set(males.length);
    this.numberOfDeclarationFemale.set(females.length);

    // ── Taux ──────────────────────────────────────────────────────────────────
    if (list.length > 0) {
      this.ratioMale.set(Math.round((males.length / list.length) * 100));
      this.ratioFemale.set(Math.round((females.length / list.length) * 100));
    }

    // ── Ce mois ───────────────────────────────────────────────────────────────
    const thisMonth = list.filter(d => {
      const dt = new Date(d.date);
      return dt.getFullYear() === y && dt.getMonth() === m;
    });
    this.numberOfDeclarationThisMonth.set(thisMonth.length);

    // ── Cette semaine ─────────────────────────────────────────────────────────
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const thisWeek = list.filter(d => new Date(d.date) >= startOfWeek);
    this.numberOfDeclarationThisWeek.set(thisWeek.length);

    // ── Top day ───────────────────────────────────────────────────────────────
    const dayCount: Record<string, number> = {};
    list.forEach(d => {
      const key = new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'long' });
      dayCount[key] = (dayCount[key] ?? 0) + 1;
    });
    const top = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
    this.topDay.set(top ? top[0] : '—');
  }

  getAllSexes(): void {
    this.utilisateurService.getAllSexe().subscribe({
      next: (response: Sexe[]) => this.listeSexes.set(response),
      error: (err: any) => console.error('Erreur chargement sexes :', err),
    });
  }

  // ─── Graphes Chart.js ────────────────────────────────────────────────────────

  renderCharts(): void {
    this.buildEvolutionChart();
    this.buildSexeChart();
  }

  /** Graphe ligne : évolution des déclarations par mois (12 derniers mois) */
  private buildEvolutionChart(): void {
    if (!this.chartEvolutionRef?.nativeElement) return;

    const now        = new Date();
    const labels: string[]     = [];
    const dataMale: number[]   = [];
    const dataFemale: number[] = [];
    const dataTotal: number[]  = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));

      const inMonth = this.listDeclaration().filter(decl => {
        const dt = new Date(decl.date);
        return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth();
      });
      dataMale.push(inMonth.filter(dc => dc.enfant.sexe.id === 1).length);
      dataFemale.push(inMonth.filter(dc => dc.enfant.sexe.id === 2).length);
      dataTotal.push(inMonth.length);
    }

    // Mise à jour si le graphe existe déjà
    if (this.chartEvolution) {
      this.chartEvolution.data.labels = labels;
      (this.chartEvolution.data.datasets[0] as any).data = dataTotal;
      (this.chartEvolution.data.datasets[1] as any).data = dataMale;
      (this.chartEvolution.data.datasets[2] as any).data = dataFemale;
      this.chartEvolution.update();
      return;
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total',
            data: dataTotal,
            borderColor: '#003189',
            backgroundColor: 'rgba(0,49,137,.08)',
            tension: .4,
            fill: true,
            pointBackgroundColor: '#003189',
            pointRadius: 4,
          },
          {
            label: 'Garçons',
            data: dataMale,
            borderColor: '#2563eb',
            backgroundColor: 'transparent',
            tension: .4,
            borderDash: [4, 3],
            pointBackgroundColor: '#2563eb',
            pointRadius: 3,
          },
          {
            label: 'Filles',
            data: dataFemale,
            borderColor: '#e8002d',
            backgroundColor: 'transparent',
            tension: .4,
            borderDash: [4, 3],
            pointBackgroundColor: '#e8002d',
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'DM Sans', size: 12 }, boxWidth: 12 } },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 } },
            grid: { color: 'rgba(0,49,137,.06)' },
          },
        },
      },
    };

    this.chartEvolution = new Chart(this.chartEvolutionRef.nativeElement, config);
  }

  /** Graphe donut : répartition par sexe */
  private buildSexeChart(): void {
    if (!this.chartSexeRef?.nativeElement) return;

    const male   = this.numberOfDeclarationMale();
    const female = this.numberOfDeclarationFemale();

    // Mise à jour si le graphe existe déjà
    if (this.chartSexe) {
      (this.chartSexe.data.datasets[0] as any).data = [male, female];
      this.chartSexe.update();
      return;
    }

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Garçons', 'Filles'],
        datasets: [{
          data: [male, female],
          backgroundColor: ['#2563eb', '#e8002d'],
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
          legend: {
            position: 'bottom',
            labels: { font: { family: 'DM Sans', size: 12 }, boxWidth: 12, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = male + female;
                const pct   = total > 0 ? Math.round((ctx.raw as number / total) * 100) : 0;
                return ` ${ctx.raw} (${pct}%)`;
              },
            },
          },
        },
      },
    };

    this.chartSexe = new Chart(this.chartSexeRef.nativeElement, config);
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
    if (!file) { this.notify('error', 'CNI : format accepté — JPG, PNG ou PDF.'); return; }
    this.cniMere = file;
    this.cniMereNom.set(file.name);
  }

  onSelectPhoto4x4(event: Event): void {
    const file = this.extraireFile(event, ['image/jpeg','image/png']);
    if (!file) { this.notify('error', 'Photo 4×4 : format accepté — JPG ou PNG.'); return; }
    this.photo4x4 = file;
    this.photo4x4Nom.set(file.name);
  }

  onSelectCertificationNaissance(event: Event): void {
    const file = this.extraireFile(event, ['image/jpeg','image/png','application/pdf']);
    if (!file) { this.notify('error', 'Certification : format accepté — JPG, PNG ou PDF.'); return; }
    this.certificationNaissance = file;
    this.certificationNaissanceNom.set(file.name);
  }

  private extraireFile(event: Event, types: string[]): File | null {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return null;
    const file = input.files[0];
    return types.includes(file.type) ? file : null;
  }

  // ─── Suppression fichiers ────────────────────────────────────────────────────

  supprimerCni(): void { this.cniMere = null; this.cniMereNom.set('Aucun fichier sélectionné'); }
  supprimerPhoto(): void { this.photo4x4 = null; this.photo4x4Nom.set('Aucun fichier sélectionné'); }
  supprimerCertification(): void { this.certificationNaissance = null; this.certificationNaissanceNom.set('Aucun fichier sélectionné'); }

  // ─── Validation fichiers ─────────────────────────────────────────────────────

  private fichiersValides(): boolean {
    if (!this.cniMere)                { this.notify('error', 'Veuillez fournir la CNI de la mère.');             return false; }
    if (!this.photo4x4)               { this.notify('error', 'Veuillez fournir la photo 4×4.');                  return false; }
    if (!this.certificationNaissance) { this.notify('error', 'Veuillez fournir la certification de naissance.'); return false; }
    return true;
  }

  // ─── Soumission ──────────────────────────────────────────────────────────────

  soumettre(): void {
    if (this.declarationFb.invalid) {
      this.declarationFb.markAllAsTouched();
      this.notify('error', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!this.fichiersValides()) return;

    this.isLoading.set(true);

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
          this.notify('success', 'Déclaration créée avec succès !');
          this.fermerModal();
          this.loadPage();
        } else {
          this.notify('error', response.message ?? 'Erreur lors de la création.');
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.notify('error', 'Erreur serveur : ' + (err?.error?.message ?? err.message));
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

  // ─── Notifications (toasts) ──────────────────────────────────────────────────

  private notify(type: 'success' | 'error', msg: string): void {
    if (type === 'success') {
      this.successMessage.set(msg);
      setTimeout(() => this.successMessage.set(null), 4000);
    } else {
      this.errorMessage.set(msg);
      setTimeout(() => this.errorMessage.set(null), 5000);
    }
  }

  // ─── Helpers template ────────────────────────────────────────────────────────

  champInvalide(nom: string): boolean {
    const ctrl = this.declarationFb.get(nom);
    return !!(ctrl?.invalid && ctrl.touched);
  }
}