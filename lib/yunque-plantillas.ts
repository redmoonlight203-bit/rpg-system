import {nuevoEfecto,type Efecto,type TipoCreacion} from "./creacion";
import {nuevaRegla,type Regla} from "./reglas";
import {PLANTILLAS_REACCION} from "./combate";
import type {Fragmento} from "./yunque-operaciones";
/**
 * Plantillas del Grimorio del Yunque: subgrafos listos para usar. Salen de las 20 mecánicas del propietario que el
 * motor ya resuelve (el número entre paréntesis) y de las cinco defensas de Kion (`PLANTILLAS_REACCION`).
 * Los ids son fijos: `pegar` los regenera cada vez que una plantilla entra en un borrador.
 */
export type Plantilla={id:string;nombre:string;descripcion:string;fragmentos:Fragmento[];
 /** Icono del Grimorio. */
 icono:string;
 /** Tipo de creación para el que está pensada (y en el que el motor la hace actuar). */
 para:TipoCreacion};
const accion=(id:string,p:Partial<Efecto>&{nombre:string}):Fragmento=>({tipo:'accion',datos:{...nuevoEfecto(),...p,id:'plantilla-'+id}});
const regla=(id:string,p:Partial<Regla>&{nombre:string}):Fragmento=>({tipo:'cuando',datos:{...nuevaRegla(),...p,id:'plantilla-'+id}});
const NOMBRE_KION:Record<keyof typeof PLANTILLAS_REACCION,{nombre:string;descripcion:string}>={
 inercia:{nombre:'Inercia',descripcion:'Salvación CD 14: detiene la mitad y deja actuar a otra defensa'},
 absorcion:{nombre:'Absorción',descripcion:'Ante magia: detiene 6 y guarda energía'},
 reflejo:{nombre:'Reflejo',descripcion:'En forma Limitless: detiene 4 y lo devuelve'},
 reciproco:{nombre:'Recíproco',descripcion:'Devuelve hasta 6 de lo que otra defensa detuvo'},
 ancla:{nombre:'Ancla',descripcion:'Fuera de Limitless: detiene 4 de cada golpe físico'},
};
const KION:Plantilla[]=(Object.keys(PLANTILLAS_REACCION) as (keyof typeof PLANTILLAS_REACCION)[]).map(k=>({
 id:'kion-'+k,nombre:`${NOMBRE_KION[k].nombre} (Kion)`,descripcion:NOMBRE_KION[k].descripcion,icono:'escudo',para:'habilidad',
 fragmentos:[accion('kion-'+k,{nombre:NOMBRE_KION[k].nombre,cantidad:0,coste_ph:2,ley_limitless:true,reaccion:structuredClone(PLANTILLAS_REACCION[k])})],
}));

