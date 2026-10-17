import { execFile } from "node:child_process";

/**
 * Execute an AppleScript script safely via stdin.
 */
export function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "osascript",
      ["-"],
      { maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
        } else {
          resolve(stdout.trim());
        }
      }
    );

    if (!child.stdin) {
      reject(new Error("Failed to open stdin for osascript"));
      return;
    }

    child.stdin.write(script);
    child.stdin.end();
  });
}

/**
 * Execute JavaScript for Automation (JXA) safely via stdin and parse the JSON result.
 */
export function runJXA<T = any>(script: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "osascript",
      ["-l", "JavaScript", "-"],
      { maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
        } else {
          const raw = stdout.trim();
          if (!raw) {
            resolve(undefined as unknown as T);
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(
              new Error(`Failed to parse JXA output as JSON: ${raw}\n${e}`)
            );
          }
        }
      }
    );

    if (!child.stdin) {
      reject(new Error("Failed to open stdin for osascript"));
      return;
    }

    child.stdin.write(script);
    child.stdin.end();
  });
}

/**
 * Helper to escape strings inside AppleScript double quotes.
 */
export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
