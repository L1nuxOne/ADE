#!/usr/bin/env node
// tools/orchestrator/plan-run.mjs
// ADE Orchestrator — drives BO4 pipeline using plan JSON.
// Usage:
//   node tools/orchestrator/plan-run.mjs run <taskId> [--dry-run] [--best-of 4] [--base main] [--reuse-task <id>]
//   node tools/orchestrator/plan-run.mjs list
// Expects: docs/plan/ade.plan.json (machine-friendly lock).
// Human-editable: docs/plan/ade.plan.yaml (optional; not parsed here).

import { spawn } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import process from "node:process";

function log(...a){ console.log("[orchestrator]", ...a); }
function err(...a){ console.error("[orchestrator:ERR]", ...a); }

function readJSON(p){
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch(e){ err("Failed to read JSON", p, e.message); process.exit(2); }
}

function runCmd(cmd, {cwd=process.cwd(), env=process.env, shell=true, echo=true}={}){
  return new Promise((res, rej)=>{
    if(echo) log("$", cmd);
    const child = spawn(cmd, {cwd, env, shell, stdio:"inherit"});
    child.on("exit", (code)=> code === 0 ? res(0) : rej(new Error(`cmd failed (${code}): ${cmd}`)));
  });
}

async function runCapture(cmd, {cwd=process.cwd(), env=process.env, shell=true, echo=true}={}){
  return new Promise((res, rej)=>{
    if(echo) log("$", cmd);
    const child = spawn(cmd, {cwd, env, shell});
    let out = "", errbuf = "";
    child.stdout.on("data", d=> out += d.toString());
    child.stderr.on("data", d=> errbuf += d.toString());
    child.on("exit", (code)=> code === 0 ? res({code, out, err: errbuf}) : rej(new Error(`cmd failed (${code}): ${cmd}\n${errbuf}`)));
  });
}

function usage(){
  console.log(`ADE Orchestrator
Usage:
  node tools/orchestrator/plan-run.mjs list
  node tools/orchestrator/plan-run.mjs run <taskId> [--dry-run] [--best-of N] [--base BRANCH] [--reuse-task ID]

Requires docs/plan/ade.plan.json (machine-friendly).`);
}

const repoRoot = process.cwd();
const planJsonPath = resolve(repoRoot, "docs/plan/ade.plan.json");
if(!existsSync(planJsonPath)){
  err("Missing docs/plan/ade.plan.json. Generate from YAML or use the bundle we provided.");
  process.exit(2);
}
const plan = readJSON(planJsonPath);

const args = process.argv.slice(2);
if(args.length === 0){ usage(); process.exit(1); }

const cmd = args[0];

if(cmd === "list"){
  console.log("Tasks:");
  for(const t of plan.tasks){
    console.log(`- ${t.id}  [${t.milestone}]  ${t.title}  status=${t.status}`);
  }
  process.exit(0);
}

if(cmd !== "run"){ usage(); process.exit(1); }

// parse flags
let taskId = args[1];
if(!taskId){ err("Missing <taskId>"); usage(); process.exit(1); }
let dryRun = args.includes("--dry-run");
let bestOf = null;
let baseBranch = null;
let reuseTask = null;

for(let i=2;i<args.length;i++){
  if(args[i] === "--dry-run") { /* already handled */ }
  else if(args[i] === "--best-of") { bestOf = parseInt(args[++i],10); }
  else if(args[i] === "--base") { baseBranch = args[++i]; }
  else if(args[i] === "--reuse-task") { reuseTask = args[++i]; }
}

const meta = plan.meta || {};
const prompts = meta.prompts || {};
const defaults = {
  best_of: plan.pipelines?.bo4?.best_of ?? 4,
  base_branch: meta.base_branch ?? "main"
};

function promptPathFromId(promptId){
  const fileName = promptId.replace(/\./g, "-") + ".yaml";
  return resolve(repoRoot, "docs/bo4/prompts", fileName);
}

function renderPromptTemplate(promptId, replacements){
  const promptPath = promptPathFromId(promptId);
  if(!existsSync(promptPath)){
    err("Prompt template not found:", promptPath);
    process.exit(2);
  }
  let tpl = readFileSync(promptPath, "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    tpl = tpl.replace(pattern, value);
  }
  return tpl;
}

bestOf = bestOf ?? defaults.best_of;
baseBranch = baseBranch ?? defaults.base_branch;

const task = plan.tasks.find(t => t.id === taskId);
if(!task){ err("Unknown task id:", taskId); process.exit(1); }
if(task.kind !== "bo4_pipeline"){ err("Task kind is not bo4_pipeline:", task.kind); process.exit(1); }

const evaluationModes = plan.evaluation_modes || {};
const modeName = task.evaluation_mode || 'shipping';
const modeConfig = evaluationModes[modeName] || {};
const conceptual = modeConfig.enforce_build === false && modeConfig.enforce_tests === false;

const runId = task.id;
const outDir = task.out_dir || join(meta.out_root || ".codex-cloud", runId);
const worktreesRoot = join(repoRoot, (meta.worktrees_root || "../_bo4"), runId);
const designIntent = task.design_intent;
const finalizeBranch = task.finalize_branch || `bo4/${runId}/winner`;
const workBranchPrefix = `bo4/${runId}`;

