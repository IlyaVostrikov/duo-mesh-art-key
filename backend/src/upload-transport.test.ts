import { expect, test } from 'bun:test'
import { UploadService } from './services/upload.service'
const config={maxImageBytes:100,max3DBytes:200,baseDir:'.scratch/not-written'}
const intent={userId:'test',fileName:'model.glb',fileType:'model/gltf-binary',byteSize:150}
test('explicit local mode returns multipart intent',async()=>{const service=new UploadService({...config,localUploads:true});expect(await service.createPresignedUpload(intent)).toMatchObject({transport:'local',uploadUrl:'/api/uploads'})})
test('missing production storage remains a configuration error',async()=>{await expect(new UploadService(config).createPresignedUpload(intent)).rejects.toThrow('not configured')})
test('local upload intent rejects oversized and private files',async()=>{const service=new UploadService({...config,localUploads:true});await expect(service.createPresignedUpload({...intent,byteSize:201})).rejects.toThrow('too large');await expect(service.createPresignedUpload({...intent,visibility:'private'})).rejects.toThrow('private')})
