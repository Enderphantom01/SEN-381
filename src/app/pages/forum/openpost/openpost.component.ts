import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ForumCommentPayload, ForumPostDetail, ForumReactionUser } from '../forum.models';

@Component({
  selector: 'app-openpost',
  templateUrl: './openpost.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgOptimizedImage, ReactiveFormsModule],
})
export class OpenPostComponent {
  post = input<ForumPostDetail | null>(null);
  loading = input<boolean>(false);
  likedPosts = input<string[]>([]);

  close = output<void>();
  like = output<string>();
  dislike = output<string>();
  share = output<string>();
  addComment = output<ForumCommentPayload>();

  private fb = inject(FormBuilder);

  commentForm = this.fb.group({
    content: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(1000)],
    }),
  });

  commentSubmitting = signal(false);
  replyTarget = signal<{ commentId: string; authorName: string; mongoId: string | null } | null>(null);

  @ViewChild('commentInput') private commentInput?: ElementRef<HTMLTextAreaElement>;

  readonly hasPost = computed(() => Boolean(this.post()));
  readonly isLikedByUser = computed(() => {
    const current = this.post();
    if (!current) {
      return false;
    }
    return this.likedPosts().includes(current.postId);
  });
  readonly reactionPreview = computed(() => this.buildReactionPreview(this.post()?.recentReactions));

  private readonly resetOnClose = effect(() => {
    if (!this.hasPost()) {
      this.commentForm.reset({ content: '' });
      this.commentSubmitting.set(false);
      this.replyTarget.set(null);
    }
  });

  requestClose(): void {
    if (this.commentSubmitting()) {
      return;
    }
    this.close.emit();
  }

  handleLike(): void {
    const current = this.post();
    if (!current) {
      return;
    }
    if (this.isLikedByUser()) {
      return;
    }
    this.like.emit(current.postId);
  }

  handleDislike(): void {
    const current = this.post();
    if (!current) {
      return;
    }
    this.dislike.emit(current.postId);
  }

  submitComment(): void {
    if (this.commentForm.invalid || this.commentSubmitting()) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const current = this.post();
    if (!current) {
      return;
    }

    this.commentSubmitting.set(true);
    const { content } = this.commentForm.getRawValue();
    this.addComment.emit({
      postId: current.postId,
      content: content.trim(),
      parentCommentId: this.replyTarget()?.mongoId ?? undefined,
    });
    this.replyTarget.set(null);
  }

  setCommentPendingState(pending: boolean): void {
    this.commentSubmitting.set(pending);
  }

  resetCommentForm(): void {
    this.commentForm.reset({ content: '' });
    this.commentSubmitting.set(false);
    this.replyTarget.set(null);
  }

  handleShare(): void {
    const current = this.post();
    if (!current) {
      return;
    }
    this.share.emit(current.postId);
  }

  getInitials(name: string | null | undefined): string {
    if (!name) {
      return '?';
    }
    return name
      .split(' ')
      .filter((segment) => segment.length > 0)
      .map((segment) => segment[0]!.toUpperCase())
      .slice(0, 2)
      .join('');
  }

  getReactionPreviewData(): { displayed: ForumReactionUser[]; remaining: number; total: number } {
    return this.reactionPreview();
  }

  startReply(target: { commentId: string; authorName: string; mongoId: string | null }): void {
    this.replyTarget.set(target);
    this.focusComposer();
  }

  cancelReply(): void {
    this.replyTarget.set(null);
  }

  private focusComposer(): void {
    queueMicrotask(() => {
      const element = this.commentInput?.nativeElement;
      if (!element) {
        return;
      }
      element.focus();
      const length = element.value.length;
      element.setSelectionRange(length, length);
    });
  }

  private buildReactionPreview(
    reactions?: ForumReactionUser[] | null,
  ): { displayed: ForumReactionUser[]; remaining: number; total: number } {
    const list = reactions ?? [];
    const displayed = list.slice(-3);
    const remaining = Math.max(list.length - displayed.length, 0);
    return { displayed, remaining, total: list.length };
  }
}
