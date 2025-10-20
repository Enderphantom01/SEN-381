import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

interface Reply {
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  isVerified?: boolean;
  replies?: Reply[];
}

interface PostDetails {
  id: number;
  author: string;
  authorAvatar: string;
  title: string;
  content: string;
  imageUrl?: string;
  timestamp: string;
  tag: { text: string; color: string; };
  replies: Reply[];
}

@Component({
  selector: 'app-openpost',
  templateUrl: './openpost.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenPostComponent {
  close = output<void>();

  onClose(): void {
    this.close.emit();
  }

  post = signal<PostDetails>({
    id: 3,
    author: 'Stefanus J Landsberg',
    authorAvatar: 'https://i.imgur.com/I2gGZNO.png',
    title: 'Error When Submitting Assignment File',
    content: 'Every time I try to submit my assignment, I get a "file format not supported" message. I\'m using a .docx file as requested. Is there a specific template we should use?',
    imageUrl: 'https://i.imgur.com/K1v5Yv2.png',
    timestamp: '2025/10/06 10:34',
    tag: { text: 'Technical', color: 'bg-slate-600' },
    replies: [
      {
        author: 'Stefanus J Landsberg',
        avatar: 'https://i.imgur.com/I2gGZNO.png',
        content: 'I have tried other file formats and still no results.',
        timestamp: '2025/10/06 10:35'
      },
      {
        author: 'Dr. A Els',
        avatar: 'https://i.imgur.com/nI42t3E.png',
        content: 'Have you checked your connection?',
        timestamp: '2025/10/06 10:45',
        isVerified: true,
        replies: [
          {
            author: 'Stefanus J Landsberg',
            avatar: 'https://i.imgur.com/I2gGZNO.png',
            content: 'I will try that now',
            timestamp: '2025/10/06 10:48',
            replies: [
                {
                    author: 'Stefanus J Landsberg',
                    avatar: 'https://i.imgur.com/I2gGZNO.png',
                    content: 'Its working now, Thank you so ma\'am',
                    timestamp: '2025/10/06 10:52'
                }
            ]
          }
        ]
      }
    ]
  });
}
