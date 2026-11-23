import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function walkFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("Tahap 5 — Audit Keamanan SEC-01 s.d. SEC-14 & Runtime Hygiene", () => {
  it("src/instrumentation.ts dan next.config.ts aman untuk bundle Edge & Node next dev", () => {
    const instrumentationPath = path.resolve(process.cwd(), "src/instrumentation.ts");
    const instrumentationSrc = fs.readFileSync(instrumentationPath, "utf8");

    expect(instrumentationSrc).not.toMatch(
      /^\s*import\s+.*reconciler/m
    );
    expect(instrumentationSrc).not.toMatch(/^\s*import\s+.*["']pg["']/m);
    expect(instrumentationSrc).toContain('process.env.NEXT_RUNTIME === "nodejs"');
    expect(instrumentationSrc).toContain('import("@/lib/ai/reconciler")');

    const nextConfigPath = path.resolve(process.cwd(), "next.config.ts");
    const nextConfigSrc = fs.readFileSync(nextConfigPath, "utf8");
    expect(nextConfigSrc).toContain("poweredByHeader: false");
    expect(nextConfigSrc).toContain('serverExternalPackages: ["pg"]');
  });

  it("tidak ada service_role atau DATABASE_ADMIN_URL di seluruh folder src/ (P4, SEC-01, SEC-12)", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const sourceFiles = walkFiles(srcDir, (file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file));
    expect(sourceFiles.length).toBeGreaterThan(0);

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      expect(content, `Dilarang service_role di ${file}`).not.toContain("service_role");
      expect(content, `Dilarang DATABASE_ADMIN_URL di ${file}`).not.toContain(
        "DATABASE_ADMIN_URL"
      );
    }
  });

  it("seluruh 30 file route API memerlukan autentikasi JWT (SEC-05) dan 8 route dosen strictly GET-only (SEC-09)", () => {
    const apiDir = path.resolve(process.cwd(), "src/app/api");
    const routeFiles = walkFiles(apiDir, (file) => path.basename(file) === "route.ts");

    const lecturerRoutes = routeFiles.filter((file) =>
      file.includes(`${path.sep}lecturer${path.sep}`)
    );
    const mobileRoutes = routeFiles.filter(
      (file) => !file.includes(`${path.sep}lecturer${path.sep}`)
    );

    expect(lecturerRoutes).toHaveLength(8);
    expect(mobileRoutes).toHaveLength(22);
    expect(routeFiles).toHaveLength(30);

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, "utf8");
      const hasAuthGuard =
        content.includes("withAuthRoute(") ||
        content.includes("authenticateRequest(");
      expect(hasAuthGuard, `Route tanpa guard JWT di ${file}`).toBe(true);
    }

    for (const file of lecturerRoutes) {
      const content = fs.readFileSync(file, "utf8");
      expect(content, `Route dosen harus punya GET di ${file}`).toMatch(
        /export\s+async\s+function\s+GET\s*\(/
      );
      expect(content, `Dilarang POST/PATCH/PUT/DELETE di ${file}`).not.toMatch(
        /export\s+(?:async\s+)?function\s+(?:POST|PATCH|PUT|DELETE)\s*\(/
      );
    }
  });

  it("pool database memakai BEGIN + SET LOCAL ROLE plas_api + request.jwt.claims (SEC-12)", () => {
    const poolPath = path.resolve(process.cwd(), "src/lib/db/pool.ts");
    const poolSrc = fs.readFileSync(poolPath, "utf8");

    expect(poolSrc).toContain('"BEGIN"');
    expect(poolSrc).toContain("SET LOCAL ROLE plas_api");
    expect(poolSrc).toContain("set_config('request.jwt.claims'");
  });

  it("klien dosen hanya memakai GET (Read-Only) dan modal mendukung tombol Escape", () => {
    const clientPath = path.resolve(process.cwd(), "src/lib/api/lecturer-client.ts");
    const clientSrc = fs.readFileSync(clientPath, "utf8");

    expect(clientSrc).toContain('method: "GET"');
    expect(clientSrc).not.toMatch(/method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/);

    const statesPath = path.resolve(process.cwd(), "src/components/ui/states.tsx");
    const statesSrc = fs.readFileSync(statesPath, "utf8");
    expect(statesSrc).toContain('e.key === "Escape"');
  });
});
