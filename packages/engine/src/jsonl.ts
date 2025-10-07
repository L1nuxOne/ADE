export class JsonlParseError extends Error {
  constructor(message: string, public readonly line: string) {
    super(message);
    this.name = "JsonlParseError";
  }
}

export type JsonlValueHandler<T> = (value: T) => void;

export interface JsonlParser<T> {
  (chunk: Buffer | string): void;
  flush(): void;
}

/**
 * Creates a streaming JSONL parser that can ingest buffers of arbitrary size and
 * emit parsed objects whenever a full line is available.
 */
export function createJsonlParser<T>(onValue: JsonlValueHandler<T>): JsonlParser<T> {
  let buffer = "";

  const parse: JsonlParser<T> = ((chunk: Buffer | string) => {
    buffer += chunk.toString();

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      try {
        onValue(JSON.parse(line) as T);
      } catch (error) {
        throw new JsonlParseError(
          `Failed to parse JSONL line: ${(error as Error).message}`,
          line,
        );
      }
    }
  }) as JsonlParser<T>;

  parse.flush = () => {
    const line = buffer.trim();
    buffer = "";

    if (!line) {
      return;
    }

    try {
      onValue(JSON.parse(line) as T);
    } catch (error) {
      throw new JsonlParseError(
        `Failed to parse JSONL line: ${(error as Error).message}`,
        line,
      );
    }
  };

  return parse;
}
