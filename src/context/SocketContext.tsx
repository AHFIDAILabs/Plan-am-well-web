"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { startIncomingRing, stopIncomingRing } from "@/lib/ringtone";

// Socket tokens are minted with a 10 min expiry (see backend authController's
// mintSocketToken) — refresh a couple minutes early so the connection never
// drops mid-session from an expired handshake token.
const TOKEN_REFRESH_MS = 8 * 60 * 1000;

interface IncomingCall {
  // Only set for a direct appointment-page-initiated call. A chat-initiated
  // request doesn't know its appointmentId up front — the respond endpoint
  // resolves that once accepted (see acceptCall below).
  appointmentId?: string;
  callType?: "audio" | "video";
  callerName?: string;
  conversationId?: string;
  videoRequestId?: string;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const canCall = !!user && (user.role === "User" || user.role === "Doctor");
  const portalBase = user?.role === "Doctor" ? "/provider" : "/app";

  const connect = useCallback(async () => {
    const { data } = await apiGet<{ success: boolean; data?: { token: string } }>("/api/socket-token");
    const token = data.data?.token;
    if (!token) return;

    if (socketRef.current) {
      // Already have a live socket for this session — never replace the
      // object. Every consumer holding this reference (VideoCallRoom most
      // critically) would silently stop receiving events the moment the
      // underlying socket changed, which is exactly what happened here every
      // TOKEN_REFRESH_MS: a fresh io() instance replaced the old one mid-call,
      // React's effect cleanup closed the peer connection in response, and
      // nothing ever reconnected it. socket.io-client re-reads `auth` on its
      // own next (re)connect attempt, so just keeping it fresh here is enough
      // — no forced disconnect needed for an otherwise-healthy connection.
      socketRef.current.auth = { token };
      return;
    }

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      forceNew: true,
      path: "/socket.io/",
      withCredentials: false,
    });

    newSocket.on("connect", () => setConnected(true));
    newSocket.on("disconnect", () => setConnected(false));
    newSocket.on("call-ringing", (payload: IncomingCall) => setIncomingCall(payload));
    // A chat-initiated call previously only ever showed up here if the
    // recipient's ChatThread for that exact conversation happened to already
    // be open — every other page (including this global modal, which is
    // what actually reaches someone regardless of what they're looking at)
    // never even knew a request existed. call-ringing was the only event
    // wired up globally; this is its chat-originated counterpart.
    newSocket.on(
      "video-call-request",
      (payload: { conversationId: string; requesterName: string; requestId: string }) =>
        setIncomingCall({
          callerName: payload.requesterName,
          conversationId: payload.conversationId,
          videoRequestId: payload.requestId,
        })
    );
    // socket.io-client's own reconnection (reconnectionAttempts: 5) gives up
    // permanently once exhausted — an outage longer than that would leave
    // this socket dead for the rest of the session with nothing to revive
    // it now that the 8-minute forced-replacement is gone. One more attempt
    // via a fresh handshake, matching mobile's socketService.ts fallback.
    newSocket.io.on("reconnect_failed", () => {
      newSocket.connect();
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, []);

  useEffect(() => {
    if (!canCall) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      return;
    }

    connect();
    const refreshTimer = setInterval(connect, TOKEN_REFRESH_MS);

    return () => {
      clearInterval(refreshTimer);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCall, user?.id]);

  // The incoming-call modal was previously silent — nothing distinguished it
  // from any other modal appearing, so a doctor/patient not looking at their
  // screen at that exact moment would miss the call entirely.
  useEffect(() => {
    if (incomingCall) {
      startIncomingRing();
    } else {
      stopIncomingRing();
    }
    return () => stopIncomingRing();
  }, [incomingCall]);

  async function acceptCall() {
    if (!incomingCall) return;
    const { appointmentId, conversationId, videoRequestId } = incomingCall;
    setIncomingCall(null);

    if (conversationId && videoRequestId) {
      // Chat-initiated — the appointmentId isn't known until the backend
      // resolves it here (see requestVideoCall/respond in chatController.ts).
      const { data } = await apiPost<{
        success: boolean;
        data?: { appointmentId: string; callType?: "audio" | "video" };
      }>(`/api/chat/conversation/${conversationId}/video-request/${videoRequestId}/respond`, { accept: true });
      if (data.success && data.data) {
        const type = data.data.callType === "audio" ? "?type=audio" : "";
        router.push(`${portalBase}/appointments/${data.data.appointmentId}/call${type}`);
      }
      return;
    }

    router.push(`${portalBase}/appointments/${appointmentId}/call`);
  }

  async function declineCall() {
    if (!incomingCall) return;
    const { appointmentId, conversationId, videoRequestId } = incomingCall;
    setIncomingCall(null);

    if (conversationId && videoRequestId) {
      await apiPost(`/api/chat/conversation/${conversationId}/video-request/${videoRequestId}/respond`, {
        accept: false,
      });
      return;
    }

    await apiPost("/api/video/decline", { appointmentId });
  }

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
      <Modal open={!!incomingCall} onClose={declineCall} title="Incoming call">
        <div className="flex flex-col items-center gap-4 py-2">
          <p className="text-center text-body">
            {incomingCall?.callerName ?? "Someone"} is calling you{" "}
            {incomingCall?.callType === "audio" ? "(audio)" : "(video)"}.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={declineCall}>
              Decline
            </Button>
            <Button variant="primary" onClick={acceptCall}>
              Accept
            </Button>
          </div>
        </div>
      </Modal>
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
