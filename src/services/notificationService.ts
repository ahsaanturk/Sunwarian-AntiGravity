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

export const playAlarm = (type: 'beep' | 'alarm') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();

  const playTone = (freq: number, start: number, duration: number, vol: number = 0.2) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, start);
    gainNode.gain.setValueAtTime(vol, start);
    gainNode.gain.exponentialRampToValueAtTime(0.01, start + duration);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  };

  if (type === 'beep') {
    // Pre-notification: "Beep 3 times"
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const startTime = now + (i * 0.8); // 800ms gap
      playTone(660, startTime, 0.2);
      playTone(880, startTime + 0.15, 0.4); // Slightly higher pitch second tone
    }
  } else {
    // On-time Alarm: "Beep in different way for 6 times"
    const now = ctx.currentTime;
    // Pattern: A distinct triplet alert (High-Mid-High)
    const notes = [880, 587, 880]; // A5, D5, A5

    for (let loop = 0; loop < 6; loop++) {
      const loopStart = now + (loop * 1.2); // 1.2s per loop
      notes.forEach((note, index) => {
        playTone(note, loopStart + (index * 0.15), 0.15, 0.3);
      });
    }
  }
};