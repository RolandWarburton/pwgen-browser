const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }

  const files = fs.readdirSync(source);

  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    const stats = fs.statSync(sourcePath);

    if (stats.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    } else if (stats.isDirectory()) {
      copyFolderSync(sourcePath, targetPath);
    }
  });
}

function makeTemp(name) {
  if (!fs.existsSync(`./${name}`)) {
    fs.mkdirSync(`./${name}`);
  }
}

async function main() {
  makeTemp('dist');

  const result = await build({
    entryPoints: ['src/index.tsx'],
    platform: 'node',
    bundle: true,
    write: false,
    format: 'cjs',
    jsx: 'automatic',
    loader: {
      '.js': 'jsx',
      '.ts': 'tsx'
    },
    // jsxFactory: 'h',
    // jsxFragment: 'Fragment',
    // external: ['react'],
    globalName: 'React',
    define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development') }
  }).catch((err) => {
    console.log(err);
    process.exit(1);
  });

  const content = result.outputFiles[0].text;
  fs.writeFileSync('dist/index.js', content);

  fs.copyFileSync('manifest.json', 'dist/manifest.json');
  fs.copyFileSync('./src/popup.html', './dist/popup.html');
  copyFolderSync('./images/', './dist/images');
}
main();