// ---- Habilidades oculares (primitiva «Visión»). Ejemplos originales: cualquier ojo se construye igual. ----
const OJOS:Plantilla[]=[
 {id:'ojo-eclipse',nombre:'Ojo del Eclipse',descripcion:'Ojo que se abre: ve puntos débiles, anticipa y revela',icono:'ojo',para:'habilidad',
  fragmentos:[accion('ojo-eclipse',{nombre:'Despertar el Ojo del Eclipse',efecto:'estado',estado:'Ojo del Eclipse',estado_tipo:'narrativo',cantidad:0,caras:4,coste_ph:3,naturaleza:'magica',
   descripcion:'Una luna negra se dibuja en el iris. Mientras esté abierto ves dónde se quiebra la guardia de cada enemigo.',
   vision:{nombre:'Ojo del Eclipse',modo:'abrir',sin_accion:true,duracion:0,mantenimiento_ph:1,alcance:7,
    apariencia:{color:'#7b3fe4',secundario:'#f2c14e',patron:'luna',marcas:3,velo:2},
    revelar:{vida:true,acciones:true,estados:true},
    puntos_debiles:{cantidad:1,cambia:'ronda',recompensa:{ventaja:true,dados:1,caras:6}},
    anticipar:{armadura:2},amenazas:true,bonos:{iniciativa:2}}})]},
 {id:'mirada-cazador',nombre:'Mirada del cazador',descripcion:'Un ataque que abre el ojo y busca el crítico',icono:'arco',para:'habilidad',
  fragmentos:[accion('mirada-cazador',{nombre:'Mirada del cazador',cantidad:1,caras:8,naturaleza:'fisica',tablero:{alcance:5,forma:'individual',tamano:0,afecta:'enemigos'},
   vision:{nombre:'Ojo de cazador',modo:'con_accion',duracion:2,alcance:8,apariencia:{color:'#e0a21a',secundario:'#2a1400',patron:'rendija',marcas:1,velo:1},
    revelar:{vida:true},puntos_debiles:{cantidad:2,cambia:'ronda',recompensa:{critico:true,perforar:50}}}})]},
 {id:'ojo-verdad',nombre:'Ojo de la verdad',descripcion:'Siempre abierto: revela todo, incluso lo oculto',icono:'ojo',para:'habilidad',
  fragmentos:[accion('ojo-verdad',{nombre:'Ojo de la verdad',efecto:'estado',estado:'Ojo de la verdad',estado_tipo:'narrativo',cantidad:0,caras:4,
   vision:{nombre:'Ojo de la verdad',modo:'permanente',duracion:0,alcance:0,atraviesa_muros:true,apariencia:{color:'#d8e6f0',secundario:'#1b2a38',patron:'estrella',marcas:6,velo:1},
    revelar:{vida:true,atributos:true,acciones:true,pasivas:true,estados:true,ocultos:true}}})]},
 // Ojo de clan por fases: la herencia (Requisitos → clan o linaje + «Se hereda») lo da a todo el clan.
 // La fase despertada sube «fase_ojo» a 2: los poderes personales de cada miembro exigen esa fase.
 {id:'ojo-clan-fases',nombre:'Ojo de clan con fases',descripcion:'Hereditario: fase 1 común, fase 2 con poder propio de cada miembro',icono:'ojo',para:'habilidad',
  fragmentos:[
   accion('ojo-clan',{nombre:'Despertar el ojo del clan',efecto:'transformacion',cantidad:0,caras:4,coste_ph:2,naturaleza:'magica',
    descripcion:'Fase 1: el ojo común del clan. Fase 2: el ojo pleno, distinto en cada miembro. Avanzar de fase consume una acción.',
    transformacion:{id:'plantilla-ojo-clan',nombre:'Ojo del clan',tipo:'poder',etapas:[
     {id:'fase-1',nombre:'Ojo despierto',stats:{fase_ojo:1,iniciativa:1},descripcion:'Los puntos débiles se vuelven visibles.',
      vision:{nombre:'Ojo despierto',modo:'permanente',duracion:0,alcance:6,apariencia:{color:'#b3122e',secundario:'#12060a',patron:'aspas',marcas:2,velo:1},
       revelar:{vida:true,estados:true},puntos_debiles:{cantidad:1,cambia:'ronda',recompensa:{ventaja:true}}}},
     {id:'fase-2',nombre:'Ojo pleno',stats:{fase_ojo:2,iniciativa:2},descripcion:'El ojo cambia de forma y despierta el poder propio de quien lo porta.',
      vision:{nombre:'Ojo pleno',modo:'permanente',duracion:0,alcance:9,atraviesa_muros:true,apariencia:{color:'#d4142f',secundario:'#050203',patron:'estrella',marcas:6,velo:3},
       revelar:{vida:true,estados:true,acciones:true,pasivas:true},puntos_debiles:{cantidad:2,cambia:'ronda',recompensa:{ventaja:true,dados:1,caras:8}},anticipar:{armadura:3},amenazas:true}},
    ]}}),
   accion('ojo-clan-poder',{nombre:'Poder propio del ojo pleno',cantidad:3,caras:8,coste_ph:4,naturaleza:'magica',tipo_dano:'mirada',
    descripcion:'Ejemplo de poder personal: duplica esta acción para cada miembro y cámbiala. Solo se puede usar en la fase 2.',
    requisito_forma:{atributo:'fase_ojo',minimo:2},tablero:{alcance:6,forma:'individual',tamano:0,afecta:'enemigos'}}),
  ]},
];
export const PLANTILLAS:Plantilla[]=[
 ...OJOS,
 // 01 · Fuego de luz: el fuego deja una quemadura que arde cada turno hasta superar una salvación CD 12.
 {id:'golpe-quemadura',nombre:'Golpe con quemadura',descripcion:'Golpe de fuego que deja una quemadura persistente',icono:'fuego',para:'habilidad',
  fragmentos:[accion('fuego-de-luz',{nombre:'Fuego de luz',cantidad:1,caras:8,elemento:'fuego',naturaleza:'magica',coste_ph:2,tipo_dano:'fuego',
   tablero:{alcance:4,forma:'individual',tamano:0,afecta:'enemigos'}})]},
 // 07 · Escudo Astral: detiene la mitad, guarda esa energía y devuelve parte al atacante.
 {id:'escudo-astral',nombre:'Escudo que absorbe y devuelve',descripcion:'Detiene la mitad, guarda la energía y la devuelve',icono:'escudo',para:'habilidad',
  fragmentos:[accion('escudo-astral',{nombre:'Escudo Astral',cantidad:0,coste_ph:2,naturaleza:'magica',
   reaccion:{prioridad:5,principal:{reducir:{modo:'mitad'},reservar:{recurso:'Energía astral',proporcion:1,maximo:20},devolver:{maximo:8},animacion:'axioma-conservacion'}}})]},
 // 06 · Protección de rey: una barrera que solo se alza ante hechizos.
 {id:'barrera-hechizos',nombre:'Barrera contra hechizos',descripcion:'Detiene 8 de cada golpe mágico',icono:'corona',para:'habilidad',
  fragmentos:[accion('proteccion-de-rey',{nombre:'Protección de rey',cantidad:0,coste_ph:2,naturaleza:'magica',
   reaccion:{naturaleza:'magica',prioridad:5,principal:{reducir:{modo:'fijo',valor:8},animacion:'axioma-defensa'}}})]},
 // 08 · Transferencia de energía: la vida del caído pasa al portador.
 {id:'curar-al-matar',nombre:'Curar al matar',descripcion:'Al matar a un enemigo recupera 2d6 de vida',icono:'pocion',para:'habilidad',
  fragmentos:[regla('transferencia',{nombre:'Transferencia de energía',evento:'matar',efectos:[{tipo:'curar',destino:'yo',valor:{dados:2,caras:6}}]})]},
 // 09 · Miasma: más daño y puntería durante tres turnos; al disiparse, el cuerpo se cansa.
 {id:'furia-temporal',nombre:'Furia temporal',descripcion:'+4 daño y +2 impacto 3 turnos; después, fatiga',icono:'alma',para:'habilidad',
  fragmentos:[
   regla('miasma',{nombre:'Miasma',evento:'usar',coste_ph:2,enfriamiento:3,efectos:[{tipo:'transformar',destino:'yo',clave:'miasma',nombre:'Miasma',duracion:3,
    cambios:[{atributo:'dano',operacion:'sumar',valor:4},{atributo:'bono_impacto',operacion:'sumar',valor:2}]}]}),
   regla('miasma-fin',{nombre:'Se disipa el miasma',evento:'fin_efecto',condicion:{tipo:'estado_terminado',clave:'miasma'},efectos:[{tipo:'fatiga',destino:'yo',valor:1}]}),
  ]},
 // 17 · Despertar del Ojo Muerto: con poca vida, una vez por combate, más iniciativa y salvación.
 {id:'despertar',nombre:'Despertar con poca vida',descripcion:'Bajo el 30 % de vida: +5 iniciativa y +3 salvación',icono:'ojo',para:'habilidad',
  fragmentos:[regla('ojo-muerto',{nombre:'Despertar del Ojo Muerto',evento:'recibir_dano',usos:1,
   condicion:{tipo:'comparar',sujeto:'yo',atributo:'vida_actual',operador:'<',valor:30,porcentaje:true},
   efectos:[{tipo:'transformar',destino:'yo',clave:'ojo_muerto',nombre:'Ojo Muerto',duracion:0,cambios:[{atributo:'iniciativa',operacion:'sumar',valor:5},{atributo:'salvacion',operacion:'sumar',valor:3}]},
    {tipo:'mensaje',destino:'yo',nombre:'¡El Ojo Muerto despierta!'}]})]},
 // 13 · Teletransportación: aparece junto al objetivo (hasta 6 casillas) y golpea.
 {id:'teletransporte',nombre:'Teletransporte',descripcion:'Aparece junto al objetivo y golpea',icono:'rayo',para:'habilidad',
  fragmentos:[accion('paso-etereo',{nombre:'Paso etéreo',cantidad:1,caras:6,naturaleza:'magica',coste_ph:3,
   tablero:{alcance:7,forma:'individual',tamano:0,afecta:'enemigos',movimiento_lanzador:{tipo:'teletransporte',casillas:6,alcance_golpe:1}}})]},
 ...KION,
];
