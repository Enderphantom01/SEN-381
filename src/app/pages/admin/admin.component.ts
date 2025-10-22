import { Component, OnInit } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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
    { label: 'Forum Posts', section: 'forum' },
    { label: 'Subjects', section: 'subjects' },
    { label: 'Analytics', section: 'analytics' },
  ];

  activeSection = 'dashboard';
  dashboardData: any = {};
  courses: any[] = [];
  users: any[] = [];
  posts: any[] = [];
  analytics: any = {};

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDashboardAndCourses();
    this.loadUsers();
    this.loadForumPosts();
  }

  loadDashboardAndCourses() {
    this.api.getAdminDashboard().pipe(
      catchError(err => {
        console.error('Error loading dashboard', err);
        return of({});
      })
    ).subscribe(data => {
      this.dashboardData = data;
    });

    this.api.getCourses().pipe(
      catchError(err => {
        console.error('Error loading courses', err);
        return of([]);
      })
    ).subscribe(data => {
      this.courses = data;
    });
  }

  loadUsers() {
    this.api.getAdminUsers().pipe(
      catchError(err => {
        console.error('Error loading users', err);
        return of([]);
      })
    ).subscribe(data => {
      this.users = data;
    });
  }

  loadForumPosts() {
    this.api.getForumPosts().pipe(
      catchError(err => {
        console.error('Error loading forum posts', err);
        return of([]);
      })
    ).subscribe(data => {
      this.posts = data.posts || [];
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

  onLogout() {
    console.log('Logout functionality will go here');
  }

  onEditUser() {
    console.log('Edit user functionality will go here');
  }

  changeSection(section: string) {
    this.activeSection = section;
  }
}
