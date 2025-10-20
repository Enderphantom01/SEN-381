// src/app/pages/login/login.component.ts
import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  rememberMe = signal(false);
  
  // UI state
  isLoading = signal(false);
  errorMessage = signal('');

  onEmailInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.email.set(inputElement.value);
    this.clearError();
  }

  onPasswordInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.password.set(inputElement.value);
    this.clearError();
  }

  onRememberMeChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.rememberMe.set(inputElement.checked);
  }

  private clearError(): void {
    this.errorMessage.set('');
  }

  async login(): Promise<void> {
    // Reset error
    this.errorMessage.set('');

    // Validation
    if (!this.validateForm()) {
      return;
    }

    this.isLoading.set(true);

    try {
      this.apiService.login(this.email(), this.password()).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          console.log('Login successful', response);
          
          // Navigate to home page
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Login failed', error);
          
          // Display error message to user
          if (error.error?.message) {
            this.errorMessage.set(error.error.message);
          } else if (error.error?.error) {
            this.errorMessage.set(error.error.error);
          } else {
            this.errorMessage.set('Login failed. Please check your credentials and try again.');
          }
        }
      });

    } catch (error) {
      this.isLoading.set(false);
      this.errorMessage.set('An unexpected error occurred.');
      console.error('Login error:', error);
    }
  }

  private validateForm(): boolean {
    // Check if all fields are filled
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Email and password are required.');
      return false;
    }

    // Validate email format and domain
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email())) {
      this.errorMessage.set('Please enter a valid email address.');
      return false;
    }

    // Check if email ends with @belgiumcampus.ac.za
    if (!this.email().toLowerCase().endsWith('@belgiumcampus.ac.za')) {
      this.errorMessage.set('Only Belgium Campus email addresses are allowed (@belgiumcampus.ac.za).');
      return false;
    }

    // Check password is provided
    if (!this.password()) {
      this.errorMessage.set('Password is required.');
      return false;
    }

    return true;
  }

  // Quick login for demo purposes (remove in production)
  quickLogin(demoEmail: string, demoPassword: string): void {
    this.email.set(demoEmail);
    this.password.set(demoPassword);
    this.login();
  }
}