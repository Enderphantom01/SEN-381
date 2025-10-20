// src/app/pages/course/course.component.ts
import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';

interface Lesson {
  id: string;
  title: string;
  content: string; // Markdown content
}

interface CourseSection {
  id: number;
  title: string;
  lessons: Lesson[];
}

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // User info
  currentUser = signal<any>(null);

  sections = signal<CourseSection[]>([
    {
      id: 1,
      title: 'Week 1',
      lessons: [
        { id: 'w1-l1', title: 'Introduction to Course', content: 'Welcome to the course! This week, we will cover the foundational concepts and objectives.\n\n- Course structure\n- Grading policy\n- Introduction to key tools' },
        { id: 'w1-l2', title: 'Setting Up Environment', content: 'This lesson guides you through setting up your development environment.\n\n1. Install Node.js\n2. Install VS Code\n3. Set up the project repository' },
        { id: 'w1-l3', title: 'Basic Concepts Part 1', content: 'Exploring the first set of basic concepts.\n\n- Variables and Data Types\n- Operators\n- Control Structures' },
        { id: 'w1-l4', title: 'Basic Concepts Part 2', content: 'Continuing with more fundamental concepts.\n\n- Functions\n- Scope\n- Introduction to Objects' },
        { id: 'w1-l5', title: 'Week 1 Assignment', content: 'Your first assignment is to complete the setup and a small coding exercise.\n\nDetails are available in the assignments tab.' },
      ]
    },
    {
      id: 2,
      title: 'Week 2',
      lessons: [
        { id: 'w2-l1', title: 'Advanced Topic A', content: 'Diving deeper into Topic A.\n\n- In-depth analysis\n- Practical examples\n- Common pitfalls' },
        { id: 'w2-l2', title: 'Advanced Topic B', content: 'Exploring the intricacies of Topic B.\n\n- Core principles\n- Advanced techniques\n- Case studies' },
        { id: 'w2-l3', title: 'Workshop Session', content: 'A hands-on workshop to apply what you have learned this week.\n\nPlease come prepared with your environment ready.' },
        { id: 'w2-l4', title: 'Guest Lecture', content: 'A special guest lecture from an industry expert.\n\nTopic: Real-world applications.' },
        { id: 'w2-l5', title: 'Week 2 Quiz', content: 'A short quiz to test your understanding of this week\'s topics.' },
      ]
    },
    {
      id: 3,
      title: 'Week 3',
      lessons: [
        { id: 'w3-l1', title: 'Project Introduction', content: 'Introduction to the final project for this course.\n\n- Project goals and scope\n- Milestone deadlines\n- Team formation' },
        { id: 'w3-l2', title: 'Project Planning', content: 'Learn how to plan your project for success.\n\n- Requirement gathering\n- Task breakdown\n- Version control strategy' },
        { id: 'w3-l3', title: 'Architecture Design', content: 'Designing a robust architecture for your project.\n\n- Design patterns\n- Scalability considerations\n- Technology stack selection' },
        { id: 'w3-l4', title: 'Project Work Session', content: 'Dedicated time to work on your project with instructor support.' },
        { id: "w3-l5", title: "Q&A and Review", content: "An open session for questions and a review of the week's progress." },
      ]
    }
  ]);

  activeSectionId = signal<number | null>(1);
  activeLesson = signal<Lesson | null>(this.sections()[0].lessons[0]);

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
    // Already on course page
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

  toggleSection(sectionId: number): void {
    this.activeSectionId.update(id => (id === sectionId ? null : sectionId));
  }

  selectLesson(lesson: Lesson): void {
    this.activeLesson.set(lesson);
  }
}