#!/usr/bin/env node
import process from "node:process";

import { cloudClient } from "./client";

function printHelp(): void {
  console.log(`ade-cloud usage:\n  list [--json]\n  show <id> [--json]\n  diff <id>\n  apply <id> [--branch <name>] [--three-way]`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.shift();

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const client = cloudClient();

  try {
    switch (command) {
      case "list": {
        const json = args.includes("--json");
        const tasks = await client.list();
        if (json) {
          console.log(JSON.stringify(tasks, null, 2));
        } else {
          for (const task of tasks) {
            console.log(`${task.id}\t${task.title}\t${task.status ?? "unknown"}`);
          }
        }
        break;
      }
      case "show": {
        const id = args[0];
        if (!id) {
          throw new Error("show requires an id");
        }
        const json = args.includes("--json");
        const detail = await client.show(id);
        if (json) {
          console.log(JSON.stringify(detail, null, 2));
        } else {
          console.log(`${detail.id}: ${detail.title}`);
          console.log(detail.description ?? "");
          for (const turn of detail.conversation) {
            console.log(`[${turn.role}] ${turn.content}`);
          }
        }
        break;
      }
      case "diff": {
        const id = args[0];
        if (!id) {
          throw new Error("diff requires an id");
        }
        const diff = await client.diff(id);
        process.stdout.write(diff);
        if (!diff.endsWith("\n")) {
          process.stdout.write("\n");
        }
        break;
      }
      case "apply": {
        const id = args[0];
        if (!id) {
          throw new Error("apply requires an id");
        }
        let branch: string | undefined;
        let threeWay = false;
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === "--branch") {
            branch = args[i + 1];
            i++;
          } else if (arg === "--three-way") {
            threeWay = true;
          }
        }
        const result = await client.apply(id, { branch, threeWay });
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      default:
        printHelp();
        process.exitCode = 1;
        break;
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

void main();
