"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Conversation, doctorFullName, doctorImageUrl, userImageUrl } from "@/lib/types";

export function ConversationList({ basePath }: { basePath: string }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Conversation[]; message?: string }>("/api/chat/conversations").then(
      ({ data }) => {
        if (data.success && data.data) {
          setConversations(data.data);
        } else {
          setError(data.message ?? "Could not load your messages.");
        }
      }
    );
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!conversations) {
    return <p className="mt-6 text-sm text-muted">Loading conversations...</p>;
  }

  if (conversations.length === 0) {
    return (
      <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
        <p className="text-sm text-muted">
          No conversations yet. A chat opens automatically once an appointment is confirmed.
        </p>
      </div>
    );
  }

  const isDoctor = user?.role === "Doctor";

  return (
    <div className="mt-6 flex flex-col gap-2">
      {conversations.map((conv) => {
        const name = isDoctor ? conv.participants.userId?.name ?? "Patient" : doctorFullName(conv.participants.doctorId);
        const imageUrl = isDoctor ? userImageUrl(conv.participants.userId) : doctorImageUrl(conv.participants.doctorId);
        const unread = isDoctor ? conv.unreadCount.doctor : conv.unreadCount.user;
        const appointmentId =
          typeof conv.appointmentId === "string" ? conv.appointmentId : conv.appointmentId._id;

        return (
          <Link
            key={conv._id}
            href={`${basePath}/${appointmentId}`}
            className="flex items-center gap-3 rounded-card bg-card-bg shadow-atmospheric p-3 transition-shadow hover:shadow-md"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-accent-pink-bg">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold text-heading">{name}</p>
                {!conv.isActive && <span className="shrink-0 text-xs text-muted">Locked</span>}
              </div>
              <p className="truncate text-sm text-muted">
                {conv.lastMessage?.isDeleted
                  ? "This message was deleted"
                  : conv.lastMessage?.content ?? "No messages yet"}
              </p>
            </div>
            {unread > 0 && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
