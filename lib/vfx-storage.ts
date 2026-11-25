import {supabase} from './supabase';
import {buscarVFX} from './vfx';

async function carpetaPersonal(){
 const {data,error}=await supabase.auth.getUser();
 if(error||!data.user)throw Error('Inicia sesión para acceder a tus efectos.');
 return data.user.id;
}
const almacen=()=>supabase.storage.from('imagenes');

export async function listarEfectosPropios(){
 const usuario=await carpetaPersonal(),ids:string[]=[];
 for(let offset=0;;offset+=100){
  const {data,error}=await almacen().list(usuario+'/vfx',{limit:100,offset,sortBy:{column:'name',order:'asc'}});
  if(error)throw Error('No se pudieron cargar tus efectos.');
  for(const archivo of data){
   const id='usr-'+usuario+'-'+archivo.name.replace(/\.(png|webp)$/,'-$1');
   if(buscarVFX(id))ids.push(id);
  }
  if(data.length<100)return ids;
 }
}

export async function subirEfecto(archivo:File,nombre:string,duracion:number){
 if(!archivo.size||archivo.size>500000)throw Error('El archivo debe pesar como máximo 500 KB.');
 const etiqueta=nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,18).replace(/^-+|-+$/g,'');
 if(!etiqueta||!Number.isInteger(duracion)||duracion<100||duracion>2400)throw Error('Indica un nombre y una duración de 100 a 2400 ms.');
 const bytes=new Uint8Array(await archivo.arrayBuffer());
 const firma=(i:number,n:number)=>String.fromCharCode(...bytes.slice(i,i+n));
 const ext=firma(0,8)==='\x89PNG\r\n\x1a\n'?'png':firma(0,4)==='RIFF'&&firma(8,4)==='WEBP'?'webp':null;
 if(!ext)throw Error('Elige una imagen PNG, APNG o WebP.');
 const imagen=await createImageBitmap(archivo);
 try{if(imagen.width>4096||imagen.height>4096)throw Error('Usa imágenes de hasta 4096 píxeles por lado.');}
 finally{imagen.close();}
 const usuario=await carpetaPersonal();
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)).slice(0,8),b=>b.toString(16).padStart(2,'0')).join('');
 const base=`${hash}-${etiqueta}-${duracion}`;
 const ruta=`${usuario}/vfx/${base}.${ext}`;
 const {error}=await almacen().upload(ruta,archivo,{contentType:'image/'+ext,upsert:false,cacheControl:'31536000'});
 if(error){
  const {data}=await almacen().list(usuario+'/vfx',{search:base+'.'+ext});
  if(!data?.some(f=>f.name===base+'.'+ext))throw Error('No se pudo subir el efecto. Puedes reintentar.');
 }
 return `usr-${usuario}-${base}-${ext}`;
}
