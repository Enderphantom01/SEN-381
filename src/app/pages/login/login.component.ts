import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  email = signal('');
  password = signal('');
  rememberMe = signal(false);

  onEmailInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.email.set(inputElement.value);
  }

  onPasswordInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.password.set(inputElement.value);
  }

  onRememberMeChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.rememberMe.set(inputElement.checked);
  }

  login(): void {
    console.log('Login attempt with the following credentials:');
    console.log('Email:', this.email());
    console.log('Password:', this.password());
    console.log('Remember Me:', this.rememberMe());

    // API call to the backend for authentication will be implemented here.
    // For example:
    // this.authService.login({ email: this.email(), password: this.password() })
    //   .subscribe({
    //     next: (response) => {
    //       console.log('Login successful', response);
    //       // Redirect to dashboard or home page
    //     },
    //     error: (error) => {
    //       console.error('Login failed', error);
    //       // Display error message to the user
    //     }
    //   });
  }
}
