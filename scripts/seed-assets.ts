import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'node:crypto'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ─── Credentials from env ONLY ───
const SPACES_KEY = process.env.SPACES_ACCESS_KEY_ID
const SPACES_SECRET = process.env.SPACES_SECRET_ACCESS_KEY
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT
const SPACES_BUCKET = process.env.SPACES_BUCKET

if (!SPACES_KEY || !SPACES_SECRET || !SPACES_ENDPOINT || !SPACES_BUCKET) {
  console.error('Missing SPACES_* env vars. Set SPACES_ACCESS_KEY_ID, SPACES_SECRET_ACCESS_KEY, SPACES_ENDPOINT, SPACES_BUCKET.')
  process.exit(1)
}

const s3 = new S3Client({
  region: process.env.SPACES_REGION || 'us-east-1',
  endpoint: SPACES_ENDPOINT,
  credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  forcePathStyle: false,
})

// ─── Curated asset manifest ───
// All sources: free licenses only. Attribution saved per artwork.
interface AssetEntry {
  slug: string
  posterUrl: string    // direct download URL for poster image
  posterSource: string  // attribution: author/license/source
  modelUrl?: string     // direct download URL for GLB model (3D only)
  modelSource?: string  // attribution for 3D model
}

const ASSETS: AssetEntry[] = [
  // ── 2D works from The Met Open Access (CC0) & Wikimedia Commons (PD) ──
  {
    slug: 'cosmic-drift',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    posterSource: 'Vincent van Gogh, The Starry Night, 1889. Public domain, via Wikimedia Commons',
  },
  {
    slug: 'silent-shores',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Hiroshige%2C_A_sketch_of_the_Mitsui_shop_in_Edo_%28cropped%29.jpg/1024px-Hiroshige%2C_A_sketch_of_the_Mitsui_shop_in_Edo_%28cropped%29.jpg',
    posterSource: 'Utagawa Hiroshige, A sketch of the Mitsui shop, 19th c. Public domain, via Wikimedia Commons',
  },
  {
    slug: 'neon-nocturne',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Claude_Monet_-_Water_Lilies_Metropolitan.jpg/1280px-Claude_Monet_-_Water_Lilies_Metropolitan.jpg',
    posterSource: 'Claude Monet, Water Lilies, 1916. Public domain, The Met Open Access (CC0)',
  },
  {
    slug: 'fractured-light',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Piet_Mondrian_-_Composition_No._10_%28compositiestuk_10%29_%28cropped%29.jpg/800px-Piet_Mondrian_-_Composition_No._10_%28compositiestuk_10%29_%28cropped%29.jpg',
    posterSource: 'Piet Mondrian, Composition No. 10, 1915. Public domain, via Wikimedia Commons',
  },
  {
    slug: 'whispers-of-chaos',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Katsushika_Hokusai_-_The_Great_Wave_off_Kanagawa_-_Google_Art_Project.jpg/1280px-Katsushika_Hokusai_-_The_Great_Wave_off_Kanagawa_-_Google_Art_Project.jpg',
    posterSource: 'Katsushika Hokusai, The Great Wave off Kanagawa, 1831. Public domain, via Wikimedia Commons',
  },
  {
    slug: 'embers-of-form',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Vassily_Kandinsky%2C_1913_-_Composition_7.jpg/1024px-Vassily_Kandinsky%2C_1913_-_Composition_7.jpg',
    posterSource: 'Wassily Kandinsky, Composition 7, 1913. Public domain, via Wikimedia Commons',
  },
  // ── 3D works from Khronos glTF-Sample-Assets (CC-BY / Apache 2.0) ──
  {
    slug: 'bronze-echo',
    posterUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.jpg',
    posterSource: 'DamagedHelmet by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    modelSource: 'DamagedHelmet by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
  },
  {
    slug: 'scanned-figure',
    posterUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MetalRoughSpheres/glTF-Binary/MetalRoughSpheres.jpg',
    posterSource: 'MetalRoughSpheres by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MetalRoughSpheres/glTF-Binary/MetalRoughSpheres.glb',
    modelSource: 'MetalRoughSpheres by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
  },
  {
    slug: 'digital-double',
    posterUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SciFiHelmet/glTF-Binary/SciFiHelmet.jpg',
    posterSource: 'SciFiHelmet by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SciFiHelmet/glTF-Binary/SciFiHelmet.glb',
    modelSource: 'SciFiHelmet by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
  },
  {
    slug: 'frozen-gesture',
    posterUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Suzanne/glTF-Binary/Suzanne.jpg',
    posterSource: 'Suzanne by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Suzanne/glTF-Binary/Suzanne.glb',
    modelSource: 'Suzanne by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
  },
  {
    slug: 'portal-v2',
    posterUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/glTF-Binary/FlightHelmet.jpg',
    posterSource: 'FlightHelmet by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/glTF-Binary/FlightHelmet.glb',
    modelSource: 'FlightHelmet by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
  },
  {
    slug: 'mesh-poem',
    posterUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.jpg',
    posterSource: 'Fox by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb',
    modelSource: 'Fox by Khronos Group, CC-BY 4.0, via glTF-Sample-Assets',
  },
]

