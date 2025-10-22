// admin.component.ts - Fixed with proper typing
import { Component, OnInit } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  studentNumber?: string;
  tutorId?: string;
  adminId?: string;
  isApproved?: boolean;
  rating?: number;
  subjects?: string[];
}

interface Tutor {
  userId: string;
  name: string;
  email: string;
  tutorId: string;
  subjects: string[];
  isApproved: boolean;
  rating: number;
  status: string;
}

interface Course {
  _id: string;
  name: string;
  code: string;
  status: string;
  description?: string;
}

interface ForumPost {
  _id: string;
  author?: { name: string };
  content: string;
  text?: string;
}

interface AnalyticsData {
  period?: string;
  userGrowth?: {
    newUsers: any[];
    totalUsers: number;
    activeUsers: number;
  };
  activityMetrics?: {
    forumPosts: number;
    helpRequests: number;
    conversations: number;
    totalActivity: number;
  };
  userDistribution?: {
    byRole: Array<{ _id: string; count: number }>;
    byStatus: Array<{ _id: string; count: number }>;
  };
}

interface ContentAnalytics {
  overview?: {
    totalTopics: number;
    activeTopics: number;
    totalPosts: number;
    reportedPosts: number;
    totalHelpRequests: number;
  };
  helpRequestStats?: any;
  popularTopics?: Array<{
    topicId: string;
    title: string;
    postCount: number;
    subscriberCount: number;
  }>;
  forumActivity?: {
    totalPosts: number;
    reportedPosts: number;
    resolutionRate: string;
  };
}

