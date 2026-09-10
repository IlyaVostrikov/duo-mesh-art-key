// Idempotently configure CORS on the DigitalOcean Spaces bucket.
//
// Why: the webapp loads 3D models (glb/gltf) cross-origin via model-viewer /
// GLTFLoader, which fetches with XHR and therefore needs an
// Access-Control-Allow-Origin response. Images render through <img> tags (no
// CORS needed), which is why 2D works but 3D shows a black/white screen when
// the bucket CORS does not allow GET from the app origin.
//
// Usage (credentials + exact app origin(s) must be in the environment; secret
// values are never printed):
//   SPACES_CORS_ALLOWED_ORIGINS="https://<webapp>.vercel.app" \
//   bun --cwd backend --env-file=backend/.env.prod scripts/configure-spaces-cors.mjs
//
// The script preserves existing rules and only ADDS a GET/HEAD rule for the
// given origin(s), so any existing upload (PUT) rule is never broken.

import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3'

const { SPACES_REGION, SPACES_BUCKET, SPACES_ENDPOINT, SPACES_ACCESS_KEY_ID, SPACES_SECRET_ACCESS_KEY } = process.env
const origins = (process.env.SPACES_CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

if (!SPACES_REGION || !SPACES_BUCKET || !SPACES_ENDPOINT || !SPACES_ACCESS_KEY_ID || !SPACES_SECRET_ACCESS_KEY) {
  console.error('Missing required SPACES_* env vars (REGION, BUCKET, ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY).')
  console.error('Load them first, e.g.:  bun --cwd backend --env-file=backend/.env.prod scripts/configure-spaces-cors.mjs')
  process.exit(1)
}

if (origins.length === 0) {
  console.error('Missing SPACES_CORS_ALLOWED_ORIGINS (comma-separated webapp origins).')
  console.error('Refusing to use "*" — set the exact app origin(s), e.g. https://<webapp>.vercel.app')
  process.exit(1)
}

const client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  forcePathStyle: false,
  credentials: { accessKeyId: SPACES_ACCESS_KEY_ID, secretAccessKey: SPACES_SECRET_ACCESS_KEY },
})

let existing = []
try {
  const res = await client.send(new GetBucketCorsCommand({ Bucket: SPACES_BUCKET }))
  existing = res.CORSRules ?? []
} catch (err) {
  if (err?.name !== 'NoSuchCORSConfiguration') throw err
}

const missingOrigins = origins.filter(
  (origin) =>
    !existing.some(
      (rule) =>
        (rule.AllowedOrigins ?? []).includes(origin) &&
        (rule.AllowedMethods ?? []).includes('GET'),
    ),
)

const rules = existing.map((r) => ({ ...r }))
if (missingOrigins.length > 0) {
  rules.push({
    AllowedOrigins: missingOrigins,
    AllowedMethods: ['GET', 'HEAD'],
    AllowedHeaders: ['*'],
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3600,
  })
}

await client.send(new PutBucketCorsCommand({ Bucket: SPACES_BUCKET, CORSConfiguration: { CORSRules: rules } }))

const verify = await client.send(new GetBucketCorsCommand({ Bucket: SPACES_BUCKET }))
console.log(`CORS configured on bucket "${SPACES_BUCKET}" (${SPACES_ENDPOINT}).`)
console.log(`Rules: ${verify.CORSRules?.length ?? 0}`)
for (const [i, rule] of (verify.CORSRules ?? []).entries()) {
  console.log(
    `  [${i}] origins=${(rule.AllowedOrigins ?? []).join(',')} ` +
    `methods=${(rule.AllowedMethods ?? []).join(',')} ` +
    `headers=${(rule.AllowedHeaders ?? []).join(',')}`,
  )
}
