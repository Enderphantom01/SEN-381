import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);

  firstName = signal('');
  lastName = signal('');
  courses = signal('');
  mobile = signal('');
  bio = signal('');
  profilePictureUrl = signal<string | ArrayBuffer | null>('');

  ngOnInit(): void {
    // Load current user data into the form
    const currentUser = this.apiService.getCurrentUserValue();
    if (currentUser) {
      const nameParts = currentUser.name.split(' ');
      this.firstName.set(nameParts[0] || '');
      this.lastName.set(nameParts.slice(1).join(' ') || '');
      this.mobile.set(currentUser.phoneNumber || '');
      this.profilePictureUrl.set(currentUser.profilePictureUrl || null); 
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => this.profilePictureUrl.set(e.target?.result || null);
      reader.readAsDataURL(file);
    }
  }

  saveChanges(): void {
    // Combine first and last name to match the 'name' field in our User object
    const fullName = `${this.firstName()} ${this.lastName()}`.trim();

    // Call the new method in the ApiService to update the user data locally
    this.apiService.updateCurrentUser({
      name: fullName,
      phoneNumber: this.mobile(),
      profilePictureUrl: this.profilePictureUrl() as string | null
    });

    // Navigate back to the home page to see the changes
    this.navigateToHome();
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}