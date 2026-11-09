import {renderMedia, selectComposition} from '@remotion/renderer';
import {bundle} from '@remotion/bundler';
import path from 'path';

async function main() {
  const entry = path.resolve('src/index.ts');
  const bundleLocation = await bundle({entryPoint: entry, webpackOverride: (config) => config});
  const composition = await selectComposition({serveUrl: bundleLocation, id: 'EarthStop'});
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: 'out/earth-stop.mp4',
    inputProps: {},
  });
}
main().catch((err) => { console.error(err); process.exit(1); });
