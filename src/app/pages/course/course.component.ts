// src/app/pages/course/course.component.ts
import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, Course, Module, CourseContent, User } from '../../services/api.service';

interface Lesson {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'upload';
  files?: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: string;
    uploadedBy: string;
  }[];
}

interface CourseSection {
  id: string;
  title: string;
  lessons: Lesson[];
  isEditing?: boolean;
}

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-course',
  templateUrl: './course.component.html',
  imports: [CommonModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // User info
  currentUser = signal<User | null>(null);
  courseId = signal<string | null>(null);
  course = signal<Course | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  sections = signal<CourseSection[]>([]);
  activeSectionId = signal<string | null>(null);
  activeLesson = signal<Lesson | null>(null);
  editingContent = signal<string>('');
  newSectionTitle = signal<string>('New Section');

  ngOnInit() {
    // Get current user info from API service
    const user = this.apiService.getCurrentUserValue();
    this.currentUser.set(user);

    // Get course ID from route and load course data
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.courseId.set(id);
        this.loadCourseData(id);
      }
    });
  }

  loadCourseData(courseId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getCourse(courseId).subscribe({
      next: (course: Course) => {
        this.course.set(course);
        this.mapCourseToSections(course);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading course:', error);
        this.error.set('Failed to load course data');
        this.loading.set(false);
        this.setMockData();
      }
    });
  }

  private mapCourseToSections(course: Course): void {
    if (!course.modules) {
      this.sections.set([]);
      return;
    }

    const sections: CourseSection[] = course.modules.map((module: Module) => ({
      id: module._id!,
      title: module.title,
      lessons: module.contentItems?.map((content: CourseContent) => ({
        id: content._id!,
        title: content.title,
        content: content.content,
        type: content.contentType,
        files: content.files || []
      })) || []
    }));

    this.sections.set(sections);

    // Set first section and lesson as active
    if (sections.length > 0) {
      this.activeSectionId.set(sections[0].id);
      if (sections[0].lessons.length > 0) {
        this.activeLesson.set(sections[0].lessons[0]);
        this.editingContent.set(sections[0].lessons[0].content);
      }
    }
  }

  private setMockData(): void {
    const mockSections: CourseSection[] = [
      {
        id: '1',
        title: 'Week 1',
        lessons: [
          { id: 'w1-l1', title: 'Introduction to Course', content: 'Welcome to the course! This week, we will cover the foundational concepts and objectives.\n\n- Course structure\n- Grading policy\n- Introduction to key tools', type: 'text' },
          { id: 'w1-l2', title: 'Setting Up Environment', content: 'This lesson guides you through setting up your development environment.\n\n1. Install Node.js\n2. Install VS Code\n3. Set up the project repository', type: 'text' },
        ]
      }
    ];
    
    this.sections.set(mockSections);
    this.activeSectionId.set('1');
    this.activeLesson.set(mockSections[0].lessons[0]);
    this.editingContent.set(mockSections[0].lessons[0].content);
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
      error: (error: any) => {
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
    this.router.navigate(['/forum']);
  }

  toggleSection(sectionId: string): void {
    this.activeSectionId.update(id => (id === sectionId ? null : sectionId));
  }

  selectLesson(lesson: Lesson): void {
    this.activeLesson.set(lesson);
    this.editingContent.set(lesson.content);
  }

  /**
   * Add a new section
   */
  addNewSection(): void {
    const courseId = this.courseId();
    if (!courseId) return;

    const newSectionData = {
      title: this.newSectionTitle(),
      order: this.sections().length
    };

    this.apiService.createModule(courseId, newSectionData).subscribe({
      next: (module: Module) => {
        const newSection: CourseSection = {
          id: module._id!,
          title: module.title,
          lessons: [],
          isEditing: true
        };
        
        this.sections.update(sections => [...sections, newSection]);
        this.activeSectionId.set(newSection.id);
        this.newSectionTitle.set('New Section');
      },
      error: (error: any) => {
        console.error('Error creating section:', error);
        // Fallback: add locally
        this.addSectionLocally();
      }
    });
  }

  private addSectionLocally(): void {
    const newSection: CourseSection = {
      id: `local-${Date.now()}`,
      title: this.newSectionTitle(),
      lessons: [],
      isEditing: true
    };
    
    this.sections.update(sections => [...sections, newSection]);
    this.activeSectionId.set(newSection.id);
    this.newSectionTitle.set('New Section');
  }

  /**
   * Update section title
   */
  updateSectionTitle(section: CourseSection, newTitle: string): void {
    this.apiService.updateModule(section.id, { title: newTitle }).subscribe({
      next: (updatedModule: Module) => {
        section.title = updatedModule.title;
        section.isEditing = false;
        this.sections.update(sections => [...sections]);
      },
      error: (error: any) => {
        console.error('Error updating section:', error);
        // Fallback: update locally
        section.title = newTitle;
        section.isEditing = false;
        this.sections.update(sections => [...sections]);
      }
    });
  }

  /**
   * Toggle section title editing
   */
  toggleSectionEditing(section: CourseSection): void {
    section.isEditing = !section.isEditing;
    this.sections.update(sections => [...sections]);
  }

  /**
   * Add content lesson to a section
   */
  addContentLesson(section: CourseSection): void {
    const courseId = this.courseId();
    if (!courseId) return;

    const newContentData = {
      title: 'New Content Lesson',
      content: 'Start typing your content here...',
      contentType: 'text' as const,
      createdBy: this.currentUser()?.userId || 'demo-user'
    };

    this.apiService.createContent(section.id, newContentData).subscribe({
      next: (content: CourseContent) => {
        const newLesson: Lesson = {
          id: content._id!,
          title: content.title,
          content: content.content,
          type: content.contentType
        };
        
        section.lessons.push(newLesson);
        this.sections.update(sections => [...sections]);
        this.selectLesson(newLesson);
      },
      error: (error: any) => {
        console.error('Error creating content:', error);
        // Fallback: add locally
        this.addContentLessonLocally(section);
      }
    });
  }

  private addContentLessonLocally(section: CourseSection): void {
    const newLesson: Lesson = {
      id: `content-${Date.now()}`,
      title: 'New Content Lesson',
      content: 'Start typing your content here...',
      type: 'text'
    };
    
    section.lessons.push(newLesson);
    this.sections.update(sections => [...sections]);
    this.selectLesson(newLesson);
  }

  /**
   * Add upload lesson to a section
   */
  addUploadLesson(section: CourseSection): void {
    const courseId = this.courseId();
    if (!courseId) return;

    const newContentData = {
      title: 'New Upload Lesson',
      content: 'Add description for your uploads...',
      contentType: 'upload' as const,
      createdBy: this.currentUser()?.userId || 'demo-user',
      files: []
    };

    this.apiService.createContent(section.id, newContentData).subscribe({
      next: (content: CourseContent) => {
        const newLesson: Lesson = {
          id: content._id!,
          title: content.title,
          content: content.content,
          type: content.contentType,
          files: content.files || []
        };
        
        section.lessons.push(newLesson);
        this.sections.update(sections => [...sections]);
        this.selectLesson(newLesson);
      },
      error: (error: any) => {
        console.error('Error creating upload lesson:', error);
        // Fallback: add locally
        this.addUploadLessonLocally(section);
      }
    });
  }

  private addUploadLessonLocally(section: CourseSection): void {
    const newLesson: Lesson = {
      id: `upload-${Date.now()}`,
      title: 'New Upload Lesson',
      content: 'Add description for your uploads...',
      type: 'upload',
      files: []
    };
    
    section.lessons.push(newLesson);
    this.sections.update(sections => [...sections]);
    this.selectLesson(newLesson);
  }

  /**
   * Update lesson content
   */
  updateLessonContent(): void {
    const activeLesson = this.activeLesson();
    if (!activeLesson) return;

    this.apiService.updateContent(activeLesson.id, { content: this.editingContent() }).subscribe({
      next: (updatedContent: CourseContent) => {
        activeLesson.content = updatedContent.content;
        this.sections.update(sections => [...sections]);
      },
      error: (error: any) => {
        console.error('Error updating content:', error);
        // Fallback: update locally
        activeLesson.content = this.editingContent();
        this.sections.update(sections => [...sections]);
      }
    });
  }

  /**
   * Handle file upload
   */
  handleFileUpload(event: any): void {
    const activeLesson = this.activeLesson();
    if (!activeLesson || activeLesson.type !== 'upload') return;

    const files = event.target.files;
    if (!files || files.length === 0) return;

    const user = this.currentUser();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      this.apiService.uploadFile(activeLesson.id, file, user?.userId || 'demo-user').subscribe({
        next: (response: any) => {
          if (response.file && activeLesson.files) {
            activeLesson.files.push(response.file);
            this.sections.update(sections => [...sections]);
          }
        },
        error: (error: any) => {
          console.error('Error uploading file:', error);
          // Fallback: add file locally
          this.addFileLocally(activeLesson, file);
        }
      });
    }
  }

  private addFileLocally(lesson: Lesson, file: File): void {
    if (!lesson.files) {
      lesson.files = [];
    }
    
    lesson.files.push({
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: this.currentUser()?.userId || 'demo-user'
    });
    
    this.sections.update(sections => [...sections]);
  }

  /**
   * Remove file from upload lesson
   */
  removeFile(lesson: Lesson, fileIndex: number): void {
    if (!lesson.files || fileIndex < 0 || fileIndex >= lesson.files.length) return;

    this.apiService.removeFileFromContent(lesson.id, fileIndex).subscribe({
      next: () => {
        lesson.files!.splice(fileIndex, 1);
        this.sections.update(sections => [...sections]);
      },
      error: (error: any) => {
        console.error('Error removing file:', error);
        // Fallback: remove locally
        lesson.files!.splice(fileIndex, 1);
        this.sections.update(sections => [...sections]);
      }
    });
  }

  /**
   * Get file URL for display
   */
  getFileUrl(fileUrl: string): string {
    return this.apiService.getFileUrl(fileUrl);
  }
}