"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiGet } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Article, ArticleCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  all: "All",
  educational: "Educational",
  "success-story": "Success Story",
  "policy-brief": "Policy Brief",
  "community-resource": "Community Resource",
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ category: ArticleCategory; count: number }[]>([]);
  const [category, setCategory] = useState<ArticleCategory | "all">("all");
  const [search, setSearch] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [category, search]);

  useEffect(() => {
    apiGet<{ success: boolean; data?: { category: ArticleCategory; count: number }[] }>("/api/articles/categories").then(
      ({ data }) => {
        if (data.success && data.data) setCategories(data.data);
      }
    );
  }, []);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Article[]; message?: string }>(`/api/articles${query ? `?${query}` : ""}`).then(
      ({ data }) => {
        if (data.success && data.data) {
          setArticles(data.data);
        } else {
          setError(data.message ?? "Could not load articles.");
        }
      }
    );
  }, [query]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Health Articles</h1>
      <p className="mt-1 text-sm text-muted">Educational content, success stories, and community resources.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input placeholder="Search articles" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as ArticleCategory)}
          className="sm:w-64"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {CATEGORY_LABELS[c.category] ?? c.category} ({c.count})
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!articles && !error && <p className="mt-6 text-sm text-muted">Loading articles...</p>}
      {articles && articles.length === 0 && <p className="mt-6 text-sm text-muted">No articles found.</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles?.map((article) => (
          <Link
            key={article._id}
            href={`/app/articles/${article.slug}`}
            className="overflow-hidden rounded-card bg-card-bg shadow-atmospheric transition-shadow hover:shadow-md"
          >
            {article.featuredImage?.url && (
              <div className="relative h-36 w-full bg-accent-pink-bg">
                <Image src={article.featuredImage.url} alt={article.title} fill className="object-cover" />
              </div>
            )}
            <div className="p-4">
              <span className="rounded-full bg-accent-blue-bg px-2 py-0.5 text-xs font-semibold text-accent-blue-fg">
                {CATEGORY_LABELS[article.category] ?? article.category}
              </span>
              <p className="mt-2 font-semibold text-heading">{article.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{article.excerpt}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                {article.readTime && <span>{article.readTime} min read</span>}
                <span>{article.commentsCount} comments</span>
                <span>{article.likes} likes</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
