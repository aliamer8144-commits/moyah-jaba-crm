/**
 * Play a subtle notification sound using Web Audio API
 * Two-tone ding: 880Hz for 150ms, then 1100Hz for 200ms
 * Only plays if user has previously interacted with the page
 */

let audioContext: AudioContext | null = null;
let hasInteracted = false;

if (typeof window !== 'undefined') {
  // Track user interaction for autoplay policy
  const interactionEvents = ['click', 'touchstart', 'keydown'];
  interactionEvents.forEach((event) => {
    document.addEventListener(event, () => {
      hasInteracted = true;
    }, { once: false });
  });
}

export function playNotificationSound() {
  try {
    if (typeof window === 'undefined') return;
    if (!hasInteracted) return; // Respect autoplay policy

    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    const ctx = audioContext;

    // Resume if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const gainNode = ctx.createGain();

    // First tone: 880Hz (A5) for 150ms
    const oscillator1 = ctx.createOscillator();
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(880, ctx.currentTime);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator1.connect(gain1);
    gain1.connect(ctx.destination);
    oscillator1.start(ctx.currentTime);
    oscillator1.stop(ctx.currentTime + 0.15);

    // Second tone: 1100Hz (C#6) for 200ms, starts after first
    const oscillator2 = ctx.createOscillator();
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(1100, ctx.currentTime + 0.16);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.16);
    gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.36);

    oscillator2.connect(gain2);
    gain2.connect(ctx.destination);
    oscillator2.start(ctx.currentTime + 0.16);
    oscillator2.stop(ctx.currentTime + 0.36);

    // Cleanup reference
    oscillator1.onended = () => { oscillator1.disconnect(); gain1.disconnect(); };
    oscillator2.onended = () => { oscillator2.disconnect(); gain2.disconnect(); };
  } catch {
    // Silently fail - audio not critical
  }
}
