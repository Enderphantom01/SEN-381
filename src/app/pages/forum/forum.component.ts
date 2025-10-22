// src/app/pages/forum/forum.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, tap } from 'rxjs/operators';

import { ApiService, User } from '../../services/api.service';
import {
  ForumComment,
  ForumCommentPayload,
  ForumPostDetail,
  ForumPostSummary,
  ForumReactionUser,
  ForumTopic,
} from './forum.models';
import { ForumPostComponent } from './forumpost/forumpost.component';
import { OpenPostComponent } from './openpost/openpost.component';


@Component({
  selector: 'app-forum',
  templateUrl: './forum.component.html',
  imports: [CommonModule, NgOptimizedImage, ForumPostComponent, OpenPostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(OpenPostComponent) private openPostView?: OpenPostComponent;

  readonly currentUser = signal<User | null>(null);

  readonly posts = signal<ForumPostSummary[]>([]);
  readonly postsLoading = signal(false);
  readonly postsError = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly searchTouched = signal(false);

  readonly topics = signal<ForumTopic[]>([]);
  readonly topicsLoading = signal(false);
  readonly topicsError = signal<string | null>(null);
  readonly topicSuggestions = signal<ForumTopic[]>([]);

  readonly showCreatePost = signal(false);

  readonly selectedPost = signal<ForumPostDetail | null>(null);
  readonly selectedPostLoading = signal(false);
  readonly selectedPostError = signal<string | null>(null);

  readonly hasPosts = computed(() => this.posts().length > 0);
  readonly activeTopicId = signal<string | null>(null);
  readonly isPostDialogVisible = computed(
    () => this.selectedPostLoading() || this.selectedPost() !== null || this.selectedPostError() !== null,
  );
  readonly likedPostIds = signal<string[]>([]);

  hasUserLiked(postId: string): boolean {
    return this.likedPostIds().includes(postId);
  }

  getReactionPreview(
    reactions?: ForumReactionUser[] | null,
  ): { displayed: ForumReactionUser[]; remaining: number; total: number } {
    const list = this.normaliseReactionList(reactions);
    const displayed = list.slice(0, 3);
    const remaining = Math.max(list.length - displayed.length, 0);
    return { displayed, remaining, total: list.length };
  }

  sharePost(postId: string): void {
    if (!this.isBrowser) {
      return;
    }
    const url = `${window.location.origin}/forum?post=${postId}`;
    if (navigator.share) {
      navigator
        .share({ title: 'CampusLearn Forum', url })
        .catch((error) => console.warn('Share failed:', error));
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch((error) => console.warn('Clipboard write failed:', error));
    }
  }

  private registerLike(postId: string): void {
    this.likedPostIds.update((current) => {
      if (current.includes(postId)) {
        this.persistLikedPostIds(current);
        return current;
      }
      const next = [...current, postId];
      this.persistLikedPostIds(next);
      return next;
    });
  }

  private buildCurrentUserReaction(): ForumReactionUser {
    const user = this.currentUser();
    const name = user?.name?.trim() || 'You';
    return {
      name,
      avatarUrl: this.generateAvatarUrl(name),
    };
  }

  private generateAvatarUrl(name: string): string {
    const encoded = encodeURIComponent(name);
    return `https://ui-avatars.com/api/?name=${encoded}&background=0F172A&color=ffffff&size=64`;
  }

  private getLikedStorageKey(): string {
    const userId = this.currentUser()?.userId;
    return userId ? `forum-liked:${userId}` : 'forum-liked:anonymous';
  }

  private restoreLikedPostIds(): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      const raw = localStorage.getItem(this.getLikedStorageKey());
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }
      const ids = parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
      if (!ids.length) {
        return;
      }
      const merged = Array.from(new Set([...this.likedPostIds(), ...ids]));
      this.likedPostIds.set(merged);
      this.persistLikedPostIds(merged);
    } catch (error) {
      console.warn('Failed to restore liked posts', error);
    }
  }

  private persistLikedPostIds(ids: string[] = this.likedPostIds()): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      const unique = Array.from(new Set(ids.filter((value) => typeof value === 'string' && value.trim().length > 0)));
      localStorage.setItem(this.getLikedStorageKey(), JSON.stringify(unique));
    } catch (error) {
      console.warn('Failed to store liked posts', error);
    }
  }

  private mergeLikedPostIds(ids: string[]): void {
    if (!ids.length) {
      return;
    }
    this.likedPostIds.update((current) => {
      const merged = Array.from(new Set([...current, ...ids]));
      this.persistLikedPostIds(merged);
      return merged;
    });
  }

  private normaliseReactionUser(
    reaction: Partial<ForumReactionUser> | { [key: string]: unknown } | string | null | undefined,
  ): ForumReactionUser | null {
    if (!reaction) {
      return null;
    }
    if (typeof reaction === 'string') {
      const name = reaction.trim();
      if (!name) {
        return null;
      }
      return { name, avatarUrl: this.generateAvatarUrl(name) };
    }

    const candidate = reaction as Record<string, unknown>;
    const rawNameSources: Array<unknown> = [
      (reaction as Partial<ForumReactionUser>).name,
      candidate['authorName'],
      candidate['displayName'],
      candidate['userName'],
      candidate['username'],
      candidate['fullName'],
    ];
    const nestedUser = candidate['user'] as Record<string, unknown> | undefined;
    if (nestedUser && typeof nestedUser === 'object') {
      rawNameSources.push(nestedUser['name'], nestedUser['displayName'], nestedUser['fullName']);
      rawNameSources.push(nestedUser['username'], nestedUser['userName']);
    }
    const nestedAuthor = candidate['author'] as Record<string, unknown> | undefined;
    if (nestedAuthor && typeof nestedAuthor === 'object') {
      rawNameSources.push(nestedAuthor['name'], nestedAuthor['displayName'], nestedAuthor['fullName']);
      rawNameSources.push(nestedAuthor['username'], nestedAuthor['userName']);
    }
    if ((!rawNameSources[0] || typeof rawNameSources[0] !== 'string') && typeof candidate['firstName'] === 'string') {
      const first = candidate['firstName']?.toString().trim();
      const last = candidate['lastName']?.toString().trim();
      if (first || last) {
        rawNameSources.push([first, last].filter(Boolean).join(' '));
      }
    }
    const rawName = rawNameSources.find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    const name = rawName ? rawName.trim() : 'Member';

    const rawAvatarSources: Array<unknown> = [
      (reaction as Partial<ForumReactionUser>).avatarUrl,
      candidate['imageUrl'],
      candidate['photoUrl'],
      candidate['avatar'],
      candidate['avatarURL'],
      candidate['profileImage'],
    ];
    if (nestedUser && typeof nestedUser === 'object') {
      rawAvatarSources.push(nestedUser['avatarUrl'], nestedUser['imageUrl'], nestedUser['photoUrl'], nestedUser['avatar']);
    }
    if (nestedAuthor && typeof nestedAuthor === 'object') {
      rawAvatarSources.push(
        nestedAuthor['avatarUrl'],
        nestedAuthor['imageUrl'],
        nestedAuthor['photoUrl'],
        nestedAuthor['avatar'],
      );
    }
    const rawAvatar = rawAvatarSources.find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    const avatarUrl = rawAvatar ? rawAvatar.trim() : this.generateAvatarUrl(name);

    return { name, avatarUrl };
  }

  private normaliseReactionList(
    reactions?: ReadonlyArray<Partial<ForumReactionUser> | { [key: string]: unknown } | string> | null,
  ): ForumReactionUser[] {
    const seen = new Set<string>();
    const normalised: ForumReactionUser[] = [];

    for (const reaction of reactions ?? []) {
      const mapped = this.normaliseReactionUser(reaction);
      if (!mapped) {
        continue;
      }
      const key = mapped.name.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      normalised.push(mapped);
    }

    return normalised;
  }

  private isPostLikedByUser(payload: any): boolean {
    if (!payload) {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    const currentUserId = this.currentUser()?.userId;
    const currentUserName = this.currentUser()?.name?.trim().toLowerCase();
    const booleanFlags = ['userLiked', 'userHasLiked', 'likedByUser', 'hasLiked', 'isLiked'];
    for (const key of booleanFlags) {
      const value = candidate[key];
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'number') {
        // Some APIs return 0/1 for booleans
        if (value === 1) {
          return true;
        }
        if (value === 0) {
          return false;
        }
      }
    }

    const likedIds = candidate['likedPostIds'];
    if (Array.isArray(likedIds)) {
      const postId = candidate['postId'];
      if (typeof postId === 'string') {
        return likedIds.includes(postId);
      }
    }

    if (currentUserId) {
      const likedUserIds = candidate['likedUserIds'];
      if (Array.isArray(likedUserIds) && likedUserIds.some((id) => id === currentUserId)) {
        return true;
      }
      const likedUsers = candidate['likedUsers'];
      if (Array.isArray(likedUsers)) {
        if (
          likedUsers.some((user) => {
            if (typeof user === 'string') {
              return user === currentUserId;
            }
            if (user && typeof user === 'object') {
              const userRecord = user as Record<string, unknown>;
              if (userRecord['userId'] === currentUserId || userRecord['id'] === currentUserId) {
                return true;
              }
            }
            return false;
          })
        ) {
          return true;
        }
      }
    }

    if (currentUserName) {
      const reactions = candidate['recentReactions'];
      if (Array.isArray(reactions)) {
        const found = reactions.some((reaction) => {
          if (!reaction) {
            return false;
          }
          if (typeof reaction === 'string') {
            return reaction.trim().toLowerCase() === currentUserName;
          }
          if (typeof reaction === 'object') {
            const reactionRecord = reaction as Record<string, unknown>;
            const namesToCheck = [
              reactionRecord['name'],
              reactionRecord['authorName'],
              reactionRecord['displayName'],
              reactionRecord['userName'],
              reactionRecord['username'],
            ];
            return namesToCheck.some(
              (value) => typeof value === 'string' && value.trim().toLowerCase() === currentUserName,
            );
          }
          return false;
        });
        if (found) {
          return true;
        }
      }
    }

    return false;
  }

  private mergeReactions(reactions: ForumReactionUser[] | undefined, newReaction: ForumReactionUser): ForumReactionUser[] {
    const existing = this.normaliseReactionList(reactions);
    const addition = this.normaliseReactionUser(newReaction);
    if (!addition) {
      return existing.slice(0, 32);
    }

    const filtered = existing.filter((reaction) => reaction.name.toLowerCase() !== addition.name.toLowerCase());
    return [...filtered, addition].slice(0, 32);
  }

  private appendCurrentUserReaction(postId: string): void {
    const reaction = this.buildCurrentUserReaction();

    this.posts.update((existing) =>
      existing.map((post) => {
        if (post.postId !== postId) {
          return post;
        }
        return {
          ...post,
          recentReactions: this.mergeReactions(post.recentReactions, reaction),
        };
      }),
    );

    const detail = this.selectedPost();
    if (detail && detail.postId === postId) {
      this.selectedPost.set({
        ...detail,
        recentReactions: this.mergeReactions(detail.recentReactions, reaction),
      });
    }
  }

  private incrementLikeCounters(postId: string): void {
    this.posts.update((existing) =>
      existing.map((post) => {
        if (post.postId !== postId) {
          return post;
        }
        return {
          ...post,
          likes: post.likes + 1,
        };
      }),
    );

    const detail = this.selectedPost();
    if (detail && detail.postId === postId) {
      this.selectedPost.set({
        ...detail,
        likes: detail.likes + 1,
      });
    }
  }

  private undoLocalLike(postId: string): void {
    const reaction = this.buildCurrentUserReaction();

    this.likedPostIds.update((ids) => {
      const filtered = ids.filter((id) => id !== postId);
      this.persistLikedPostIds(filtered);
      return filtered;
    });

    this.posts.update((existing) =>
      existing.map((post) => {
        if (post.postId !== postId) {
          return post;
        }
        return {
          ...post,
          likes: Math.max(post.likes - 1, 0),
          recentReactions: this.normaliseReactionList(
            (post.recentReactions ?? []).filter(
              (existingReaction) => existingReaction.name.toLowerCase() !== reaction.name.toLowerCase(),
            ),
          ),
        };
      }),
    );

    const detail = this.selectedPost();
    if (detail && detail.postId === postId) {
      this.selectedPost.set({
        ...detail,
        likes: Math.max(detail.likes - 1, 0),
        recentReactions: this.normaliseReactionList(
          (detail.recentReactions ?? []).filter(
            (existingReaction) => existingReaction.name.toLowerCase() !== reaction.name.toLowerCase(),
          ),
        ),
      });
    }
  }

  ngOnInit(): void {
    this.currentUser.set(this.apiService.getCurrentUserValue());
    this.restoreLikedPostIds();
    if (this.isBrowser) {
      this.loadPosts();
      this.loadTopics();
    }
  }

  // Navigation helpers
  getUserDisplayName(): string {
    return this.currentUser()?.name ?? 'Student';
  }

  logout(): void {
    this.apiService.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (error) => {
        console.error('Logout failed:', error);
        this.router.navigate(['/login']);
      },
    });
  }

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
    this.router.navigate(['/chats']);
  }

  navigateToForum(): void {
    // Already on forum page
  }

  // Posts
  loadPosts(search: string | null = null): void {
    if (!this.isBrowser) {
      return;
    }

    this.postsLoading.set(true);
    this.postsError.set(null);

    const params: Record<string, string> = {};
    const searchValue = search ?? this.searchTerm();
    if (searchValue.trim()) {
      params['search'] = searchValue.trim();
    }
    const hasSearchParam = 'search' in params;
    const topicFilter = this.activeTopicId();
    if (topicFilter) {
      params['topicId'] = topicFilter;
    }

    this.apiService
      .getForumPosts(Object.keys(params).length ? params : undefined)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.postsLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          let mappedPosts = (response?.posts ?? []).map((post: any) => this.mapPostSummary(post));
          const likedIdsFromResponse = (response?.posts ?? [])
            .filter((post: any) => this.isPostLikedByUser(post))
            .map((post: any) => post.postId)
            .filter((postId: string) => typeof postId === 'string');

          if (likedIdsFromResponse.length) {
            this.mergeLikedPostIds(likedIdsFromResponse);
          } else {
            this.persistLikedPostIds();
          }

          if (topicFilter) {
            mappedPosts = mappedPosts.filter((post: ForumPostSummary) => post.topicId === topicFilter);
          }

          this.posts.set(mappedPosts);
          if (mappedPosts.length === 0) {
            this.postsError.set(
              topicFilter
                ? 'No posts found for this topic yet.'
                : hasSearchParam && searchValue
                  ? `No posts found for "${searchValue}".`
                  : 'No forum posts yet. Start the conversation!',
            );
          } else {
            this.postsError.set(null);
          }
        },
        error: (error) => {
          const fallback = 'Unable to load forum posts';
          const message = error?.error?.message ?? error?.message ?? fallback;
          this.postsError.set(message);
          this.posts.set([]);
        },
      });
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (!value && this.searchTouched()) {
      this.loadPosts('');
    }
  }

  applySearch(): void {
    if (!this.isBrowser) {
      return;
    }
    this.activeTopicId.set(null);
    this.searchTouched.set(true);
    this.loadPosts(this.searchTerm());
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchTouched.set(false);
    this.activeTopicId.set(null);
    this.loadPosts('');
  }

  openCreatePost(): void {
    if (this.isBrowser && !this.topicSuggestions().length) {
      this.loadTopicSuggestions(false);
    }
    this.showCreatePost.set(true);
  }

  closeCreatePost(): void {
    this.showCreatePost.set(false);
  }

  handlePostCreated(): void {
    this.showCreatePost.set(false);
    this.loadPosts();
    this.loadTopics();
  }

  openPost(postId: string): void {
    this.selectedPost.set(null);
    this.selectedPostLoading.set(true);
    this.selectedPostError.set(null);

    this.apiService
      .getForumPost(postId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.selectedPostLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const raw = response?.post;
          if (!raw) {
            this.selectedPostError.set('Forum post not found');
            return;
          }
          if (typeof raw.postId === 'string' && this.isPostLikedByUser(raw)) {
            this.mergeLikedPostIds([raw.postId]);
          }
          const detail = this.mapPostDetail(raw);
          this.selectedPost.set(detail);
        },
        error: (error) => {
          const fallback = 'Unable to load forum post';
          const message = error?.error?.message ?? error?.message ?? fallback;
          this.selectedPostError.set(message);
        },
      });
  }

  closePostView(): void {
    this.selectedPost.set(null);
    this.selectedPostLoading.set(false);
    this.selectedPostError.set(null);
  }

  handleLike(postId: string): void {
    if (this.hasUserLiked(postId)) {
      return;
    }

    this.registerLike(postId);
    this.incrementLikeCounters(postId);
    this.appendCurrentUserReaction(postId);

    this.apiService
      .likePost(postId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.updatePostReactions(postId, response?.likes, response?.dislikes, response?.recentReactions);
        },
        error: (error: any) => {
          const status = error?.status;
          if (status === 401) {
            // keep optimistic like locally
            return;
          }
          this.undoLocalLike(postId);
          console.error('Failed to like post', error);
        },
      });
  }

  handleDislike(postId: string): void {
    this.apiService
      .dislikePost(postId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.updatePostReactions(postId, response?.likes, response?.dislikes, response?.recentReactions);
        },
        error: (error: any) => {
          console.error('Failed to dislike post', error);
        },
      });
  }

  handleComment(payload: ForumCommentPayload): void {
    this.openPostView?.setCommentPendingState(true);

    this.apiService
      .createComment(payload.postId, {
        content: payload.content,
        parentCommentId: payload.parentCommentId,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.openPostView?.setCommentPendingState(false)),
        tap({
          next: () => this.openPostView?.resetCommentForm(),
        }),
      )
      .subscribe({
        next: () => this.refreshSelectedPost(payload.postId),
        error: (error) => {
          console.error('Failed to add comment', error);
        },
      });
  }

  private refreshSelectedPost(postId: string): void {
    this.selectedPostLoading.set(true);
    this.apiService
      .getForumPost(postId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.selectedPostLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const raw = response?.post;
          if (!raw) {
            this.selectedPostError.set('Forum post not found');
            return;
          }
          if (typeof raw.postId === 'string' && this.isPostLikedByUser(raw)) {
            this.mergeLikedPostIds([raw.postId]);
          }
          const detail = this.mapPostDetail(raw);
          this.selectedPost.set(detail);
        },
        error: (error) => {
          console.error('Failed to refresh post after comment', error);
        },
      });
  }

  // Topics
  private loadTopics(): void {
    if (!this.isBrowser) {
      return;
    }

    this.topicsLoading.set(true);
    this.topicsError.set(null);

    this.apiService
      .getForumTrending()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.topicsLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.topicsError.set(null);
          const activeTopics = (response?.activeTopics ?? []).map((topic: any) => ({
            topicId: topic.topicId,
            title: topic.title,
            postCount: topic.postCount,
          }));

          if (activeTopics.length) {
            this.topics.set(activeTopics);
          } else {
            this.topics.set([]);
          }

          this.loadTopicSuggestions(!activeTopics.length);
        },
        error: () => {
          this.topicsError.set('Unable to load active topics');
          this.topics.set([]);
          this.loadTopicSuggestions(true);
        },
      });
  }

  private loadTopicSuggestions(replaceActive: boolean): void {
    if (!this.isBrowser) {
      return;
    }

    const existing = this.topicSuggestions();
    if (existing.length) {
      if (replaceActive) {
        this.topics.set(existing.slice(0, Math.min(existing.length, 5)));
        this.topicsError.set(null);
      }
      return;
    }

    this.apiService
      .getTopics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const items = (response?.topics ?? response ?? []).map((topic: any) => ({
            topicId: topic.topicId,
            title: topic.title,
            postCount: topic.postCount,
          }));
          this.topicSuggestions.set(items);

          if (replaceActive && items.length) {
            this.topics.set(items.slice(0, Math.min(items.length, 5)));
            this.topicsError.set(null);
          }
        },
        error: (error) => {
          if (error?.status === 401 || error?.status === 403) {
            this.loadTopicSuggestionsFromTrending(replaceActive);
            return;
          }
          if (replaceActive && !this.topics().length) {
            this.topics.set([]);
            this.topicsError.set('Unable to load active topics');
          }
        },
      });
  }

  private loadTopicSuggestionsFromTrending(replaceActive: boolean): void {
    this.apiService
      .getForumTrending()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const fallbackTopics = (response?.activeTopics ?? []).map((topic: any) => ({
            topicId: topic.topicId,
            title: topic.title,
            postCount: topic.postCount,
          }));
          this.topicSuggestions.set(fallbackTopics);

          if (replaceActive && fallbackTopics.length) {
            this.topics.set(fallbackTopics.slice(0, Math.min(fallbackTopics.length, 5)));
            this.topicsError.set(null);
          } else if (replaceActive && !fallbackTopics.length && !this.topics().length) {
            this.topicsError.set('Unable to load active topics');
          }
        },
        error: () => {
          if (replaceActive && !this.topics().length) {
            this.topics.set([]);
            this.topicsError.set('Unable to load active topics');
          }
        },
      });
  }

  private updatePostReactions(
    postId: string,
    likes?: number,
    dislikes?: number,
    reactions?: ForumReactionUser[],
  ): void {
    if (likes === undefined && dislikes === undefined && !reactions) {
      return;
    }

    const reactionCopy = reactions ? this.normaliseReactionList(reactions) : undefined;

    this.posts.update((existing) =>
      existing.map((post) => {
        if (post.postId !== postId) {
          return post;
        }
        return {
          ...post,
          likes: likes ?? post.likes,
          dislikes: dislikes ?? post.dislikes,
          recentReactions: reactionCopy ?? this.normaliseReactionList(post.recentReactions),
        };
      }),
    );

    const currentDetail = this.selectedPost();
    if (currentDetail && currentDetail.postId === postId) {
      this.selectedPost.set({
        ...currentDetail,
        likes: likes ?? currentDetail.likes,
        dislikes: dislikes ?? currentDetail.dislikes,
        recentReactions: reactionCopy ?? this.normaliseReactionList(currentDetail.recentReactions),
      });
    }
  }

  private mapPostSummary(post: any): ForumPostSummary {
    const originalContent: string = post.content ?? '';
    const preview =
      originalContent.length > 220
        ? `${originalContent.slice(0, 217).trimEnd()}...`
        : originalContent;

    return {
      postId: post.postId,
      title: post.title,
      preview,
      authorName: post.authorName,
      authorRole: post.authorRole,
      topicId: post.topicId,
      topicTitle: post.topicTitle,
      isAnonymous: post.isAnonymous,
      likes: post.likes,
      dislikes: post.dislikes,
      commentCount: post.commentCount ?? 0,
      createdAt: post.createdAt,
      tags: post.tags ?? [],
      recentReactions: this.normaliseReactionList(post.recentReactions),
    };
  }

  private mapPostDetail(post: any): ForumPostDetail {
    const mapComment = (comment: any): ForumComment => ({
      mongoId: comment.id ?? comment.mongoId ?? comment._id ?? null,
      commentId: comment.commentId,
      content: comment.content,
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      isInstructor: comment.isInstructor ?? false,
      likes: comment.likes ?? 0,
      dislikes: comment.dislikes ?? 0,
      createdAt: comment.createdAt,
      replies: (comment.replies ?? []).map((reply: any) => mapComment(reply)),
    });

    const comments = (post.comments ?? []).map((comment: any) => mapComment(comment));

    return {
      postId: post.postId,
      title: post.title,
      content: post.content,
      authorName: post.authorName,
      authorRole: post.authorRole,
      topicId: post.topicId,
      topicTitle: post.topicTitle,
      isAnonymous: post.isAnonymous ?? false,
      likes: post.likes ?? 0,
      dislikes: post.dislikes ?? 0,
      createdAt: post.createdAt,
      comments,
      tags: post.tags ?? [],
      commentCount: comments.length,
      recentReactions: this.normaliseReactionList(post.recentReactions),
    };
  }

  filterByTopic(topic: ForumTopic): void {
    if (this.activeTopicId() === topic.topicId) {
      return;
    }
    this.activeTopicId.set(topic.topicId);
    this.searchTerm.set('');
    this.searchTouched.set(false);
    this.loadPosts('');
  }

  clearTopicFilter(): void {
    if (!this.activeTopicId()) {
      return;
    }
    this.activeTopicId.set(null);
    this.loadPosts(this.searchTerm());
  }

  isTopicActive(topicId: string): boolean {
    return this.activeTopicId() === topicId;
  }

}