async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`  Downloading ${url.slice(0, 80)}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(destPath, buf)
  console.log(`  → ${buf.length} bytes to ${destPath}`)
}

async function uploadToSpaces(key: string, filePath: string, contentType: string): Promise<void> {
  const { readFile } = await import('node:fs/promises')
  const body = await readFile(filePath)
  const md5 = createHash('md5').update(body).digest('base64')

  // Check if already uploaded with same content
  try {
    const existing = await s3.send(new HeadObjectCommand({ Bucket: SPACES_BUCKET, Key: key }))
    if (existing.ETag?.replace(/"/g, '') === md5) {
      console.log(`  → Already uploaded (same MD5): ${key}`)
      return
    }
  } catch {
    // Not found — proceed with upload
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    }),
  )
  console.log(`  → Uploaded: ${key}`)
}

async function main() {
  console.log(`\n🌊 DUO MESH — Seed Assets to Spaces\n`)
  console.log(`Bucket: ${SPACES_BUCKET}`)
  console.log(`Endpoint: ${SPACES_ENDPOINT}`)
  console.log(`Assets to process: ${ASSETS.length}\n`)

  const tmpDir = tmpdir()
  let uploaded = 0
  let failed = 0

  for (const asset of ASSETS) {
    console.log(`── ${asset.slug} ──`)

    try {
      // Download poster
      const posterExt = asset.posterUrl.split('.').pop()?.split('?')[0] || 'jpg'
      const posterTmp = join(tmpDir, `${asset.slug}_poster.${posterExt}`)
      await downloadFile(asset.posterUrl, posterTmp)

      // Upload poster
      const posterKey = `seed/artworks/${asset.slug}/poster.jpg`
      await uploadToSpaces(posterKey, posterTmp, 'image/jpeg')
      await unlink(posterTmp).catch(() => {})

      // Download & upload 3D model if present
      if (asset.modelUrl) {
        const modelTmp = join(tmpDir, `${asset.slug}_model.glb`)
        await downloadFile(asset.modelUrl, modelTmp)

        const modelKey = `seed/artworks/${asset.slug}/model.glb`
        await uploadToSpaces(modelKey, modelTmp, 'model/gltf-binary')
        await unlink(modelTmp).catch(() => {})
      }

      uploaded++
      console.log(`  ✓ ${asset.slug} complete\n`)
    } catch (err: any) {
      failed++
      console.error(`  ✗ ${asset.slug} FAILED: ${err.message}\n`)
    }
  }

  console.log(`Done. Uploaded: ${uploaded}, Failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

main()
