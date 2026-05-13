import { Component, signal } from '@angular/core';
import { AdminNavbar } from "../admin-navbar/admin-navbar";
import { AdminSidebar } from "../admin-sidebar/admin-sidebar";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layouts',
  imports: [AdminNavbar, AdminSidebar, RouterOutlet],
  templateUrl: './layouts.html',
  styleUrl: './layouts.css',
})
export class Layouts {
  sidebarOpen = signal<boolean>(false);

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }
}