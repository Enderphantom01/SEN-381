import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-forumpost',
  templateUrl: './forumpost.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumPostComponent {
  close = output<void>();

  onCancel(): void {
    this.close.emit();
  }
}
