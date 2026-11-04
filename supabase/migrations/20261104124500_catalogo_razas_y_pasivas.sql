-- Catálogo racial de Yugen. No modifica los atributos de personajes existentes.
-- Los valores son bases para creaciones futuras; el motor racial se aplica al preparar encuentros.
begin;

-- El disparador de pasivas raciales exige una cuenta KUROI: respetar la verificación.
select set_config('request.jwt.claim.sub',(
  select id::text from public.perfiles where rol='KUROI' order by created_at limit 1
),true);
do $$ begin
  if auth.uid() is null then raise exception 'No se encontró un perfil KUROI para configurar razas.'; end if;
end $$;

-- Las razas de origen del Diario no presentes en el catálogo se añaden sin cambiar familias existentes.
insert into public.categorias_forja (clave,nombre,descripcion,icono,parent_id)
select seed.clave,seed.nombre,seed.descripcion,seed.icono,root.id
from (values
  ('gigantes','Gigantes','De constitución robusta, con fuerza, regeneración y marcas ancestrales.','gigante'),
  ('hombres_bestia','Hombres Bestia','Pueblos de herencia animal y capacidades de transformación parcial.','bestia'),
  ('hadas','Hadas','Afinidad elemental, percepción de magia y vuelo mediante su magia.','alada')
) as seed(clave,nombre,descripcion,icono)
cross join (select id from public.categorias_forja where clave='razas') root
where not exists (select 1 from public.categorias_forja c where c.clave=seed.clave);

-- Ocho atributos por raza; las definiciones globales 'razas' no se modifican.
with seed(categoria,clave,valor) as (values
  ('personajes','vida',18),
  ('personajes','armadura',5),
  ('personajes','ph',4),
  ('personajes','fatiga',5),
  ('personajes','bono_impacto',0),
  ('personajes','dano',0),
  ('personajes','iniciativa',0),
  ('personajes','salvacion',0),
  ('kuro','vida',16),
  ('kuro','armadura',5),
  ('kuro','ph',3),
  ('kuro','fatiga',6),
  ('kuro','bono_impacto',1),
  ('kuro','dano',0),
  ('kuro','iniciativa',2),
  ('kuro','salvacion',0),
  ('elfos','vida',16),
  ('elfos','armadura',4),
  ('elfos','ph',7),
  ('elfos','fatiga',4),
  ('elfos','bono_impacto',1),
  ('elfos','dano',0),
  ('elfos','iniciativa',2),
  ('elfos','salvacion',1),
  ('enanos','vida',22),
  ('enanos','armadura',7),
  ('enanos','ph',3),
  ('enanos','fatiga',7),
  ('enanos','bono_impacto',0),
  ('enanos','dano',1),
  ('enanos','iniciativa',-1),
  ('enanos','salvacion',1),
  ('dragones','vida',26),
  ('dragones','armadura',9),
  ('dragones','ph',6),
  ('dragones','fatiga',8),
  ('dragones','bono_impacto',2),
  ('dragones','dano',2),
  ('dragones','iniciativa',0),
  ('dragones','salvacion',2),
  ('gigantes','vida',27),
  ('gigantes','armadura',7),
  ('gigantes','ph',2),
  ('gigantes','fatiga',8),
  ('gigantes','bono_impacto',0),
  ('gigantes','dano',2),
  ('gigantes','iniciativa',-1),
  ('gigantes','salvacion',1),
  ('hombres_bestia','vida',20),
  ('hombres_bestia','armadura',5),
  ('hombres_bestia','ph',4),
  ('hombres_bestia','fatiga',6),
  ('hombres_bestia','bono_impacto',1),
  ('hombres_bestia','dano',1),
  ('hombres_bestia','iniciativa',2),
  ('hombres_bestia','salvacion',0),
  ('hadas','vida',14),
  ('hadas','armadura',3),
  ('hadas','ph',8),
  ('hadas','fatiga',4),
  ('hadas','bono_impacto',0),
  ('hadas','dano',0),
  ('hadas','iniciativa',2),
  ('hadas','salvacion',2)
)
insert into public.config_estadisticas (categoria,clave,etiqueta,descripcion,valor_defecto,limite_jugador)
select seed.categoria,seed.clave,raiz.etiqueta,raiz.descripcion,seed.valor,greatest(coalesce(raiz.limite_jugador,11),abs(seed.valor))
from seed
join public.config_estadisticas raiz on raiz.categoria='razas' and raiz.clave=seed.clave
join public.categorias_forja c on c.clave=seed.categoria
where not exists(select 1 from public.config_estadisticas actual where actual.categoria=seed.categoria and actual.clave=seed.clave);