log("Task:", runId, task.title);
log("Design Intent:", designIntent);
log("Out dir:", outDir);
log("Worktrees root:", worktreesRoot);
log("Best-of:", bestOf, "Base:", baseBranch);
if(reuseTask) log("Reusing cloud task id:", reuseTask);
log("Evaluation mode:", modeName, conceptual ? '(conceptual)' : '(shipping)');

if(dryRun){
  console.log("Dry-run mode. No commands executed.");
  process.exit(0);
}

mkdirSync(outDir, {recursive:true});
mkdirSync(worktreesRoot, {recursive:true});

// STEP 1: create task (unless reuse)
let cloudTaskId = reuseTask;
if(!cloudTaskId){
  const taskName = `ade-${runId}-${Date.now()}`;
  const argsStr = `design_intent_path=${designIntent},base_branch=${baseBranch},work_branch_prefix=${workBranchPrefix},out_dir=${outDir}`;
  const cmdCreate = [
    "codex cloud create-task",
    `--best-of ${bestOf}`,
    `--prompt ${prompts.implement_variant || "bo4.implement.variant"}`,
    `--args ${argsStr}`,
    `--name ${taskName}`,
    `--json`
  ].join(" ");
  const { out } = await runCapture(cmdCreate);
  try {
    const parsed = JSON.parse(out.trim());
    cloudTaskId = parsed.id || parsed.task?.id;
  } catch(e){
    err("Failed to parse create-task JSON. Output was:\n", out);
    process.exit(2);
  }
  if(!cloudTaskId){
    err("No task id found in create-task response.");
    process.exit(2);
  }
  log("Cloud task id:", cloudTaskId);
}

// STEP 2: fetch artifacts (poll until 4 variant patch files exist)
const variants = ["var1","var2","var3","var4"];
async function fetchArtifacts(){
  const cmdFetch = `codex cloud export ${cloudTaskId} --all --dir ${outDir}`;
  await runCmd(cmdFetch);
}
function allVariantArtifactsPresent(){
  try {
    for(const v of variants){
      const patchPath = join(outDir, v, 'patch.diff');
      if(!existsSync(patchPath)) return false;
    }
    return true;
  } catch { return false; }
}

log("Fetching artifacts (polling until patches are present)...");
let attempts = 0;
while(attempts < 60){ // ~10-15 minutes max depending on poll delay
  await fetchArtifacts();
  if(allVariantArtifactsPresent()){ break; }
  attempts++;
  await new Promise(r => setTimeout(r, 10000)); // 10s
}
if(!allVariantArtifactsPresent()){
  err("Timed out waiting for variant patches. Check cloud task status:", cloudTaskId);
  process.exit(2);
}

// STEP 3: apply patches to worktrees
for(const v of variants){
  const wt = join(worktreesRoot, v);
  const br = `${workBranchPrefix}/${v}`;
  const patch = resolve(repoRoot, outDir, v, "patch.diff");
  const cmdAdd = `git worktree add ${wt} -b ${br} ${baseBranch}`;
  await runCmd(cmdAdd);
  const cmdApply = `(cd ${wt} && git apply --3way ${patch})`;
  await runCmd(cmdApply);
  const reportSrc = join(wt, 'docs', 'report.json');
  const reportDest = resolve(repoRoot, outDir, v, 'report.json');
  if (existsSync(reportSrc)) {
    mkdirSync(dirname(reportDest), { recursive: true });
    copyFileSync(reportSrc, reportDest);
  } else {
    log('Report not found for', v, '- expected at', reportSrc);
  }
}

// STEP 4: meta-review
const metaPromptId = prompts.meta_review || "bo4.meta.review";
const metaPromptText = renderPromptTemplate(metaPromptId, {
  design_intent_path: designIntent,
  variants_dir: outDir,
  local_worktrees_dir: worktreesRoot,
});
const metaPromptFile = join(outDir, "meta_prompt.yaml");
writeFileSync(metaPromptFile, metaPromptText, "utf8");
await runCmd(`codex exec --full-auto - < ${metaPromptFile}`);

// STEP 5: transplant / build composite winner
const metaReportPath = join(outDir, "meta_report.json");
const transplantPromptId = prompts.transplant_coder || "bo4.transplant.coder";
const transplantPromptText = renderPromptTemplate(transplantPromptId, {
  meta_report_path: metaReportPath,
  finalize_branch: finalizeBranch,
});
const transplantPromptFile = join(outDir, "transplant_prompt.yaml");
writeFileSync(transplantPromptFile, transplantPromptText, "utf8");
await runCmd(`codex exec --full-auto - < ${transplantPromptFile}`);

// STEP 6: verify locally
if(conceptual){
  log('Skipping build/test verification (conceptual mode).');
} else {
  await runCmd('pnpm build && pnpm test');
}
log('Task completed:', runId);

// Update state file
const statePath = resolve(repoRoot, ".codex-orchestrator/state.json");
let state = {};
try { state = JSON.parse(readFileSync(statePath, "utf8")); } catch {}
state[runId] = { status: "done", taskId: cloudTaskId, outDir, worktreesRoot, finalizeBranch, endedAt: new Date().toISOString() };
writeFileSync(statePath, JSON.stringify(state, null, 2));
log("State updated:", statePath);
