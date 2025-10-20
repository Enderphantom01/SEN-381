import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface SettingsState {
  notificationSound: boolean;
  doNotDisturb: boolean;
  showOnlineStatus: boolean;
  autoJoinChats: boolean;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
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
}