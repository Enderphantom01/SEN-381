import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface Course {
  name: string;
  code: string;
}

@Component({
  selector: 'app-topicpost',
  templateUrl: './topicpost.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicPostComponent {
  courses = signal<Course[]>([
    { name: 'Database Development 181', code: 'DBD181' },
    { name: 'Information Systems 181', code: 'INF181' },
    { name: 'Innovation and Leadership 101', code: 'INL101' },
    { name: 'Innovation and Leadership 102', code: 'INL102' },
    { name: 'Linear Programming 181', code: 'LPR181' },
    { name: 'Mathematics 181', code: 'MAT181' },
    { name: 'Network Development 181', code: 'NWD181' },
    { name: 'Statistics 181', code: 'STA181' },
    { name: 'Machine Learning 381', code: 'MLG381' },
    { name: 'Artificial Intelligence 382', code: 'AI382' },
  ]);
}
