// Simple Web Audio API Notification Chime
export const playNotificationSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Play a nice clean "ding" (two tones)
        const playTone = (freq: number, startTime: number, duration: number) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start(audioCtx.currentTime + startTime);
            oscillator.stop(audioCtx.currentTime + startTime + duration);
        };

        playTone(523.25, 0, 0.4); // C5
        playTone(659.25, 0.1, 0.6); // E5

    } catch (e) {
        console.warn("Audio Context not supported or blocked by browser.");
    }
};
