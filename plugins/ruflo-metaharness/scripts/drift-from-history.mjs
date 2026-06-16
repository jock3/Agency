#!/usr/bin/env node
// drift-from-history.mjs — iter 53 — one-command drift detection.
//
// Composes the existing pipeline into the workflow users actually want:
// "did my repo drift since the last audit?" Implementation:
//
//   1. List audit records from `metaharness-audit` memory namespace
//   2. Pick the most recent one (or filter --since Nd to skip recent ones
//      and use an older baseline)
//   3. Run a fresh oia-audit against the current repo state
//   4. Diff via audit-trend → structural distance + severity rollup
//   5. Alert if structural similarity falls below --threshold
//
// Until this iter, doing this required the user to:
//   $ npx ruflo metaharness audit-list --format json
//   $ # ... pick a key by hand from the listing
//   $ npx ruflo metaharness oia-audit --format json > /tmp/curr.json
//   $ npx ruflo metaharness audit-trend --baseline-key X --current-file /tmp/curr.json
// Now it's:
//   $ npx ruflo metaharness drift-from-history --threshold 0.95
//
// USAGE
//   node scripts/drift-from-history.mjs                       # default: last record vs now
//   node scripts/drift-from-history.mjs --baseline-since 7d   # use an audit ≥ 7d old
//   node scripts/drift-from-history.mjs --threshold 0.95      # alert under 0.95 similarity
//   node scripts/drift-from-history.mjs --format json
//   node scripts/drift-from-history.mjs --dry-run             # don't persist current
//
// EXIT CODES
//   0  ok (no drift below --threshold)
//   1  drift below --threshold (alert fired)
//   2  config / input error (no history available, etc.)
//   3  upstream metaharness absent — degraded payload returned

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const NS = process.env.METAHARNESS_AUDIT_NAMESPACE || 'metaharness-audit';
const CLI_PKG = process.env.CLI_CORE === '1'
  ? '@claude-flow/cli-core@alpha'
  : '@claude-flow/cli@latest';

const ARGS = (() => {
  const a = {
    path: '.', baselineSince: null, threshold: 0.95,
    dryRun: false, format: 'table',
  };
  for (let i = 2; i < process.argv.length; i++) {
    const v = process.argv[i];
    if (v === '--path') a.path = process.argv[++i];
    else if (v === '--baseline-since') a.baselineSince = process.argv[++i];
    else if (v === '--threshold') a.threshold = Number(process.argv[++i]);
    else if (v === '--dry-run') a.dryRun = true;
    else if (v === '--format') a.format = process.argv[++i];
  }
  return a;
})();

function emitAndExit(payload, code) {
  if (ARGS.format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`# drift-from-history\n`);
    if (payload.degraded) {
      console.log(`⊘ ${payload.reason}`);
    } else if (payload.error) {
      console.log(`✗ ${payload.error}`);
    } else {
      console.log(`Baseline:        ${payload.baseline?.key ?? payload.baseline?.startedAt}`);
      console.log(`Current:         ${payload.current?.startedAt ?? '(fresh)'}`);
      console.log('');
      const sd = payload.drift?.structuralDistance;
      if (sd && sd.verdict !== 'unavailable') {
        console.log(`Structural similarity: ${sd.overall} (${sd.verdict})`);
        console.log(`Distance:              ${sd.distance}`);
      }
      console.log('');
      if (payload.alert?.triggered) {
        console.log(`⚠ ALERT: ${payload.alert.reason}`);
      } else if (payload.alert) {
        console.log(`✓ ${payload.alert.reason}`);
      }
    }
  }
  process.exit(code);
}

function runScriptJson(script, args) {
  const r = spawnSync('node', [join(SCRIPTS_DIR, script), ...args, '--format', 'json'], {
    encoding: 'utf-8',
  });
  const m = /\{[\s\S]*\}/.exec(r.stdout || '');
  const json = m ? JSON.parse(m[0]) : null;
  // audit-list emits {records:[...]} — check that shape too
  const arrM = /\[[\s\S]*\]/.exec(r.stdout || '');
  return { json, exitCode: r.status ?? -1, stdout: r.stdout || '', stderr: r.stderr || '', arrMatch: arrM };
}

