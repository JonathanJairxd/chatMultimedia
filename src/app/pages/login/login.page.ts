import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
})
export class LoginPage {
  email = '';
  password = '';
  errorMessage = '';

  //Para guardar el nombre y la imagen
  name = '';
  avatarUrl = '';
  isRegistering = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  async signIn() {
    this.errorMessage = '';
    try {
      await this.supabase.signIn(this.email, this.password);
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Error en login';
    }
  }

  async signUp() {
  this.errorMessage = '';
  try {
    const { user } = await this.supabase.signUp(this.email, this.password);

    if (user) {
      await this.supabase.supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: this.name,
          avatar_url: this.avatarUrl
        });

      alert('Usuario registrado. Revisa tu correo para confirmar.');
      this.isRegistering = false; // vuelve al login
    }
  } catch (error: any) {
    this.errorMessage = error.message || 'Error en registro';
  }
}
}
