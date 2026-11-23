'use client';
// Pestañas del artefacto además de «Niveles». Cada paso del plan añade la suya aquí.
import FormasArtefacto from './FormasArtefacto';
import AbsorcionArtefacto from './AbsorcionArtefacto';
import VocesArtefacto from './VocesArtefacto';
import type {PestanaArtefacto} from './EditorArtefacto';

export function pestanasArtefacto(artefactoId?:string):PestanaArtefacto[]{
 const id=artefactoId&&artefactoId!=='nueva'?artefactoId:undefined;
 return [
  {id:'formas',nombre:'Formas y portadores',contenido:(a,set)=><FormasArtefacto a={a} set={set} artefactoId={id}/>},
  {id:'absorcion',nombre:'Absorción',contenido:(a,set)=><AbsorcionArtefacto a={a} set={set}/>},
  {id:'voces',nombre:'Voces',contenido:(a,set)=><VocesArtefacto a={a} set={set}/>},
 ];
}
