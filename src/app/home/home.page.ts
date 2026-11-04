import { Component,signal,OnInit,ChangeDetectorRef  } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { IonButton, IonHeader, IonToolbar, IonTitle, IonContent,IonIcon,ToastController,IonCol, IonGrid, IonRow,IonProgressBar } from '@ionic/angular';
import { ShopComponent } from '../components/shop/shop.component';
import { HttpClient } from '@angular/common/http';
import dinosaurs from '../../assets/data/dino.json';
import levels from '../../assets/data/levels.json';
import { SonidosService } from '../services/sonidos';
interface Level {
  nivel: number;
  nombre: string;
  tiempo: number;
  cantidadDinosaurios: number;
  velocidad: number;
  recompensa: number;
  fondo: string;
}
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonProgressBar, IonRow, IonButton, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonCol, IonGrid , IonRow ],
})
export class HomePage implements OnInit {

  // Temporizador y barra de progreso
  readonly progress = signal(0);

  timeLeft() {
      return this.remainingTime; // Temporal: después implementaremos el temporizador real
  }

  // Dinosaurios cargados desde el JSON
  dinosaurs: any[] = dinosaurs.dinosaurs;
  // Configuración de los niveles
  levels: Level[] = levels.levels;
  // Nivel actual
  currentLevel = 1;

  // Datos del nivel que estamos jugando
  levelData: Level | undefined;

    // Tiempo restante de la partida
  remainingTime = 0;

  // Control del temporizador
  timerInterval: ReturnType<typeof setInterval> | undefined;

  // Estado de la partida
  gameState: 'playing' | 'won' | 'lost' | 'finished' = 'playing';
  // Inventario: cada número representa un poder comprado
  inventory: number[] = []; 
  // Monedas
  coins = 0;
  // Pausa del juego
  isPaused = false;
  // Estado del dinosaurio (si todavía lo necesitas)
  dinosaurVisible = true;
  // Estado de la tienda
  isShopOpen = false;

  // Poderes

  // Poder de congelar dinosaurios
  isFrozen = false; 
  freezeTimeLeft = 0;
  freezeInterval: ReturnType<typeof setInterval> | undefined;

  
  // Doble recompensa
  isDoubleReward = false;
  doubleRewardTimeLeft = 0;
  doubleRewardInterval: ReturnType<typeof setInterval> | undefined;

  // Tiempo extra: no necesita un temporizador propio
  // porque modifica directamente el tiempo del nivel.

  // Lentitud jurásica
  isSlow = false;
  slowTimeLeft = 0;
  slowInterval: ReturnType<typeof setInterval> | undefined;

  
  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private sonidosService: SonidosService,
    private cdr: ChangeDetectorRef
  ) {
  }

  // Inicialización de la página
  ngOnInit() {
    this.loadGame();
    this.loadDinosaurs();
    this.loadLevel();
  }

  handleKeydown(event: KeyboardEvent) {

    if (event.key === 'Escape') {
      event.preventDefault();
      this.openModal();
      return;
    }
    if (event.key === '1') {
      this.activateFreeze();
    } else if (event.key === '2') {
      this.activateDoubleReward();
    } else if (event.key === '3') {
      this.activateExtraTime();
    } else if (event.key === '4') {
      this.activateSlow();
    }
  }
  
  saveGame() {
    // Guardamos las monedas como texto en localStorage.
    // String() convierte el número de monedas en una cadena de texto.
    localStorage.setItem('dinoCoins', String(this.coins));

    // Guardamos el inventario convirtiendo el array en texto JSON.
    localStorage.setItem('dinoInventory', JSON.stringify(this.inventory));
  }


  loadGame() {
    // Recuperamos las monedas y el inventario guardados.
    const savedCoins = localStorage.getItem('dinoCoins');
    const savedInventory = localStorage.getItem('dinoInventory');

    // Comprobamos si hay monedas guardadas.
    if (savedCoins !== null) {
      // Convertimos el texto recuperado en un número.
      const parsedCoins = Number(savedCoins);

      // Solo aceptamos números válidos y no negativos.
      if (Number.isFinite(parsedCoins) && parsedCoins >= 0) {
        this.coins = parsedCoins;
      }
    }

    // Comprobamos si existe un inventario guardado.
    if (savedInventory !== null) {
      try {
        // Convertimos el texto JSON en un valor de JavaScript.
        const inventarioGuardado = JSON.parse(savedInventory);

        // Comprobamos que el resultado sea una lista.
        if (Array.isArray(inventarioGuardado)) {
          // Recuperamos los poderes guardados.
          this.inventory = inventarioGuardado;
        }
      } catch {
        // Si el texto no es JSON válido, mostramos un aviso
        console.log('Error al cargar el inventario.');
      }
    }
  }


  // Carga los dinosaurios desde el JSON
