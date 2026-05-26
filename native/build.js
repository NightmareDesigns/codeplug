const path = require("node:path");
const { mkdir } = require("node:fs/promises");
const { spawnSync } = require("node:child_process");

const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "native", "bin");
const sourceFile = path.join(rootDir, "native", "decrypter.c");
const outputFile = path.join(outDir, process.platform === "win32" ? "decrypter.exe" : "decrypter");

const compilerCandidates =
  process.platform === "win32" ? ["gcc", "clang", "cl"] : ["cc", "gcc", "clang"];

const runCompiler = (compiler) => {
  const isMsvc = compiler === "cl";
  const args = isMsvc
    ? ["/nologo", "/O2", "/W3", sourceFile, `/Fe:${outputFile}`]
    : [sourceFile, "-O2", "-Wall", "-Wextra", "-o", outputFile];

  return spawnSync(compiler, args, { stdio: "pipe", encoding: "utf8" });
};

const build = async () => {
  await mkdir(outDir, { recursive: true });

  for (const compiler of compilerCandidates) {
    const result = runCompiler(compiler);
    if (result.error) {
      continue;
    }

    if (result.status === 0) {
      process.stdout.write(`Built ${outputFile}\n`);
      return;
    }
  }

  throw new Error(
    `Unable to compile native/decrypter.c. Install one of: ${compilerCandidates.join(", ")}.`
  );
};

build().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
