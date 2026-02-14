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
    // Soft double chime
    playTone(660, ctx.currentTime, 0.5);
    playTone(880, ctx.currentTime + 0.2, 0.5);
  } else {
    // Melodic sequence for the main alarm
    const now = ctx.currentTime;
    const notes = [440, 554, 659, 880]; // A major arpeggio
    notes.forEach((note, i) => {
        playTone(note, now + i * 0.25, 0.8, 0.15);
    });
    // Repeat once
    notes.forEach((note, i) => {
        playTone(note, now + 1.2 + i * 0.25, 0.8, 0.15);
    });
  }
};