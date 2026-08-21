# Storage And Media

Use this document when a product needs uploads, images, media, generated files, or downloadable assets.

The supported DigitalOcean-first storage path is:

- DigitalOcean Spaces Standard Storage for persistent objects.
- Spaces CDN for public images, media, and downloads.
- Backend-issued presigned URLs for direct browser/client uploads and private downloads.
- App Platform only for API/runtime code and short-lived temporary files.

Do not store user uploads or durable generated assets on the App Platform container filesystem. App Platform containers can be replaced during deployments and scaling, and their local filesystem is not durable.

## Intake Before Building File Features

Ask product-level questions before implementation:

- What will users upload: avatars, photos, documents, videos, exports, or something else?
- Are files public, private, shared with selected users, or mixed?
- Which roles can upload, view, replace, and delete files?
- What are the maximum file size and allowed file types?
- Do images need thumbnails, responsive sizes, format conversion, compression, cropping, or moderation?
- How long should files live after the owning record is deleted?
- Should filenames be user-visible, or should the app generate opaque object keys?
- Are uploads required in the first version, or can media be deferred?

Record the answer in the relevant README section when storage affects the active product surface.

## DigitalOcean Spaces Defaults

Use Spaces Standard Storage for app media. Do not use Spaces Cold Storage for public app images or active downloads because Cold Storage does not support CDN integration or custom CDN endpoints.

Recommended production setup:

- One Space per environment when practical, for example `<project>-prod` and `<project>-staging`.
- Enable Spaces CDN for public media buckets.
- Use a custom CDN subdomain such as `images.example.com` when the app has a production domain.
- Store public immutable assets under generated keys and set long cache headers.
- Store private files under separate prefixes or buckets and serve them with short-lived presigned GET URLs.
- Do not put personally identifiable or sensitive information in bucket names, object keys, metadata, or tags.

Spaces is S3-compatible. The backend uses AWS S3 SDK clients against the DigitalOcean endpoint, for example `https://nyc3.digitaloceanspaces.com`.

## Backend Storage Service

The backend storage layer lives in `backend/src/storage`. It is intentionally a service layer, not a product-specific upload feature.

Use it to:

- generate safe object keys;
- issue presigned PUT URLs for direct uploads;
- issue short-lived presigned GET URLs for private downloads;
- build public CDN URLs for public objects;
- delete objects when the owning product record is deleted.

Required env when storage is active:

```bash
SPACES_REGION=nyc3
SPACES_BUCKET=<project-prod>
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_CDN_BASE_URL=https://images.example.com
SPACES_ACCESS_KEY_ID=<spaces-access-key>
SPACES_SECRET_ACCESS_KEY=<spaces-secret-key>
UPLOAD_MAX_3D_BYTES=209715200
SPACES_UPLOAD_MAX_BYTES=209715200
SPACES_UPLOAD_URL_TTL_SECONDS=900
SPACES_DOWNLOAD_URL_TTL_SECONDS=300
SPACES_PUBLIC_CACHE_CONTROL="public, max-age=31536000, immutable"
```

Leave these variables blank for projects that do not need uploads yet. If any required Spaces variable is set, all required Spaces variables must be set.

## Upload Flow

Default direct-upload flow:

1. Authenticated client asks the backend for an upload URL with intended file metadata.
2. Backend validates role, size, content type, owner record, and target key.
3. Backend returns a presigned PUT URL, browser-settable upload headers, and the declared `contentLength` (informational — the signature does not depend on it).
4. Client uploads directly to Spaces.
5. Client calls the app API to confirm the uploaded object key.
For glTF scenes with external `.bin` or texture files, the web client accepts a single ZIP bundle. It uploads the archive directly to Spaces, then calls `POST /api/uploads/finalize-model`; the backend validates the archive, safely extracts supported files under one immutable object prefix, and returns the public `scene.gltf`/`scene.glb` URL. The original archive key remains available for cleanup or future download. ZIP limits are 200 MB compressed, 500 MB uncompressed, and 200 entries. Individual 3D files inside the bundle are limited to 200 MB by `UPLOAD_MAX_3D_BYTES`.
6. Backend stores object metadata in PostgreSQL if the product needs ownership, deletion, audit, or private access rules.

Browser upload example:

```ts
if (file.size !== upload.contentLength) {
  throw new Error('File size mismatch')
}

await fetch(upload.uploadUrl, {
  method: upload.method,
  headers: upload.headers,
  body: file,
})
```

The presigned PUT URL validates the requested upload intent before signing. The signature does not include `content-length`, so the storage provider does not compare the browser's actual body size against the declared size. Size is enforced at the backend validation step (`assertByteSize`) against the declared `byteSize`. If the product must strictly enforce the actual stored file size, content type, or image dimensions, verify the uploaded object before confirming it in the app database.

