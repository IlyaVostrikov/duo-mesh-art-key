import { describe, expect, test } from 'bun:test'
import { resolveHallLayout, resolveSlottedArtworks } from '../src/components/hall3d/layoutTemplates'
const works = [{id:'a',mediaType:'MODEL_3D' as const},{id:'b',mediaType:'MODEL_3D' as const}]
describe('saved hall placement',()=>{
 test('preserves empty slots, assigned coordinates and excludes unassigned works',()=>{
  const layout=resolveHallLayout(works,{template:'custom',slots:[{x:-4,y:0,z:2,artworkId:null},{x:4,y:0,z:2,artworkId:'b'}]})
  expect(resolveSlottedArtworks(works,layout).map(({artwork,slot})=>[artwork.id,slot.x])).toEqual([['b',4]])
 })
 test('missing or private work does not shift another sculpture into its slot',()=>{
  const layout=resolveHallLayout(works,{template:'custom',slots:[{x:-4,y:0,z:2,artworkId:'private'},{x:4,y:0,z:2,artworkId:'a'}]})
  expect(resolveSlottedArtworks(works,layout).map(({artwork,slot})=>[artwork.id,slot.x])).toEqual([['a',4]])
 })
 test('legacy positional slots remain supported and sculpture stays on the floor',()=>{
  const layout=resolveHallLayout(works,{template:'legacy',slots:[{x:2,y:1.55,z:0}]})
  expect(resolveSlottedArtworks(works,layout)[0].slot).toMatchObject({x:2,y:0,z:1.5})
 })
 test('without saved configuration all works receive automatic slots',()=>{
  expect(resolveSlottedArtworks(works,resolveHallLayout(works,null))).toHaveLength(2)
 })
})
