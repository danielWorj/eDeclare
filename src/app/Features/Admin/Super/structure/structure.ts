import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UtilisateurService } from '../../../../Core/Service/Utilisateur/utilisateur-service';
import { Mairie } from '../../../../Core/Model/Etablissement/Mairie';
import { Hopital } from '../../../../Core/Model/Etablissement/Hopital';
import { EtablissementService } from '../../../../Core/Service/Etablissement/etablissement-service';

// ── Types internes ──────────────────────────────────────────────────────────

type TabId = 'mairie' | 'hopital';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  visible: boolean;
}

type ModalMode = 'create' | 'edit' | 'delete' | null;

// ── Composant ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-structure',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './structure.html',
  styleUrl: './structure.css',
})
export class StructureC implements OnInit {

  // ── Onglet actif
  activeTab = signal<TabId>('mairie');

  // ── Données
  mairies  = signal<Mairie[]>([]);
  hopitaux = signal<Hopital[]>([]);
  loading  = signal<{ mairie: boolean; hopital: boolean }>({ mairie: false, hopital: false });

  // ── Recherche
  searchMairie  = signal('');
  searchHopital = signal('');

  filteredMairies = computed(() =>
    this.mairies().filter(m =>
      m.nom?.toLowerCase().includes(this.searchMairie().toLowerCase()) ||
      m.localisation?.toLowerCase().includes(this.searchMairie().toLowerCase())
    )
  );

  filteredHopitaux = computed(() =>
    this.hopitaux().filter(h =>
      h.nom?.toLowerCase().includes(this.searchHopital().toLowerCase()) ||
      h.localisation?.toLowerCase().includes(this.searchHopital().toLowerCase())
    )
  );

  // ── Modals
  mairieModal  = signal<ModalMode>(null);
  hopitalModal = signal<ModalMode>(null);

  selectedMairie  = signal<Mairie | null>(null);
  selectedHopital = signal<Hopital | null>(null);

  savingMairie  = signal(false);
  savingHopital = signal(false);

  // ── Formulaires
  mairieForm!:  FormGroup;
  hopitalForm!: FormGroup;

  // ── Toasts
  toasts = signal<Toast[]>([]);
  private toastCounter = 0;

  constructor(
    private fb: FormBuilder,
    private etablissementService: EtablissementService
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadMairies();
    this.loadHopitaux();
  }

  // ══════════════════════════════════════════════════════════════
  // FORMULAIRES
  // ══════════════════════════════════════════════════════════════

  private buildForms(): void {
    this.mairieForm = this.fb.group({
      id:           [null],
      nom:          ['', [Validators.required, Validators.minLength(2)]],
      telephone:    ['', Validators.required],
      localisation: ['', Validators.required],
      email:        ['', [Validators.required, Validators.email]],
    });

    this.hopitalForm = this.fb.group({
      id:           [null],
      nom:          ['', [Validators.required, Validators.minLength(2)]],
      telephone:    ['', Validators.required],
      localisation: ['', Validators.required],
      email:        ['', [Validators.required, Validators.email]],
      mairieId:     [null, Validators.required],
    });
  }

  // ══════════════════════════════════════════════════════════════
  // TABS
  // ══════════════════════════════════════════════════════════════

  setTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  // ══════════════════════════════════════════════════════════════
  // RECHERCHE
  // ══════════════════════════════════════════════════════════════

  onSearchMairie(event: Event): void {
    this.searchMairie.set((event.target as HTMLInputElement).value);
  }

  onSearchHopital(event: Event): void {
    this.searchHopital.set((event.target as HTMLInputElement).value);
  }

  // ══════════════════════════════════════════════════════════════
  // CHARGEMENT
  // ══════════════════════════════════════════════════════════════

  loadMairies(): void {
    this.loading.update(s => ({ ...s, mairie: true }));
    this.etablissementService.getAllMairie().subscribe({
      next: data => {
        this.mairies.set(data);
        this.loading.update(s => ({ ...s, mairie: false }));
      },
      error: () => {
        this.loading.update(s => ({ ...s, mairie: false }));
        this.toast('error', 'Impossible de charger les mairies.');
      }
    });
  }

