// src/app/pages/chat/chat.component.ts
import { ChangeDetectionStrategy, Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit, OnDestroy {
  apiService = inject(ApiService);
  private router = inject(Router);
  private http = inject(HttpClient);

  myId = '0';
  newMessage = signal('');
  searchQuery = signal('');
  private subscriptions: Subscription[] = [];
  private searchSubject = new Subject<string>();

  // AI Assistant State
  isAiTyping = signal<boolean>(false);
  private geminiApiKey = signal<string | null>(null);
  private isApiKeyLoaded = signal<boolean>(false);
  private cachedCsvBase64: string | null = null;

  // User info
  currentUser = signal<any>(null);

  // Recent chats (contacts you've actually chatted with)
  recentContacts = signal<Contact[]>([
    { 
      id: '1', 
      name: 'AI Assistant', 
      role: 'AI Tutor', 
      isAi: true, 
      status: 'online', 
      userId: 'ai-assistant', 
      lastMessage: 'Hello! I am your AI Assistant. How can I help you today?', 
      lastMessageTime: '09:00',
      avatar: 'https://i.imgur.com/2a2eL5h.png'
    },
    { 
      id: '0', 
      name: 'Me', 
      role: 'Personal Notes', 
      status: 'online', 
      userId: 'current-user', 
      lastMessage: 'Note to self: Finish the Angular project documentation.', 
      lastMessageTime: 'Yesterday' 
    },
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

    // Load Gemini API key first
    this.loadGeminiApiKey();

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

    // Preload CSV data for AI
    this.loadCsvData();
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Load Gemini API key from backend
   */
  private loadGeminiApiKey() {
    this.apiService.getGeminiApiKey().subscribe({
      next: (response) => {
        this.geminiApiKey.set(response.apiKey);
        this.isApiKeyLoaded.set(true);
        console.log('✅ Gemini API key loaded successfully');
      },
      error: (error) => {
        console.error('❌ Failed to load Gemini API key:', error);
        this.isApiKeyLoaded.set(true); // Still set to true to avoid blocking
      }
    });
  }

 /**
 * Load CSV data for AI assistant context
 */
private async loadCsvData(): Promise<void> {
    try {
        console.log('📥 Loading CSV data from assets...');
        const csvText = await this.http.get('/assets/Questions_Answers.csv', { responseType: 'text' }).toPromise();
        if (csvText) {
            this.cachedCsvBase64 = btoa(unescape(encodeURIComponent(csvText)));
            console.log('✅ CSV data loaded successfully, size:', csvText.length, 'characters');
            console.log('✅ First 100 chars of CSV:', csvText.substring(0, 100));
        } else {
            console.error('❌ CSV data is empty or null');
        }
    } catch (error) {
        console.error('❌ Error loading CSV data from assets:', error);
        console.error('❌ Make sure Questions_Answers.csv is in src/assets/ folder');
        this.cachedCsvBase64 = null;
    }
}

  /**
   * Get CSV as inline data part for Gemini API
   */
  /**
 * Get CSV as inline data part for Gemini API
 */
private async getCsvInlinePart(): Promise<any> {
    try {
        if (!this.cachedCsvBase64) {
            await this.loadCsvData();
        }
        
        if (!this.cachedCsvBase64) {
            console.warn('⚠️ CSV data not available, proceeding without context');
            // Return empty text part if CSV fails to load
            return { text: "No CSV context available." };
        }
        
        console.log('📁 CSV data loaded, size:', this.cachedCsvBase64.length, 'bytes');
        return {
            inlineData: {
                mimeType: "text/csv",
                data: this.cachedCsvBase64
            }
        };
    } catch (error) {
        console.error('❌ Error getting CSV part:', error);
        // Return empty text part if CSV fails
        return { text: "CSV context unavailable due to error." };
    }
}

  /**
   * Call Gemini AI API with user message
   */
  /**
 * Call Gemini AI API with user message
 */
private async callGeminiAPI(userMessage: string, attachment?: { base64: string; type: string }): Promise<string> {
    // Wait for API key to be loaded
    if (!this.isApiKeyLoaded()) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.callGeminiAPI(userMessage, attachment);
    }

    const apiKey = this.geminiApiKey();
    if (!apiKey) {
        console.error('❌ Gemini API key is null or undefined');
        throw new Error('Gemini API key not available');
    }

    // Check if API key is still the placeholder
    if (apiKey === '####') {
        console.error('❌ Gemini API key is still the placeholder "####"');
        throw new Error('Gemini API key not properly configured');
    }

    try {
        const csvPart = await this.getCsvInlinePart();
        
        const contents: any[] = [csvPart];
        
        // Add attachment if present
        if (attachment) {
            contents.push({
                inlineData: {
                    mimeType: attachment.type,
                    data: attachment.base64.split(',')[1] // Remove data URI prefix
                }
            });
        }
        
        // Add text message
        if (userMessage) {
            contents.push({ text: userMessage });
        }

        console.log('🤖 Sending request to Gemini API...');
        console.log('🔑 API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
        console.log('💭 User message:', userMessage);
        console.log('📊 Contents length:', contents.length);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: contents }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH", 
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });

        console.log('📡 Gemini API Response Status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Gemini API error response:', errorText);
            
            if (response.status === 401) {
                throw new Error('Invalid API key - please check your Gemini API key');
            } else if (response.status === 403) {
                throw new Error('API key does not have permission to access Gemini API');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded - please try again later');
            } else if (response.status === 400) {
                throw new Error('Bad request - invalid request format');
            } else {
                throw new Error(`API call failed: ${response.status} ${response.statusText}. Details: ${errorText}`);
            }
        }

        const data = await response.json();
        console.log('✅ Gemini API success response:', data);
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('❌ Invalid response format from Gemini API:', data);
            throw new Error('Invalid response format from Gemini API');
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('🔴 Gemini API fetch error:', error);
        throw error;
    }
}

  /**
   * Handle AI response generation
   */
  private async generateAIResponse(userMessage: string, tempMessageId: string) {
    this.isAiTyping.set(true);

    try {
      const aiResponseText = await this.callGeminiAPI(userMessage);
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        senderId: '1', // AI Assistant ID
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', minute: '2-digit', hour12: false 
        }),
        status: 'read'
      };

      // Replace temporary message with AI response
      this.allMessages.update(all => {
        const currentMessages = all['1'] ? [...all['1']] : [];
        const filteredMessages = currentMessages.filter(msg => msg.id !== tempMessageId);
        return { ...all, ['1']: [...filteredMessages, aiMessage] };
      });

      // Update contact's last message
      this.updateContactLastMessage('1', aiResponseText, aiMessage.timestamp);

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        senderId: '1',
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', minute: '2-digit', hour12: false 
        }),
        status: 'read'
      };

      // Replace temporary message with error
      this.allMessages.update(all => {
        const currentMessages = all['1'] ? [...all['1']] : [];
        const filteredMessages = currentMessages.filter(msg => msg.id !== tempMessageId);
        return { ...all, ['1']: [...filteredMessages, errorMessage] };
      });

      this.updateContactLastMessage('1', errorMessage.text!, errorMessage.timestamp);
    } finally {
      this.isAiTyping.set(false);
    }
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
    // Skip if this is the AI assistant (we handle AI separately)
    if (message.senderId === 'ai-assistant') {
      return;
    }

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

    // Send typing indicators (only for non-AI contacts)
    const selectedContact = this.selectedContact();
    const currentUser = this.currentUser();
    
    if (selectedContact && !selectedContact.isAi && currentUser && inputElement.value.length > 0) {
      this.apiService.startTyping({
        senderId: currentUser.userId,
        receiverId: selectedContact.userId || ''
      });
    } else if (selectedContact && !selectedContact.isAi && currentUser) {
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

    // Handle AI Assistant messages differently
    if (currentContact.isAi) {
      // For AI Assistant, generate response using Gemini API
      this.generateAIResponse(messageText, tempMessage.id);
      
      // Use AI-specific socket method instead of regular sendMessage
      this.apiService.sendAIMessage({
        senderId: currentUser.userId,
        text: messageText,
        conversationId: `conv_${currentUser.userId}_${currentContact.userId}`
      });
    } else {
      // For real users, send via Socket.IO
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
    }

    this.newMessage.set('');
  }

  /**
   * Regenerate AI response for the last message
   */
  regenerateAIResponse(messageId: string): void {
    const messages = this.messages();
    const messageIndex = messages.findIndex(m => m.id === messageId);
    
    if (messageIndex < 1 || messages[messageIndex - 1].senderId !== this.myId) {
      console.error("Could not find the user's prompt for regeneration.");
      return;
    }

    const userPromptMessage = messages[messageIndex - 1];
    
    // Remove the AI response that is being regenerated
    this.allMessages.update(all => {
      const currentMessages = all['1'] ? [...all['1']] : [];
      const updatedMessages = currentMessages.filter(msg => msg.id !== messageId);
      return { ...all, ['1']: updatedMessages };
    });

    // Regenerate the response
    if (userPromptMessage.text) {
      this.generateAIResponse(userPromptMessage.text, `temp-regenerate-${Date.now()}`);
    }
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

  /**
   * Check if message can be regenerated (AI messages from the current user's last prompt)
   */
  canRegenerateMessage(message: Message): boolean {
    if (this.selectedContactId() !== '1' || message.senderId !== '1') {
      return false;
    }

    const messages = this.messages();
    const messageIndex = messages.findIndex(m => m.id === message.id);
    return messageIndex > 0 && messages[messageIndex - 1].senderId === this.myId;
  }
}