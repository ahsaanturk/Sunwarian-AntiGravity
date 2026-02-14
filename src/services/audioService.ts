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

export const playDuaAudio = async (text: string, id: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const audioPath = id === 'sehri_dua' ? '/media/Sehri.mp3' : '/media/Iftar.mp3';
      const audio = new Audio(audioPath);

      audio.onended = () => resolve(true);
      audio.onerror = () => {
        console.error(`Error playing ${audioPath}`);
        resolve(false);
      };

      audio.play().catch(e => {
        console.error("Playback failed:", e);
        resolve(false);
      });
    } catch (error) {
      console.error("Audio setup error:", error);
      resolve(false);
    }
  });
};