async function main() {
  // Step 1: list audit records
  const listArgs = ['--limit', '50'];
  if (ARGS.baselineSince) listArgs.push('--since', ARGS.baselineSince);
  const listResult = runScriptJson('audit-list.mjs', listArgs);
  if (listResult.exitCode !== 0) {
    emitAndExit({
      error: `audit-list failed (exit ${listResult.exitCode})`,
      stderrTail: listResult.stderr.slice(-200),
    }, 2);
  }
  const records = listResult.json?.records ?? listResult.json?.entries ?? [];
  if (records.length === 0) {
    emitAndExit({
      error: 'no audit records found in namespace ' + NS,
      hint: 'Run `ruflo metaharness oia-audit` at least once to seed history.',
    }, 2);
  }
  // Pick the most recent record (records are typically newest-first; if not,
  // sort by startedAt). Each record's key is in the entry.
  const sorted = [...records].sort((a, b) =>
    String(b.startedAt ?? b.key ?? '').localeCompare(String(a.startedAt ?? a.key ?? '')));
  const baseline = sorted[0];
  if (!baseline?.key) {
    emitAndExit({
      error: 'audit record has no `key` field — cannot reference',
      sample: baseline,
    }, 2);
  }

  // Step 2: run fresh oia-audit (write to temp file so audit-trend can read it)
  const tmp = mkdtempSync(join(tmpdir(), 'drift-from-history-'));
  const currPath = join(tmp, 'current.json');
  try {
    const auditArgs = ['--path', ARGS.path];
    if (ARGS.dryRun) auditArgs.push('--dry-run');
    const auditResult = runScriptJson('oia-audit.mjs', auditArgs);
    if (!auditResult.json || auditResult.exitCode !== 0) {
      emitAndExit({
        error: `oia-audit failed (exit ${auditResult.exitCode})`,
        stderrTail: auditResult.stderr.slice(-200),
      }, 2);
    }
    if (auditResult.json.degraded === true) {
      emitAndExit({
        degraded: true,
        reason: auditResult.json.reason || 'metaharness-not-available',
      }, 3);
    }
    writeFileSync(currPath, JSON.stringify(auditResult.json));

    // Step 3: audit-trend
    const trendArgs = [
      '--baseline-key', baseline.key,
      '--current', currPath,
      '--alert-on-distance-below', String(ARGS.threshold),
    ];
    const trendResult = runScriptJson('audit-trend.mjs', trendArgs);
    if (!trendResult.json) {
      emitAndExit({
        error: `audit-trend produced no JSON (exit ${trendResult.exitCode})`,
        stderrTail: trendResult.stderr.slice(-200),
      }, 2);
    }
    const trend = trendResult.json;
    const alertTriggered = trendResult.exitCode === 1;

    const payload = {
      adr: 'ADR-150 + ADR-152 §3.1',
      command: 'drift-from-history',
      baseline: {
        key: baseline.key,
        startedAt: baseline.startedAt ?? null,
      },
      current: {
        startedAt: auditResult.json.startedAt,
        composite: auditResult.json.composite,
      },
      drift: trend.delta,
      alert: {
        threshold: ARGS.threshold,
        triggered: alertTriggered,
        reason: trend.alert?.reasons?.join('; ')
          ?? (alertTriggered ? `similarity < ${ARGS.threshold}` : `similarity ≥ ${ARGS.threshold} — OK`),
      },
      generatedAt: new Date().toISOString(),
    };
    emitAndExit(payload, alertTriggered ? 1 : 0);
  } finally {
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

main().catch((e) => {
  console.error('drift-from-history crashed:', e.message || e);
  process.exit(2);
});
