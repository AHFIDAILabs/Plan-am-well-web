"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/context/AuthContext";
import { CommentItem } from "@/components/articles/CommentItem";
import { Article, ArticleComment, ArticleCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  all: "All",
  educational: "Educational",
  "success-story": "Success Story",
  "policy-brief": "Policy Brief",
  "community-resource": "Community Resource",
};

export default function ArticleDetailPage() {
  const params = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(false);

  const [comments, setComments] = useState<ArticleComment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Article; message?: string }>(`/api/articles/${params.slug}`).then(({ data }) => {
      if (data.success && data.data) {
        setArticle(data.data);
      } else {
        setError(data.message ?? "Could not load this article.");
      }
    });
  }, [params.slug]);

  function loadComments(articleId: string) {
    apiGet<{ success: boolean; data?: ArticleComment[] }>(`/api/articles/${articleId}/comments`).then(({ data }) => {
      if (data.success && data.data) setComments(data.data);
    });
  }

  useEffect(() => {
    if (article) loadComments(article._id);
  }, [article?._id]);

  async function handleLike() {
    if (!article || liking) return;
    setLiking(true);
    const { data } = await apiPost<{ success: boolean; data?: { likes: number } }>(`/api/articles/${article._id}/like`);
    setLiking(false);
    if (data.success && data.data) {
      setArticle((a) => (a ? { ...a, likes: data.data!.likes } : a));
      setLiked(true);
    }
  }

  async function handlePostComment() {
    if (!article || !newComment.trim()) return;
    setPosting(true);
    await apiPost(`/api/articles/${article._id}/comments`, { content: newComment.trim() });
    setPosting(false);
    setNewComment("");
    loadComments(article._id);
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/app/articles" className="mt-4 inline-block text-sm font-semibold text-primary">
          &larr; Back to articles
        </Link>
      </div>
    );
  }

  if (!article) {
    return <p className="text-sm text-muted">Loading article...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/articles" className="text-sm font-semibold text-primary">
        &larr; Back to articles
      </Link>

      {article.featuredImage?.url && (
        <div className="relative mt-4 h-64 w-full overflow-hidden rounded-xl bg-accent-pink-bg">
          <Image src={article.featuredImage.url} alt={article.title} fill className="object-cover" />
        </div>
      )}

      <span className="mt-4 inline-block rounded-full bg-accent-blue-bg px-2 py-0.5 text-xs font-semibold text-accent-blue-fg">
        {CATEGORY_LABELS[article.category] ?? article.category}
      </span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-heading">{article.title}</h1>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>{article.author.name}</span>
        {article.publishedAt && <span>{new Date(article.publishedAt).toLocaleDateString()}</span>}
        {article.readTime && <span>{article.readTime} min read</span>}
        <span>{article.views} views</span>
      </div>

      {article.content && (
        // Admin-authored CMS content only (createArticle requires
        // authorize("Admin")) — not user-generated, so this is the same
        // trust boundary the mobile app already extends when it renders
        // article.content as HTML.
        <div
          className="prose prose-sm mt-6 max-w-none text-body"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      )}

      {article.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-accent-gray-bg px-2 py-0.5 text-xs text-accent-gray-fg">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button variant={liked ? "primary" : "outline"} loading={liking} onClick={handleLike}>
          👍 {article.likes} {liked ? "Liked" : "Like"}
        </Button>
      </div>

      {article.commentsEnabled && (
        <div className="mt-10">
          <h2 className="font-bold text-heading">Comments ({article.commentsCount})</h2>

          <div className="mt-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              placeholder="Share your thoughts..."
            />
            <Button className="mt-2" loading={posting} disabled={!newComment.trim()} onClick={handlePostComment}>
              Post comment
            </Button>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {comments === null && <p className="text-sm text-muted">Loading comments...</p>}
            {comments?.length === 0 && <p className="text-sm text-muted">No comments yet — be the first.</p>}
            {comments?.map((c) => (
              <CommentItem
                key={c._id}
                comment={c}
                articleId={article._id}
                currentUserId={user?.id}
                onChanged={() => loadComments(article._id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
