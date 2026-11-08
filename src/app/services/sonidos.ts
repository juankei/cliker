import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SonidosService {
  private musica = new Audio('assets/sounds/chill.mp3');
  private sonidoMatar = new Audio('assets/sounds/kill.mp3');

  constructor() {
    this.musica.loop = true;
    this.musica.volume = 0.25;
    this.sonidoMatar.volume = 0.6;
  }

  iniciarMusica(): void {
    this.musica.play().catch(() => console.warn('El navegador bloqueó el audio'));
  }

  pararMusica(): void {
    this.musica.pause();
    this.musica.currentTime = 0;
  }

  sonarMatar(): void {
    const s = this.sonidoMatar.cloneNode() as HTMLAudioElement;
    s.volume = this.sonidoMatar.volume;
    s.play().catch(() => {});
  }
  pararSonidoMatar(): void {
    this.sonidoMatar.pause();
    this.sonidoMatar.currentTime = 0;
  }
}