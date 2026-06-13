import "server-only";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SarvamAIClient } from "sarvamai";

// All Sarvam-specific wiring lives here so the rest of the app stays
// provider-agnostic. Saaras v3 supports translate mode, which stores call
// transcripts in English for the internal team.

export type TranscribeOptions = {
  // BCP-47 hint, or "unknown" to auto-detect.
  languageCode: string;
  // saaras:v3 output mode. "translate" produces English transcript text.
  mode: "transcribe" | "translate" | "codemix";
  fileName: string;
};

function getClient(): SarvamAIClient | null {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return null;
  return new SarvamAIClient({ apiSubscriptionKey: key });
}

export function isConfigured(): boolean {
  return !!process.env.SARVAM_API_KEY;
}

export type JobResult =
  | { state: "processing" }
  | { state: "failed"; error: string }
  | { state: "done"; transcript: string; language: string | null };

// Kick off a batch job WITHOUT waiting for it. Returns the Sarvam job id, which
// we store and poll later — this keeps the request short enough for serverless
// (the minutes-long transcription happens on Sarvam's side, not in our function).
export async function startTranscriptionJob(
  bytes: Uint8Array,
  opts: TranscribeOptions,
): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("SARVAM_API_KEY is not configured");

  const work = await mkdtemp(join(tmpdir(), "sarvam-"));
  const inPath = join(work, opts.fileName);
  try {
    await writeFile(inPath, bytes);
    const job = await client.speechToTextJob.createJob({
      model: "saaras:v3",
      mode: opts.mode,
      languageCode: opts.languageCode as never,
      withDiarization: false,
    });
    await job.uploadFiles([inPath]);
    await job.start();
    return job.jobId;
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

// Check a job's status. When it's finished, download + parse the transcript.
// Fast enough to run inside a single serverless invocation.
export async function fetchTranscriptionResult(jobId: string): Promise<JobResult> {
  const client = getClient();
  if (!client) throw new Error("SARVAM_API_KEY is not configured");

  const job = client.speechToTextJob.getJob(jobId);
  const status = await job.getStatus();
  const state = status.job_state;

  if (state === "Failed") {
    return { state: "failed", error: status.error_message ?? "Transcription failed" };
  }
  if (state !== "Completed") {
    return { state: "processing" };
  }

  const work = await mkdtemp(join(tmpdir(), "sarvam-out-"));
  try {
    await mkdir(work, { recursive: true });
    await job.downloadOutputs(work);
    const files = await readdir(work);
    let transcript = "";
    let language: string | null = null;
    for (const f of files.filter((n) => n.endsWith(".json"))) {
      const raw = await readFile(join(work, f), "utf8");
      const data = JSON.parse(raw) as {
        transcript?: string;
        language_code?: string | null;
      };
      if (data.transcript) transcript += (transcript ? "\n" : "") + data.transcript;
      if (data.language_code) language = data.language_code;
    }
    return { state: "done", transcript: transcript.trim(), language };
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

// Short English summary of a (possibly Hindi/Punjabi) transcript, via Sarvam's
// own LLM — keeps everything on one vendor / one key.
export async function summarizeTranscript(transcript: string): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("SARVAM_API_KEY is not configured");
  const text = transcript.trim();
  if (!text) return "";

  const res = await client.chat.completions({
    model: "sarvam-30b",
    messages: [
      {
        role: "system",
        content:
          "You summarise client call transcripts for a web design agency. The transcript may be in Hindi, Punjabi, or English, but your response must be in English only. Write a 2-4 sentence summary, then a short '- ' bulleted list of any decisions or action items. Be faithful; do not invent details.",
      },
      { role: "user", content: text.slice(0, 12000) },
    ],
    temperature: 0.2,
  });

  const choice = (res as { choices?: { message?: { content?: string } }[] })
    .choices?.[0];
  return choice?.message?.content?.trim() ?? "";
}

export async function translateTranscriptToEnglish(transcript: string): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("SARVAM_API_KEY is not configured");
  const text = transcript.trim();
  if (!text) return "";
  const detected = await client.text
    .identifyLanguage({ input: text.slice(0, 1000) })
    .then((r) => r.language_code)
    .catch(() => null);
  if (detected === "en-IN") return text;
  const sourceLanguage = detected || "hi-IN";

  const chunks = chunkText(text, 1800);
  const translated = await Promise.all(
    chunks.map(async (input) => {
      const res = await client.text.translate({
        input,
        source_language_code: sourceLanguage as never,
        target_language_code: "en-IN",
        model: "sarvam-translate:v1",
      });
      return res.translated_text.trim();
    }),
  );

  return translated.filter(Boolean).join("\n\n").trim();
}

function chunkText(text: string, maxChars: number): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    if ((current + "\n\n" + paragraph).trim().length <= maxChars) {
      current = (current + "\n\n" + paragraph).trim();
      continue;
    }
    if (current) chunks.push(current);
    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }
    for (let i = 0; i < paragraph.length; i += maxChars) {
      chunks.push(paragraph.slice(i, i + maxChars));
    }
    current = "";
  }
  if (current) chunks.push(current);
  return chunks;
}
