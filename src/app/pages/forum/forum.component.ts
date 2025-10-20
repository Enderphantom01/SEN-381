// src/app/pages/forum/forum.component.ts
import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface Reaction {
  name: string;
  avatar: string;
}

interface PostTag {
  text: string;
  color: string;
}

interface ForumPost {
  id: number;
  authorAvatar: string;
  title: string;
  content: string;
  timestamp: string;
  tag: PostTag;
  reactions: Reaction[];
}

@Component({
  selector: 'app-forum',
  templateUrl: './forum.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // User info
  currentUser = signal<any>(null);

  posts = signal<ForumPost[]>([
    {
      id: 1,
      authorAvatar: 'https://picsum.photos/id/1005/40/40',
      title: 'Struggling with Week 3 Quiz, Need help',
      content: 'Hey everyone, I\'m a bit stuck on the Week 3 quiz. Question 4 asks about "data normalization techniques," and I\'m not sure which answer fits best between min-max scaling and standardization. Can anyone explain the difference or give an example?',
      timestamp: '2025/10/06 10:34',
      tag: { text: 'General', color: 'bg-slate-500' },
      reactions: [
        { name: 'User 1', avatar: 'https://picsum.photos/id/1011/40/40' },
        { name: 'User 2', avatar: 'https://picsum.photos/id/1012/40/40' },
      ]
    },
    {
      id: 2,
      authorAvatar: 'https://picsum.photos/id/1027/40/40',
      title: 'Study group for Finals',
      content: 'Hi! I\'m forming a small study group for the final exam next week. We\'ll meet on Discord or Google Meet to go over key topics and practice past.',
      timestamp: '2025/10/05 05:45',
      tag: { text: 'Collaboration', color: 'bg-cyan-600' },
       reactions: [
        { name: 'User A', avatar: 'https://picsum.photos/id/237/40/40' },
        { name: 'User B', avatar: 'https://picsum.photos/id/238/40/40' },
        { name: 'User C', avatar: 'https://picsum.photos/id/239/40/40' },
        { name: 'User D', avatar: 'https://picsum.photos/id/240/40/40' },
      ]
    },
    {
      id: 3,
      authorAvatar: 'https://picsum.photos/id/1062/40/40',
      title: 'Error When Submitting Assignment File',
      content: 'Every time I try to submit my assignment, I get a "file format not supported" message. I\'m using a .docx file as requested. Is there a specific template we should use?',
      timestamp: '2025/10/04 14:50',
      tag: { text: 'Technical', color: 'bg-teal-600' },
      reactions: [
         { name: 'User X', avatar: 'https://picsum.photos/id/301/40/40' },
      ]
    }
  ]);

  topics = signal<string[]>([
    'Struggling with Week 3 Quiz, Need help',
    'Study group for Finals',
    'Error When Submitting Assignment File',
    'How Do You Stay Focused During Online Learning?',
    'Share Your Favourite Learning Resources!',
    'Looking for Partner - Web Development Project (Week 6)'
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
    this.router.navigate(['/courses']);
  }

  navigateToTopics(): void {
    this.router.navigate(['/topics']);
  }

  navigateToChats(): void {
    this.router.navigate(['/chats']);
  }

  navigateToForum(): void {
    // Already on forum page
  }
}