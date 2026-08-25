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
  appointmentId: string;
  callType?: "audio" | "video";
  callerName?: string;
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

    socketRef.current?.disconnect();

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

  function acceptCall() {
    if (!incomingCall) return;
    const { appointmentId } = incomingCall;
    setIncomingCall(null);
    router.push(`${portalBase}/appointments/${appointmentId}/call`);
  }

  async function declineCall() {
    if (!incomingCall) return;
    const { appointmentId } = incomingCall;
    setIncomingCall(null);
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
