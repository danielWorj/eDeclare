import { Component, OnInit, signal, computed, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Utilisateur } from '../../../../Core/Model/User/Utilisateur';
import { Mairie } from '../../../../Core/Model/Etablissement/Mairie';
import { Hopital } from '../../../../Core/Model/Etablissement/Hopital';
import { UtilisateurService } from '../../../../Core/Service/Utilisateur/utilisateur-service';
import { EtablissementService } from '../../../../Core/Service/Etablissement/etablissement-service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);


// ── Types locaux ────────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit' | 'delete' | 'view' | null;
type FilterType = 'all' | 'mairie' | 'hopital';
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  visible: boolean;
}

interface ChartBar {
  label: string;
  count: number;
  pct: number;
  type: 'mairie' | 'hopital';
}

// Statuts fictifs pour affichage (issus de l'interface)
const STATUTS: Record<number, { label: string; css: string }> = {
  1: { label: 'En attente', css: 'pending' },
  2: { label: 'Actif',      css: 'approved' },
  3: { label: 'Bloqué',     css: 'rejected' },
};

// ── Composant ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './utilisateurs.html',
  styleUrl:    './utilisateurs.css',
})
export class Utilisateurs implements OnInit, AfterViewInit {

  @ViewChild('agentsChart') agentsChartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  // ── Données brutes
  agents   = signal<Utilisateur[]>([]);
  mairies  = signal<Mairie[]>([]);
  hopitaux = signal<Hopital[]>([]);

  // ── Chargement
  loading = signal<{ agents: boolean; ref: boolean }>({ agents: false, ref: false });

  // ── Filtres
  filterType      = signal<FilterType>('all');
  filterStructId  = signal<number | null>(null);
  searchQuery     = signal('');

