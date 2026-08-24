"use client";

import { useState } from "react";
import { apiPost, apiPut, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ArticleComment } from "@/lib/types";

export function CommentItem({
  comment,
  articleId,
  currentUserId,
  onChanged,
}: {
  comment: ArticleComment;
  articleId: string;
  currentUserId?: string;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const [liking, setLiking] = useState(false);
  const [likes, setLikes] = useState(comment.likes);
  const [hasLiked, setHasLiked] = useState(currentUserId ? comment.likedBy.includes(currentUserId) : false);

  const isOwn = currentUserId && comment.userId === currentUserId;
  const authorName = comment.author.userId?.name ?? comment.author.name;

  async function submitReply() {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    await apiPost(`/api/articles/${articleId}/comments`, {
      content: replyText.trim(),
      parentCommentId: comment._id,
    });
    setSubmittingReply(false);
    setReplyText("");
    setReplying(false);
    onChanged();
  }

  async function saveEdit() {
    if (!editText.trim()) return;
    setSaving(true);
    await apiPut(`/api/comments/${comment._id}`, { content: editText.trim() });
    setSaving(false);
    setEditing(false);
    onChanged();
  }

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    await apiDelete(`/api/comments/${comment._id}`);
    onChanged();
  }

  async function toggleLike() {
    setLiking(true);
    const { data } = await apiPost<{ success: boolean; data?: { likes: number; hasLiked: boolean } }>(
      `/api/comments/${comment._id}/like`
    );
    setLiking(false);
    if (data.success && data.data) {
      setLikes(data.data.likes);
      setHasLiked(data.data.hasLiked);
    }
  }

  return (
    <div className={comment.depth > 0 ? "ml-6 border-l border-border pl-4" : ""}>
      <div className="rounded-2xl bg-card-bg shadow-atmospheric p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-heading">{authorName}</p>
          <p className="text-xs text-muted">{new Date(comment.createdAt).toLocaleDateString()}</p>
        </div>

        {editing ? (
          <div className="mt-2">
            <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} />
            <div className="mt-2 flex gap-2">
              <Button loading={saving} onClick={saveEdit}>
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-body">
            {comment.content}
            {comment.isEdited && <span className="ml-1 text-xs text-muted">(edited)</span>}
          </p>
        )}

        <div className="mt-2 flex gap-4 text-xs font-semibold">
          <button
            disabled={liking || !currentUserId}
            onClick={toggleLike}
            className={hasLiked ? "text-primary" : "text-muted"}
          >
            👍 {likes > 0 ? likes : ""} {hasLiked ? "Liked" : "Like"}
          </button>
          {comment.depth < 3 && (
            <button className="text-muted" onClick={() => setReplying((r) => !r)}>
              Reply
            </button>
          )}
          {isOwn && !editing && (
            <>
              <button className="text-muted" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="text-red-600" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>

        {replying && (
          <div className="mt-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              placeholder="Write a reply..."
            />
            <div className="mt-2 flex gap-2">
              <Button loading={submittingReply} disabled={!replyText.trim()} onClick={submitReply}>
                Post reply
              </Button>
              <Button variant="outline" onClick={() => setReplying(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              articleId={articleId}
              currentUserId={currentUserId}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}
