import * as esbuild from "esbuild"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, "..")
const distDir = path.join(projectRoot, "dist")

async function build() {
  // 1. Clean dist
  await fs.rm(distDir, { recursive: true, force: true })
  await fs.mkdir(distDir, { recursive: true })

  const commonOptions = {
    entryPoints: [path.join(projectRoot, "src/index.js")],
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ["es2022"],
  }

  // 2. Build ESM
  console.log("Building ESM bundle...")
  await esbuild.build({
    ...commonOptions,
    format: "esm",
    outfile: path.join(distDir, "clientagentjs.esm.js"),
  })

  // 3. Build Global (IIFE)
  console.log("Building Global (IIFE) bundle...")
  await esbuild.build({
    ...commonOptions,
    format: "iife",
    globalName: "ClientAgent",
    outfile: path.join(distDir, "clientagentjs.global.js"),
  })

  console.log("\nBuild completed successfully!")
  console.log(`- dist/clientagentjs.esm.js`)
  console.log(`- dist/clientagentjs.global.js`)
}

build().catch((err) => {
  console.error("Build failed:", err)
  process.exit(1)
})
