import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// Interfaces
export type ContactStatus = 'online' | 'away' | 'unavailable' | 'offline';
export type MessageStatus = 'sent' | 'received' | 'read';

export interface Contact {
  id: number;
  name: string;
  role: string;
  isAi?: boolean;
  status: ContactStatus;
  hasUnread?: boolean;
}

export interface Message {
  id: number;
  senderId: number;
  text?: string;
  timestamp: string;
  status?: MessageStatus;
  file?: {
    name: string;
    type: 'zip';
  };
}


@Component({
  selector: 'app-chat',
  imports: [CommonModule],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  myId = 0;
  newMessage = signal('');

  // Mock data for contacts based on image
  contacts = signal<Contact[]>([
    { id: 1, name: 'AI Assistant', role: '', isAi: true, status: 'online' },
    { id: 0, name: 'Me', role: 'Personal Chat', status: 'online' },
    { id: 2, name: 'James Anderson', role: 'Lecturer', status: 'unavailable', hasUnread: true },
    { id: 3, name: 'Karen Clark', role: 'Student', status: 'away' },
    { id: 4, name: 'Joshua King', role: 'Student', status: 'online', hasUnread: true },
  ]);

  selectedContactId = signal<number>(3);

  // All messages stored by contact ID
  allMessages = signal<Record<number, Message[]>>({
    3: [ // Karen Clark
      { id: 1, senderId: 0, text: 'Hey Karen, did you receive the project file?', timestamp: '10:34', status: 'read' },
      { id: 2, senderId: 3, text: 'Give me one sec...', timestamp: '10:35' },
      { id: 3, senderId: 3, text: 'Nope, could you send it, please?', timestamp: '10:35' },
      { id: 4, senderId: 0, text: 'Sure thing!', file: { name: 'prj_1.zip', type: 'zip' }, timestamp: '10:36', status: 'received' },
    ],
    1: [ // AI Assistant
      { id: 1, senderId: 1, text: 'Hello! I am your AI Assistant. How can I help you today?', timestamp: '09:00' },
    ],
    0: [ // Me (Personal Chat)
      { id: 1, senderId: 0, text: 'Note to self: Finish the Angular project documentation.', timestamp: 'Yesterday' },
    ],
    2: [ // James Anderson
      { id: 1, senderId: 2, text: 'Hello, please see the announcement regarding midterm study sessions.', timestamp: '11:00' },
      { id: 2, senderId: 0, text: 'Got it, thanks!', timestamp: '11:01', status: 'sent' }
    ],
    4: [ // Joshua King
       { id: 1, senderId: 4, text: 'Hey, are you free to work on the assignment later?', timestamp: '10:00' },
    ]
  });

  selectedContact = computed(() => {
    return this.contacts().find(c => c.id === this.selectedContactId()) ?? null;
  });

  messages = computed(() => {
    return this.allMessages()[this.selectedContactId()] ?? [];
  });

  selectContact(id: number): void {
    this.selectedContactId.set(id);
    const contact = this.contacts().find(c => c.id === id);
    if (contact?.hasUnread) {
        this.contacts.update(contacts => 
            contacts.map(c => c.id === id ? { ...c, hasUnread: false } : c)
        );
    }
  }

  onMessageInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.newMessage.set(inputElement.value);
  }

  sendMessage(): void {
    if (this.newMessage().trim() === '') return;

    const currentContactId = this.selectedContactId();
    if (currentContactId === null) return;

    const newMessage: Message = {
      id: (this.messages()?.length ?? 0) + 1,
      senderId: this.myId,
      text: this.newMessage().trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: 'sent',
    };
    
    this.allMessages.update(all => {
      const currentMessages = all[currentContactId] ? [...all[currentContactId]] : [];
      currentMessages.push(newMessage);
      return { ...all, [currentContactId]: currentMessages };
    });

    this.newMessage.set('');
  }

  getStatusBorderColor(status: ContactStatus): string {
    switch (status) {
      case 'online': return 'border-green-400';
      case 'away': return 'border-yellow-400';
      case 'unavailable': return 'border-red-500';
      case 'offline': return 'border-gray-500';
    }
  }

  getMessageStatusDotColor(status: MessageStatus): string {
    switch (status) {
      case 'sent': return 'bg-gray-400';
      case 'received': return 'bg-yellow-400';
      case 'read': return 'bg-green-500';
    }
  }
}