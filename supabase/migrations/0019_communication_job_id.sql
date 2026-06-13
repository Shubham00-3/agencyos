-- Serverless-safe transcription: instead of awaiting the Sarvam batch job (which
-- can run for minutes and exceed a serverless function's time limit), we start
-- the job, store its id, and let the client poll for completion. This column
-- holds the Sarvam job id while transcript_status = 'processing'.

alter table communications
  add column if not exists transcript_job_id text;

notify pgrst, 'reload schema';
