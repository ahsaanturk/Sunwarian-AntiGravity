export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notifications");
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const sendNotification = (title: string, body: string) => {
  if (Notification.permission === "granted") {
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300]);
    }

    new Notification(title, {
      body,
      icon: "https://cdn-icons-png.flaticon.com/512/4358/4358667.png",
      tag: "ramadan-alert"
    });
  }
};

let currentAudioCtx: AudioContext | null = null;

export const stopAlarm = () => {
  if (currentAudioCtx) {
    currentAudioCtx.close();
    currentAudioCtx = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

export const playAlarm = (type: 'beep' | 'alarm', tone: 'digital' | 'islamic' | 'classic' = 'digital', eventType?: 'sehri' | 'iftar') => {
  // Stop any currently playing alarm first
  stopAlarm();

  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  currentAudioCtx = ctx;

  const playTone = (freq: number, start: number, duration: number, vol: number = 0.2, type: 'sine' | 'triangle' | 'sawtooth' | 'square' = 'sine') => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    gainNode.gain.setValueAtTime(vol, start);
    gainNode.gain.exponentialRampToValueAtTime(0.01, start + duration);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  };

  const now = ctx.currentTime;

  if (type === 'beep') {
    // Pre-notification: Simple Beeps
    for (let i = 0; i < 3; i++) {
      const startTime = now + (i * 0.8);
      playTone(tone === 'islamic' ? 523.25 : 660, startTime, 0.4, 0.3); // C5 for Islamic, E5 for Digital/Classic
    }
  } else {
    // MAIN ALARM
    if (tone === 'digital') {
      // STRONG & LONG: High-pitched, urgent, repetitive (15 loops ~ 12s)
      const notes = [880, 1174, 880, 1174]; // A5, D6
      for (let loop = 0; loop < 15; loop++) {
        const loopStart = now + (loop * 0.8);
        notes.forEach((note, index) => {
          playTone(note, loopStart + (index * 0.1), 0.1, 0.4, 'triangle'); // Triangle wave for sharper sound
        });
      }
    } else if (tone === 'islamic') {
      // HARMONIC CHIME: Soft, bell-like, peaceful (Major Chord arp)
      const chime = [523.25, 659.25, 783.99, 1046.50]; // C Major with C6
      for (let loop = 0; loop < 5; loop++) {
        const loopStart = now + (loop * 2.5); // Slower pace
        chime.forEach((note, index) => {
          // Staggered entry for harp/bell effect
          playTone(note, loopStart + (index * 0.2), 2.0, 0.3, 'sine');
        });
      }
    } else if (tone === 'classic') {
      // CLASSIC ALARM: Very Strong, Old School Alarm Clock (Sawtooth/Square)
      // Pattern: Ringer (Fast trill) ... Pause ... Ringer
      // Note: 880Hz (A5) for classic bell sound
      for (let loop = 0; loop < 10; loop++) {
        const loopStart = now + (loop * 2.0); // 2 second cycle

        // Generate a "Rring-Rring" effect (2 bursts)
        for (let burst = 0; burst < 2; burst++) {
          const burstStart = loopStart + (burst * 0.4);
          // Fast trill within burst
          for (let click = 0; click < 6; click++) {
            playTone(880, burstStart + (click * 0.05), 0.05, 0.5, 'square');
            playTone(800, burstStart + (click * 0.05), 0.05, 0.5, 'sawtooth'); // Mix for dissonance
          }
        }
      }
    }
  }
};