loadDinosaurs() {
  this.dinosaurs = dinosaurs.dinosaurs
    .filter(dino => dino.nivel === this.currentLevel)
    .map(dino => ({
      ...dino,
      duration: this.levelData?.velocidad ?? dino.duration
    }));
}

  killDinosaur(id: number) {
    this.sonidosService.sonarMatar();
    // No permitimos eliminar dinosaurios si la tienda está abierta
    // o si la partida ya no está en curso.
    if (this.isPaused || this.gameState !== 'playing') {
      return;
    }

    // Recorremos la lista de dinosaurios para encontrar
    // el que el jugador ha pulsado.
    for (let i = 0; i < this.dinosaurs.length; i++) {
      if (this.dinosaurs[i].id === id) {

        // Sumamos las monedas que recompensa ese dinosaurio.
        if (this.isDoubleReward) {
        // Si el poder está activo, ganamos el doble de monedas
        this.coins += this.dinosaurs[i].coins * 2;
      } else {
        // Si no está activo, ganamos las monedas normales
        this.coins += this.dinosaurs[i].coins;
    }

        // Eliminamos el dinosaurio de la lista.
        // Así deja de aparecer en el juego.
        this.dinosaurs.splice(i, 1);

        // Terminamos el bucle porque ya encontramos el dinosaurio.
        break;
      }
    }

    // Comprobamos si se han eliminado todos los dinosaurios.
    if (this.dinosaurs.length === 0) {

      // Cambiamos el estado para indicar que el nivel se ha superado.
      this.gameState = 'won';

      // Detenemos el temporizador del nivel.
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }

      // Si tenemos los datos del nivel, añadimos la recompensa.
      if (this.levelData) {
        this.coins += this.levelData.recompensa;

        // Guardamos las monedas y el inventario actual.
        this.saveGame();
      }

      // Mostramos un mensaje en la consola.
      console.log('¡Nivel completado!');
    }
  }



  async openModal() {

    // Evitamos abrir varias tiendas.
    if (this.isShopOpen) {
      return;
    }

    this.isShopOpen = true;
    // Pausamos el juego antes de abrir la tienda.
    this.isPaused = true;

    // Creamos el modal de la tienda y le enviamos
    // las monedas y una copia del inventario actual.
    const modal = await this.modalCtrl.create({
      component: ShopComponent,
      componentProps: {
        coins: this.coins,
        inventory: [...this.inventory]
      },
      backdropDismiss: false
    });

    // Mostramos la tienda en pantalla.
    await modal.present();

    // Esperamos hasta que el jugador cierre la tienda.
    const result = await modal.onDidDismiss();

    // Si se ha realizado una compra y recibimos datos,
    // actualizamos las monedas y el inventario.
    if (result.role === 'buy' && result.data) {
      this.coins = result.data.coins;
      this.inventory = result.data.inventory;

      // Guardamos los datos actualizados.
      this.saveGame();
    }

    // Reanudamos el juego al salir de la tienda,
    // tanto si ha comprado como si no.
    this.isPaused = false;
    this.isShopOpen = false;
    this.cdr.detectChanges();
  }

  
  loadLevel() {
    this.levelData = undefined;

    for (let i = 0; i < this.levels.length; i++) {
      if (this.levels[i].nivel === this.currentLevel) {
        this.levelData = this.levels[i];
        break;
      }
    }

    if (!this.levelData) {
      this.gameState = 'finished';
      return;
    }

    this.remainingTime = this.levelData.tiempo;
    this.progress.set(1);
    this.gameState = 'playing';

    this.loadDinosaurs();
    this.startTimer();
  }

  nextLevel() {
  this.currentLevel++;
  this.loadLevel();
}

