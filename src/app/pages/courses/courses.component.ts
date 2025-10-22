// src/app/pages/courses/courses.component.ts
import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, Course } from '../../services/api.service';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // User info
  currentUser = signal<any>(null);
  courses = signal<Course[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  topics = signal<any[]>([
    { id: 1, title: 'Examination Schedule - November 2025', author: 'Edward van Niekerk', date: '2 Oct 2025', time: '3:05 PM' },
    { id: 2, title: 'AI Fest 2025 - Belgium Campus', author: 'Francois Venter', date: '2 Oct 2025', time: '3:06 PM' },
    { id: 3, title: 'Examination Perusal Schedule June 2025', author: 'Francois Venter', date: '14 Aug 2025', time: '3:07 PM' },
    { id: 4, title: 'Examination results - June 2025', author: 'Theodorus Kritzinger', date: '28 July 2025', time: '3:08 PM' },
    { id: 5, title: 'International Global Minor Enrichment Programme', author: 'Francois Venter', date: '14 July 2025', time: '3:09 PM' },
  ]);

  // Color palette for lecturer avatars
  private avatarColors = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-green-500 to-green-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-red-500 to-red-600',
    'bg-gradient-to-br from-yellow-500 to-yellow-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
  ];

  ngOnInit() {
    // Get current user info from API service
    const user = this.apiService.getCurrentUserValue();
    this.currentUser.set(user);
    
    // Load courses from API
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.apiService.getCourses().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.error.set('Failed to load courses');
        this.loading.set(false);
        
        // Fallback to mock data if API fails
        this.setMockCourses();
      }
    });
  }

  private setMockCourses(): void {
    const mockCourses: Course[] = [
      {
        _id: '1',
        code: 'DBD 381',
        name: 'Database Design and Implementation',
        status: 'Active',
        lecturer: { name: 'Naledi Msiya', avatarUrl: '' },
        image: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop'
      },
      {
        _id: '2',
        code: 'INL381',
        name: 'Information Systems Management',
        status: 'Active',
        lecturer: { name: 'Dino Giovanni', avatarUrl: '' },
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop'
      },
      {
        _id: '3',
        code: 'PRJ381',
        name: 'Advanced Project Management',
        status: 'Active',
        lecturer: { name: 'Ane Strydom', avatarUrl: '' },
        image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop'
      },
      {
        _id: '4',
        code: 'DBD 281',
        name: 'Database Fundamentals',
        status: 'Inactive',
        lecturer: { name: 'Simba Zengeni', avatarUrl: '' },
        image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop'
      },
      {
        _id: '5',
        code: 'SEN381',
        name: 'Software Engineering Principles',
        status: 'Active',
        lecturer: { name: 'Abey Kelli', avatarUrl: '' },
        image: 'https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?q=80&w=2070&auto=format&fit=crop'
      },
      {
        _id: '6',
        code: 'WEB381',
        name: 'Web Development Technologies',
        status: 'Active',
        lecturer: { name: 'Sarah Johnson', avatarUrl: '' },
        image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?q=80&w=2070&auto=format&fit=crop'
      },
    ];
    
    this.courses.set(mockCourses);
  }

  /**
   * Get user display name for the header
   */
  getUserDisplayName(): string {
    const user = this.currentUser();
    return user?.name || 'Student';
  }

  /**
   * Get lecturer initial for avatar
   */
  getLecturerInitial(lecturerName: string): string {
    return lecturerName ? lecturerName.charAt(0).toUpperCase() : '?';
  }

  /**
   * Get consistent color for lecturer based on name
   */
  getLecturerColor(lecturerName: string): string {
    if (!lecturerName) return this.avatarColors[0];
    
    // Simple hash function to get consistent color for each lecturer
    let hash = 0;
    for (let i = 0; i < lecturerName.length; i++) {
      hash = lecturerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % this.avatarColors.length;
    return this.avatarColors[index];
  }

  /**
   * Generate random module count for demo purposes
   */
  getRandomModuleCount(): number {
    return Math.floor(Math.random() * 8) + 3; // 3-10 modules
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

  /**
   * Navigate to individual course
   */
  navigateToCourse(courseId: string): void {
    this.router.navigate(['/course', courseId]);
  }
}