// Utilidades puras compartidas por la función Edge y las pruebas de Node.
export const MAX_PREGUNTA = 1800;
const texto = (valor,limite) => typeof valor === 'string' ? valor.trim().slice(0,limite) : '';
const entero = (valor) => Number.isInteger(valor) && valor >= 0 && valor <= 100 ? valor : 0;

export function normalizarSolicitud(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw Error('Solicitud inválida.');
  const pregunta = texto(datos.mensaje,MAX_PREGUNTA+1);
  if (!pregunta || pregunta.length > MAX_PREGUNTA) throw Error('Escribe una pregunta de hasta 1800 caracteres.');
  const fuente = Array.isArray(datos.historial) ? datos.historial : [];
  const historial = fuente.slice(-8).filter(x => x && typeof x === 'object' && (x.autor === 'navy' || x.autor === 'usuario') && typeof x.texto === 'string' && x.texto.trim())
    .map(x => ({role: x.autor === 'navy' ? 'assistant' : 'user',content: texto(x.texto,1400)}));
  const c = datos.contexto && typeof datos.contexto === 'object' && !Array.isArray(datos.contexto) ? datos.contexto : {};
  const contexto = {
    nombre: texto(c.nombre,160),
    tipo: texto(c.tipo,40),
    clasificacion: texto(c.clasificacion,100),
    descripcion: texto(c.descripcion,900),
    efectos: entero(c.efectos),
    reglas: entero(c.reglas),
    pasivas: entero(c.pasivas),
    requisitos: c.requisitos === true,
  };
  return {pregunta,historial,contexto};
}

export function resumirCatalogo(creaciones,categorias) {
  const productos = Array.isArray(creaciones) ? creaciones.slice(0,20).map(x => ({
    nombre: texto(x?.nombre,100),
    tipo: texto(x?.tipo_creacion,35),
    clase: texto(x?.clase,12),
    descripcion: texto(x?.descripcion,140),
  })) : [];
  const familias = Array.isArray(categorias) ? categorias.slice(0,60).map(x => ({
    nombre:texto(x?.nombre,75),
    clave:texto(x?.clave,70),
  })) : [];
  return {creaciones_recientes:productos,categorias:familias};
}

export function extraerTextoRespuesta(respuesta) {
  if (!respuesta || typeof respuesta !== 'object') return '';
  const desdeContenido = Array.isArray(respuesta.output) ? respuesta.output.flatMap(item =>
    item?.type === 'message' && Array.isArray(item.content)
      ? item.content.filter(p => p?.type === 'output_text' && typeof p.text === 'string').map(p => p.text)
      : []
  ).join('\n').trim() : '';
  return desdeContenido || texto(respuesta.output_text,6000);
}
