// src/app/pages/api-test/api-test.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <h3 class="text-2xl font-bold mb-4">API Connection Test</h3>
      
      <!-- Connection Test -->
      <div class="mb-6 p-4 border rounded">
        <h4 class="text-lg font-semibold mb-2">Backend Connection</h4>
        <button 
          (click)="testConnection()"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          [disabled]="testingConnection">
          {{ testingConnection ? 'Testing...' : 'Test Backend Connection' }}
        </button>
        <div *ngIf="connectionResult" class="mt-2 p-2 rounded" 
             [class.bg-green-100]="connectionResult.includes('✅')"
             [class.bg-red-100]="connectionResult.includes('❌')">
          {{ connectionResult }}
        </div>
      </div>

      <!-- Auth Test -->
      <div class="mb-6 p-4 border rounded" *ngIf="!apiService.isLoggedIn()">
        <h4 class="text-lg font-semibold mb-2">Authentication Test</h4>
        <div class="space-y-2">
          <input 
            [(ngModel)]="testEmail" 
            placeholder="Email (must end with @belgiumcampus.ac.za)" 
            class="w-full p-2 border rounded"
          />
          <input 
            [(ngModel)]="testPassword" 
            placeholder="Password" 
            type="password"
            class="w-full p-2 border rounded"
          />
          <button 
            (click)="testLogin()"
            class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            [disabled]="testingAuth">
            {{ testingAuth ? 'Logging in...' : 'Test Login' }}
          </button>
        </div>
        <div *ngIf="authResult" class="mt-2 p-2 bg-gray-100 rounded">
          <pre>{{ authResult | json }}</pre>
        </div>
      </div>

      <!-- API Tests (when logged in) -->
      <div class="mb-6 p-4 border rounded" *ngIf="apiService.isLoggedIn()">
        <h4 class="text-lg font-semibold mb-2">
          Logged in as: {{ apiService.getCurrentUserValue()?.email }}
        </h4>
        
        <div class="flex flex-wrap gap-2 mb-4">
          <button 
            (click)="testGetProfile()"
            class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
            Get Profile
          </button>
          <button 
            (click)="testGetTopics()"
            class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
            Get Topics
          </button>
          <button 
            (click)="testGetPosts()"
            class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
            Get Posts
          </button>
          <button 
            (click)="testLogout()"
            class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Logout
          </button>
        </div>
        
        <div *ngIf="apiResult" class="mt-2 p-2 bg-gray-100 rounded overflow-auto">
          <h5 class="font-semibold mb-2">API Response:</h5>
          <pre class="text-sm">{{ apiResult | json }}</pre>
        </div>
      </div>
    </div>
  `
})
export class ApiTestComponent {
  apiService = inject(ApiService); // Changed from private to public
  
  testEmail = 'test@belgiumcampus.ac.za'; // Use your test email
  testPassword = 'Password123'; // Use your test password
  connectionResult: string = '';
  authResult: any = null;
  apiResult: any = null;
  testingConnection = false;
  testingAuth = false;

  async testConnection() {
    this.testingConnection = true;
    this.connectionResult = '';
    
    try {
      this.apiService.testConnection().subscribe({
        next: (response) => {
          this.connectionResult = '✅ Backend is reachable! Response: ' + JSON.stringify(response);
          this.testingConnection = false;
        },
        error: (error) => {
          this.connectionResult = '❌ Cannot reach backend: ' + (error.message || 'Unknown error');
          this.testingConnection = false;
        }
      });
    } catch (error: any) {
      this.connectionResult = '❌ Connection test failed: ' + error.message;
      this.testingConnection = false;
    }
  }

  testLogin() {
    this.testingAuth = true;
    this.authResult = null;
    
    this.apiService.login(this.testEmail, this.testPassword).subscribe({
      next: (response) => {
        this.authResult = response;
        this.apiResult = null;
        this.testingAuth = false;
      },
      error: (error) => {
        this.authResult = { error: error.error?.message || 'Login failed', details: error };
        this.testingAuth = false;
      }
    });
  }

  testGetProfile() {
    this.apiService.getUserProfile().subscribe({
      next: (response) => {
        this.apiResult = response;
      },
      error: (error) => {
        this.apiResult = { error: error.error?.message || 'Failed to get profile', details: error };
      }
    });
  }

  testGetTopics() {
    this.apiService.getTopics().subscribe({
      next: (response) => {
        this.apiResult = response;
      },
      error: (error) => {
        this.apiResult = { error: error.error?.message || 'Failed to get topics', details: error };
      }
    });
  }

  testGetPosts() {
    this.apiService.getForumPosts().subscribe({
      next: (response) => {
        this.apiResult = response;
      },
      error: (error) => {
        this.apiResult = { error: error.error?.message || 'Failed to get posts', details: error };
      }
    });
  }

  testLogout() {
    this.apiService.logout().subscribe({
      next: () => {
        this.apiResult = { message: 'Logged out successfully' };
        this.authResult = null;
      },
      error: (error) => {
        this.apiResult = { error: error.error?.message || 'Logout failed', details: error };
      }
    });
  }
}