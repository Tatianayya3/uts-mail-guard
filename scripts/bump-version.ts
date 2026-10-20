/**
 * Fase RELEASE: pone la misma versión SemVer en todos los paquetes del
 * monorepo (los que no son 0.0.0) y actualiza bun.lock.
 *
 *   bun run release:version 2.1.0
 *
 * Después: agrega la sección en CHANGELOG.md, haz commit y crea el tag
 * (git tag v2.1.0 && git push --follow-tags); release.yml hace el resto.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Glob } from "bun";

const version = process.argv[2]?.replace(/^v/, "");
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error("Uso: bun run release:version <x.y.z>   (ej. 2.1.0)");
  process.exit(1);
}

const manifests = [
  ...new Glob("{apps,packages,services}/*/package.json").scanSync("."),
];

for (const path of manifests) {
  const raw = readFileSync(path, "utf8");
  const pkg = JSON.parse(raw) as { name: string; version?: string };
  if (!pkg.version || pkg.version === "0.0.0") continue;
  // Reemplazo puntual para conservar el formato del archivo.
  const updated = raw.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`);
  writeFileSync(path, updated);
  console.log(`✓ ${pkg.name}: ${pkg.version} → ${version}`);
}

// bun.lock guarda la versión de cada workspace.
const install = Bun.spawnSync([process.execPath, "install"], {
  stdout: "inherit",
  stderr: "inherit",
});
if (install.exitCode !== 0) process.exit(install.exitCode ?? 1);

console.log(`
Listo. Siguientes pasos:
  1. Agrega "## [${version}]" en CHANGELOG.md
  2. git commit -am "release: v${version}"
  3. git tag v${version} && git push --follow-tags`);
