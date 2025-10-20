// src/app/pages/register/register.component.ts
import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);

  email = signal('');
  firstName = signal('');
  lastName = signal('');
  password = signal('');
  confirmPassword = signal('');
  acceptTerms = signal(false);
  
  // UI state
  isLoading = signal(false);
  errorMessage = signal('');

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    this.clearError();
  }

  onFirstNameInput(event: Event): void {
    this.firstName.set((event.target as HTMLInputElement).value);
    this.clearError();
  }

  onLastNameInput(event: Event): void {
    this.lastName.set((event.target as HTMLInputElement).value);
    this.clearError();
  }

  onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
    this.clearError();
  }

  onConfirmPasswordInput(event: Event): void {
    this.confirmPassword.set((event.target as HTMLInputElement).value);
    this.clearError();
  }

  onAcceptTermsChange(event: Event): void {
    this.acceptTerms.set((event.target as HTMLInputElement).checked);
    this.clearError();
  }

  private clearError(): void {
    this.errorMessage.set('');
  }

  async signup(): Promise<void> {
    // Reset error
    this.errorMessage.set('');

    // Validation
    if (!this.validateForm()) {
      return;
    }

    this.isLoading.set(true);

    try {
      const userData = {
        email: this.email(),
        firstName: this.firstName(),
        lastName: this.lastName(),
        password: this.password(),
        phoneNumber: '+27123456789' // You can add a phone number field later
      };

      this.apiService.register(userData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          console.log('Registration successful', response);
          
          // Navigate to home page
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Registration failed', error);
          
          // Display error message to user
          if (error.error?.message) {
            this.errorMessage.set(error.error.message);
          } else if (error.error?.error) {
            this.errorMessage.set(error.error.error);
          } else {
            this.errorMessage.set('Registration failed. Please try again.');
          }
        }
      });

    } catch (error) {
      this.isLoading.set(false);
      this.errorMessage.set('An unexpected error occurred.');
      console.error('Registration error:', error);
    }
  }

  private validateForm(): boolean {
    // Check if all fields are filled
    if (!this.email() || !this.firstName() || !this.lastName() || !this.password() || !this.confirmPassword()) {
      this.errorMessage.set('All fields are required.');
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

    // Check password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(this.password())) {
      this.errorMessage.set('Password must be at least 6 characters and contain at least one uppercase letter, one lowercase letter, and one number.');
      return false;
    }

    // Check if passwords match
    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Passwords do not match.');
      return false;
    }

    // Check if terms are accepted
    if (!this.acceptTerms()) {
      this.errorMessage.set('You must accept the Terms of Use and Privacy Policy.');
      return false;
    }

    return true;
  }
}