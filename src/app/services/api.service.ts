// src/app/services/api.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common'; // Add this import
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
  phoneNumber?: string;
  status: string;
  lastLogin?: string;
  studentNumber?: string;
  tutorId?: string;
  subjects?: string[];
  isApproved?: boolean;
  rating?: number;
}

export interface LoginResponse {
  message: string;
  user: User;
  sessionId: string;
}

export interface ApiResponse {
  message?: string;
  error?: string;
  [key: string]: any;
}

export interface Course {
  _id?: string;
  name: string;
  image: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  modules?: Module[];
}

export interface Module {
  _id?: string;
  courseId: string;
  name: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  contentItems?: ContentItem[];
}

export interface ContentItem {
  _id?: string;
  moduleId: string;
  courseId: string;
  title: string;
  description?: string;
  fileType: 'powerpoint' | 'markdown' | 'pdf' | 'word' | 'excel' | 'image' | 'video' | 'audio' | 'text' | 'other';
  fileUrl: string;
  fileName: string;
  fileSize: number;
  order?: number;
  isActive?: boolean;
  uploadedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';
  private sessionId: string | null = null;
  private currentUser = new BehaviorSubject<User | null>(null);
  private isBrowser: boolean;

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.loadSession();
  }

  private loadSession() {
    // Only try to access localStorage if we're in the browser
    if (this.isBrowser) {
      const savedSession = localStorage.getItem('sessionId');
      const savedUser = localStorage.getItem('currentUser');
      
      if (savedSession) {
        this.sessionId = savedSession;
      }
      if (savedUser) {
        try {
          this.currentUser.next(JSON.parse(savedUser));
        } catch (e) {
          console.warn('Failed to parse saved user data');
        }
      }
    }
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (this.sessionId) {
      headers = headers.set('Authorization', `Bearer ${this.sessionId}`);
    }

    return headers;
  }

  private getHeadersForUpload(): HttpHeaders {
    let headers = new HttpHeaders();
    // Don't set Content-Type for multipart/form-data - let browser set it with boundary

    if (this.sessionId) {
      headers = headers.set('Authorization', `Bearer ${this.sessionId}`);
    }

    return headers;
  }

  // Auth Methods
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          this.sessionId = response.sessionId;
          this.currentUser.next(response.user);
          // Only save to localStorage if we're in the browser
          if (this.isBrowser) {
            localStorage.setItem('sessionId', response.sessionId);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
          }
        })
      );
  }

  register(userData: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/register`, userData)
      .pipe(
        tap(response => {
          this.sessionId = response.sessionId;
          this.currentUser.next(response.user);
          if (this.isBrowser) {
            localStorage.setItem('sessionId', response.sessionId);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
          }
        })
      );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}, { headers: this.getHeaders() })
      .pipe(
        tap(() => {
          this.clearSession();
        })
      );
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/me`, { headers: this.getHeaders() });
  }

  // User Methods
  getUserProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/users/profile`, { headers: this.getHeaders() });
  }

  updateUserProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/users/profile`, profileData, { headers: this.getHeaders() });
  }

  // COURSE MANAGEMENT METHODS

  // Course Methods
  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.baseUrl}/courses`, { headers: this.getHeaders() });
  }

  getCourse(id: string): Observable<Course> {
    return this.http.get<Course>(`${this.baseUrl}/courses/${id}`, { headers: this.getHeaders() });
  }

  createCourse(courseData: Partial<Course>): Observable<Course> {
    return this.http.post<Course>(`${this.baseUrl}/courses`, courseData, { headers: this.getHeaders() });
  }

  updateCourse(id: string, courseData: Partial<Course>): Observable<Course> {
    return this.http.put<Course>(`${this.baseUrl}/courses/${id}`, courseData, { headers: this.getHeaders() });
  }

  // Module Methods
  getModules(courseId: string): Observable<Module[]> {
    return this.http.get<Module[]>(`${this.baseUrl}/modules/course/${courseId}`, { headers: this.getHeaders() });
  }

  createModule(moduleData: Partial<Module>): Observable<Module> {
    return this.http.post<Module>(`${this.baseUrl}/modules`, moduleData, { headers: this.getHeaders() });
  }

  updateModule(id: string, moduleData: Partial<Module>): Observable<Module> {
    return this.http.put<Module>(`${this.baseUrl}/modules/${id}`, moduleData, { headers: this.getHeaders() });
  }

  // Content Methods
  getContentItems(moduleId: string): Observable<ContentItem[]> {
    return this.http.get<ContentItem[]>(`${this.baseUrl}/content/module/${moduleId}`, { headers: this.getHeaders() });
  }

  getContentItem(id: string): Observable<ContentItem> {
    return this.http.get<ContentItem>(`${this.baseUrl}/content/${id}`, { headers: this.getHeaders() });
  }

  uploadContent(file: File, uploadData: {
    moduleId: string;
    courseId: string;
    title?: string;
    description?: string;
    uploadedBy?: string;
  }): Observable<ContentItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('moduleId', uploadData.moduleId);
    formData.append('courseId', uploadData.courseId);
    
    if (uploadData.title) {
      formData.append('title', uploadData.title);
    }
    if (uploadData.description) {
      formData.append('description', uploadData.description);
    }
    if (uploadData.uploadedBy) {
      formData.append('uploadedBy', uploadData.uploadedBy);
    }

    return this.http.post<ContentItem>(`${this.baseUrl}/content/upload`, formData, {
      headers: this.getHeadersForUpload()
    });
  }

  updateContentItem(id: string, contentData: Partial<ContentItem>): Observable<ContentItem> {
    return this.http.put<ContentItem>(`${this.baseUrl}/content/${id}`, contentData, { headers: this.getHeaders() });
  }

  deleteContentItem(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/content/${id}`, { headers: this.getHeaders() });
  }

  // Topics Methods
  getTopics(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.baseUrl}/topics`, { headers: this.getHeaders(), params: httpParams });
  }

  createTopic(topicData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/topics`, topicData, { headers: this.getHeaders() });
  }

  subscribeToTopic(topicId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/topics/${topicId}/subscribe`, {}, { headers: this.getHeaders() });
  }

  unsubscribeFromTopic(topicId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/topics/${topicId}/subscribe`, { headers: this.getHeaders() });
  }

  // Forum Methods
  getForumPosts(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.baseUrl}/forum/posts`, { headers: this.getHeaders(), params: httpParams });
  }

  getForumPost(postId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/forum/posts/${postId}`, { headers: this.getHeaders() });
  }

  createForumPost(postData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/forum/posts`, postData, { headers: this.getHeaders() });
  }

  likePost(postId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forum/posts/${postId}/like`, {}, { headers: this.getHeaders() });
  }

  createComment(postId: string, commentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/forum/posts/${postId}/comments`, commentData, { headers: this.getHeaders() });
  }

  getForumTrending(): Observable<any> {
    return this.http.get(`${this.baseUrl}/forum/trending`, { headers: this.getHeaders() });
  }

  // Message Methods
  getConversations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/messages/conversations`, { headers: this.getHeaders() });
  }

  getConversationMessages(conversationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/messages/conversations/${conversationId}`, { headers: this.getHeaders() });
  }

  startConversation(conversationData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/messages/conversations`, conversationData, { headers: this.getHeaders() });
  }

  sendMessage(messageData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/messages/send`, messageData, { headers: this.getHeaders() });
  }

  // Notification Methods
  getNotifications(): Observable<any> {
    return this.http.get(`${this.baseUrl}/notifications`, { headers: this.getHeaders() });
  }

  markNotificationAsRead(notificationId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/notifications/${notificationId}/read`, {}, { headers: this.getHeaders() });
  }

  markAllNotificationsAsRead(): Observable<any> {
    return this.http.put(`${this.baseUrl}/notifications/read-all`, {}, { headers: this.getHeaders() });
  }

  // Admin Methods
  getAdminDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/dashboard`, { headers: this.getHeaders() });
  }

  getAdminUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/users`, { headers: this.getHeaders() });
  }

  updateUserStatus(userId: string, statusData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/users/${userId}/status`, statusData, { headers: this.getHeaders() });
  }

  approveTutor(tutorId: string, approvalData?: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/tutors/${tutorId}/approve`, approvalData, { headers: this.getHeaders() });
  }

  // Session management
  private clearSession() {
    this.sessionId = null;
    this.currentUser.next(null);
    if (this.isBrowser) {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('currentUser');
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getCurrentUserValue(): User | null {
    return this.currentUser.value;
  }

  isLoggedIn(): boolean {
    return !!this.sessionId;
  }

  // Test connection method
  testConnection(): Observable<any> {
    return this.http.get('http://localhost:3000/health');
  }

  // File URL helper method
  getFileUrl(filePath: string): string {
    if (filePath.startsWith('http')) {
      return filePath;
    }
    return `http://localhost:3000${filePath}`;
  }
}