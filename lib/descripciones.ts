import {formula, type Efecto} from './creacion';
import {type Regla, type EfectoRegla, type CondicionRegla} from './reglas';
export type AyudaClara={resumen:string;detalles:string[]};
const elementos:Record<string,string>={fuego:'fuego',agua:'agua',hielo:'hielo',electricidad:'electricidad',luz_sagrada:'luz sagrada'};
const atributo=(s:string)=>({vida:'vida máxima',hp:'vida máxima',vida_actual:'vida actual',ph:'PH',ph_actual:'PH actuales',fatiga:'Fatiga máxima',fatiga_actual:'Fatiga actual',armadura:'armadura',bono_impacto:'bonificación al ataque',salvacion:'bonificación de salvación'}[s]||s.replaceAll('_',' '));
export function describirEfecto(e:Efecto,nombre=e.nombre):AyudaClara {
 const legacy=(e.tipo_dano||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const claveElemento=e.elemento||({electrico:'electricidad',frio:'hielo','luz sagrada':'luz_sagrada'}[legacy]||legacy);
 const elemento=elementos[claveElemento];
 let resumen:string;
 switch(e.efecto){
  case 'transformacion':resumen=`Activa ${e.transformacion?.nombre||e.nombre}: ${e.transformacion?.tipo==='forma'?'vida independiente; al romperse recupera su cuerpo':'poder con su vida real'}.`;break;
  case 'dano': resumen=/desarmado/i.test(nombre)?'Ataca con el puño.':/^Atacar con /i.test(nombre)?nombre.replace(/^Atacar /i,'Ataca ')+'.':elemento?`Ataca al objetivo con ${elemento}.`:'Ataca al objetivo para causarle daño.';break;
  case 'curacion':resumen='Recupera vida del objetivo sin superar su vida máxima.';break;
  case 'recuperar_ph':resumen='Recupera puntos de habilidad del objetivo.';break;
  case 'reducir_fatiga':resumen='Reduce la Fatiga del objetivo. Si está agotado, aún necesita descansar.';break;
  case 'estado':resumen=`Aplica ${e.estado||'un estado'} al objetivo.`;break;
  case 'crear_arma':resumen=e.tabla_armas?`Lanza 1d${e.tabla_armas.caras} y crea el arma asignada al resultado.`:`Crea ${e.arma_nombre||'un arma temporal'} para combatir. Sustituye el equipo de la mano que ocupa.`;break;
 }
 const detalles:string[]=[];
 if(e.transformacion){detalles.push('Una activación por encuentro. Cambiar etapa consume una acción, sin repetir el coste de activación.');for(const etapa of e.transformacion.etapas)detalles.push(`${etapa.nombre}: ${etapa.descripcion?etapa.descripcion+' ':''}${Object.entries(etapa.stats).map(([k,v])=>`${atributo(k)} ${v}`).join(', ')}.`);}
 if(e.tablero){const t=e.tablero;
  detalles.push(t.origen_area==='lanzador'?'Rugido o aura: el efecto nace del propio atacante.':t.origen_area==='aterrizaje'?'Salta a una casilla libre y causa daño alrededor al aterrizar.':t.origen_area==='recorrido'?'Carrera ofensiva: golpea a cada criatura situada en su trayecto.':`Alcance: ${t.alcance} casillas desde el personaje.`);
  if(t.movimiento_lanzador)detalles.push(`${{dash:'Dash',salto:'Salto',teletransporte:'Teletransporte',carrera:'Carrera'}[t.movimiento_lanzador.tipo]}: hasta ${t.movimiento_lanzador.casillas} casillas; golpe final a ${t.movimiento_lanzador.alcance_golpe} casillas.`);
  if(t.afecta_lanzador===false)detalles.push('El lanzador no sufre daño de este efecto aunque esté dentro del área.');
  detalles.push(t.forma==='individual'?'Afecta una casilla.':t.forma==='cuadrado'?`Área: cuadrado de ${t.tamano} × ${t.tamano} casillas.`:t.forma==='linea'||t.forma==='cono'?`Área: ${t.forma} de ${t.tamano} casillas desde el lanzador.`:`Área: ${t.forma==='circulo'?'círculo':'cruz'} de radio ${t.tamano} casillas alrededor del centro.`);
  detalles.push(`Objetivos: ${{enemigos:'enemigos y el lanzador si está dentro del área',aliados:'aliados, incluido el lanzador',todos:'todos, incluidos aliados',yo:'solo el lanzador'}[t.afecta]}.`);
  if(t.desplazamiento)detalles.push(`${t.desplazamiento.tipo==='atraer'?'Atrae hacia':'Empuja lejos de'} el centro hasta ${t.desplazamiento.casillas} casillas${t.desplazamiento.cuando==='fallo_salvacion'?' si falla la salvación':''}; se detiene ante casillas ocupadas.`);
  if(t.derribo)detalles.push(`Deja al objetivo derribado${t.derribo==='fallo_salvacion'?' si falla la salvación':''}. Levantarse cuesta la mitad del movimiento máximo.`);
 }

 if(e.tabla_armas)detalles.push(...e.tabla_armas.resultados.map(r=>`${r.cara}: ${r.nombre || 'Sin asignar'} (${formula(r)}).`));
 if(e.efecto!=='estado'&&e.efecto!=='transformacion'&&!e.tabla_armas)detalles.push(`${{dano:'Daño',curacion:'Vida recuperada',recuperar_ph:'PH recuperados',reducir_fatiga:'Fatiga reducida',crear_arma:'Daño del arma'}[e.efecto]}: ${e.cantidad?formula(e):String(e.modificador||0)}.`);

 if(e.efecto==='estado'){
  if(['veneno','quemadura','regeneracion'].includes(e.estado_tipo||''))detalles.push(`${e.estado_tipo==='regeneracion'?'Recupera':'Sufre'} ${formula(e)} ${e.estado_tipo==='regeneracion'?'de vida':'de daño'} al inicio de cada turno.`);
  if(e.estado_tipo==='aturdido')detalles.push('Pierde su próxima acción y el aturdimiento se retira.');
  if(e.estado_tipo==='quemadura')detalles.push('Puede apagar la quemadura con una salvación de 12 al inicio del turno.');
  for(const [k,v] of Object.entries(e.bonos_estado||{}))if(v)detalles.push(`${atributo(k)}: ${v>0?'+':''}${v} mientras dura el estado.`);
 }
 if(e.requisito_forma)detalles.push(`Requiere ${atributo(e.requisito_forma.atributo)} de al menos ${e.requisito_forma.minimo}.`);
 if(e.efecto==='dano'&&elemento)detalles.push(`Añade 1d4 de daño de ${elemento}.`);
 if(e.coste_ph)detalles.push(`Consume ${e.coste_ph} PH.`);
 if(e.coste_fatiga)detalles.push(`Genera ${e.coste_fatiga} de Fatiga.`);
 if(e.salvacion)detalles.push(`El objetivo tira una salvación de ${atributo(e.salvacion.atributo)} contra ${e.salvacion.cd}. Si la supera, ${e.salvacion.exito==='mitad'?'recibe la mitad del daño':e.salvacion.exito==='solo_estado'?'evita el estado, pero recibe el daño':'evita el efecto'}.`);
 if(e.duracion>0)detalles.push(`Duración: ${e.duracion} turnos${e.efecto==='crear_arma'?' propios':''}.`);
 if(e.efecto==='dano'&&claveElemento==='fuego')detalles.push('Puede quemar al objetivo si falla su salvación de 12.');
 if(e.efecto==='dano'&&claveElemento==='agua')detalles.push('Deja al objetivo Mojado y permite combinaciones elementales.');
 return {resumen:(typeof e.descripcion==="string"&&e.descripcion.trim())||resumen,detalles};
}
export function condicionClara(c:CondicionRegla):string {
 switch(c.tipo){
 case 'siempre':return 'Se activa sin condiciones adicionales.';
 case 'estado_terminado':return `Se activa cuando termina ${c.clave}.`;
 case 'estado':return `Requiere el estado ${c.estado}.`;
 case 'comparar':return `Requiere ${atributo(c.atributo)} ${{'<':'menor que','<=':'menor o igual a','=':'igual a','>=':'mayor o igual a','>':'mayor que'}[c.operador]} ${c.valor}${c.porcentaje?'%':''}.`;
 case 'elemento':return `Requiere un ataque de ${elementos[c.elemento]||c.elemento}.`;
 case 'probabilidad':return `Tiene un ${c.porcentaje}% de probabilidad de activarse.`;
 case 'todas':return 'Deben cumplirse todas las condiciones configuradas.';
 case 'alguna':return 'Debe cumplirse al menos una de las condiciones configuradas.';
 case 'no':return 'La condición configurada no debe cumplirse.';
 }
}
function efectoReglaClaro(e:EfectoRegla):string{
 const destino={yo:'al portador',actor:'a quien provocó el evento',objetivo:'al objetivo',aliados:'a los aliados vivos',enemigos:'a los enemigos vivos',todos:'a todos los personajes vivos'}[e.destino];
 const valor=typeof e.valor==='number'?String(e.valor):e.valor?.dados?`${e.valor.dados}d${e.valor.caras}${e.valor.bono?`${e.valor.bono>0?'+':''}${e.valor.bono}`:''}`:e.valor?.atributo?`según ${atributo(e.valor.atributo)}`:'según su fórmula';
 switch(e.tipo){
 case 'atributo':return `Modifica ${atributo(e.atributo||'atributo')} ${destino}: ${e.operacion==='fijar'?'fija en':e.operacion==='multiplicar'?'multiplica por':'suma'} ${valor}${e.permanente?' de forma permanente':''}.`;
 case 'transformar':return `Transforma ${destino} en ${e.nombre||e.clave||'una nueva forma'} y cambia sus estadísticas.`;
 case 'estado':return `Aplica ${e.nombre||e.clave||'un estado'} ${destino}.`;
 case 'quitar_estado':return `Quita ${e.nombre||e.clave||'el estado configurado'} ${destino}.`;
 case 'dano':return `Causa ${valor} de daño directo ${destino}.`;
 case 'curar':return `Recupera ${valor} de vida ${destino}.`;
 case 'ph':return `Modifica los PH ${destino}: ${valor}.`;
 case 'fatiga':return `Modifica la Fatiga ${destino}: ${valor}.`;
 case 'perder_accion':return `Hace perder la acción del turno ${destino}.`;
 case 'salvacion':return `Exige una salvación de ${atributo(e.atributo||'salvacion')} contra ${e.cd}; el resultado decide qué efectos se aplican.`;
 case 'condicional':return 'Aplica efectos diferentes según se cumpla o no su condición.';
 case 'habilidad':return `Concede la acción ${e.accion?.nombre||'configurada'} ${destino}.`;
 case 'mensaje':return e.nombre||'Añade un mensaje al registro.';
 }
}
export function describirRegla(r:Regla):AyudaClara{
 return {resumen:(typeof r.descripcion==="string"&&r.descripcion.trim())||r.efectos.map(efectoReglaClaro).slice(0,2).join(' ')||'Activa los efectos configurados.',detalles:[condicionClara(r.condicion),...r.efectos.slice(0,6).map(efectoReglaClaro),...(r.coste_ph?[`Consume ${r.coste_ph} PH.`]:[]),...(r.coste_fatiga?[`Genera ${r.coste_fatiga} de Fatiga.`]:[]),...(r.enfriamiento?[`Debes esperar ${r.enfriamiento} turnos antes de volver a usarla.`]:[]),...(r.limite_por_turno?[`Máximo ${r.limite_por_turno} activación(es) por turno.`]:[])]};
}
export const ayudaGuardia:AyudaClara={resumen:'Adopta una postura defensiva para protegerte.',detalles:['Ganas 2 de armadura hasta tu siguiente turno.','Consume tu acción.']};

