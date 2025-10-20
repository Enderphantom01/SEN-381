// src/app/pages/courses/courses.component.ts
import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface Course {
  id: number;
  code: string;
  status: 'Active' | 'Inactive';
  lecturer: {
    name: string;
    avatarUrl: string;
  };
  imageUrl: string;
}

interface Topic {
  id: number;
  title: string;
  author: string;
  date: string;
  time: string;
}

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // User info
  currentUser = signal<any>(null);

  courses = signal<Course[]>([
    {
      id: 1,
      code: 'DBD 381',
      status: 'Active',
      lecturer: { name: 'Naledi Msiya', avatarUrl: 'https://picsum.photos/seed/naledi/32/32' },
      imageUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop'
    },
    {
      id: 2,
      code: 'INL381',
      status: 'Active',
      lecturer: { name: 'Dino Giovanni', avatarUrl: 'https://picsum.photos/seed/dino/32/32' },
      imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop'
    },
    {
      id: 3,
      code: 'PRJ381',
      status: 'Active',
      lecturer: { name: 'Ane Strydom', avatarUrl: 'https://picsum.photos/seed/ane/32/32' },
      imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop'
    },
    {
      id: 4,
      code: 'DBD 281',
      status: 'Inactive',
      lecturer: { name: 'Simba Zengeni', avatarUrl: 'https://picsum.photos/seed/simba/32/32' },
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop'
    },
    {
      id: 5,
      code: 'SEN381',
      status: 'Active',
      lecturer: { name: 'Abey Kelli', avatarUrl: 'https://picsum.photos/seed/abey/32/32' },
      imageUrl: 'https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?q=80&w=2070&auto=format&fit=crop'
    },
  ]);

  topics = signal<Topic[]>([
    { id: 1, title: 'Examination Schedule - November 2025', author: 'Edward van Niekerk', date: '2 Oct 2025', time: '3:05 PM' },
    { id: 2, title: 'AI Fest 2025 - Belgium Campus', author: 'Francois Venter', date: '2 Oct 2025', time: '3:06 PM' },
    { id: 3, title: 'Examination Perusal Schedule June 2025', author: 'Francois Venter', date: '14 Aug 2025', time: '3:07 PM' },
    { id: 4, title: 'Examination results - June 2025', author: 'Theodorus Kritzinger', date: '28 July 2025', time: '3:08 PM' },
    { id: 5, title: 'International Global Minor Enrichment Programme', author: 'Francois Venter', date: '14 July 2025', time: '3:09 PM' },
  ]);

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
    // Already on courses page
  }

  navigateToTopics(): void {
    this.router.navigate(['/topics']);
  }

  navigateToChats(): void {
    this.router.navigate(['/chats']);
  }

  navigateToForum(): void {
    this.router.navigate(['/forum']);
  }
}