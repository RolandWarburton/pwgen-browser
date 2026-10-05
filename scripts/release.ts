/// <reference lib="deno.ns" />
import { exists } from '@std/fs';
import { load } from '@std/dotenv';

// --- Configuration ---
const TAG = 'v2.0.1';
const RELEASE_NAME = 'Version 2.0.1';
const ZIP_FILE_PATH = 'pwgen-browser.zip';
const RELEASE_NOTES = 'The extension is built with Deno (deno bundle) instead of npm and esbuild';
// ---------------------

// ZIP_PASSWORD comes from the environment or .env, never the repo
await load({ export: true });
const ZIP_PASSWORD = Deno.env.get('ZIP_PASSWORD');
if (!ZIP_PASSWORD) {
  console.error('ZIP_PASSWORD must be set (environment or .env)');
  Deno.exit(1);
}

// args are passed straight to the program (no shell), so nothing needs quoting
async function run(cmd: string, args: string[], log = `${cmd} ${args.join(' ')}`) {
  console.log(`\n$ ${log}`);
  const { success, stdout, stderr } = await new Deno.Command(cmd, { args, stdout: 'piped', stderr: 'piped' }).output();
  const out = new TextDecoder().decode(stdout).trim();
  const err = new TextDecoder().decode(stderr).trim();
  if (out) console.log(out);
  if (!success) {
    throw new Error(err || `${cmd} failed`);
  }
  return out;
}

async function createRelease() {
  console.log('--- Starting GitHub Release Process ---');

  // 1. Build the extension
  console.log('\nBuilding extension...');
  await run(Deno.execPath(), ['task', 'build'], 'deno task build');

  // 2. Zip the dist folder
  console.log('\nCreating zip...');
  if (await exists(ZIP_FILE_PATH)) {
    await Deno.remove(ZIP_FILE_PATH);
  }
  // logged with the password masked
  await run('zip', ['-q', '-r', '-P', ZIP_PASSWORD!, ZIP_FILE_PATH, 'dist/'], `zip -r -P *** ${ZIP_FILE_PATH} dist/`);

  // 3. Verify the zip exists
  if (!(await exists(ZIP_FILE_PATH))) {
    console.error(`Error: Artifact not found at ${ZIP_FILE_PATH}`);
    Deno.exit(1);
  }
  console.log(`Found artifact: ${ZIP_FILE_PATH}`);

  // 4. Create the release
  try {
    await run('gh', ['release', 'create', TAG, ZIP_FILE_PATH, '--title', RELEASE_NAME, '--notes', RELEASE_NOTES, '--latest']);
    console.log(`\nSuccessfully created release ${TAG} and uploaded ${ZIP_FILE_PATH}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.warn(`Release tag ${TAG} already exists. Attempting to overwrite asset.`);
      await run('gh', ['release', 'upload', TAG, ZIP_FILE_PATH, '--clobber']);
      console.log(`Successfully uploaded/overwrote asset for existing release ${TAG}.`);
    } else {
      throw error;
    }
  }
}

await createRelease();
