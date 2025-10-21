// src/app/pages/chat/chat.component.ts
import { ChangeDetectionStrategy, Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, SocketMessage, TypingEvent, UserStatusEvent } from '../../services/api.service';
import { Subscription, debounceTime, Subject } from 'rxjs';

// Interfaces
export type ContactStatus = 'online' | 'away' | 'unavailable' | 'offline';
export type MessageStatus = 'sent' | 'received' | 'read';

export interface Contact {
  id: string;
  name: string;
  role: string;
  isAi?: boolean;
  status: ContactStatus;
  hasUnread?: boolean;
  userId?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  avatar?: string;
}

export interface Message {
  id: string;
  senderId: string;
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
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit, OnDestroy {
  apiService = inject(ApiService);
  private router = inject(Router);

  myId = '0';
  newMessage = signal('');
  searchQuery = signal('');
  private subscriptions: Subscription[] = [];
  private searchSubject = new Subject<string>();

  // User info
  currentUser = signal<any>(null);

  // Recent chats (contacts you've actually chatted with)
  recentContacts = signal<Contact[]>([
    { id: '1', name: 'AI Assistant', role: 'AI Tutor', isAi: true, status: 'online', userId: 'ai-assistant', lastMessage: 'Hello! I am your AI Assistant. How can I help you today?', lastMessageTime: '09:00' },
    { id: '0', name: 'Me', role: 'Personal Notes', status: 'online', userId: 'current-user', lastMessage: 'Note to self: Finish the Angular project documentation.', lastMessageTime: 'Yesterday' },
  ]);

  // Search results
  searchResults = signal<Contact[]>([]);

  selectedContactId = signal<string>('1'); // Default to AI Assistant
  isTyping = signal<boolean>(false);
  typingUser = signal<string>('');

  // All messages stored by contact ID
  allMessages = signal<Record<string, Message[]>>({
    '1': [ // AI Assistant
      { id: '1', senderId: '1', text: 'Hello! I am your AI Assistant. How can I help you today?', timestamp: '09:00' },
    ],
    '0': [ // Me (Personal Chat)
      { id: '1', senderId: '0', text: 'Note to self: Finish the Angular project documentation.', timestamp: 'Yesterday' },
    ],
  });

  // Computed contacts list - shows search results when searching, otherwise recent contacts
  contacts = computed(() => {
    const query = this.searchQuery();
    if (query.trim()) {
      return this.searchResults();
    }
    return this.recentContacts();
  });

  selectedContact = computed(() => {
    return this.contacts().find(c => c.id === this.selectedContactId()) ?? null;
  });

  messages = computed(() => {
    return this.allMessages()[this.selectedContactId()] ?? [];
  });

  ngOnInit() {
    // Get current user info from API service
    const user = this.apiService.getCurrentUserValue();
    this.currentUser.set(user);
    
    // Set myId to current user's ID
    if (user && user.userId) {
      this.myId = user.userId;
    }

    // Subscribe to socket events
    this.subscriptions.push(
      this.apiService.newMessage$.subscribe((message: SocketMessage | null) => {
        if (message) {
          this.handleNewMessage(message);
        }
      })
    );

    this.subscriptions.push(
      this.apiService.typing$.subscribe((typingEvent: TypingEvent | null) => {
        if (typingEvent) {
          this.handleTypingEvent(typingEvent);
        }
      })
    );

    this.subscriptions.push(
      this.apiService.userStatus$.subscribe((statusEvent: UserStatusEvent | null) => {
        if (statusEvent) {
          this.handleUserStatusEvent(statusEvent);
        }
      })
    );

    // Subscribe to search subject with debounce
    this.subscriptions.push(
      this.searchSubject.pipe(debounceTime(300)).subscribe(query => {
        this.searchUsers(query);
      })
    );

    // Load initial recent contacts from API (mock for now)
    this.loadRecentContacts();
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Load recent chat contacts
   */
  private loadRecentContacts() {
    // TODO: Replace with actual API call to get recent chats
    // For now, we'll use the static recent contacts
    console.log('Loading recent contacts...');
  }

  /**
   * Search for users in the system
   */
  searchUsers(query: string) {
    this.searchQuery.set(query);
    
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }

    // Call the API to search users
    this.apiService.searchUsers(query).subscribe({
      next: (response) => {
        // Transform the API response to Contact objects
        const users = response.users.map((user: any) => ({
          id: user.userId, // Using userId as the id for the contact
          name: user.name,
          role: user.role,
          isAi: false, // These are real users
          status: 'offline' as ContactStatus, // Default status, you might update this with real status if available
          userId: user.userId,
          lastMessage: '', // No last message initially
          lastMessageTime: '' // No last message time initially
        }));
        this.searchResults.set(users);
      },
      error: (error) => {
        console.error('Error searching users:', error);
        this.searchResults.set([]);
      }
    });
  }

  /**
   * Handle new incoming messages from socket
   */
  private handleNewMessage(message: SocketMessage) {
    // Find the contact ID based on the sender's userId
    const contact = this.recentContacts().find(c => c.userId === message.senderId);
    
    if (contact) {
      // Update existing contact's last message
      this.updateContactLastMessage(contact.id, message.text, new Date(message.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', hour12: false 
      }));

      const newMessage: Message = {
        id: message._id || `msg-${Date.now()}`,
        senderId: contact.id,
        text: message.text,
        timestamp: new Date(message.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', minute: '2-digit', hour12: false 
        }),
        status: message.status as MessageStatus
      };

      this.addMessageToContact(contact.id, newMessage);

      // Mark as unread if not the current conversation
      if (contact.id !== this.selectedContactId()) {
        this.markContactAsUnread(contact.id);
      }
    } else {
      // This is a new contact - add them to recent contacts
      // TODO: Fetch contact details from API based on senderId
      console.log('New contact message from:', message.senderId);
    }
  }

  /**
   * Update contact's last message and timestamp
   */
  private updateContactLastMessage(contactId: string, message: string, timestamp: string) {
    this.recentContacts.update(contacts => 
      contacts.map(contact => 
        contact.id === contactId 
          ? { ...contact, lastMessage: message, lastMessageTime: timestamp }
          : contact
      )
    );
  }

  /**
   * Add message to contact's message history
   */
  private addMessageToContact(contactId: string, message: Message) {
    this.allMessages.update(all => {
      const currentMessages = all[contactId] ? [...all[contactId]] : [];
      currentMessages.push(message);
      return { ...all, [contactId]: currentMessages };
    });
  }

  /**
   * Mark contact as having unread messages
   */
  private markContactAsUnread(contactId: string) {
    this.recentContacts.update(contacts => 
      contacts.map(contact => 
        contact.id === contactId ? { ...contact, hasUnread: true } : contact
      )
    );
  }

  /**
   * Handle typing indicators
   */
  private handleTypingEvent(typingEvent: TypingEvent) {
    const contact = this.recentContacts().find(c => c.userId === typingEvent.senderId);
    if (contact && contact.id === this.selectedContactId()) {
      this.isTyping.set(typingEvent.isTyping);
      this.typingUser.set(contact.name);
      
      // Auto-hide typing indicator after 3 seconds
      if (typingEvent.isTyping) {
        setTimeout(() => {
          this.isTyping.set(false);
        }, 3000);
      }
    }
  }

  /**
   * Handle user status changes
   */
  private handleUserStatusEvent(statusEvent: UserStatusEvent) {
    this.recentContacts.update(contacts => 
      contacts.map(contact => {
        if (contact.userId === statusEvent.userId) {
          return { 
            ...contact, 
            status: this.mapSocketStatusToContactStatus(statusEvent.status) 
          };
        }
        return contact;
      })
    );
  }

  private mapSocketStatusToContactStatus(socketStatus: string): ContactStatus {
    switch (socketStatus) {
      case 'online': return 'online';
      case 'away': return 'away';
      case 'offline': return 'offline';
      default: return 'unavailable';
    }
  }

  /**
   * Get user display name for the header
   */
  getUserDisplayName(): string {
    const user = this.currentUser();
    return user?.name || 'Student';
  }

  /**
   * Handle logout
   */
  logout(): void {
    this.apiService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Navigate to different sections
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  navigateToCourses(): void {
    this.router.navigate(['/courses']);
  }

  navigateToTopics(): void {
    this.router.navigate(['/topics']);
  }

  navigateToChats(): void {
    // Already on chats page
  }

  navigateToForum(): void {
    this.router.navigate(['/forum']);
  }

  selectContact(id: string): void {
    this.selectedContactId.set(id);
    const contact = this.recentContacts().find(c => c.id === id);
    
    // Clear search when a contact is selected
    this.searchQuery.set('');
    this.searchResults.set([]);

    // Mark as read if it had unread messages
    if (contact?.hasUnread) {
      this.recentContacts.update(contacts => 
        contacts.map(c => c.id === id ? { ...c, hasUnread: false } : c)
      );
    }

    this.isTyping.set(false);

    // If this is a new contact from search, add to recent contacts
    const searchContact = this.searchResults().find(c => c.id === id);
    if (searchContact && !this.recentContacts().find(c => c.id === id)) {
      this.recentContacts.update(contacts => [searchContact, ...contacts]);
      
      // Initialize empty messages for new contact
      if (!this.allMessages()[id]) {
        this.allMessages.update(all => ({
          ...all,
          [id]: []
        }));
      }
    }
  }

  onMessageInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.newMessage.set(inputElement.value);

    // Send typing indicators
    const selectedContact = this.selectedContact();
    const currentUser = this.currentUser();
    
    if (selectedContact && currentUser && inputElement.value.length > 0) {
      this.apiService.startTyping({
        senderId: currentUser.userId,
        receiverId: selectedContact.userId || ''
      });
    } else if (selectedContact && currentUser) {
      this.apiService.stopTyping({
        senderId: currentUser.userId,
        receiverId: selectedContact.userId || ''
      });
    }
  }

  onSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchQuery.set(inputElement.value);
    this.searchSubject.next(inputElement.value);
  }

  sendMessage(): void {
    const messageText = this.newMessage().trim();
    if (messageText === '') return;

    const currentContact = this.selectedContact();
    const currentUser = this.currentUser();
    
    if (!currentContact || !currentUser) return;

    // Create temporary message for immediate feedback
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: this.myId,
      text: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: 'sent',
    };

    // Update contact's last message
    this.updateContactLastMessage(currentContact.id, messageText, tempMessage.timestamp);

    // Add to local messages immediately for instant feedback
    this.addMessageToContact(this.selectedContactId(), tempMessage);

    // Send via Socket.IO
    this.apiService.sendMessage({
      senderId: currentUser.userId,
      receiverId: currentContact.userId || '',
      text: messageText,
      conversationId: `conv_${currentUser.userId}_${currentContact.userId}`
    });

    // Stop typing
    this.apiService.stopTyping({
      senderId: currentUser.userId,
      receiverId: currentContact.userId || ''
    });

    this.newMessage.set('');
  }

  getStatusBorderColor(status: ContactStatus): string {
    switch (status) {
      case 'online': return 'border-green-400';
      case 'away': return 'border-yellow-400';
      case 'unavailable': return 'border-red-500';
      case 'offline': return 'border-gray-500';
      default: return 'border-gray-500';
    }
  }

  getMessageStatusDotColor(status: MessageStatus): string {
    switch (status) {
      case 'sent': return 'bg-gray-400';
      case 'received': return 'bg-yellow-400';
      case 'read': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  }

  /**
   * Get display time for contact list
   */
  getDisplayTime(timestamp?: string): string {
    if (!timestamp) return '';
    
    // For demo purposes, return as-is. In real app, you'd format relative time
    return timestamp;
  }
}