#!/usr/bin/env node
import process from "node:process";

import { cac } from "cac";

import { cloudClient } from "./client";

type CommonOptions = {
  json?: boolean;
};

async function run() {
  const client = cloudClient();
  const cli = cac("ade-cloud");

  cli
    .command("list", "List available cloud tasks")
    .option("--json", "Output JSON")
    .action(async (options: CommonOptions) => {
      try {
        const tasks = await client.list();
        if (options.json) {
          console.log(JSON.stringify(tasks, null, 2));
          return;
        }
        for (const task of tasks) {
          console.log(`${task.id}\t${task.title}\t${task.status ?? "unknown"}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  cli
    .command("show <id>", "Show details for a task")
    .option("--json", "Output JSON")
    .action(async (id: string, options: CommonOptions) => {
      try {
        const detail = await client.show(id);
        if (options.json) {
          console.log(JSON.stringify(detail, null, 2));
          return;
        }
        console.log(`${detail.id}: ${detail.title}`);
        console.log(detail.description ?? "");
        for (const turn of detail.conversation) {
          console.log(`[${turn.role}] ${turn.content}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  cli
    .command("diff <id>", "Print diff for a task")
    .action(async (id: string) => {
      try {
        const diff = await client.diff(id);
        process.stdout.write(diff.endsWith("\n") ? diff : `${diff}\n`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  cli
    .command("apply <id>", "Apply a task patch")
    .option("--branch <name>", "Target branch name")
    .option("--three-way", "Force three-way merge", { default: false })
    .option("--json", "Output JSON")
    .action(
      async (
        id: string,
        options: { branch?: string; threeWay?: boolean; json?: boolean },
      ) => {
        try {
          const result = await client.apply(id, {
            branch: options.branch,
            threeWay: Boolean(options.threeWay),
          });
          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(`Applied task ${id} on branch ${result.branch}`);
          }
        } catch (error) {
          console.error(error instanceof Error ? error.message : error);
          process.exitCode = 1;
        }
      },
    );

  cli.help();

  const parsed = cli.parse(process.argv);

  if (!cli.matchedCommand && parsed.args.length === 0) {
    cli.outputHelp();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
