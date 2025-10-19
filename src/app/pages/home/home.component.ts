import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// Interfaces for data structures
interface Course {
  name: string;
  code: string;
}

interface Assignment {
  title: string;
  course: string;
  dueDate: string;
  progress: number; // as percentage
  filesSubmitted: number;
  filesTotal: number;
}

interface Announcement {
  author: string;
  title: string;
  content: string;
}

interface ChatContact {
  name: string;
  role: string;
  avatar: 'ai' | 'user';
  borderColor: string;
}

interface UpcomingEvent {
  title: string;
  date: string;
}

interface CalendarDay {
  day: number | null;
  isToday: boolean;
  isCurrentMonth: boolean;
  hasEvent: boolean;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {

  // API call to get user's current course
  course = signal<Course>({
    name: 'Software Engineering',
    code: '381',
  });

  // API call to get user's current assignment
  assignment = signal<Assignment>({
    title: 'Project Task 2',
    course: 'SEN 381',
    dueDate: '06/10/2025',
    progress: 25,
    filesSubmitted: 1,
    filesTotal: 5,
  });

  // API call to get platform's latest announcement
  announcement = signal<Announcement>({
    author: 'James Anderson',
    title: 'Campus Announcement',
    content: `Attention students: The library will be extending its hours this week for midterm study sessions. Doors will remain open until 12:00 AM from Monday through Thursday. Free coffee and snacks will be provided in the lobby starting at 8:00 PM.\n\nPlease remember to bring your student ID for entry after 9:00 PM.`,
  });

  // API call to get user's recent contacts
  chats = signal<ChatContact[]>([
    { name: 'AI assistant', role: '', avatar: 'ai', borderColor: 'border-green-400' },
    { name: 'James Anderson', role: 'Lecturer', avatar: 'user', borderColor: 'border-red-500' },
    { name: 'Daniel Thomas', role: 'Student', avatar: 'user', borderColor: 'border-red-500' },
    { name: 'Karen Clark', role: 'Lecturer', avatar: 'user', borderColor: 'border-yellow-400' },
    { name: 'Joshua King', role: 'Lecturer', avatar: 'user', borderColor: 'border-gray-500' },
  ]);

  // API call to get most recent upcoming activity
  upcomingEvent = signal<UpcomingEvent>({
    title: 'Meeting: Project Task 2',
    date: 'Friday, 03/10/2025',
  });

  // API call to get month's listed activities
  currentDate = signal(new Date('2025-10-01'));
  monthName = computed(() => this.currentDate().toLocaleString('default', { month: 'long' }));
  year = computed(() => this.currentDate().getFullYear());
  
  calendarDays = computed(() => {
    const events = [3, 7]; // Days with events from the image
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const lastDayOfPrevMonth = new Date(year, month, 0);

    const days: CalendarDay[] = [];
    
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0=Mon, 1=Tue...

    for (let i = startDayOfWeek; i > 0; i--) {
        days.push({ day: lastDayOfPrevMonth.getDate() - i + 1, isToday: false, isCurrentMonth: false, hasEvent: false });
    }

    const todayInMonth = 4; // Hardcoded from image for Oct 4th
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
        days.push({ day: i, isToday: i === todayInMonth, isCurrentMonth: true, hasEvent: events.includes(i) });
    }
    
    const totalDaysInGrid = 35; // 5 rows * 7 days
    if (days.length < totalDaysInGrid) {
        const remainingSlots = totalDaysInGrid - days.length;
        for (let i = 1; i <= remainingSlots; i++) {
            days.push({ day: i, isToday: false, isCurrentMonth: false, hasEvent: false });
        }
    }

    return days;
  });
}