For public media, the object should be uploaded with `public-read`, immutable object keys, and long cache headers. For private files, keep objects private and return short-lived presigned GET URLs only after permission checks.

If product records store public media URLs instead of only object keys, shared API contracts must reject non-HTTPS schemes such as `javascript:`, `data:`, and `ftp:`. Prefer storing app-owned object keys and deriving public CDN URLs on the backend.

When browser clients upload directly to Spaces, configure Spaces CORS for the deployed origins and allowed upload headers such as `Content-Type` and `Cache-Control` (the ACL travels as a signed query parameter, not a header). If the Spaces CDN is enabled and CORS changed after files were cached, purge the CDN cache.

## Images And Optimization

DigitalOcean Spaces and Spaces CDN store and deliver images, but they do not provide first-party dynamic image resizing, compression, cropping, or format transformation.

Default image strategy:

- Store the original upload in Spaces.
- When optimized images are required, generate app-owned variants in the backend, a worker, or a dedicated App Platform service.
- Store variants in Spaces with stable keys such as `images/<entity>/<id>/<variant>.webp`.
- Serve public variants through Spaces CDN.
- Keep original private if users should not download the raw upload.

Use a library such as `sharp` only when implementing image processing for a product feature. Do not add image-processing dependencies or an image proxy just because uploads exist.

If the product needs dynamic transformations by URL, consider a dedicated App Platform component running an image proxy such as `imgproxy`, backed by Spaces. This is self-hosted on DigitalOcean, not a first-party DigitalOcean image transformation service. Use third-party services such as Cloudinary or ImageKit only when the user explicitly chooses that tradeoff.

## CDN And Caching

Use Spaces CDN for public media and downloads. It reduces latency and load on the origin Space.

Operational rules:

- Prefer immutable object keys for public assets so replacing content creates a new URL.
- Use long cache headers for immutable assets.
- Purge the CDN only for urgent corrections or when mutable URLs cannot be avoided.
- Do not rely on CDN caching for presigned private URLs. DigitalOcean documents that presigned URL requests are forwarded to the Spaces origin and do not benefit from cache hits.
- Spaces Cold Storage does not support CDN integration or custom CDN endpoints.

## Security And Privacy

- Never commit Spaces access keys or secrets.
- Use limited-access Spaces keys for the app bucket when possible.
- Keep private files private; do not use obscurity-only public URLs for sensitive data.
- Validate MIME type, size, owner, and permissions before issuing upload or download URLs.
- Generate object keys server-side. Do not trust client-provided paths.
- Do not include emails, names, customer IDs, or other sensitive data in object keys.
- Delete or orphan-clean objects when the owning product record is deleted, according to the product retention policy.

## Yandex Cloud Alternative

Use Yandex Object Storage only when the user explicitly chooses Yandex Cloud. Follow [YANDEX_CLOUD.md](YANDEX_CLOUD.md) for the full provider runbook.

Yandex Object Storage is S3-compatible and uses `https://storage.yandexcloud.net` as the standard endpoint. Public media should be served through Yandex Cloud CDN when production latency, cache controls, or custom domains matter. Private files should stay private and be exposed through short-lived presigned URLs after backend permission checks.

For image optimization on Yandex Cloud, first consider Yandex Cloud Marketplace Image Resizer for simple fixed-size variants. For dynamic transformations, use a dedicated Thumbor/imgproxy-style service or app-owned image worker and put Cloud CDN in front of public variants.

## Current Upstream Documentation

- DigitalOcean Spaces: https://docs.digitalocean.com/products/spaces/
- Spaces features: https://docs.digitalocean.com/products/spaces/details/features/
- Spaces S3 compatibility: https://docs.digitalocean.com/products/spaces/reference/s3-compatibility/
- Use AWS S3 SDKs with Spaces: https://docs.digitalocean.com/products/spaces/how-to/use-aws-sdks/
- Enable Spaces CDN: https://docs.digitalocean.com/products/spaces/how-to/enable-cdn/
- Manage Spaces CDN cache: https://docs.digitalocean.com/products/spaces/how-to/manage-cdn-cache/
- Configure CORS on Spaces: https://docs.digitalocean.com/products/spaces/how-to/configure-cors/
- Spaces performance best practices: https://docs.digitalocean.com/products/spaces/concepts/best-practices/
- App Platform limits: https://docs.digitalocean.com/products/app-platform/details/limits/
- Yandex Object Storage: https://yandex.cloud/en/docs/storage/
- Yandex Cloud CDN: https://yandex.cloud/en/docs/cdn/concepts/
- Yandex Cloud Marketplace Image Resizer: https://yandex.cloud/en/marketplace/products/yc/image-resizer
