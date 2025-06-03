import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

//Para usar firebase
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild('content') content!: ElementRef;

  messages: any[] = [];
  newMessage = '';
  private subscription: Subscription | null = null;

  //Ubicacion
  latitude: number | null = null;
  longitude: number | null = null;

  constructor(public supabase: SupabaseService, private firestore: Firestore) { }

  ngOnInit() {
    this.loadMessages();

    // Escuchar mensajes nuevos en tiempo real
    this.supabase.listenMessages((msg) => {
      this.messages.push(msg);
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }

  scrollToBottom() {
    if (this.content && this.content.nativeElement) {
      this.content.nativeElement.scrollToBottom(300);
    }
  }

  ngOnDestroy() {
    this.supabase.unsubscribeMessages();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async loadMessages() {
    const { data, error } = await this.supabase['supabase']
      .from('messages')
      .select(`
      *,
      profiles!messages_user_id_fkey (
        name,
        avatar_url
      )
    `)
      .order('inserted_at', { ascending: true });

    if (!error && data) {
      this.messages = data;
    }
  }

  async sendMessage() {
    const user = this.supabase.currentUser.value;
    if (!user) throw new Error('No user logged in');

    if (!this.newMessage.trim()) return;

    const { data, error } = await this.supabase.supabase
      .from('messages')
      .insert([{ user_id: user.id, content: this.newMessage.trim() }]);
    if (error) throw error;

    this.newMessage = ''; // limpia el input
    return data;
  }

  // Método para obtener la ubicación actual
  getCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada en este navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        alert(`Ubicación obtenida: ${this.latitude}, ${this.longitude}`);
      },
      (error) => {
        alert('Error obteniendo ubicación: ' + error.message);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }

  // Método para enviar la ubicación como mensaje
  async sendLocation() {
    const user = this.supabase.currentUser.value;
    if (!user) throw new Error('No user logged in');
    if (this.latitude === null || this.longitude === null) {
      alert('Primero obtén la ubicación');
      return;
    }
    console.log('Usuario:', user);
    console.log('Latitud:', this.latitude, 'Longitud:', this.longitude);


    // Opcional: guardamos en Firebase la ubicación
    try {
      const ubicacionesRef = collection(this.firestore, 'ubicaciones');
      await addDoc(ubicacionesRef, {
        user_id: user.id,
        latitud: this.latitude,
        longitud: this.longitude,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error guardando ubicación en Firebase:', error);
    }

    // Enviamos el mensaje con un link de Google Maps al chat en Supabase
    const mapLink = `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
    const content = `📍 Mi ubicación: ${mapLink}`;

    const { data, error } = await this.supabase.supabase
      .from('messages')
      .insert([{ user_id: user.id, content }]);
    if (error) throw error;

    this.latitude = null;
    this.longitude = null;
    return data;
  }

  // Para consumir la api

  async sendGhibliInfo() {
    const user = this.supabase.currentUser.value;
    if (!user) {
      alert('No user logged in');
      return;
    }

    try {
      const response = await fetch('https://ghibliapi.vercel.app/films');
      const films = await response.json();

      const film = films[Math.floor(Math.random() * films.length)];
      const title = film.title;
      const description = film.description;
      const director = film.director;
      const release_date = film.release_date;

      const content = `🎬 *${title}*\n🧑‍🎨 Director: ${director}\n🗓 Año: ${release_date}\n📝 ${description.substring(0, 150)}...`;


      const { data: insertData, error } = await this.supabase.supabase
        .from('messages')
        .insert([{ user_id: user.id, content }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error al obtener datos de Ghibli:', err);
      alert('No se pudo obtener la película de Ghibli');
    }
  }

  formatMessageContent(content: string): string {
    if (!content) return '';

    // Convertir saltos de línea a <br>
    let formatted = content.replace(/\n/g, '<br>');

    // Convertir *texto* en negrita <strong>texto</strong>
    formatted = formatted.replace(/\*(.*?)\*/g, '<strong>$1</strong>');

    return formatted;
  }



}