  loadHopitaux(): void {
    this.loading.update(s => ({ ...s, hopital: true }));
    this.etablissementService.getAllHopital().subscribe({
      next: data => {
        this.hopitaux.set(data);
        this.loading.update(s => ({ ...s, hopital: false }));
      },
      error: () => {
        this.loading.update(s => ({ ...s, hopital: false }));
        this.toast('error', 'Impossible de charger les hôpitaux.');
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // MODALS MAIRIE
  // ══════════════════════════════════════════════════════════════

  openCreateMairie(): void {
    this.selectedMairie.set(null);
    this.mairieForm.reset();
    this.mairieModal.set('create');
  }

  openEditMairie(m: Mairie): void {
    this.selectedMairie.set(m);
    this.mairieForm.patchValue(m);
    this.mairieModal.set('edit');
  }

  openDeleteMairie(m: Mairie): void {
    this.selectedMairie.set(m);
    this.mairieModal.set('delete');
  }

  closeMairieModal(): void {
    this.mairieModal.set(null);
    this.mairieForm.reset();
  }

  saveMairie(): void {
    if (this.mairieForm.invalid) {
      this.mairieForm.markAllAsTouched();
      return;
    }
    this.savingMairie.set(true);
    const payload : FormData = new FormData();
    payload.append("mairie", JSON.stringify(this.mairieForm.value)); 
    const isEdit  = this.mairieModal() === 'edit';

    const req = isEdit
      ? this.etablissementService.updateMairie(payload)
      : this.etablissementService.createMairie(payload);

    req.subscribe({
      next: () => {
        this.savingMairie.set(false);
        this.closeMairieModal();
        this.loadMairies();
        this.toast('success', isEdit ? 'Mairie mise à jour.' : 'Mairie créée avec succès.');
      },
      error: () => {
        this.savingMairie.set(false);
        this.toast('error', 'Une erreur est survenue. Réessayez.');
      }
    });
  }

  confirmDeleteMairie(): void {
    const m = this.selectedMairie();
    if (!m?.id) return;
    this.savingMairie.set(true);
    this.etablissementService.deleteMairie(m.id).subscribe({
      next: () => {
        this.savingMairie.set(false);
        this.closeMairieModal();
        this.loadMairies();
        this.toast('success', `Mairie « ${m.nom} » supprimée.`);
      },
      error: () => {
        this.savingMairie.set(false);
        this.toast('error', 'Suppression impossible. Réessayez.');
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // MODALS HOPITAL
  // ══════════════════════════════════════════════════════════════

  openCreateHopital(): void {
    this.selectedHopital.set(null);
    this.hopitalForm.reset();
    this.hopitalModal.set('create');
  }

  openEditHopital(h: Hopital): void {
    this.selectedHopital.set(h);
    this.hopitalForm.patchValue(h);
    this.hopitalModal.set('edit');
  }

  openDeleteHopital(h: Hopital): void {
    this.selectedHopital.set(h);
    this.hopitalModal.set('delete');
  }

  closeHopitalModal(): void {
    this.hopitalModal.set(null);
    this.hopitalForm.reset();
  }

  saveHopital(): void {
    if (this.hopitalForm.invalid) {
      this.hopitalForm.markAllAsTouched();
      return;
    }
    this.savingHopital.set(true);
    const payload: FormData = new FormData(); 
    payload.append("hopital", JSON.stringify(this.hopitalForm.value)); 
    const isEdit  = this.hopitalModal() === 'edit';

    const req = isEdit
      ? this.etablissementService.updateHopital(payload)
      : this.etablissementService.createHopital(payload);

    req.subscribe({
      next: () => {
        this.savingHopital.set(false);
        this.closeHopitalModal();
        this.loadHopitaux();
        this.toast('success', isEdit ? 'Hôpital mis à jour.' : 'Hôpital créé avec succès.');
      },
      error: () => {
        this.savingHopital.set(false);
        this.toast('error', 'Une erreur est survenue. Réessayez.');
      }
    });
  }

  confirmDeleteHopital(): void {
    const h = this.selectedHopital();
    if (!h?.id) return;
    this.savingHopital.set(true);
    this.etablissementService.deleteHopital(h.id).subscribe({
      next: () => {
        this.savingHopital.set(false);
        this.closeHopitalModal();
        this.loadHopitaux();
        this.toast('success', `Hôpital « ${h.nom} » supprimé.`);
      },
      error: () => {
        this.savingHopital.set(false);
        this.toast('error', 'Suppression impossible. Réessayez.');
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // HELPERS FORMULAIRE
  // ══════════════════════════════════════════════════════════════

  mf(field: string) { return this.mairieForm.get(field); }
  hf(field: string) { return this.hopitalForm.get(field); }

  mfError(field: string): boolean {
    const c = this.mf(field);
    return !!(c && c.invalid && c.touched);
  }

  hfError(field: string): boolean {
    const c = this.hf(field);
    return !!(c && c.invalid && c.touched);
  }

  // ══════════════════════════════════════════════════════════════
  // TOASTS
  // ══════════════════════════════════════════════════════════════

  toast(type: ToastType, message: string): void {
    const id = ++this.toastCounter;
    this.toasts.update(t => [...t, { id, type, message, visible: true }]);
    setTimeout(() => this.dismissToast(id), 4000);
  }

  dismissToast(id: number): void {
    this.toasts.update(t =>
      t.map(item => item.id === id ? { ...item, visible: false } : item)
    );
    setTimeout(() => {
      this.toasts.update(t => t.filter(item => item.id !== id));
    }, 350);
  }

  // ══════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ══════════════════════════════════════════════════════════════

  getMairieName(id: number | undefined): string {
    if (!id) return '—';
    const m = this.mairies().find(m => m.id === id);
    return m ? m.nom : `#${id}`;
  }

  trackById(_: number, item: any): number { return item.id; }
}