-- La pasiva queda en la subcategoría, con herencia automática.
-- Solo se rellenan las que siguen vacías; posteriores ediciones del GM se respetan.
with seed(clave,definicion) as (values
  ('personajes','{"nombre":"Versatilidad Nata","descripcion":"Los humanos aprenden con rapidez. En combate, después de su primer ataque fallido ganan +2 al impacto de su siguiente ataque, hasta acertar o hasta que expire el efecto. La velocidad de aprendizaje es una característica narrativa, no un multiplicador de experiencia implementado.","reglas":[{"id":"humano_aprender_error","nombre":"Aprender del error","evento":"fallar","condicion":{"tipo":"siempre"},"efectos":[{"tipo":"atributo","destino":"yo","atributo":"bono_impacto","operacion":"sumar","valor":2,"clave":"versatilidad_nata","duracion":2}],"coste_ph":0,"coste_fatiga":0,"enfriamiento":0,"usos":1,"prioridad":0},{"id":"humano_adaptacion_aplicada","nombre":"Aplicar adaptación","evento":"impactar","condicion":{"tipo":"estado","sujeto":"yo","estado":"versatilidad_nata"},"efectos":[{"tipo":"quitar_estado","destino":"yo","clave":"versatilidad_nata"}],"coste_ph":0,"coste_fatiga":0,"enfriamiento":0,"usos":0,"prioridad":0}],"reglas_pasivas":[]}'::jsonb),
  ('kuro','{"nombre":"Sangre Mutada","descripcion":"Mutación de los Kuro. Al quedarse con la mitad de vida o menos recibe +2 al impacto y +1 a las salvaciones. Hereda también Versatilidad Nata de los humanos. No concede las habilidades exclusivas de Axel.","reglas":[],"reglas_pasivas":[{"id":"kuro_sangre_mutada","nombre":"Sangre Mutada","evento":"permanente","condicion":"vida_mitad","bonos":{"bono_impacto":2,"salvacion":1},"curacion":0,"recuperar_ph":0,"reducir_fatiga":0}]}'::jsonb),
  ('elfos','{"nombre":"Vínculo Espiritual","descripcion":"Cada elfo posee una criatura del alma única. Activación inicial: consume 1 PH y una acción para manifestarla tres turnos; durante ese tiempo recibe +1 al impacto y +1 a salvación. Los poderes concretos de cada espíritu se desarrollan por personaje.","reglas":[{"id":"elfo_manifestar_espiritu","nombre":"Manifestar criatura del alma","evento":"usar","condicion":{"tipo":"siempre"},"efectos":[{"tipo":"transformar","destino":"yo","clave":"vinculo_espiritual","nombre":"Espíritu manifestado","duracion":3,"cambios":[{"atributo":"bono_impacto","operacion":"sumar","valor":1},{"atributo":"salvacion","operacion":"sumar","valor":1}]},{"tipo":"mensaje","destino":"yo","nombre":"Tu criatura espiritual te acompaña durante tres turnos"}],"coste_ph":1,"coste_fatiga":0,"enfriamiento":0,"usos":1,"prioridad":0}],"reglas_pasivas":[]}'::jsonb),
  ('enanos','{"nombre":"Maestría en Forja Elemental","descripcion":"Capacidad innata para combinar minerales y producir aleaciones extraordinarias. Es una ventaja de fabricación fuera del combate; el módulo de Forja todavía no aplica automáticamente bonificaciones al producir materiales.","reglas":[{"id":"enano_maestria_forja","nombre":"Dominio de materiales","evento":"inicio_combate","condicion":{"tipo":"siempre"},"efectos":[{"tipo":"mensaje","destino":"yo","nombre":"La maestría de forja es una capacidad de fabricación, no un bono adicional de combate"}],"coste_ph":0,"coste_fatiga":0,"enfriamiento":0,"usos":1,"prioridad":0}],"reglas_pasivas":[]}'::jsonb),
  ('dragones','{"nombre":"Escamas de Dragón","descripcion":"Frente a ataques mágicos que consumen PH: +5 ARM solo contra ese ataque y reducción del 50 % del daño recibido si impacta. No concede +5 ARM permanente. El simulador prioriza esta versión racial frente a pasivas equipadas con el mismo nombre.","reglas":[],"reglas_pasivas":[{"id":"dragon_escamas_magicas","nombre":"Escamas de Dragón","evento":"recibir_ataque","condicion":"ataque_magico","bonos":{"armadura":5},"curacion":0,"recuperar_ph":0,"reducir_fatiga":0,"reduccion_pct":50}]}'::jsonb),
  ('gigantes','{"nombre":"Regeneración Gigantada","descripcion":"El organismo de un gigante se recupera con rapidez: sana 2 HP al inicio de cada turno mientras siga vivo. Las marcas sagradas anti-magia del Diario se conservan como lore; la inmunidad absoluta aún requiere una regla diferenciada en el motor.","reglas":[],"reglas_pasivas":[{"id":"gigante_regeneracion","nombre":"Regeneración Gigantada","evento":"inicio_turno","condicion":"siempre","bonos":{},"curacion":2,"recuperar_ph":0,"reducir_fatiga":0}]}'::jsonb),
  ('hombres_bestia','{"nombre":"Instinto Salvaje","descripcion":"La percepción y fuerza de su linaje animal les permite una transformación parcial: cuesta una acción y 2 Fatiga, aumenta +2 daño y +1 impacto por tres turnos. Las particularidades de cada especie se definen por personaje.","reglas":[{"id":"bestia_transformacion_parcial","nombre":"Transformación parcial","evento":"usar","condicion":{"tipo":"siempre"},"efectos":[{"tipo":"transformar","destino":"yo","clave":"instinto_salvaje","nombre":"Instinto Salvaje","duracion":3,"cambios":[{"atributo":"dano","operacion":"sumar","valor":2},{"atributo":"bono_impacto","operacion":"sumar","valor":1}]}],"coste_ph":0,"coste_fatiga":2,"enfriamiento":0,"usos":1,"prioridad":0}],"reglas_pasivas":[]}'::jsonb),
  ('hadas','{"nombre":"Resplandor Mágico","descripcion":"Las hadas perciben las corrientes mágicas y poseen una afinidad natural con los elementos, además de la capacidad narrativa de volar. La detección y el vuelo aún no aplican modificaciones de altura ni cálculos de percepción automáticos.","reglas":[{"id":"hada_resplandor","nombre":"Resplandor Mágico","evento":"inicio_combate","condicion":{"tipo":"siempre"},"efectos":[{"tipo":"mensaje","destino":"yo","nombre":"Percibes la presencia de energía mágica; la detección requiere interpretación del GM"}],"coste_ph":0,"coste_fatiga":0,"enfriamiento":0,"usos":1,"prioridad":0}],"reglas_pasivas":[]}'::jsonb)
)
update public.categorias_forja c
set pasiva_racial=seed.definicion
from seed where c.clave=seed.clave and c.pasiva_racial is null;

commit;
