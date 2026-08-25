"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { QuickExitButton } from "@/components/safety/QuickExitButton";
import { Icon, ICONS } from "@/components/ui/Icon";
import { Doctor, Product, Article, Clinic, doctorFullName, doctorImageUrl } from "@/lib/types";

interface SearchResults {
  doctors: Doctor[];
  products: Product[];
  articles: Article[];
  clinics: Clinic[];
}

const EMPTY_RESULTS: SearchResults = { doctors: [], products: [], articles: [], clinics: [] };

function hasAnyResults(results: SearchResults): boolean {
  return results.doctors.length > 0 || results.products.length > 0 || results.articles.length > 0 || results.clinics.length > 0;
}

function SearchBox({ placeholder }: { placeholder: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      apiGet<{ success: boolean; data?: SearchResults }>(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5`)
        .then(({ data }) => setResults(data.success && data.data ? data.data : EMPTY_RESULTS))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Icon path={ICONS.search} className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-border bg-input-bg pl-10 pr-4 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-card border border-border bg-card-bg p-2 shadow-atmospheric">
          {loading && <p className="p-3 text-sm text-muted">Searching...</p>}

          {!loading && !hasAnyResults(results) && <p className="p-3 text-sm text-muted">No results for &quot;{query.trim()}&quot;.</p>}

          {!loading && results.doctors.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Doctors</p>
              {results.doctors.map((doctor) => (
                <Link
                  key={doctor._id}
                  href={`/app/doctors/${doctor._id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-input-bg"
                >
                  {doctorImageUrl(doctor) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doctorImageUrl(doctor)!} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-pink-bg text-xs font-bold text-primary">
                      {doctor.firstName[0]}
                      {doctor.lastName[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-heading">{doctorFullName(doctor)}</p>
                    <p className="truncate text-xs text-muted">{doctor.specialization}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && results.products.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Products</p>
              {results.products.map((product) => (
                <Link
                  key={product._id}
                  href={`/app/pharmacy/${product._id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-input-bg"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-amber-bg text-accent-amber-fg">
                    <Icon path={ICONS.pill} className="h-4 w-4" />
                  </div>
                  <p className="truncate text-sm font-semibold text-heading">{product.name}</p>
                </Link>
              ))}
            </div>
          )}

          {!loading && results.articles.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Articles</p>
              {results.articles.map((article) => (
                <Link
                  key={article._id}
                  href={`/app/articles/${article.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-input-bg"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-gray-bg text-accent-gray-fg">
                    <Icon path={ICONS.article} className="h-4 w-4" />
                  </div>
                  <p className="truncate text-sm font-semibold text-heading">{article.title}</p>
                </Link>
              ))}
            </div>
          )}

          {!loading && results.clinics.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Clinics</p>
              {results.clinics.map((clinic) => (
                <div key={clinic._id} className="flex items-center gap-3 rounded-xl px-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-blue-bg text-accent-blue-fg">
                    <Icon path={ICONS.pin} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-heading">{clinic.name}</p>
                    {clinic.city && <p className="truncate text-xs text-muted">{clinic.city}</p>}
                  </div>
                  <Link href="/app/clinics" onClick={() => setOpen(false)} className="shrink-0 text-xs font-semibold text-tertiary">
                    View on map &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TopBar({
  variant,
  onMenuClick,
  notificationsHref,
  profileHref,
}: {
  variant: "patient" | "provider";
  onMenuClick: () => void;
  notificationsHref: string;
  profileHref: string;
}) {
  const { user, isAnonymous } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card-bg px-4 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-full text-heading hover:bg-input-bg lg:hidden"
      >
        <Icon path={ICONS.menu} className="h-5 w-5" />
      </button>

      <div className="hidden flex-1 md:flex">
        <SearchBox
          placeholder={variant === "patient" ? "Search clinics, articles..." : "Search doctors, products, articles, clinics"}
        />
      </div>
      <div className="flex-1 md:hidden" />

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {variant === "patient" && (
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-input-bg px-3 py-1.5 text-xs font-semibold text-accent-gray-fg lg:flex">
            <Icon path={ICONS.lock} className="h-3.5 w-3.5" />
            Confidential Session
          </div>
        )}

        <Link
          href={notificationsHref}
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-heading hover:bg-input-bg"
        >
          <Icon path={ICONS.notifications} className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />}
        </Link>

        <Link href={profileHref} className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-input-bg md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
            {isAnonymous ? "?" : (user?.name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
          </div>
          <span className="max-w-24 truncate text-sm font-semibold text-heading">
            {isAnonymous ? "Guest" : user?.name || user?.email}
          </span>
        </Link>

        <QuickExitButton />
      </div>
    </header>
  );
}
