import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface Post {
  title: string;
  snippet: string;
  author: string;
  timestamp: string;
}

interface Course {
  code: string;
  name: string;
}

interface Student {
  name: string;
  statusColor: string;
}

@Component({
  selector: 'app-opentopic',
  templateUrl: './opentopic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenTopicComponent {
  posts = signal<Post[]>([
    {
      title: 'Training Accuracy Stuck at 85%',
      snippet: 'My CNN model won\'t improve past 85% accuracy — even after adjusting batch size and optimizer. Any suggestions?',
      author: 'Daniel Thomas',
      timestamp: '2025/10/06 20:53',
    },
    {
      title: 'Linear Regression Assignment Confusion',
      snippet: 'In LPR281, do we need to manually calculate MSE for all folds in cross-validation or just use sklearn\'s built-in methods?',
      author: 'Liam Morgan',
      timestamp: '2025/10/06 20:52',
    },
    {
      title: 'Understanding Gradient Descent Intuition',
      snippet: 'Can someone explain why the learning rate affects convergence speed and accuracy so much? I get the math, but not the intuition.',
      author: 'Dave Davlyson',
      timestamp: '2025/10/06 20:49',
    },
  ]);

  courses = signal<Course[]>([
    { code: 'STA181', name: 'Statistics 181' },
    { code: 'STA281', name: 'Statistics 281' },
    { code: 'DBD181', name: 'Database Development 181' },
    { code: 'DBD281', name: 'Database Development 281' },
    { code: 'DBD381', name: 'Database Development 381' },
    { code: 'MAT181', name: 'Mathematics 181' },
    { code: 'MAT281', name: 'Mathematics 281' },
    { code: 'LPR181', name: 'Linear Programming 181' },
    { code: 'LPR281', name: 'Linear Programming 281' },
    { code: 'MLG381', name: 'Machine Learning 381' },
    { code: 'MLG382', name: 'Machine Learning 382' },
  ]);

  students = signal<Student[]>([
    { name: 'Daniel Thomas', statusColor: 'ring-red-500' },
    { name: 'Dave Davlyson', statusColor: 'ring-yellow-400' },
    { name: 'Liam Morgan', statusColor: 'ring-green-500' },
  ]);
}
