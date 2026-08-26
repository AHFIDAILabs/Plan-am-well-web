"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import { apiGet, apiPost } from "@/lib/api";
import { logEvent } from "@/lib/analytics";
import { startRingback, stopRingback } from "@/lib/ringtone";
import { Button } from "@/components/ui/Button";
import { Icon, ICONS } from "@/components/ui/Icon";

// Same public fallback TURN server mobile's client already uses when the
// backend's /video/ice-servers call fails — not a new secret being introduced.
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
];

type CallState = "starting" | "ringing" | "connecting" | "connected" | "ended" | "error";

export function VideoCallRoom({
  appointmentId,
  backHref,
  callType: requestedCallType = "video",
}: {
  appointmentId: string;
  backHref: string;
  callType?: "audio" | "video";
}) {
  const router = useRouter();
  const { socket, connected } = useSocket();
  // The initiator's requested type drives the /video/token call below; the
  // joiner instead gets the authoritative value back in that response (the
  // backend already returns callType for Case B/C joins) — this state is
  // updated from either source so both sides render the same layout.
  const [callType, setCallType] = useState<"audio" | "video">(requestedCallType);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isInitiatorRef = useRef(false);
  const readyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  // ICE candidates that arrive before setRemoteDescription has run were
  // previously just discarded (caught and ignored) — real candidates lost,
  // not a benign race. Queue and drain once the remote description lands,
  // matching mobile's iceCandidateQueue in VideoCallScreen.tsx.
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const failedRetryCountRef = useRef(0);
  const connectedAtRef = useRef<number | null>(null);
  const callStartedLoggedRef = useRef(false);
  const callEndedLoggedRef = useRef(false);

  const [state, setState] = useState<CallState>("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ring-out for the caller — previously the "Ringing…" state was purely
  // visual with no actual tone playing, so a doctor calling out had no
  // audible confirmation the call was actually going out.
  useEffect(() => {
    if (state === "ringing") {
      startRingback();
    } else {
      stopRingback();
    }
    return () => stopRingback();
  }, [state]);

  const markConnected = useCallback(() => {
    setState("connected");
    if (!callStartedLoggedRef.current) {
      callStartedLoggedRef.current = true;
      connectedAtRef.current = Date.now();
      logEvent("call_started", { call_type: callType, is_initiator: isInitiatorRef.current });
      if (!durationTimerRef.current) {
        durationTimerRef.current = setInterval(() => setCallDurationSec((s) => s + 1), 1000);
      }
    }
  }, [callType]);

  const logCallEnded = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (callEndedLoggedRef.current || !connectedAtRef.current) return;
    callEndedLoggedRef.current = true;
    const durationSeconds = Math.round((Date.now() - connectedAtRef.current) / 1000);
    logEvent("call_ended", { call_type: callType, duration_seconds: durationSeconds });
  }, [callType]);

  useEffect(() => {
    if (!socket || !connected || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    function cleanup() {
      if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
      socket!.off("webrtc-ready");
      socket!.off("webrtc-offer");
      socket!.off("webrtc-answer");
      socket!.off("webrtc-ice-candidate");
      socket!.off("call-ended");
      socket!.off("call-cancelled");
      socket!.emit("leave-appointment", { appointmentId });
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      pcRef.current = null;
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: requestedCallType === "video",
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const { data: tokenRes } = await apiPost<{
          success: boolean;
          data?: { isInitiator: boolean; callType?: "audio" | "video" };
          message?: string;
        }>("/api/video/token", { appointmentId, callType: requestedCallType });

        if (!tokenRes.success || !tokenRes.data) {
          throw new Error(tokenRes.message || "Could not start the call.");
        }
        isInitiatorRef.current = tokenRes.data.isInitiator;
        // A joiner gets the authoritative type back from the appointment
        // (set by whoever initiated) rather than trusting requestedCallType,
        // which for a joiner is just this page's own default/guess.
        if (tokenRes.data.callType) setCallType(tokenRes.data.callType);
        setState(tokenRes.data.isInitiator ? "ringing" : "connecting");

        let iceServers = FALLBACK_ICE_SERVERS;
        try {
          const { data: iceRes } = await apiGet<{ success: boolean; data?: { iceServers: RTCIceServer[] } }>(
            "/api/video/ice-servers"
          );
          if (iceRes.success && iceRes.data?.iceServers?.length) iceServers = iceRes.data.iceServers;
        } catch {
          // fall back silently
        }

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Drains ICE candidates that arrived before the remote description
        // was set — previously these were just discarded by the catch block
        // in the ice-candidate handler below, silently losing real candidates
        // rather than queueing them (mirrors mobile's iceCandidateQueue).
        async function drainPendingIceCandidates() {
          const queued = pendingIceCandidatesRef.current;
          pendingIceCandidatesRef.current = [];
          for (const candidate of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {
              // stale candidate after renegotiation — safe to discard
            }
          }
        }

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          markConnected();
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket!.emit("webrtc-ice-candidate", { appointmentId, candidate: event.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            markConnected();
            failedRetryCountRef.current = 0;
            return;
          }
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            // Don't dead-end on the first failure — the webrtc-ready retry
            // loop below (already running) will keep re-offering with
            // iceRestart. Only surface a terminal error if several retries
            // in a row haven't recovered the connection.
            failedRetryCountRef.current += 1;
            if (failedRetryCountRef.current >= 4) {
              setErrorMessage("The connection failed. Check your network and try again.");
              setState("error");
            } else {
              // The connectionState === "connected" branch above already
              // returned early, so reaching here means we're not currently
              // connected — safe to show "connecting" unconditionally
              // without reading the `state` variable (which this effect's
              // closure would otherwise read as a stale value frozen at
              // mount, since it only runs once).
              setState("connecting");
            }
          }
        };

        socket!.emit("join-appointment", { appointmentId });

        async function makeOffer() {
          if (pc.signalingState !== "stable") return;
          // iceRestart lets this double as a recovery offer when
          // onconnectionstatechange above detects a failed/disconnected
          // state — same connection, fresh ICE gathering, no need for a
          // separate restart code path.
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          socket!.emit("webrtc-offer", { appointmentId, offer });
        }

        socket!.on("webrtc-ready", (payload: { appointmentId: string }) => {
          if (payload.appointmentId !== appointmentId) return;
          if (isInitiatorRef.current) makeOffer();
        });

        socket!.on(
          "webrtc-offer",
          async (payload: { appointmentId: string; offer: RTCSessionDescriptionInit }) => {
            if (payload.appointmentId !== appointmentId) return;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            await drainPendingIceCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket!.emit("webrtc-answer", { appointmentId, answer });
          }
        );

        socket!.on(
          "webrtc-answer",
          async (payload: { appointmentId: string; answer: RTCSessionDescriptionInit }) => {
            if (payload.appointmentId !== appointmentId) return;
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              await drainPendingIceCandidates();
            }
          }
        );

        socket!.on(
          "webrtc-ice-candidate",
          async (payload: { appointmentId: string; candidate: RTCIceCandidateInit }) => {
            if (payload.appointmentId !== appointmentId) return;
            if (!pc.remoteDescription) {
              pendingIceCandidatesRef.current.push(payload.candidate);
              return;
            }
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {
              // stale candidate after renegotiation — safe to discard
            }
          }
        );

        socket!.on("call-ended", (payload: { appointmentId: string }) => {
          if (payload.appointmentId !== appointmentId) return;
          logCallEnded();
          setState("ended");
          cleanup();
        });

        socket!.on("call-cancelled", (payload: { appointmentId: string; reason?: string }) => {
          if (payload.appointmentId !== appointmentId) return;
          // "answered-elsewhere" targets this same user's OTHER sessions when
          // THEY are the one answering a ring — not relevant to this screen,
          // which only ever reaches here once already committed to the call.
          if (payload.reason === "answered-elsewhere") return;
          logCallEnded();
          setErrorMessage(payload.reason === "no-answer" ? "No answer." : "The call was declined.");
          setState("ended");
          cleanup();
        });

        socket!.emit("webrtc-ready", { appointmentId });
        readyIntervalRef.current = setInterval(() => {
          if (pc.connectionState === "connected") {
            if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
            return;
          }
          socket!.emit("webrtc-ready", { appointmentId });
        }, 5000);
      } catch (err: any) {
        setErrorMessage(err?.message || "Could not access your camera or microphone.");
        setState("error");
      }
    }

    start();

    return () => {
      cancelled = true;
      logCallEnded();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, appointmentId]);

  async function endCall() {
    logCallEnded();
    // Still ringing out, nobody has answered yet — cancel instead of end, so
    // the other side's incoming-call UI dismisses immediately (call-cancelled)
    // rather than ringing the full 60s after we've already backed out.
    if (state === "ringing") {
      await apiPost("/api/video/cancel", { appointmentId });
    } else {
      await apiPost("/api/video/end-call", { appointmentId });
    }
    setState("ended");
    router.push(backHref);
  }

  function toggleMic() {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  }

  function toggleCamera() {
    const nextOn = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = nextOn));
    setCameraOn(nextOn);
    socket?.emit("webrtc-call-mode-changed", { appointmentId, callMode: nextOn ? "video" : "audio" });
  }

  function formatDuration(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const statusText =
    (state === "starting" && "Setting up your call…") ||
    (state === "ringing" && "Ringing…") ||
    (state === "connecting" && "Connecting…") ||
    (state === "ended" && (errorMessage ?? "Call ended.")) ||
    (state === "error" && (errorMessage ?? "Something went wrong.")) ||
    "";

  return (
    <div className="flex h-full min-h-[70vh] flex-col rounded-card bg-black text-white">
      {callType === "video" ? (
        <div className="relative flex-1 overflow-hidden rounded-card">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full bg-black object-cover" />
          {state !== "connected" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-center">
              <p className="px-6 text-lg font-semibold">{statusText}</p>
            </div>
          )}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 h-32 w-24 rounded-lg border border-white/30 bg-black object-cover shadow-atmospheric"
          />
        </div>
      ) : (
        // Voice-only layout — no video elements at all, since getUserMedia
        // above never requested a camera track for an audio call.
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10">
            <Icon path={ICONS.person} className="h-14 w-14 text-white/70" />
          </div>
          {state === "connected" ? (
            <p className="font-mono text-lg text-white/90">{formatDuration(callDurationSec)}</p>
          ) : (
            <p className="px-6 text-center text-lg font-semibold">{statusText}</p>
          )}
        </div>
      )}
      {/* Silent audio element for the remote stream in voice-only mode — the
          video layout's own <video> tag already plays audio, this covers
          the branch above that renders no <video> at all. */}
      {callType === "audio" && <video ref={remoteVideoRef} autoPlay className="hidden" />}

      <div className="flex items-center justify-center gap-4 py-6">
        <button
          onClick={toggleMic}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            micOn ? "bg-white/15 text-white" : "bg-white text-black"
          }`}
        >
          <Icon path={ICONS.mic} className="h-6 w-6" />
        </button>
        {callType === "video" && (
          <button
            onClick={toggleCamera}
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              cameraOn ? "bg-white/15 text-white" : "bg-white text-black"
            }`}
          >
            <Icon path={ICONS.video} className="h-6 w-6" />
          </button>
        )}
        <Button
          onClick={endCall}
          aria-label="End call"
          className="h-14! w-14! rounded-full! px-0! bg-red-600 text-white hover:bg-red-700"
        >
          <Icon path={ICONS.close} className="h-6 w-6" />
        </Button>
      </div>

      {state === "ended" && (
        <div className="pb-6 text-center">
          <Button variant="outline" onClick={() => router.push(backHref)} className="bg-white">
            Back to appointment
          </Button>
        </div>
      )}
    </div>
  );
}
