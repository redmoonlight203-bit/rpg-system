'use client';
// Pestañas del artefacto además de «Niveles». Cada paso del plan añade la suya aquí.
import FormasArtefacto from './FormasArtefacto';
import type {PestanaArtefacto} from './EditorArtefacto';

export function pestanasArtefacto(artefactoId?:string):PestanaArtefacto[]{
 const id=artefactoId&&artefactoId!=='nueva'?artefactoId:undefined;
 return [
  {id:'formas',nombre:'Formas d100',contenido:(a,set)=><FormasArtefacto a={a} set={set} artefactoId={id}/>},
 ];
}
