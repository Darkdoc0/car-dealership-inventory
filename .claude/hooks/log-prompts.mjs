#!/usr/bin/env node
/**
 * Claude Code hook: appends raw, unedited chat turns to PROMPTS.md.
 *
 *  - UserPromptSubmit -> logs the prompt exactly as typed.
 *  - Stop             -> logs Claude's final reply for that turn, read
 *                        verbatim from the session transcript.
 *
 * No summarising or rewriting happens here — the kata requires raw logs.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const file = join(root, 'PROMPTS.md');
const stamp = new Date().toISOString();

if (!existsSync(file)) {
  writeFileSync(file, '# PROMPTS\n\nRaw, unedited AI chat log for this project.\n');
}

function lastAssistantText(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return null;
  const lines = readFileSync(transcriptPath, 'utf8').trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type !== 'assistant') continue;
      const blocks = entry.message?.content ?? [];
      const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      if (text.trim()) return text;
    } catch { /* skip malformed line */ }
  }
  return null;
}

if (input.hook_event_name === 'UserPromptSubmit') {
  appendFileSync(file, `\n---\n\n### 🧑 User — ${stamp}\n\n${input.prompt}\n`);
} else if (input.hook_event_name === 'Stop') {
  const reply = lastAssistantText(input.transcript_path);
  if (reply) appendFileSync(file, `\n### 🤖 Claude — ${stamp}\n\n${reply}\n`);
}
