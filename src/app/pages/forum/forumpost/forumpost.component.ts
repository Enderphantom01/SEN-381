import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ForumTopic } from '../forum.models';
import { take } from 'rxjs';

@Component({
  selector: 'app-forumpost',
  templateUrl: './forumpost.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
})
export class ForumPostComponent {
  topics = input<ForumTopic[]>([]);
  close = output<void>();
  postCreated = output<void>();

  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);

  form = this.fb.group({
    title: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(200)],
      nonNullable: true,
    }),
    topicId: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    content: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(5000)],
      nonNullable: true,
    }),
    isAnonymous: this.fb.control(false, { nonNullable: true }),
    tags: this.fb.control<string>(''),
  });

  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  topicInput = signal('');

  private readonly ensureTopicSelection = effect(() => {
    const availableTopics = this.topics();
    const control = this.form.controls.topicId;
    if (!availableTopics.length) {
      this.topicInput.set('');
      if (control.value) {
        control.setValue('', { emitEvent: false });
      }
      return;
    }
    const current = control.value;
    const match = availableTopics.find((topic) => topic.topicId === current);
    if (match) {
      this.topicInput.set(match.title);
      return;
    }
    control.setValue(availableTopics[0].topicId, { emitEvent: false });
    this.topicInput.set(availableTopics[0].title);
  });

  cancel(): void {
    if (this.submitting()) {
      return;
    }
    this.close.emit();
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, topicId, content, isAnonymous, tags } = this.form.getRawValue();
    if (!topicId) {
      this.form.controls.topicId.markAsTouched();
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      topicId,
      isAnonymous,
      tags: this.parseTags(tags),
    };

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.apiService
      .createForumPost(payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.postCreated.emit();
          this.form.reset({
            title: '',
            topicId: '',
            content: '',
            isAnonymous: false,
            tags: '',
          });
          this.topicInput.set('');
        },
        error: (error) => {
          const fallback = 'Unable to create forum post';
          const message = error?.error?.message ?? error?.message ?? fallback;
          this.errorMessage.set(message);
          this.submitting.set(false);
        },
      });
  }

  onTopicInputChange(value: string): void {
    this.topicInput.set(value);
    const match = this.findTopicByLabel(value);
    this.form.controls.topicId.setValue(match?.topicId ?? '');
  }

  private parseTags(rawTags: string | null | undefined): string[] {
    if (!rawTags) {
      return [];
    }
    return rawTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  private findTopicByLabel(label: string): ForumTopic | undefined {
    const normalized = label.trim().toLowerCase();
    return this.topics().find(
      (topic) =>
        topic.title.trim().toLowerCase() === normalized ||
        topic.topicId.trim().toLowerCase() === normalized,
    );
  }
}
