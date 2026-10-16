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

export class VoiceCapture {
  private readonly startedAt = performance.now();
  private readonly samples: Float32Array<ArrayBuffer>;
  private readonly stream: MediaStream;
  private readonly context: AudioContext;
  private readonly analyzer: AnalyserNode;
  private readonly recorder: MediaRecorder;
  private readonly chunks: Blob[];

  private constructor(
    stream: MediaStream,
    context: AudioContext,
    analyzer: AnalyserNode,
    recorder: MediaRecorder,
    chunks: Blob[],
  ) {
    this.stream = stream;
    this.context = context;
    this.analyzer = analyzer;
    this.recorder = recorder;
    this.chunks = chunks;
    this.samples = new Float32Array(analyzer.fftSize);
  }

  static async start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
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
      return new VoiceCapture(stream, context, analyzer, recorder, chunks);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      if (context) await context.close();
      throw error;
    }
  }

  level() {
    this.analyzer.getFloatTimeDomainData(this.samples);
    let sum = 0;
    for (const value of this.samples) sum += value * value;
    return Math.min(1, Math.sqrt(sum / this.samples.length) * 3);
  }

  elapsedMs() {
    return performance.now() - this.startedAt;
  }

  async stop() {
    let blob: Blob;
    try {
      blob = await this.collect();
    } finally {
      this.release();
    }
    const decoder = new OfflineAudioContext(1, 1, 44100);
    const audio = await decoder.decodeAudioData(await blob.arrayBuffer());
    return {
      channels: Array.from({ length: audio.numberOfChannels }, (_, index) =>
        audio.getChannelData(index).slice(),
      ),
      sampleRate: audio.sampleRate,
    };
  }

  cancel() {
    if (this.recorder.state !== "inactive") this.recorder.stop();
    this.release();
  }

  private collect() {
    const blob = () => new Blob(this.chunks, { type: this.recorder.mimeType });
    if (this.recorder.state === "inactive") return Promise.resolve(blob());
    return new Promise<Blob>((resolve, reject) => {
      this.recorder.onstop = () => resolve(blob());
      this.recorder.onerror = () => reject(new Error("The recording failed."));
      this.recorder.stop();
    });
  }

  private release() {
    this.stream.getTracks().forEach((track) => track.stop());
    void this.context.close();
  }
}
