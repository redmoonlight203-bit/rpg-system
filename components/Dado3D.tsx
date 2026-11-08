import {memo} from 'react';
import type {CSSProperties} from 'react';
const p=(1+Math.sqrt(5))/2;
const vertices=[[0,-1,-p],[0,-1,p],[0,1,-p],[0,1,p],[-1,-p,0],[-1,p,0],[1,-p,0],[1,p,0],[-p,0,-1],[p,0,-1],[-p,0,1],[p,0,1]];
const sub=(a:number[],b:number[])=>a.map((n,i)=>n-b[i]);
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:number[],b:number[])=>a.reduce((n,v,i)=>n+v*b[i],0);
const faces:string[]=[];
for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)for(let k=j+1;k<12;k++){
 const ids=[i,j,k];if(ids.some((a,n)=>Math.abs(dot(sub(vertices[a],vertices[ids[(n+1)%3]]),sub(vertices[a],vertices[ids[(n+1)%3]]))-4)>.01))continue;
 let [a,b,c]=ids.map(v=>vertices[v].map(n=>n*31));let u=sub(b,a),v=sub(c,a),normal=cross(u,v);
 if(dot(normal,a)<0){[b,c]=[c,b];u=sub(b,a);v=sub(c,a);normal=cross(u,v);}
 const len=Math.sqrt(dot(normal,normal));normal=normal.map(n=>n/len);
 faces.push(`matrix3d(${[...u.map(n=>n/100),0,...v.map(n=>n/100),0,...normal,0,...a,1].join(',')})`);
}
function Dado3D({caras=20,valor,girando=false,animar=false,indice=0}:{caras?:number;valor?:number;girando?:boolean;animar?:boolean;indice?:number}){
 return <div className={`y-die ${girando?'is-rolling':''} ${animar?'is-entering':''} ${!girando&&valor===1?'is-one':!girando&&valor===caras?'is-twenty':''}`} style={{'--die-delay':`${indice*55}ms`} as CSSProperties} aria-label={`Dado de ${caras} caras${valor?`: ${valor}`:''}`}><div className="y-die-space"><div className="y-die-mesh">{faces.map((transform,i)=><div className="y-die-face" key={i} style={{transform,'--face-light':`${24+i%5*4}%`} as CSSProperties}/>)}</div><strong className="y-die-value">{girando?'?':valor??caras}</strong></div><span>d{caras}</span></div>;
}

export default memo(Dado3D);
