export type EventoLogro='manual'|'enemigo_derrotado'|'encuentro_finalizado'|'sobrevivir_encuentro'|'nivel_alcanzado'|'objeto_adjudicado';
export type CondicionesLogro={nivel_minimo?:number;enemigo_nivel_minimo?:number;rondas_maximas?:number;sin_caer?:boolean;objeto_id?:string};
export type LogroYugen={id?:string;nombre:string;descripcion:string;icono:string;imagen_url:string;evento:EventoLogro;objetivo:string|null;meta:number;alcance:'cuenta'|'personaje'|'campana';campana:string;secreto:boolean;titulo:string;titulo_forja_id:string|null;color:string;activo:boolean;criterio:string;condiciones:CondicionesLogro};
export const nuevoLogro=():LogroYugen=>({nombre:'',descripcion:'',icono:'corona',imagen_url:'',evento:'manual',objetivo:null,meta:1,alcance:'cuenta',campana:'ambrosia',secreto:false,titulo:'',titulo_forja_id:null,color:'#fbbf24',activo:true,criterio:'',condiciones:{}});
export const DISPARADORES_LOGRO:{id:EventoLogro;nombre:string;descripcion:string}[]=[
 {id:'manual',nombre:'Decisión del GM · sesión presencial o hito narrativo',descripcion:'No exige que ocurra nada en la aplicación. El GM registra el motivo y puede desbloquear el logro o añadir progreso.'},
 {id:'enemigo_derrotado',nombre:'Derrotar enemigos en una victoria oficial',descripcion:'Cuenta enemigos derrotados del bando contrario al aprobar las recompensas. Excluye invocaciones y neutrales; un mismo enemigo no cuenta varias veces para la cuenta por tener varios compañeros.'},
 {id:'encuentro_finalizado',nombre:'Ganar encuentros oficiales',descripcion:'Añade una victoria cuando el GM aprueba las recompensas y el destinatario es elegible en el bando ganador.'},
 {id:'sobrevivir_encuentro',nombre:'Sobrevivir a una victoria oficial',descripcion:'Exige que el personaje termine con vida mayor que cero. Puedes exigir además que no haya caído durante el encuentro.'},
 {id:'nivel_alcanzado',nombre:'Subir niveles',descripcion:'Cuenta los niveles subidos al recibir EXP del encuentro. Para un título al alcanzar el nivel 10, exige nivel mínimo 10 y progreso necesario 1.'},
 {id:'objeto_adjudicado',nombre:'Recibir botín confirmado',descripcion:'Sin objeto específico cuenta entregas de saqueo. Con un objeto específico cuenta sus copias realmente adjudicadas.'},
];
export function condicionesParaEvento(evento:EventoLogro,c:CondicionesLogro):CondicionesLogro{
 if(evento==='manual')return {};
 return {...(c.nivel_minimo?{nivel_minimo:c.nivel_minimo}:{}),...(evento==='enemigo_derrotado'&&c.enemigo_nivel_minimo?{enemigo_nivel_minimo:c.enemigo_nivel_minimo}:{}),...(['enemigo_derrotado','encuentro_finalizado','sobrevivir_encuentro'].includes(evento)?{...(c.rondas_maximas?{rondas_maximas:c.rondas_maximas}:{}),...(c.sin_caer?{sin_caer:true}:{})}:{}),...(evento==='objeto_adjudicado'&&c.objeto_id?{objeto_id:c.objeto_id}:{})};
}
