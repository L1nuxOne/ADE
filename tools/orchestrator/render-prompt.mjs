#!/usr/bin/env node
// Compose a concrete coder prompt from schema + intent + pointers.
// Usage:
//  node tools/orchestrator/render-prompt.mjs \
//    --schema docs/prompt_schemas/coder.v3.yaml \
//    --design-intent docs/design_intent/ade.m1.terminals.yaml \
//    --task-id m1-01.terminals \
//    --milestone M1 \
//    --tags terminals,pty \
//    --out-file .codex-cloud/m1-01-coder.yaml

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function arg(name, dflt=null){ const i=process.argv.indexOf(name); return i>0 ? process.argv[i+1] : dflt; }
function die(m){ console.error("[render]", m); process.exit(2); }
function indent(s, n=2){ const pad=' '.repeat(n); return s.split('\n').map(l=>pad+l).join('\n'); }
function bulletize(arr){ return (arr||[]).map(x=>`- ${x}`).join('\n'); }

const schemaPath = resolve(arg("--schema"));
const diPath = resolve(arg("--design-intent"));
const outFile = resolve(arg("--out-file",".codex-cloud/rendered.yaml"));
const taskId = arg("--task-id","");
const milestone = arg("--milestone","");
const tags = (arg("--tags","")||"").split(",").map(s=>s.trim()).filter(Boolean);

if(!schemaPath || !diPath) die("Missing --schema or --design-intent");

const tpl = readFileSync(schemaPath, "utf8");
const diContent = indent(readFileSync(diPath, "utf8"), 2);

let pointers = [];
// Load general guidelines
try {
  const g = JSON.parse(readFileSync("docs/prompt_meta/guidelines.general.json","utf8"));
  pointers.push(...(g.rules||[]));
} catch(_e){ /* optional */ }

// Load lessons and filter by applies_to
try {
  const L = JSON.parse(readFileSync("docs/prompt_meta/lessons.json","utf8"));
  for(const it of (L.lessons||[])){
    const a = it.applies_to || {};
    const okTask = (a.tasks||[]).includes(taskId);
    const okMs = (a.milestones||[]).includes(milestone);
    const okTag = (a.tags||[]).some(t => tags.includes(t));
    if(okTask || okMs || okTag){ pointers.push(...(it.pointers||[])); }
  }
} catch(_e){ /* optional */ }

const rendered = tpl
  .replace("{{POINTERS}}", bulletize(pointers) || "- (none)")
  .replace("{{DESIGN_INTENT_CONTENT}}", diContent);

writeFileSync(outFile, rendered, "utf8");
console.log(outFile);
