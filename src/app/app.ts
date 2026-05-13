import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from './Core/Service/Auth/auth-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('web');

   private readonly INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(private authService : AuthService){
   // Premier ping immédiat au démarrage
    this.authService.pingPong().subscribe();

    // Puis toutes les 10 minutes
    interval(10 * 60 * 1000).pipe(
      switchMap(() => this.authService.pingPong())
    ).subscribe({
      next: () => console.log('Ping OK'),
      error: (err) => console.error('Ping failed', err)
    });
  }


}
