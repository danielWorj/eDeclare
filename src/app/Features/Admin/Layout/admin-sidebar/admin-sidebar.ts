import { Component, signal, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.css',
})
export class AdminSidebar {
  role = signal<number>(0);
  @Input() isOpen = false;  // ← reçoit l'état depuis le parent

  constructor() {
    this.role.set(parseInt(localStorage.getItem("role")!) ?? 0);
  }
}