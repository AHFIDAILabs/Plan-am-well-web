"use client";

// Synthesized call tones via the Web Audio API — no external audio asset to
// source/license. Two independent players so the caller's "ringing out" and
// the callee's "incoming call" are audibly distinct, the way a real phone
// distinguishes them.
//
// Caller (VideoCallRoom, while state === "ringing"): the standard North
// American ringback tone — 440Hz + 480Hz together, 2s on / 4s off.
//
// Callee (SocketContext's incoming-call modal): a higher, more attention-
// grabbing double-beep pattern, since this is the one that needs to actually
// get someone's attention to pick up.

type ToneController = { stop: () => void };

function playTonePattern(
  frequencies: number[],
  cadence: { onMs: number; offMs: number }
): ToneController {
  if (typeof window === "undefined") return { stop: () => {} };
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return { stop: () => {} };

  const ctx: AudioContext = new AudioCtx();
  ctx.resume().catch(() => {});

  // The context is often created deep inside an async chain (well after the
  // click that started the call), which several browsers' autoplay policy
  // silently refuses to resume — no error, it just never plays. If it's
  // still suspended after the immediate attempt, retry on the next tap
  // anywhere on the page (the mic/camera buttons, the page itself) rather
  // than staying silently dead for the rest of the call.
  if (ctx.state !== "running") {
    const retryResume = () => {
      ctx.resume().catch(() => {});
    };
    document.addEventListener("pointerdown", retryResume, { once: true });
    document.addEventListener("keydown", retryResume, { once: true });
    ctx.addEventListener("statechange", () => {
      if (ctx.state === "running") {
        document.removeEventListener("pointerdown", retryResume);
        document.removeEventListener("keydown", retryResume);
      }
    });
  }

  const oscillators = frequencies.map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    return osc;
  });
  const gain = ctx.createGain();
  gain.gain.value = 0;
  oscillators.forEach((osc) => {
    osc.connect(gain);
    osc.start();
  });
  gain.connect(ctx.destination);

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function loop(on: boolean) {
    if (stopped) return;
    gain.gain.setValueAtTime(on ? 0.15 : 0, ctx.currentTime);
    timer = setTimeout(() => loop(!on), on ? cadence.onMs : cadence.offMs);
  }
  loop(true);

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (timer) clearTimeout(timer);
      oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // already stopped
        }
      });
      ctx.close().catch(() => {});
    },
  };
}

let ringbackController: ToneController | null = null;
let incomingController: ToneController | null = null;

export function startRingback() {
  if (ringbackController) return;
  ringbackController = playTonePattern([440, 480], { onMs: 2000, offMs: 4000 });
}

export function stopRingback() {
  ringbackController?.stop();
  ringbackController = null;
}

export function startIncomingRing() {
  if (incomingController) return;
  incomingController = playTonePattern([1000, 1200], { onMs: 700, offMs: 700 });
}

export function stopIncomingRing() {
  incomingController?.stop();
  incomingController = null;
}
