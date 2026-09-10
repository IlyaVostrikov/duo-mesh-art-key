# 3D rendering checks

The detail viewer and hall sculpture loader have separate lifecycles. A progress
event reaching 100% does not prove that model-viewer loaded a scene; its error
path also completes progress. The loading overlay waits for the load event and
valid bounds. URL changes reset the viewer, including unsupported-format states.

Hall models own their geometry, materials and textures until unmount. Fitting is
applied to a parent group so authored root transforms survive and hover renders
do not recalculate bounds against an already scaled model. Both room renderers
place sculpture slots at floor level; legacy wall slots move forward to z=1.5.

Run the isolated browser regression checks (no account or database writes):

```powershell
bun run --cwd webapp e2e --config playwright.rendering.config.ts
bun run --cwd webapp build
```

The tests use the attributed CC0 Avocado asset in
`webapp/e2e/fixtures/models`. They cover query-string GLB URLs, failure,
replacement, unsupported-format transitions and stable hall transforms.

## Delivery limitation

The original chapel ZIP rendered locally during investigation, while the
production artwork stalled downloading from its public R2 development URL.
That observation does not prove which network hop caused the stall or that all
uploaded objects are intact. It is not resolved by a frontend deployment alone.

Cloudflare documents r2.dev as rate-limited development access:
https://developers.cloudflare.com/r2/buckets/public-buckets/

After configuring and verifying a production CDN/custom domain for the same
bucket, set the frontend build variable VITE_CDN_BASE_URL and redeploy.
assetUrl remaps only unsigned /uploads/ URLs from this project's known public
bucket. Signed and unrelated external URLs remain unchanged. The custom domain
must serve the full key hierarchy, including glTF relative .bin and texture
dependencies, and allow browser GET access. Never use a placeholder CDN domain.

## Saved hall layouts and viewport

Both room renderers resolve saved slots by artwork ID. Empty slots stay empty;
missing/private artworks do not move other works. Layouts without ID fields retain
legacy positional behavior; halls without saved slots use automatic placement.
Room centers and navigation use the same scaled widths as the rendered walls, and
side/back walls use the selected room depth. Page transitions release their CSS
transform after entering so fixed hall canvases remain attached to the viewport.

Validation:

```powershell
bun test ./webapp/tests/hall-layout.test.ts
bun run --cwd webapp e2e --config playwright.rendering.config.ts
bun run --cwd webapp build
```

The rendering suite uses isolated fixtures; it does not validate registration,
upload storage, publication, or persistence through PostgreSQL.
## Local development uploads and first artwork

Without object storage, the development backend explicitly returns a `transport: local`
upload intent. The client sends authenticated multipart data to that endpoint and resolves
returned media URLs against the API origin, including same-origin configurations.
Production still requires configured object storage; authorization errors never trigger a
local fallback. `/api/uploads/` is rewritten to the local static storage path when mounted
under the API prefix.

Onboarding and dashboard creation both use `uploadFiles` and submit file hashes for
ArtKey integrity. Publishing a hall without a cover accepts `coverImageUrl: null`.
The public hall contract retains model URLs, posters, media types and artist metadata.

The rendering suite also checks local transport and rejects unauthorized fallback. Its
WebGL assertions allow 15 seconds on software-rendered test machines. Real registration,
publication and PostgreSQL persistence require a separate full-cycle environment.
