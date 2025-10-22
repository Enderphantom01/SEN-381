// src/app/pages/topics/topics.component.ts
import { ChangeDetectionStrategy, Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface Topic {
  title: string;
  description: string;
}

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-topics',
  templateUrl: './topics.component.html',
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicsComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // User info
  currentUser = signal<any>(null);

  topics = signal<Topic[]>([
    {
      title: 'Object-Oriented Programming in C# and Java',
      description: 'Exploring encapsulation, inheritance, and polymorphism for building maintainable software.',
    },
    {
      title: 'Database Integration in Web Apps',
      description: 'Handling user data securely with SQL and NoSQL databases.',
    },
    {
      title: 'Introduction to Machine Learning',
      description: 'Understanding the fundamentals of machine learning models and algorithms.',
    },
    {
      title: 'Web Security Best Practices',
      description: 'Learn to secure web applications against common vulnerabilities like XSS and SQL injection.',
    },
    {
      title: 'Agile & Scrum Methodologies',
      description: 'A deep dive into agile principles and the scrum framework for effective project management.'
    }
  ]);

  searchTerm = signal('');

  filteredTopics = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return this.topics();
    }
    return this.topics().filter(
      topic => topic.title.toLowerCase().includes(term) || topic.description.toLowerCase().includes(term)
    );
  });

  ngOnInit() {
    // Get current user info from API service
    const user = this.apiService.getCurrentUserValue();
    this.currentUser.set(user);
  }

  /**
   * Get user display name for the header
   */
  getUserDisplayName(): string {
    const user = this.currentUser();
    return user?.name || 'Student';
  }

  /**
   * Handle logout
   */
  logout(): void {
    this.apiService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Navigate to different sections
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  navigateToCourses(): void {
    this.router.navigate(['/courses']);
  }

  navigateToTopics(): void {
    // Already on topics page
  }

  navigateToChats(): void {
    this.router.navigate(['/chats']);
  }

  navigateToForum(): void {
    this.router.navigate(['/forum']);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
}