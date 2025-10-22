// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  { 
    path: 'register', 
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  { 
    path: 'home', 
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'chats', 
    loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'api-test', 
    loadComponent: () => import('./pages/api-test/api-test.component').then(m => m.ApiTestComponent)
  },
  { 
    path: 'courses', 
    loadComponent: () => import('./pages/courses/courses.component').then(m => m.CoursesComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'course/:id', 
    loadComponent: () => import('./pages/course/course.component').then(m => m.CourseComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'topics', 
    loadComponent: () => import('./pages/topics/topics.component').then(m => m.TopicsComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'forum', 
    loadComponent: () => import('./pages/forum/forum.component').then(m => m.ForumComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'profile', 
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'settings', 
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'notifications', 
    loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/login' } // Fallback route
];