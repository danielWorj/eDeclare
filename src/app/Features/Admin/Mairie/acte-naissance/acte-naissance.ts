import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// ── Interfaces (à remplacer par vos vrais modèles) ──────────────────────────
export interface PersonneSimple { nom: string; prenom: string; }
export interface Pere extends PersonneSimple { profession?: string; }
export interface ActeModel {
  id: number;
  numero: string;
  referenceDeclaration: string;
  enfant: PersonneSimple;
  pere: Pere | null;
  mere: PersonneSimple;
  dateEmission: Date | null;
  statut: 'emis' | 'attente_pere' | 'brouillon';
}

@Component({
  selector: 'app-acte-naissance',
  standalone: true,
  imports: [CommonModule],       // fournit DatePipe, NgClass, @if/@for natifs
  templateUrl: './acte-naissance.html',
  styleUrl: './acte-naissance.css',
})
export class ActeNaissance implements OnInit {

  // ── Filtres ────────────────────────────────────────────────────────────────
  rechercheActe = signal<string>('');
  filtreStatut  = signal<string>('');
  filtrePeriode = signal<string>('');

  // ── Pagination ─────────────────────────────────────────────────────────────
  private readonly PAGE_SIZE = 10;
  pageActuelle = signal<number>(1);

  // ── Données brutes ─────────────────────────────────────────────────────────
  private tousLesActes = signal<ActeModel[]>([]);

  // ── Modales ────────────────────────────────────────────────────────────────
  isModalActeOpen = signal<boolean>(false);
  isRecapOpen     = signal<boolean>(false);
  acteEnEdition   = signal<ActeModel | null>(null);
  acteRecap       = signal<ActeModel | null>(null);

  // ── Computed : liste filtrée ───────────────────────────────────────────────
  actesFiltres = computed<ActeModel[]>(() => {
    let liste = this.tousLesActes();
    const q   = this.rechercheActe().toLowerCase().trim();

    if (q) {
      liste = liste.filter(a =>
        a.numero.toLowerCase().includes(q)              ||
        a.referenceDeclaration.toLowerCase().includes(q)||
        a.enfant.nom.toLowerCase().includes(q)          ||
        a.enfant.prenom.toLowerCase().includes(q)       ||
        a.mere.nom.toLowerCase().includes(q)
      );
    }

    if (this.filtreStatut()) {
      liste = liste.filter(a => a.statut === this.filtreStatut());
    }

    if (this.filtrePeriode()) {
      const now = new Date();
      liste = liste.filter(a => {
        if (!a.dateEmission) return false;
        const d = new Date(a.dateEmission);
        switch (this.filtrePeriode()) {
          case 'mois':
            return d.getMonth() === now.getMonth() &&
                   d.getFullYear() === now.getFullYear();
          case 'trimestre': {
            const tri = (m: number) => Math.floor(m / 3);
            return tri(d.getMonth()) === tri(now.getMonth()) &&
                   d.getFullYear() === now.getFullYear();
          }
          case 'annee':
            return d.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    return liste;
  });

  // ── Computed : stats ───────────────────────────────────────────────────────
  actesEmis         = computed(() => this.tousLesActes().filter(a => a.statut === 'emis').length);
  totalDeclarations = computed(() => this.tousLesActes().length);

  // ── Computed : pagination ──────────────────────────────────────────────────
  pages = computed<number[]>(() => {
    const nb = Math.ceil(this.actesFiltres().length / this.PAGE_SIZE) || 1;
    return Array.from({ length: nb }, (_, i) => i + 1);
  });

  actesPagines = computed<ActeModel[]>(() => {
    const debut = (this.pageActuelle() - 1) * this.PAGE_SIZE;
    return this.actesFiltres().slice(debut, debut + this.PAGE_SIZE);
  });

  // ──────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.chargerActes();
  }

  /** TODO : remplacer par un appel service réel */
  private chargerActes(): void {
    this.tousLesActes.set([
      {
        id: 1, numero: 'ACTE-001/2025', referenceDeclaration: 'DEC-2024-001',
        enfant: { nom: 'Fontaine', prenom: 'Emma' },
        pere:   { nom: 'Marc Fontaine', prenom: 'Marc', profession: 'Ingénieur' },
        mere:   { nom: 'Fontaine', prenom: 'Sophie' },
        dateEmission: new Date('2025-01-15'), statut: 'emis',
      },
      {
        id: 2, numero: 'ACTE-002/2025', referenceDeclaration: 'DEC-2024-002',
        enfant: { nom: 'Mbarga', prenom: 'Liam' },
        pere: null,
        mere: { nom: 'Mbarga', prenom: 'Aline' },
        dateEmission: null, statut: 'attente_pere',
      },
    ]);
  }

  // ── Handlers filtres (sans FormsModule / ngModel) ─────────────────────────
  onRechercheChange(e: Event): void {
    this.rechercheActe.set((e.target as HTMLInputElement).value);
    this.pageActuelle.set(1);
  }
  onStatutChange(e: Event): void {
    this.filtreStatut.set((e.target as HTMLSelectElement).value);
    this.pageActuelle.set(1);
  }
  onPeriodeChange(e: Event): void {
    this.filtrePeriode.set((e.target as HTMLSelectElement).value);
    this.pageActuelle.set(1);
  }
  appliquerFiltres(): void { this.pageActuelle.set(1); }

  // ── Actions ────────────────────────────────────────────────────────────────
  ouvrirModalActe(acte?: ActeModel): void {
    this.acteEnEdition.set(acte ?? null);
    this.isModalActeOpen.set(true);
  }
  fermerModalActe(): void { this.isModalActeOpen.set(false); this.acteEnEdition.set(null); }

  ouvrirRecap(acte: ActeModel): void { this.acteRecap.set(acte); this.isRecapOpen.set(true); }
  fermerRecap(): void { this.isRecapOpen.set(false); this.acteRecap.set(null); }

  telechargerPdf(acte: ActeModel): void { console.log('PDF:', acte.numero); /* TODO */ }
  relancerParent(acte: ActeModel): void { console.log('Relance:', acte.numero); /* TODO */ }

  // ── Pagination ─────────────────────────────────────────────────────────────
  allerPage(p: number): void { this.pageActuelle.set(p); }
  pagePrecedente(): void { if (this.pageActuelle() > 1) this.pageActuelle.update(p => p - 1); }
  pageSuivante(): void {
    if (this.pageActuelle() < this.pages().length) this.pageActuelle.update(p => p + 1);
  }
}