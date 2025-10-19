import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  email = signal('');
  firstName = signal('');
  lastName = signal('');
  password = signal('');
  confirmPassword = signal('');
  acceptTerms = signal(false);

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onFirstNameInput(event: Event): void {
    this.firstName.set((event.target as HTMLInputElement).value);
  }

  onLastNameInput(event: Event): void {
    this.lastName.set((event.target as HTMLInputElement).value);
  }

  onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  onConfirmPasswordInput(event: Event): void {
    this.confirmPassword.set((event.target as HTMLInputElement).value);
  }

  onAcceptTermsChange(event: Event): void {
    this.acceptTerms.set((event.target as HTMLInputElement).checked);
  }

  signup(): void {
    if (this.password() !== this.confirmPassword()) {
      console.error('Passwords do not match.');
      // You can add logic here to show an error to the user
      return;
    }
    if (!this.acceptTerms()) {
      console.error('User must accept terms and conditions.');
      // You can add logic here to show an error to the user
      return;
    }

    console.log('Signup attempt with the following details:');
    console.log('Email:', this.email());
    console.log('First Name:', this.firstName());
    console.log('Last Name:', this.lastName());
    console.log('Password:', this.password());
    console.log('Accepted Terms:', this.acceptTerms());

    // API call to the backend for user registration will be implemented here.
    // For example:
    // this.authService.register({
    //   email: this.email(),
    //   firstName: this.firstName(),
    //   lastName: this.lastName(),
    //   password: this.password()
    // }).subscribe({
    //   next: (response) => {
    //     console.log('Registration successful', response);
    //     // Redirect to login page or dashboard
    //   },
    //   error: (error) => {
    //     console.error('Registration failed', error);
    //     // Display error message to the user
    //   }
    // });
  }
}