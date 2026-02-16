let currentAudio: HTMLAudioElement | null = null;

export const stopCurrentAudio = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
};

export const prefetchAudio = async (text: string, id: string): Promise<boolean> => {
  // Logic to prefetch/cache is handled by Service Worker for PWA
  // For runtime prefetch, we can just load it into an Audio object
  try {
    const audioPath = id === 'sehri_dua' ? '/media/Sehri.mp3' : '/media/Iftar.mp3';
    const audio = new Audio(audioPath);
    audio.preload = 'auto'; // Hint to browser to download
    return true;
  } catch (e) {
    return false;
  }
};

export const playDuaAudio = (text: string, id: string): HTMLAudioElement | null => {
  try {
    stopCurrentAudio(); // Stop any currently playing audio

    const audioPath = id === 'sehri_dua' ? '/media/Sehri.mp3' : '/media/Iftar.mp3';
    const audio = new Audio(audioPath);
    currentAudio = audio;

    audio.play().catch(e => {
      console.error("Playback failed:", e);
    });

    return audio;
  } catch (error) {
    console.error("Audio setup error:", error);
    return null;
  }
};