retryLevel() {
  this.loadLevel();
}


  startTimer() {
    // Si ya no queda tiempo al comenzar,
    // declaramos el nivel perdido y salimos.
    if (
      this.remainingTime <= 0 &&
      this.gameState === 'playing'
    ) {
      this.gameState = 'lost';

      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }

      return;
    }

    // Creamos un intervalo que se ejecuta cada segundo.
    this.timerInterval = setInterval(() => {

      // No avanzamos el temporizador si el juego está pausado
      // o si la partida ya no está en curso.
      if (this.isPaused || this.gameState !== 'playing') {
        return;
      }

      // Si queda tiempo, restamos un segundo.
      if (this.remainingTime > 0) {
        this.remainingTime--;

        // Actualizamos la barra de progreso.
        // Dividir el tiempo restante entre el tiempo inicial
        // calcula la proporción que queda.
        if (this.levelData) {
          this.progress.set(
            this.remainingTime / this.levelData.tiempo
          );
        }
      }

      // Si el tiempo llega a cero, perdemos el nivel
      // y detenemos el intervalo.
      if (this.remainingTime <= 0) {
        this.gameState = 'lost';

        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = undefined;
        }
      }
    }, 1000);
  }




  hasFreezePower(): boolean {
    // includes(1) comprueba si el inventario contiene
    // el identificador 1, que estamos usando para Congelación.
    // Devuelve true si lo tenemos y false si no.
    return this.inventory.includes(1);
  }

  

  activateFreeze() {
    // Evitamos activar otra congelación si ya hay una activa.
    if (this.isFrozen) {
      return;
    }

    // Buscamos el identificador del poder de Congelación.
    const index = this.inventory.indexOf(1);

    // Si no lo encontramos, no hacemos nada.
    if (index === -1) {
      return;
    }

    // Consumimos una unidad del poder comprado.
    this.inventory.splice(index, 1);

    // Guardamos el inventario actualizado para que
    // el poder consumido no reaparezca al recargar la página.
    this.saveGame();

    // Activamos el efecto de congelación.
    // La clase CSS paused utiliza este valor para detener
    // las animaciones de los dinosaurios.
    this.isFrozen = true;

    // Inicializamos el contador en cinco segundos.
    this.freezeTimeLeft = 5;

    // Creamos un intervalo que se ejecuta cada segundo.
    this.freezeInterval = setInterval(() => {

      // Restamos un segundo al contador.
      this.freezeTimeLeft--;

      // Cuando el contador llega a cero, termina el efecto.
      if (this.freezeTimeLeft <= 0) {
        this.isFrozen = false;
        this.freezeTimeLeft = 0;

        // Detenemos el intervalo para que no siga ejecutándose.
        if (this.freezeInterval) {
          clearInterval(this.freezeInterval);
          this.freezeInterval = undefined;
        }
      }
    }, 1000);
  }


  activateDoubleReward() {
  if (this.isDoubleReward) return;

  const index = this.inventory.indexOf(2);
  if (index === -1) return;

  this.inventory.splice(index, 1);
  this.saveGame();

  this.isDoubleReward = true;
  this.doubleRewardTimeLeft = 15;

  this.doubleRewardInterval = setInterval(() => {
    this.doubleRewardTimeLeft--;

    if (this.doubleRewardTimeLeft <= 0) {
      this.isDoubleReward = false;
      this.doubleRewardTimeLeft = 0;

      if (this.doubleRewardInterval) {
        clearInterval(this.doubleRewardInterval);
        this.doubleRewardInterval = undefined;
      }
    }
  }, 1000);
}

activateExtraTime() {
  // Comprobamos si tenemos el poder en el inventario
  const index = this.inventory.indexOf(3);

  if (index === -1) {
    return;
  }

  // Gastamos una unidad del poder
  this.inventory.splice(index, 1);
  this.saveGame();

  // Añadimos 15 segundos a la partida
  this.remainingTime += 15;

  // Actualizamos la barra de tiempo
  if (this.levelData) {
    this.progress.set(
      this.remainingTime / this.levelData.tiempo
    );
  }
}



activateSlow() {
  if (this.isSlow) return;

  const index = this.inventory.indexOf(4);

  if (index === -1) return;

  // Gastamos una unidad del poder
  this.inventory.splice(index, 1);
  this.saveGame();

  // Activamos la lentitud durante 10 segundos
  this.isSlow = true;
  this.slowTimeLeft = 10;

  this.slowInterval = setInterval(() => {
    this.slowTimeLeft--;

    if (this.slowTimeLeft <= 0) {
      this.isSlow = false;
      this.slowTimeLeft = 0;

      if (this.slowInterval) {
        clearInterval(this.slowInterval);
        this.slowInterval = undefined;
      }
    }
  }, 1000);
}

}
  

