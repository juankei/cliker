
import { Component, OnInit, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModalController } from '@ionic/angular';
import powers from '../../../assets/data/powers.json';
import {
  IonButton,
  IonProgressBar,
  IonRow,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonCol,
  IonGrid
} from '@ionic/angular';

// Definimos la estructura de un poder
interface Power {
  id: number;
  nombre: string;
  precio: number;
  descripcion: string;
  duracion: number;
  imagen: string;
}

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss'],
  standalone: true,
  imports: [
    IonProgressBar,
    IonRow,
    IonButton,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonCol,
    IonGrid
  ],
})
export class ShopComponent implements OnInit {

  powers: Power[] = powers.powers;
  poderComprado: Power | null = null;
  mensajeCompra = '';
  @Input() coins: number = 0;
  @Input() inventory: number[] = [];
  
  constructor(private http: HttpClient, private modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.loadPowers();
  }

  loadPowers(): void {
    this.powers = powers.powers;
    console.log('Poderes cargados:', this.powers);
  }

buyItem(item: Power): void {
  // Comprobar si tienes suficientes monedas
  if (this.coins < item.precio) {
    this.mensajeCompra = 'No tienes suficientes monedas.';
    return;
  }

  // Restar monedas
  this.coins -= item.precio;

  // Añadir el poder al inventario
  this.inventory.push(item.id);

  // Mostrar mensaje
  this.mensajeCompra = `¡Has comprado ${item.nombre}!`;

  // IMPORTANTE: No cerrar el modal aquí
  this.poderComprado = item;
}

  trackById(index: number, power: Power): number {
    return power.id;
  }


  exitShop(): void {
    this.modalCtrl.dismiss(
      {
        coins: this.coins,
        inventory: this.inventory,
        item: this.poderComprado
      },
      this.poderComprado ? 'buy' : 'close'
    );
  }
}
