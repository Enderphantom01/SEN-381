import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface SettingsState {
  notificationSound: boolean;
  doNotDisturb: boolean;
  showOnlineStatus: boolean;
  autoJoinChats: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private router = inject(Router);

  settings = signal<SettingsState>({
    notificationSound: true,
    doNotDisturb: false,
    showOnlineStatus: true,
    autoJoinChats: false,
  });

  toggleSetting(key: keyof SettingsState): void {
    this.settings.update(currentSettings => ({
      ...currentSettings,
      [key]: !currentSettings[key],
    }));
  }
  navigateToHome(): void {
  this.router.navigate(['/home']);
  }
}