interface SystemHealth {
  server?: {
    version: string;
    environment: string;
    nodeVersion: string;
    uptime: string;
    memoryUsage: string;
  };
  database?: {
    status: string;
    size: string;
    collections: number;
    operations: string;
  };
  performance?: {
    averageResponseTime: string;
    activeConnections: number;
    errorRate: string;
    requestsPerMinute: number;
  };
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, SlicePipe],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  sidebarLinks = [
    { label: 'Dashboard', section: 'dashboard' },
    { label: 'Users', section: 'users' },
    { label: 'Tutors', section: 'tutors' },
    { label: 'Forum Posts', section: 'forum' },
    { label: 'Subjects', section: 'subjects' },
    { label: 'Analytics', section: 'analytics' },
    { label: 'System', section: 'system' },
  ];

  activeSection = 'dashboard';
  dashboardData: any = {};
  courses: Course[] = [];
  users: User[] = [];
  tutors: Tutor[] = [];
  posts: ForumPost[] = [];
  analytics: AnalyticsData = {};
  systemHealth: SystemHealth = {};
  contentAnalytics: ContentAnalytics = {};

  // Mock data for demonstration
  mockSystemInfo: SystemHealth = {
    server: {
      version: '1.0.0',
      environment: 'production',
      nodeVersion: '18.17.0',
      uptime: '15 days, 6 hours',
      memoryUsage: '45%'
    },
    database: {
      status: 'Connected',
      size: '2.3 GB',
      collections: 12,
      operations: 'Normal'
    },
    performance: {
      averageResponseTime: '245ms',
      activeConnections: 42,
      errorRate: '0.2%',
      requestsPerMinute: 125
    }
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDashboardAndCourses();
    this.loadUsers();
    this.loadTutors();
    this.loadForumPosts();
    this.loadAnalytics();
    this.loadSystemHealth();
    this.loadContentAnalytics();
  }

  loadDashboardAndCourses() {
    this.api.getAdminDashboard().pipe(
      catchError(err => {
        console.error('Error loading dashboard', err);
        // Mock data for demo
        return of({
          dashboard: {
            overview: {
              totalUsers: 1542,
              totalTutors: 87,
              activeCourses: 24,
              feedbackCount: 3421,
              pendingTutorApprovals: 12,
              activeHelpRequests: 45
            },
            userEngagement: {
              dailyActiveUsers: 312,
              weeklyActiveUsers: 892,
              monthlyActiveUsers: 1542,
              userGrowth: 15.5,
              retentionRate: 78.3
            },
            tutorPerformance: {
              totalTutors: 87,
              activeTutors: 74,
              averageRating: 4.6,
              responseTime: '2.3 hours',
              resolutionRate: 89.2
            },
            recentActivity: {
              helpRequests: [
                { title: 'SQL Query Optimization', status: 'assigned' },
                { title: 'JavaScript Promises', status: 'open' },
                { title: 'Database Design', status: 'in-progress' }
              ],
              forumPosts: [
                { title: 'Best practices for React hooks', authorName: 'John Doe' },
                { title: 'Understanding MongoDB aggregation', authorName: 'Jane Smith' }
              ]
            },
            systemHealth: {
              uptime: '99.8%',
              responseTime: '245ms',
              errorRate: '0.2%',
              databaseSize: '2.3 GB',
              lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });
      })
    ).subscribe((data: any) => {
      this.dashboardData = data.dashboard || data;
    });

    this.api.getCourses().pipe(
      catchError(err => {
        console.error('Error loading courses', err);
        // Mock courses data
        return of([
          { _id: '1', name: 'Software Engineering', code: 'SEN381', status: 'Active' },
          { _id: '2', name: 'Database Development', code: 'DBD381', status: 'Active' },
          { _id: '3', name: 'Artificial Intelligence', code: 'AI381', status: 'Active' },
          { _id: '4', name: 'Mathematics', code: 'MAT381', status: 'Active' }
        ]);
      })
    ).subscribe((data: any) => {
      this.courses = data;
    });
  }

  loadUsers() {
    this.api.getAdminUsers().pipe(
      catchError(err => {
        console.error('Error loading users', err);
        // Mock users data
        return of({
          users: [
            { userId: 'S001', name: 'John Student', email: 'john@belgiumcampus.ac.za', role: 'Student', status: 'active', studentNumber: 'S001' },
            { userId: 'S002', name: 'Jane Student', email: 'jane@belgiumcampus.ac.za', role: 'Student', status: 'active', studentNumber: 'S002' },
            { userId: 'T001', name: 'Dr. Smith', email: 'smith@belgiumcampus.ac.za', role: 'Tutor', status: 'active', tutorId: 'T001', isApproved: true },
            { userId: 'A001', name: 'Admin User', email: 'admin@belgiumcampus.ac.za', role: 'Admin', status: 'active', adminId: 'A001' }
          ]
        });
      })
    ).subscribe((data: any) => {
      this.users = data.users || data;
    });
  }

  loadTutors() {
    this.api.getAdminTutors().pipe(
      catchError(err => {
        console.error('Error loading tutors', err);
        // Mock tutors data
        return of({
          tutors: [
            { userId: 'T001', name: 'Dr. Smith', email: 'smith@belgiumcampus.ac.za', tutorId: 'T001', subjects: ['Database Development', 'Software Engineering'], isApproved: true, rating: 4.8 },
            { userId: 'T002', name: 'Prof. Johnson', email: 'johnson@belgiumcampus.ac.za', tutorId: 'T002', subjects: ['Mathematics', 'AI'], isApproved: true, rating: 4.6 },
            { userId: 'T003', name: 'Ms. Wilson', email: 'wilson@belgiumcampus.ac.za', tutorId: 'T003', subjects: ['Web Development'], isApproved: false, rating: 0 }
          ]
        });
      })
    ).subscribe((data: any) => {
      this.tutors = data.tutors || data;
    });
  }

  loadForumPosts() {
    this.api.getForumPosts().pipe(
      catchError(err => {
        console.error('Error loading forum posts', err);
        // Mock forum posts data
        return of({
          posts: [
            { _id: '1', author: { name: 'John Student' }, content: 'Having trouble with SQL joins...', text: 'Having trouble with SQL joins...' },
            { _id: '2', author: { name: 'Jane Student' }, content: 'Best resources for learning React?', text: 'Best resources for learning React?' },
            { _id: '3', author: { name: 'Dr. Smith' }, content: 'Office hours changed this week...', text: 'Office hours changed this week...' }
          ]
        });
      })
    ).subscribe((data: any) => {
      this.posts = data.posts || data;
    });
  }

  loadAnalytics() {
    this.api.getAdminAnalytics().pipe(
      catchError(err => {
        console.error('Error loading analytics', err);
        // Mock analytics data
        return of({
          analytics: {
            period: '30d',
            userGrowth: {
              newUsers: [{ _id: { year: 2024, month: 1, day: 1 }, count: 15 }],
              totalUsers: 1542,
              activeUsers: 892
            },
            activityMetrics: {
              forumPosts: 3421,
              helpRequests: 567,
              conversations: 1234,
              totalActivity: 5222
            },
            userDistribution: {
              byRole: [
                { _id: 'Student', count: 1420 },
                { _id: 'Tutor', count: 87 },
                { _id: 'Admin', count: 35 }
              ],
              byStatus: [
                { _id: 'active', count: 1489 },
                { _id: 'inactive', count: 53 }
              ]
            }
          }
        });
      })
    ).subscribe((data: any) => {
      this.analytics = data.analytics || data;
    });
  }

  loadSystemHealth() {
    this.api.getAdminSystemHealth().pipe(
      catchError(err => {
        console.error('Error loading system health', err);
        return of({ systemHealth: this.mockSystemInfo });
      })
    ).subscribe((data: any) => {
      this.systemHealth = data.systemHealth || data;
    });
  }

  loadContentAnalytics() {
    this.api.getAdminContentAnalytics().pipe(
      catchError(err => {
        console.error('Error loading content analytics', err);
        // Mock content analytics
        return of({
          analytics: {
            overview: {
              totalTopics: 24,
              activeTopics: 22,
              totalPosts: 3421,
              reportedPosts: 12,
              totalHelpRequests: 567
            },
            helpRequestStats: {
              open: 45,
              assigned: 67,
              'in-progress': 23,
              resolved: 432
            },
            popularTopics: [
              { topicId: 'TPC001', title: 'Database Development', postCount: 567, subscriberCount: 234 },
              { topicId: 'TPC002', title: 'Web Development', postCount: 432, subscriberCount: 198 },
              { topicId: 'TPC003', title: 'AI and Machine Learning', postCount: 389, subscriberCount: 167 }
            ],
            forumActivity: {
              totalPosts: 3421,
              reportedPosts: 12,
              resolutionRate: '99.6%'
            }
          }
        });
      })
    ).subscribe((data: any) => {
      this.contentAnalytics = data.analytics || data;
    });
  }

  deletePost(postId: string) {
    if (confirm('Are you sure you want to delete this post?')) {
      this.api.deleteContentItem(postId).subscribe({
        next: () => {
          this.posts = this.posts.filter(p => p._id !== postId);
          alert('Post deleted successfully');
        },
        error: (err) => console.error('Error deleting post:', err)
      });
    }
  }

  updateUserStatus(userId: string, newStatus: string) {
    this.api.updateUserStatus(userId, { status: newStatus }).subscribe({
      next: () => {
        const user = this.users.find(u => u.userId === userId);
        if (user) user.status = newStatus;
      },
      error: (err) => console.error('Error updating user status:', err)
    });
  }

  approveTutor(tutorId: string) {
    this.api.approveTutor(tutorId).subscribe({
      next: () => {
        const tutor = this.tutors.find(t => t.tutorId === tutorId);
        if (tutor) tutor.isApproved = true;
        alert('Tutor approved successfully');
      },
      error: (err) => console.error('Error approving tutor:', err)
    });
  }

  onLogout() {
    console.log('Logout functionality will go here');
  }

  onEditUser() {
    console.log('Edit user functionality will go here');
  }

  changeSection(section: string) {
    this.activeSection = section;
    
    // Load section-specific data when switching sections
    switch (section) {
      case 'tutors':
        this.loadTutors();
        break;
      case 'system':
        this.loadSystemHealth();
        break;
      case 'analytics':
        this.loadAnalytics();
        this.loadContentAnalytics();
        break;
    }
  }

  // Helper method to get user role distribution
  getUserRoleDistribution() {
    if (this.analytics.userDistribution?.byRole) {
      return this.analytics.userDistribution.byRole;
    }
    return [];
  }

  // Helper method to get user status distribution
  getUserStatusDistribution() {
    if (this.analytics.userDistribution?.byStatus) {
      return this.analytics.userDistribution.byStatus;
    }
    return [];
  }
}