const FORMATS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export function voiceError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access was blocked. Allow it for this site and try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No microphone was found.";
  if (name === "NotReadableError") return "The microphone is in use by another app.";
  return error instanceof Error ? error.message : "The recording failed.";
}

export async function startVoiceCapture() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  let context: AudioContext;
  try {
    context = new AudioContext();
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
  try {
    const analyzer = context.createAnalyser();
    analyzer.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyzer);
    const mimeType = FORMATS.find((format) => MediaRecorder.isTypeSupported?.(format));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.start();
    const startedAt = performance.now();
    const samples = new Float32Array(analyzer.fftSize);
    const release = () => {
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    };
    const collect = () => {
      const blob = () => new Blob(chunks, { type: recorder.mimeType });
      if (recorder.state === "inactive") return Promise.resolve(blob());
      return new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(blob());
        recorder.onerror = () => reject(new Error("The recording failed."));
        recorder.stop();
      });
    };
    return {
      level: () => {
        analyzer.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) sum += value * value;
        return Math.min(1, Math.sqrt(sum / samples.length) * 3);
      },
      elapsedMs: () => performance.now() - startedAt,
      stop: async () => {
        let blob: Blob;
        try {
          blob = await collect();
        } finally {
          release();
        }
        const decoder = new OfflineAudioContext(1, 1, 44100);
        const audio = await decoder.decodeAudioData(await blob.arrayBuffer());
        return {
          channels: Array.from({ length: audio.numberOfChannels }, (_, index) =>
            audio.getChannelData(index).slice(),
          ),
          sampleRate: audio.sampleRate,
        };
      },
      cancel: () => {
        if (recorder.state !== "inactive") recorder.stop();
        release();
      },
    };
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
    throw error;
  }
}
