// src/app/pages/forum/forum.models.ts
export interface ForumTopic {
  topicId: string;
  title: string;
  postCount?: number;
}

export interface ForumReactionUser {
  name: string;
  avatarUrl: string;
}

export interface ForumPostSummary {
  postId: string;
  title: string;
  preview: string;
  authorName: string;
  authorRole?: string | null;
  topicId: string;
  topicTitle: string;
  isAnonymous: boolean;
  likes: number;
  dislikes: number;
  commentCount: number;
  createdAt: string;
  tags?: string[];
  recentReactions?: ForumReactionUser[];
}

export interface ForumComment {
  commentId: string;
  content: string;
  authorName: string;
  authorRole?: string | null;
  isInstructor: boolean;
  likes: number;
  dislikes: number;
  createdAt: string;
  replies?: ForumComment[];
  mongoId?: string | null;
}

export interface ForumPostDetail {
  postId: string;
  title: string;
  content: string;
  authorName: string;
  authorRole?: string | null;
  topicId: string;
  topicTitle: string;
  isAnonymous: boolean;
  likes: number;
  dislikes: number;
  createdAt: string;
  comments: ForumComment[];
  tags?: string[];
  commentCount?: number;
  recentReactions?: ForumReactionUser[];
}

export interface ForumCommentPayload {
  postId: string;
  content: string;
  parentCommentId?: string;
}
