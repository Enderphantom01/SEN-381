import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent {
  private router = inject(Router);

  notifications = signal<Notification[]>([
    { id: 1, title: 'Campus Announcement', message: 'System Maintenace 19:00', read: false },
    { id: 2, title: 'Jane Jennifer', message: 'Let me know if our study session is still on for tomorrow 15h00.', read: true },
    { id: 3, title: 'Resource uploaded', message: 'Project Task 2 rubric added to WPR281', read: true },
    { id: 4, title: 'New Study Groups', message: 'Multiple new study groups have been added. View them ....', read: false }
  ]);

  toggleReadStatus(id: number): void {
    this.notifications.update(notifications =>
      notifications.map(n =>
        n.id === id ? { ...n, read: !n.read } : n
      )
    );
  }

  navigateToHome(): void {
  this.router.navigate(['/home']);
  }
}