  // ── Agents filtrés
  filteredAgents = computed(() => {
    let list = this.agents();

    // filtre type structure
    const ft  = this.filterType();
    const sid = this.filterStructId();

    if (ft === 'mairie' && sid) {
      list = list.filter(a => a.structure?.id === sid);
    } else if (ft === 'hopital' && sid) {
      list = list.filter(a => a.structure?.id === sid);
    } else if (ft === 'mairie') {
      const ids = new Set(this.mairies().map(m => m.id));
      list = list.filter(a => ids.has(a.structure?.id));
    } else if (ft === 'hopital') {
      const ids = new Set(this.hopitaux().map(h => h.id));
      list = list.filter(a => ids.has(a.structure?.id));
    }

    // filtre recherche
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(a =>
        a.nom?.toLowerCase().includes(q) ||
        a.prenom?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.telephone?.toLowerCase().includes(q)
      );
    }

    return list;
  });

  // ── Métriques
  metriques = computed(() => {
    const all    = this.agents();
    const actifs = all.filter(a => a.statutUser?.id === 2).length;
    const attent = all.filter(a => a.statutUser?.id === 1).length;
    const bloq   = all.filter(a => a.statutUser?.id === 3).length;
    const mairieIds = new Set(this.mairies().map(m => m.id));
    const agentsMairie   = all.filter(a => mairieIds.has(a.structure?.id)).length;
    const agentsHopital  = all.length - agentsMairie;
    return { total: all.length, actifs, attent, bloq, agentsMairie, agentsHopital };
  });

  // ── Graphique répartition par structure
  chartBars = computed((): ChartBar[] => {
    const agents = this.agents();
    const map    = new Map<number, { label: string; count: number; type: 'mairie' | 'hopital' }>();
    const mairieIds = new Set(this.mairies().map(m => m.id));

    for (const a of agents) {
      const sid  = a.structure?.id;
      const snom = a.structure?.nom ?? 'Inconnu';
      if (!sid) continue;
      if (!map.has(sid)) {
        map.set(sid, { label: snom, count: 0, type: mairieIds.has(sid) ? 'mairie' : 'hopital' });
      }
      map.get(sid)!.count++;
    }

    const bars = Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const max = bars[0]?.count || 1;
    return bars.map(b => ({ ...b, pct: Math.round((b.count / max) * 100) }));
  });

  // ── Modal
  modalMode        = signal<ModalMode>(null);
  selectedAgent    = signal<Utilisateur | null>(null);
  saving           = signal(false);

  // ── Formulaire
  agentForm!: FormGroup;

  // ── Toasts
  toasts = signal<Toast[]>([]);
  private toastCounter = 0;

  // ── Exposition des constantes au template
  readonly STATUTS = STATUTS;
  readonly STATUT_KEYS = [1, 2, 3];

  // Rôles fictifs (à enrichir depuis l'API si disponible)
  readonly ROLES = [
    { id: 1, nom: 'Administrateur' },
    { id: 2, nom: 'Agent mairie' },
    { id: 3, nom: 'Agent hôpital' },
    { id: 4, nom: 'Superviseur' },
  ];

  constructor(
    private fb: FormBuilder,
    private utilisateurService: UtilisateurService,
    private etablissementService: EtablissementService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadRefs();
    this.loadAgents();
  }

  ngAfterViewInit(): void {
    // Le graphique sera construit après le chargement des données
  }

  // ══════════════════════════════════════════════════════════════
  // GRAPHIQUE CHART.JS
  // ══════════════════════════════════════════════════════════════

  private buildChart(): void {
    const bars = this.chartBars();
    if (!bars.length || !this.agentsChartRef?.nativeElement) return;

    // Détruire l'instance précédente si elle existe
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const mairieData  = bars.filter(b => b.type === 'mairie');
    const hopitalData = bars.filter(b => b.type === 'hopital');
    const allLabels   = [...new Set(bars.map(b => b.label))];

    // Construire des séries alignées sur les labels
    const mairieValues  = allLabels.map(l => mairieData.find(b => b.label === l)?.count  ?? 0);
    const hopitalValues = allLabels.map(l => hopitalData.find(b => b.label === l)?.count ?? 0);

    const ctx = this.agentsChartRef.nativeElement.getContext('2d')!;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [
          {
            label: 'Mairies',
            data: mairieValues,
            borderColor: '#003189',
            backgroundColor: 'rgba(0,49,137,.10)',
            borderWidth: 2.5,
            pointBackgroundColor: '#003189',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            tension: .4,
          },
          {
            label: 'Hôpitaux',
            data: hopitalValues,
            borderColor: '#e8002d',
            backgroundColor: 'rgba(232,0,45,.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#e8002d',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            tension: .4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false }, // On utilise notre propre légende HTML
          tooltip: {
            backgroundColor: '#1a1e2e',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,.75)',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: ctx => {
                const val = ctx.parsed.y ?? 0;
                return ` ${ctx.dataset.label} : ${val} agent${val > 1 ? 's' : ''}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#eef0f5', lineWidth: 1 },
            ticks: {
              color: '#6b7280',
              font: { family: 'DM Sans, sans-serif', size: 11 },
              maxRotation: 30,
            },
            border: { color: '#dce1ec' },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#eef0f5', lineWidth: 1 },
            ticks: {
              color: '#6b7280',
              font: { family: 'DM Sans, sans-serif', size: 11 },
              precision: 0,
            },
            border: { color: '#dce1ec', dash: [4, 4] },
          },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // FORM
  // ══════════════════════════════════════════════════════════════

  private buildForm(): void {
    this.agentForm = this.fb.group({
      id:          [null],
      nom:         ['', [Validators.required, Validators.minLength(2)]],
      prenom:      ['', [Validators.required, Validators.minLength(2)]],
      telephone:   ['', Validators.required],
      email:       ['', [Validators.required, Validators.email]],
      password:    [''],
      statutUser:  [2, Validators.required],
      roleUser:    [null, Validators.required],
      structure:   [null, Validators.required],
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHARGEMENT
  // ══════════════════════════════════════════════════════════════

  loadRefs(): void {
    this.loading.update(s => ({ ...s, ref: true }));
    this.etablissementService.getAllMairie().subscribe({
      next: d => { this.mairies.set(d); this.loading.update(s => ({ ...s, ref: false })); },
      error: () => this.loading.update(s => ({ ...s, ref: false }))
    });
    this.etablissementService.getAllHopital().subscribe({
      next: d => this.hopitaux.set(d),
    });
  }

  loadAgents(): void {
    this.loading.update(s => ({ ...s, agents: true }));
    this.utilisateurService.getAllAgent().subscribe({
      next: d => {
        this.agents.set(d);
        this.loading.update(s => ({ ...s, agents: false }));
        // Petit délai pour laisser Angular rendre le canvas
        setTimeout(() => this.buildChart(), 50);
      },
      error: () => {
        this.loading.update(s => ({ ...s, agents: false }));
        this.toast('error', 'Impossible de charger les utilisateurs.');
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // FILTRES
  // ══════════════════════════════════════════════════════════════

  setFilterType(ft: FilterType): void {
    this.filterType.set(ft);
    this.filterStructId.set(null);
  }

  setFilterStructure(id: number | null): void {
    this.filterStructId.set(id);
  }

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  clearFilters(): void {
    this.filterType.set('all');
    this.filterStructId.set(null);
    this.searchQuery.set('');
  }

  get hasActiveFilter(): boolean {
    return this.filterType() !== 'all' || !!this.filterStructId() || !!this.searchQuery();
  }

  // ══════════════════════════════════════════════════════════════
  // MODALS
  // ══════════════════════════════════════════════════════════════

  openCreate(): void {
    this.selectedAgent.set(null);
    this.agentForm.reset({ statutUser: 2 });
    this.agentForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.agentForm.get('password')?.updateValueAndValidity();
    this.modalMode.set('create');
  }

  openEdit(a: Utilisateur): void {
    this.selectedAgent.set(a);
    this.agentForm.reset();
    this.agentForm.get('password')?.clearValidators();
    this.agentForm.get('password')?.updateValueAndValidity();
    this.agentForm.patchValue({
      id:        a.id,
      nom:       a.nom,
      prenom:    a.prenom,
      telephone: a.telephone,
      email:     a.email,
      statutUser: a.statutUser?.id ?? 2,
      roleUser:   a.roleUser?.id ?? null,
      structure:  a.structure?.id ?? null,
    });
    this.modalMode.set('edit');
  }

  openView(a: Utilisateur): void {
    this.selectedAgent.set(a);
    this.modalMode.set('view');
  }

  openDelete(a: Utilisateur): void {
    this.selectedAgent.set(a);
    this.modalMode.set('delete');
  }

  closeModal(): void {
    this.modalMode.set(null);
    this.agentForm.reset();
  }

  // ══════════════════════════════════════════════════════════════
  // SAUVEGARDE
  // ══════════════════════════════════════════════════════════════

  saveAgent(): void {
    if (this.agentForm.invalid) {
      this.agentForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v      = this.agentForm.value;
    const isEdit = this.modalMode() === 'edit';
    const payload = {
      id:         v.id,
      nom:        v.nom,
      prenom:     v.prenom,
      telephone:  v.telephone,
      email:      v.email,
      password:   v.password || undefined,
      statutUser: v.statutUser,
      roleUser:   v.roleUser,
      structure:  v.structure,
    };

    const formData : FormData = new FormData();

    formData.append("user", JSON.stringify(this.agentForm.value)); 
    const req = isEdit
      ? this.utilisateurService.updateAgent(formData)
      : this.utilisateurService.createAgent(formData);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadAgents();
        this.toast('success', isEdit ? 'Agent mis à jour.' : 'Agent créé avec succès.');
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Une erreur est survenue. Réessayez.');
      }
    });
  }

  confirmDelete(): void {
    const a = this.selectedAgent();
    if (!a?.id) return;
    this.saving.set(true);
    this.utilisateurService.deleteAgent(a.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadAgents();
        this.toast('success', `Agent « ${a.nom} ${a.prenom} » supprimé.`);
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Suppression impossible. Réessayez.');
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // HELPERS FORMULAIRE
  // ══════════════════════════════════════════════════════════════

  fc(f: string) { return this.agentForm.get(f); }
  fcErr(f: string): boolean {
    const c = this.fc(f);
    return !!(c && c.invalid && c.touched);
  }

  // ══════════════════════════════════════════════════════════════
  // TOASTS
  // ══════════════════════════════════════════════════════════════

  toast(type: ToastType, message: string): void {
    const id = ++this.toastCounter;
    this.toasts.update(t => [...t, { id, type, message, visible: true }]);
    setTimeout(() => this.dismissToast(id), 4500);
  }

  dismissToast(id: number): void {
    this.toasts.update(t => t.map(i => i.id === id ? { ...i, visible: false } : i));
    setTimeout(() => this.toasts.update(t => t.filter(i => i.id !== id)), 380);
  }

  // ══════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ══════════════════════════════════════════════════════════════

  getStatut(id: number | undefined) {
    return STATUTS[id ?? 0] ?? { label: '—', css: 'draft' };
  }

  getRoleName(id: number | undefined): string {
    return this.ROLES.find(r => r.id === id)?.nom ?? '—';
  }

  allStructures = computed(() => [
    ...this.mairies().map(m  => ({ id: m.id,  nom: m.nom,  type: 'mairie'  as const })),
    ...this.hopitaux().map(h => ({ id: h.id,  nom: h.nom,  type: 'hopital' as const })),
  ]);

  trackById(_: number, item: any) { return item.id; }

  initiales(nom?: string, prenom?: string): string {
    return ((nom?.[0] ?? '') + (prenom?.[0] ?? '')).toUpperCase() || '?';
  }
}