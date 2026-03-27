import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// --- Configuration ---
const TAG = 'v1.0.1';
const RELEASE_NAME = 'Version 1.0.1';
const ZIP_FILE_PATH = 'pwgen-browser.zip';
const RELEASE_NOTES = 'Minor bugfix';
// ---------------------

function run(command) {
  console.log(`\n$ ${command}`);
  const output = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log(output.trim());
  return output;
}

async function createRelease() {
  console.log('--- Starting GitHub Release Process ---');

  // 1. Build the extension
  console.log('\nBuilding extension...');
  run('node build.js');

  // 2. Zip the dist folder
  console.log('\nCreating zip...');
  if (existsSync(ZIP_FILE_PATH)) {
    run(`rm ${ZIP_FILE_PATH}`);
  }
  run(`zip -r ${ZIP_FILE_PATH} dist/`);

  // 3. Verify the zip exists
  const artifactPath = join(process.cwd(), ZIP_FILE_PATH);
  if (!existsSync(artifactPath)) {
    console.error(`Error: Artifact not found at ${ZIP_FILE_PATH}`);
    process.exit(1);
  }
  console.log(`Found artifact: ${ZIP_FILE_PATH}`);

  // 4. Create the release
  try {
    run(`gh release create ${TAG} ${ZIP_FILE_PATH} --title "${RELEASE_NAME}" --notes "${RELEASE_NOTES}" --latest`);
    console.log(`\nSuccessfully created release ${TAG} and uploaded ${ZIP_FILE_PATH}`);
  } catch (error) {
    if (error.stderr && error.stderr.includes('already exists')) {
      console.warn(`Release tag ${TAG} already exists. Attempting to overwrite asset.`);
      run(`gh release upload ${TAG} ${ZIP_FILE_PATH} --clobber`);
      console.log(`Successfully uploaded/overwrote asset for existing release ${TAG}.`);
    } else {
      throw error;
    }
  }
}

createRelease();
