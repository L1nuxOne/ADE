import { spawn } from "node:child_process";

import type { EngineCaps } from "@ade/engine";

import { isAdeCloudMissingError } from "./cloudClient";

export interface CapabilityProbeOptions {
  bin: string;
  helpArgs?: string[];
  detectCloud?: () => Promise<boolean>;
}

export async function probeCliHelp(
  bin: string,
  args: string[] = ["--help"],
): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "ignore"],
    });

    const stdout: string[] = [];

    child.stdout?.on("data", (chunk) => stdout.push(chunk.toString()));
    child.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        console.error(`Error probing help for "${bin}":`, error);
      }
      resolve("");
    });
    child.once("close", () => {
      resolve(stdout.join(""));
    });
  });
}

export function detectCapabilitiesFromHelp(helpOutput: string) {
  const normalized = helpOutput ?? "";
  const hasCDP = /cdp|chrome|browser/i.test(normalized);
  const hasMCP = /mcp/i.test(normalized);
  return { hasCDP, hasMCP };
}

export async function probeEngineCapabilities({
  bin,
  helpArgs,
  detectCloud,
}: CapabilityProbeOptions): Promise<EngineCaps> {
  const helpOutput = await probeCliHelp(bin, helpArgs);
  const { hasCDP, hasMCP } = detectCapabilitiesFromHelp(helpOutput);

  let hasCloud = false;
  if (detectCloud) {
    try {
      hasCloud = await detectCloud();
    } catch (error) {
      if (!isAdeCloudMissingError(error)) {
        console.error(`Cloud capability probe failed for "${bin}":`, error);
      }
      hasCloud = false;
    }
  }

  return { hasCDP, hasMCP, hasCloud };
}
