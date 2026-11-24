// Bioelectricidad como DATOS (el motor no la conoce): recurso CB + potenciador «1 CB = 1d6».
export const CB={id:'carga_bioelectrica',nombre:'Carga Bioeléctrica',tope:{tipo:'fijo',valor:6},inicial:2,generacion:[{evento:'inicio_turno',cantidad:1}],recuperacion:'inicial',visible:'todos'};
export const BIO={id:'bioelectricidad',nombre:'Bioelectricidad',origen:'linaje',recursos:[CB],potenciadores:[{id:'carga',nombre:'Carga eléctrica',acepta:['ataque'],coste:{recurso:{id:'carga_bioelectrica',min:1,max:3}},componentes_anadidos:[{elemento:'electricidad',cantidad:1,caras:6,por_unidad:true}],limite_por_uso:1}]};
export const rasgoEf=(rasgo,id='rasgo')=>({id,nombre:rasgo.nombre,efecto:'estado',estado:rasgo.nombre,cantidad:0,caras:4,modificador:0,coste_ph:0,solo_pasivo:true,rasgo});
export const bola={id:'bola',nombre:'Bola de fuego',efecto:'dano',cantidad:2,caras:6,modificador:0,coste_ph:2,naturaleza:'magica',elemento:'fuego',tipo_dano:'fuego'};
