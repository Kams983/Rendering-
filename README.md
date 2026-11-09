# Earth Stop Remotion Project

## Local
npm install
npm run start

## Render locally
npm run render   # InternetFacts; use render:earth for EarthStop

## GitHub Actions
Push this repository to GitHub, open **Actions**, select **Render Remotion Video**, click **Run workflow**.

When the job finishes, download the `earth-stop-video` artifact from the workflow run.

## Project structure
- `src/Root.tsx` composition definitions (InternetFacts and EarthStop)
- `src/Video.tsx` video scenes
- `src/index.ts` Remotion entry point
- `remotion.config.ts` Remotion configuration
- `scripts/render.ts` optional programmatic renderer
- `public/3d-render/` visual scene assets
- `public/sfx/` sound effects
- `.github/workflows/render.yml` GitHub Actions renderer
