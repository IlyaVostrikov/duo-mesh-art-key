import { expect, test } from 'bun:test'
import { updateHallSchema, exhibitionHallPublicSchema } from '@duo-mesh/contracts'
import { toHallPublicDto } from './dto/hall.dto'
test('publishing a new hall supports an absent cover',()=>{expect(updateHallSchema.safeParse({isPublished:true,coverImageUrl:null}).success).toBe(true)})
test('public hall contract preserves actual 3D media from serializer',()=>{
 const dto=toHallPublicDto({id:'00000000-0000-4000-8000-000000000001',artistId:'00000000-0000-4000-8000-000000000002',slug:'test',title:'Test',description:null,coverImageUrl:null,layoutConfig:null,theme:'default',customization:null,isPublished:true,viewCount:0,createdAt:new Date(),updatedAt:new Date(),artist:{id:'00000000-0000-4000-8000-000000000002',verified:false,location:null,user:{displayName:'Artist',avatarUrl:null}},artworks:[{id:'00000000-0000-4000-8000-000000000003',title:'Model',posterUrl:null,modelUrl:'https://example.test/model.glb',mediaType:'MODEL_3D',category:'SCULPTURE',price:null,currency:'RUB',status:'LISTED'}]} as any)
 const parsed=exhibitionHallPublicSchema.parse(dto)
 expect(parsed.artworks[0]).toMatchObject({mediaType:'MODEL_3D',modelUrl:'https://example.test/model.glb'})
})
