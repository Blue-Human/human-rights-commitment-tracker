-- The site is published in Spanish. This migration translates the stored content the site
-- shows: recommendations (official Spanish text of A/HRC/60/8), assessment rationales,
-- evidence, the human-security mapping, monitoring notes and reference names.
-- Each value replaced is first copied to content_translation_backup, so the English
-- original can be restored. Status, confidence and the other stored codes do not change.

create table if not exists public.content_translation_backup (
  table_name text not null,
  row_key text not null,
  column_name text not null,
  original text,
  saved_at timestamptz not null default now(),
  primary key (table_name, row_key, column_name)
);
alter table public.content_translation_backup enable row level security;
revoke all on public.content_translation_backup from anon, authenticated;

-- Recommendations: Spanish titles and the official Spanish text of A/HRC/60/8.
with t (k, es) as (values
  ('ESP-UPR4-050.1', $es$Convención sobre los trabajadores migratorios: considerar su ratificación$es$),
  ('ESP-UPR4-050.10', $es$Recursos para el Defensor del Pueblo$es$),
  ('ESP-UPR4-050.11', $es$Medios adecuados para el Observatorio del Racismo y la Xenofobia$es$),
  ('ESP-UPR4-050.12', $es$Observatorio del Feminicidio y datos sobre armas de fuego$es$),
  ('ESP-UPR4-050.13', $es$Estrategia nacional contra el racismo, la xenofobia y la intolerancia$es$),
  ('ESP-UPR4-050.14', $es$Legislación sobre el uso de la fuerza y de las armas de fuego$es$),
  ('ESP-UPR4-050.15', $es$Resistencia de la población a la desinformación$es$),
  ('ESP-UPR4-050.16', $es$Diversidad en la inteligencia artificial$es$),
  ('ESP-UPR4-050.17', $es$Marco Estratégico contra el racismo y la xenofobia$es$),
  ('ESP-UPR4-050.18', $es$Plan nacional contra el racismo y la intolerancia$es$),
  ('ESP-UPR4-050.19', $es$III Plan de Acción de Lucha contra los Delitos de Odio$es$),
  ('ESP-UPR4-050.2', $es$Convención sobre los trabajadores migratorios: considerar la adhesión$es$),
  ('ESP-UPR4-050.20', $es$Plan nacional de lucha contra el antisemitismo$es$),
  ('ESP-UPR4-050.21', $es$II Plan Nacional de Derechos Humanos$es$),
  ('ESP-UPR4-050.22', $es$Lucha contra el racismo$es$),
  ('ESP-UPR4-050.23', $es$Combatir todas las formas de racismo$es$),
  ('ESP-UPR4-050.24', $es$Combatir el discurso de odio y sensibilizar$es$),
  ('ESP-UPR4-050.25', $es$Discurso de odio y amenazas en Internet$es$),
  ('ESP-UPR4-050.26', $es$Poner fin al perfilado étnico por parte de los cuerpos de seguridad$es$),
  ('ESP-UPR4-050.27', $es$Prohibir los perfiles raciales o étnicos en los controles de identidad$es$),
  ('ESP-UPR4-050.28', $es$Poner fin a las prácticas de perfilado racial$es$),
  ('ESP-UPR4-050.29', $es$Combatir el racismo y prohibir el perfilado racial$es$),
  ('ESP-UPR4-050.3', $es$Convención sobre los trabajadores migratorios: ratificación$es$),
  ('ESP-UPR4-050.30', $es$Medidas contra el perfilado racial$es$),
  ('ESP-UPR4-050.31', $es$Discriminación, discurso de odio y perfilado racial$es$),
  ('ESP-UPR4-050.32', $es$Combatir los delitos de odio dentro y fuera de Internet$es$),
  ('ESP-UPR4-050.33', $es$Aplicar la legislación contra el racismo y la discriminación$es$),
  ('ESP-UPR4-050.34', $es$Combatir el discurso de odio racista y xenófobo$es$),
  ('ESP-UPR4-050.35', $es$Legislación integral contra la discriminación$es$),
  ('ESP-UPR4-050.36', $es$Legislación específica contra la discriminación racial$es$),
  ('ESP-UPR4-050.37', $es$Aplicar la ley contra el racismo y programas educativos$es$),
  ('ESP-UPR4-050.38', $es$Combatir el racismo en los espacios digitales$es$),
  ('ESP-UPR4-050.39', $es$Reforzar los mecanismos contra el racismo y el discurso de odio$es$),
  ('ESP-UPR4-050.4', $es$Ratificación del Protocolo Facultativo del Pacto Internacional de Derechos Civiles y Políticos$es$),
  ('ESP-UPR4-050.40', $es$Combatir la discriminación racial y el discurso de odio$es$),
  ('ESP-UPR4-050.5', $es$Ratificación de la Convención contra el Genocidio$es$),
  ('ESP-UPR4-050.6', $es$Tratado sobre la Prohibición de las Armas Nucleares$es$),
  ('ESP-UPR4-050.7', $es$Tratado sobre las armas nucleares y participación como observador$es$),
  ('ESP-UPR4-050.8', $es$Medidas coercitivas unilaterales$es$),
  ('ESP-UPR4-050.9', $es$Asistencia técnica en derechos económicos, sociales y culturales$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'commitments', t.k, 'title', x.title from public.commitments x join t on x.public_id = t.k
  on conflict do nothing
)
update public.commitments x set title = t.es from t where x.public_id = t.k;

with t (k, es) as (values
  ('ESP-UPR4-050.1', $es$Considerar la posibilidad de ratificar la Convención Internacional sobre la Protección de los Derechos de Todos los Trabajadores Migratorios y de Sus Familiares$es$),
  ('ESP-UPR4-050.10', $es$Seguir proporcionando recursos financieros a la Oficina del Defensor del Pueblo$es$),
  ('ESP-UPR4-050.11', $es$Garantizar que el Observatorio del Racismo y la Xenofobia disponga de los medios adecuados para desempeñar su importante función$es$),
  ('ESP-UPR4-050.12', $es$Fortalecer el Observatorio del Feminicidio mediante la recopilación sistemática de datos detallados sobre la tenencia de armas de fuego y su implicación en casos de feminicidio y violencia de género para identificar factores de riesgo y mejorar los mecanismos de prevención$es$),
  ('ESP-UPR4-050.13', $es$Adoptar una estrategia nacional integral de lucha contra el racismo, la xenofobia y la intolerancia, que incluya medidas más contundentes para investigar, perseguir y sancionar la incitación al odio$es$),
  ('ESP-UPR4-050.14', $es$Revisar la legislación nacional sobre el uso de la fuerza y de las armas de fuego, en particular en las manifestaciones y en las fronteras, para adaptarla a las normas internacionales$es$),
  ('ESP-UPR4-050.15', $es$Proseguir las iniciativas destinadas a aumentar la resistencia de la población a la desinformación y la manipulación de la información, en estrecha cooperación con la sociedad civil, el mundo académico, el sector privado y otras partes interesadas$es$),
  ('ESP-UPR4-050.16', $es$Desarrollar políticas públicas que promuevan la diversidad en todos los ámbitos de la inteligencia artificial$es$),
  ('ESP-UPR4-050.17', $es$Seguir intensificando los esfuerzos mediante la aplicación plena y efectiva del Marco Estratégico para la Ciudadanía y la Inclusión contra el Racismo y la Xenofobia, incluidos mecanismos de seguimiento y evaluación que garanticen la rendición de cuentas y el impacto$es$),
  ('ESP-UPR4-050.18', $es$Adoptar un plan nacional de lucha contra todas las formas de racismo, xenofobia e intolerancia$es$),
  ('ESP-UPR4-050.19', $es$Avanzar con la adopción del tercer Plan de Acción para Combatir los Delitos de Odio$es$),
  ('ESP-UPR4-050.2', $es$Considerar la posibilidad de adherirse a la Convención Internacional sobre la Protección de los Derechos de Todos los Trabajadores Migratorios y de Sus Familiares$es$),
  ('ESP-UPR4-050.20', $es$Garantizar la plena aplicación del Plan Nacional de Aplicación de la Estrategia de la Unión Europea de Lucha contra el Antisemitismo y hacer más visibles los compromisos$es$),
  ('ESP-UPR4-050.21', $es$Continuar la aplicación efectiva del segundo Plan Nacional de Derechos Humanos con la participación activa de la sociedad civil$es$),
  ('ESP-UPR4-050.22', $es$Intensificar la lucha contra el racismo$es$),
  ('ESP-UPR4-050.23', $es$Seguir intensificando los esfuerzos para combatir todas las formas de racismo, en particular aplicando las recomendaciones pertinentes de la Relatoría Especial sobre cuestiones de las minorías$es$),
  ('ESP-UPR4-050.24', $es$Redoblar los esfuerzos nacionales para combatir el discurso de odio en todas sus formas e intensificar los programas de sensibilización en este ámbito$es$),
  ('ESP-UPR4-050.25', $es$Adoptar medidas eficaces para combatir el fenómeno de la incitación al odio y las amenazas en Internet$es$),
  ('ESP-UPR4-050.26', $es$Erradicar el uso del perfilado étnico por parte de los cuerpos de seguridad, garantizando así el derecho a la igualdad y a la no discriminación de todas las personas, incluidos los migrantes, los refugiados y las personas pertenecientes a grupos minoritarios$es$),
  ('ESP-UPR4-050.27', $es$Proseguir los esfuerzos para luchar eficazmente contra la elaboración de perfiles raciales o étnicos por la policía y adoptar disposiciones jurídicas que prohíban los controles de identidad basados en esos criterios$es$),
  ('ESP-UPR4-050.28', $es$Garantizar que las autoridades encargadas de hacer cumplir la ley no utilicen prácticas de elaboración de perfiles raciales, y tomar medidas concretas para poner fin a tales prácticas$es$),
  ('ESP-UPR4-050.29', $es$Mantener los esfuerzos para luchar eficazmente contra el racismo, la xenofobia y la discriminación y prohibir el uso de perfiles raciales y étnicos por parte de las fuerzas del orden$es$),
  ('ESP-UPR4-050.3', $es$Ratificar la Convención Internacional sobre la Protección de los Derechos de Todos los Trabajadores Migratorios y de Sus Familiares$es$),
  ('ESP-UPR4-050.30', $es$Considerar la posibilidad de adoptar medidas eficaces para combatir la práctica del perfilado racial$es$),
  ('ESP-UPR4-050.31', $es$Combatir la discriminación y el discurso de odio, tanto en la esfera política como en la pública, incluyendo estrategias para erradicar el perfilado racial por parte de las fuerzas de seguridad$es$),
  ('ESP-UPR4-050.32', $es$Redoblar continuamente los esfuerzos para combatir los delitos motivados por el odio en línea y fuera de línea, entre ellos los cometidos contra personas pertenecientes a minorías nacionales o étnicas, religiosas y lingüísticas$es$),
  ('ESP-UPR4-050.33', $es$Intensificar los esfuerzos para combatir el discurso y los delitos de odio y aplicar plenamente la legislación contra el racismo y la discriminación$es$),
  ('ESP-UPR4-050.34', $es$Intensificar las medidas para combatir el discurso de odio y la retórica racista y xenófoba, tanto en línea como fuera de ella, haciendo especial hincapié en perseguir y castigar a los autores$es$),
  ('ESP-UPR4-050.35', $es$Adoptar una legislación antidiscriminatoria compleja para combatir todas las formas de racismo, incluido el discurso de odio, en Internet y otros medios de comunicación, así como en el empleo, la educación y la atención sanitaria$es$),
  ('ESP-UPR4-050.36', $es$Aprobar legislación específica contra el racismo y la discriminación racial$es$),
  ('ESP-UPR4-050.37', $es$Intensificar los esfuerzos para aplicar plenamente la legislación contra el racismo y la discriminación y desarrollar programas educativos integrales sobre el tema$es$),
  ('ESP-UPR4-050.38', $es$Redoblar los esfuerzos para combatir el racismo, la xenofobia y otras formas de intolerancia, también en los espacios digitales$es$),
  ('ESP-UPR4-050.39', $es$Seguir reforzando los mecanismos de lucha contra todas las formas de racismo, xenofobia, intolerancia y discurso de odio$es$),
  ('ESP-UPR4-050.4', $es$Finalizar la ratificación del Protocolo Facultativo del Pacto Internacional de Derechos Civiles y Políticos$es$),
  ('ESP-UPR4-050.40', $es$Reforzar las medidas y los esfuerzos para combatir todas las formas de discriminación racial y el discurso de odio$es$),
  ('ESP-UPR4-050.5', $es$Ratificar la Convención para la Prevención y la Sanción del Delito de Genocidio$es$),
  ('ESP-UPR4-050.6', $es$Considerar la ratificación del Tratado sobre la Prohibición de las Armas Nucleares$es$),
  ('ESP-UPR4-050.7', $es$Considerar la posibilidad de ratificar el Tratado sobre la Prohibición de las Armas Nucleares y participar como observador en la reunión de los Estados partes$es$),
  ('ESP-UPR4-050.8', $es$Eliminar sin condiciones la aplicación ilegal de medidas coercitivas unilaterales$es$),
  ('ESP-UPR4-050.9', $es$Aumentar la asistencia técnica para apoyar la promoción de los derechos humanos en el ámbito de los derechos económicos, sociales y culturales, con resultados claros y mensurables$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'commitments', t.k, 'normalized_summary', x.normalized_summary from public.commitments x join t on x.public_id = t.k
  on conflict do nothing
)
update public.commitments x set normalized_summary = t.es from t where x.public_id = t.k;

with t (k, es) as (values
  ('ESP-UPR4-050.1', $es$Considerar la posibilidad de ratificar la Convención Internacional sobre la Protección de los Derechos de Todos los Trabajadores Migratorios y de Sus Familiares (Gambia) (Paraguay) (Senegal) (Türkiye);$es$),
  ('ESP-UPR4-050.10', $es$Seguir proporcionando recursos financieros a la Oficina del Defensor del Pueblo (Georgia);$es$),
  ('ESP-UPR4-050.11', $es$Garantizar que el Observatorio del Racismo y la Xenofobia disponga de los medios adecuados para desempeñar su importante función (Marruecos);$es$),
  ('ESP-UPR4-050.12', $es$Fortalecer el Observatorio del Feminicidio mediante la recopilación sistemática de datos detallados sobre la tenencia de armas de fuego y su implicación en casos de feminicidio y violencia de género para identificar factores de riesgo y mejorar los mecanismos de prevención (Panamá);$es$),
  ('ESP-UPR4-050.13', $es$Adoptar una estrategia nacional integral de lucha contra el racismo, la xenofobia y la intolerancia, que incluya medidas más contundentes para investigar, perseguir y sancionar la incitación al odio (Bangladesh);$es$),
  ('ESP-UPR4-050.14', $es$Revisar la legislación nacional sobre el uso de la fuerza y de las armas de fuego, en particular en las manifestaciones y en las fronteras, para adaptarla a las normas internacionales (Colombia);$es$),
  ('ESP-UPR4-050.15', $es$Proseguir las iniciativas destinadas a aumentar la resistencia de la población a la desinformación y la manipulación de la información, en estrecha cooperación con la sociedad civil, el mundo académico, el sector privado y otras partes interesadas (Lituania);$es$),
  ('ESP-UPR4-050.16', $es$Desarrollar políticas públicas que promuevan la diversidad en todos los ámbitos de la inteligencia artificial (Estonia);$es$),
  ('ESP-UPR4-050.17', $es$Seguir intensificando los esfuerzos mediante la aplicación plena y efectiva del Marco Estratégico para la Ciudadanía y la Inclusión contra el Racismo y la Xenofobia, incluidos mecanismos de seguimiento y evaluación que garanticen la rendición de cuentas y el impacto (Eritrea);$es$),
  ('ESP-UPR4-050.18', $es$Adoptar un plan nacional de lucha contra todas las formas de racismo, xenofobia e intolerancia (Bahréin);$es$),
  ('ESP-UPR4-050.19', $es$Avanzar con la adopción del tercer Plan de Acción para Combatir los Delitos de Odio (República de Moldavia);$es$),
  ('ESP-UPR4-050.2', $es$Considerar la posibilidad de adherirse a la Convención Internacional sobre la Protección de los Derechos de Todos los Trabajadores Migratorios y de Sus Familiares (Egipto) (Sri Lanka);$es$),
  ('ESP-UPR4-050.20', $es$Garantizar la plena aplicación del Plan Nacional de Aplicación de la Estrategia de la Unión Europea de Lucha contra el Antisemitismo y hacer más visibles los compromisos (Alemania);$es$),
  ('ESP-UPR4-050.21', $es$Continuar la aplicación efectiva del segundo Plan Nacional de Derechos Humanos con la participación activa de la sociedad civil (Kazajstán);$es$),
  ('ESP-UPR4-050.22', $es$Intensificar la lucha contra el racismo (Albania);$es$),
  ('ESP-UPR4-050.23', $es$Seguir intensificando los esfuerzos para combatir todas las formas de racismo, en particular aplicando las recomendaciones pertinentes de la Relatoría Especial sobre cuestiones de las minorías (Irlanda);$es$),
  ('ESP-UPR4-050.24', $es$Redoblar los esfuerzos nacionales para combatir el discurso de odio en todas sus formas e intensificar los programas de sensibilización en este ámbito (Kuwait);$es$),
  ('ESP-UPR4-050.25', $es$Adoptar medidas eficaces para combatir el fenómeno de la incitación al odio y las amenazas en Internet (Federación de Rusia);$es$),
  ('ESP-UPR4-050.26', $es$Erradicar el uso del perfilado étnico por parte de los cuerpos de seguridad, garantizando así el derecho a la igualdad y a la no discriminación de todas las personas, incluidos los migrantes, los refugiados y las personas pertenecientes a grupos minoritarios (República Bolivariana de Venezuela);$es$),
  ('ESP-UPR4-050.27', $es$Proseguir los esfuerzos para luchar eficazmente contra la elaboración de perfiles raciales o étnicos por la policía y adoptar disposiciones jurídicas que prohíban los controles de identidad basados en esos criterios (Djibouti);$es$),
  ('ESP-UPR4-050.28', $es$Garantizar que las autoridades encargadas de hacer cumplir la ley no utilicen prácticas de elaboración de perfiles raciales, y tomar medidas concretas para poner fin a tales prácticas (Egipto);$es$),
  ('ESP-UPR4-050.29', $es$Mantener los esfuerzos para luchar eficazmente contra el racismo, la xenofobia y la discriminación y prohibir el uso de perfiles raciales y étnicos por parte de las fuerzas del orden (Rumanía);$es$),
  ('ESP-UPR4-050.3', $es$Ratificar la Convención Internacional sobre la Protección de los Derechos de Todos los Trabajadores Migratorios y de Sus Familiares (Argelia) (Bangladesh) (Ghana) (Filipinas);$es$),
  ('ESP-UPR4-050.30', $es$Considerar la posibilidad de adoptar medidas eficaces para combatir la práctica del perfilado racial (Namibia);$es$),
  ('ESP-UPR4-050.31', $es$Combatir la discriminación y el discurso de odio, tanto en la esfera política como en la pública, incluyendo estrategias para erradicar el perfilado racial por parte de las fuerzas de seguridad (México);$es$),
  ('ESP-UPR4-050.32', $es$Redoblar continuamente los esfuerzos para combatir los delitos motivados por el odio en línea y fuera de línea, entre ellos los cometidos contra personas pertenecientes a minorías nacionales o étnicas, religiosas y lingüísticas (Austria);$es$),
  ('ESP-UPR4-050.33', $es$Intensificar los esfuerzos para combatir el discurso y los delitos de odio y aplicar plenamente la legislación contra el racismo y la discriminación (Azerbaiyán);$es$),
  ('ESP-UPR4-050.34', $es$Intensificar las medidas para combatir el discurso de odio y la retórica racista y xenófoba, tanto en línea como fuera de ella, haciendo especial hincapié en perseguir y castigar a los autores (Djibouti);$es$),
  ('ESP-UPR4-050.35', $es$Adoptar una legislación antidiscriminatoria compleja para combatir todas las formas de racismo, incluido el discurso de odio, en Internet y otros medios de comunicación, así como en el empleo, la educación y la atención sanitaria (República Checa);$es$),
  ('ESP-UPR4-050.36', $es$Aprobar legislación específica contra el racismo y la discriminación racial (Brasil);$es$),
  ('ESP-UPR4-050.37', $es$Intensificar los esfuerzos para aplicar plenamente la legislación contra el racismo y la discriminación y desarrollar programas educativos integrales sobre el tema (Ecuador);$es$),
  ('ESP-UPR4-050.38', $es$Redoblar los esfuerzos para combatir el racismo, la xenofobia y otras formas de intolerancia, también en los espacios digitales (Lesoto);$es$),
  ('ESP-UPR4-050.39', $es$Seguir reforzando los mecanismos de lucha contra todas las formas de racismo, xenofobia, intolerancia y discurso de odio (Senegal);$es$),
  ('ESP-UPR4-050.4', $es$Finalizar la ratificación del Protocolo Facultativo del Pacto Internacional de Derechos Civiles y Políticos (República Democrática del Congo);$es$),
  ('ESP-UPR4-050.40', $es$Reforzar las medidas y los esfuerzos para combatir todas las formas de discriminación racial y el discurso de odio (Arabia Saudí);$es$),
  ('ESP-UPR4-050.5', $es$Ratificar la Convención para la Prevención y la Sanción del Delito de Genocidio (Côte d’Ivoire) (Pakistán);$es$),
  ('ESP-UPR4-050.6', $es$Considerar la ratificación del Tratado sobre la Prohibición de las Armas Nucleares (Yibuti);$es$),
  ('ESP-UPR4-050.7', $es$Considerar la posibilidad de ratificar el Tratado sobre la Prohibición de las Armas Nucleares y participar como observador en la reunión de los Estados partes (Samoa);$es$),
  ('ESP-UPR4-050.8', $es$Eliminar sin condiciones la aplicación ilegal de medidas coercitivas unilaterales (República Bolivariana de Venezuela);$es$),
  ('ESP-UPR4-050.9', $es$Aumentar la asistencia técnica para apoyar la promoción de los derechos humanos en el ámbito de los derechos económicos, sociales y culturales, con resultados claros y mensurables (Malasia);$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'commitments', t.k, 'original_text', x.original_text from public.commitments x join t on x.public_id = t.k
  on conflict do nothing
)
update public.commitments x set original_text = t.es from t where x.public_id = t.k;

with t (k, es) as (values
  ('ESP-UPR4-050.1', $es$es$es$),
  ('ESP-UPR4-050.10', $es$es$es$),
  ('ESP-UPR4-050.11', $es$es$es$),
  ('ESP-UPR4-050.12', $es$es$es$),
  ('ESP-UPR4-050.13', $es$es$es$),
  ('ESP-UPR4-050.14', $es$es$es$),
  ('ESP-UPR4-050.15', $es$es$es$),
  ('ESP-UPR4-050.16', $es$es$es$),
  ('ESP-UPR4-050.17', $es$es$es$),
  ('ESP-UPR4-050.18', $es$es$es$),
  ('ESP-UPR4-050.19', $es$es$es$),
  ('ESP-UPR4-050.2', $es$es$es$),
  ('ESP-UPR4-050.20', $es$es$es$),
  ('ESP-UPR4-050.21', $es$es$es$),
  ('ESP-UPR4-050.22', $es$es$es$),
  ('ESP-UPR4-050.23', $es$es$es$),
  ('ESP-UPR4-050.24', $es$es$es$),
  ('ESP-UPR4-050.25', $es$es$es$),
  ('ESP-UPR4-050.26', $es$es$es$),
  ('ESP-UPR4-050.27', $es$es$es$),
  ('ESP-UPR4-050.28', $es$es$es$),
  ('ESP-UPR4-050.29', $es$es$es$),
  ('ESP-UPR4-050.3', $es$es$es$),
  ('ESP-UPR4-050.30', $es$es$es$),
  ('ESP-UPR4-050.31', $es$es$es$),
  ('ESP-UPR4-050.32', $es$es$es$),
  ('ESP-UPR4-050.33', $es$es$es$),
  ('ESP-UPR4-050.34', $es$es$es$),
  ('ESP-UPR4-050.35', $es$es$es$),
  ('ESP-UPR4-050.36', $es$es$es$),
  ('ESP-UPR4-050.37', $es$es$es$),
  ('ESP-UPR4-050.38', $es$es$es$),
  ('ESP-UPR4-050.39', $es$es$es$),
  ('ESP-UPR4-050.4', $es$es$es$),
  ('ESP-UPR4-050.40', $es$es$es$),
  ('ESP-UPR4-050.5', $es$es$es$),
  ('ESP-UPR4-050.6', $es$es$es$),
  ('ESP-UPR4-050.7', $es$es$es$),
  ('ESP-UPR4-050.8', $es$es$es$),
  ('ESP-UPR4-050.9', $es$es$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'commitments', t.k, 'original_language', x.original_language from public.commitments x join t on x.public_id = t.k
  on conflict do nothing
)
update public.commitments x set original_language = t.es from t where x.public_id = t.k;

-- Assessment rationales. The stored pilot caveat, where present, is kept as it was.
with t (k, es) as (values
  ('9d5907e2-f438-42ad-81cd-d502edd32293', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('fede980f-7b1c-494b-b07f-b3e648e24d6e', $es$La recomendación 50.10 pide a España que siga proporcionando recursos financieros a la Oficina del Defensor del Pueblo. La referencia anterior a la recomendación muestra una asignación definitiva de 20,9178 millones de euros en 2024 y la misma asignación total a mediados de 2025. Los datos presupuestarios oficiales posteriores a la recomendación muestran que la financiación se mantiene en 2026, con un presupuesto inicial publicado de 20,9178 millones de euros y un crédito definitivo de 23,0218 millones de euros a 30 de junio de 2026. Atendiendo a la redacción estricta de la recomendación, queda por tanto documentada la continuidad de la dotación financiera. Esta valoración no afirma que todos los aspectos de la capacidad o la independencia de la institución sean óptimos; solo valora el compromiso de seguir proporcionando recursos financieros.$es$),
  ('3e95f006-5791-4765-aa36-5bf364126ab2', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('0f31a85a-7cf8-424b-a6ad-17e8fa359178', $es$La recomendación 50.11 pide a España que garantice que el OBERAXE disponga de los medios adecuados para desempeñar su función. La información oficial demuestra una capacidad operativa significativa en la monitorización del discurso de odio en línea: un equipo específico de ocho personas, trabajo diario durante todo el año, sistemas técnicos propios y publicaciones periódicas. Sin embargo, la evidencia revisada no revela el presupuesto total del OBERAXE, su plantilla total ni su carga de trabajo en el conjunto de su mandato legal, ni ofrece una referencia de lo que constituiría una dotación adecuada. La existencia de actividad y de recursos no basta, por tanto, para determinar con fiabilidad si son adecuados. La valoración se mantiene en «Evidencia insuficiente». AI-assisted pilot assessment based on public sources; human validation remains required before external launch.$es$),
  ('5dc7c827-f187-4682-a73b-e71d26702238', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('193b913a-9f74-4f62-9e10-274a1d0f463b', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('e9b5325b-1f34-42d1-8174-931591c08c52', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('fda400d4-c717-49d0-a048-389028952b23', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('be27e6a8-3183-4a07-b2f8-c6d8fd40940a', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('1f818004-92ca-40d6-9432-33df509034fa', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('c3884249-53d4-4a22-b4e8-60fff2baa4d0', $es$La recomendación 50.17 pide la aplicación plena y efectiva del Marco Estratégico de Ciudadanía e Inclusión contra el Racismo y la Xenofobia 2023-2027, incluidos mecanismos de seguimiento y evaluación. La evidencia oficial muestra que el OBERAXE y el Observatorio Permanente de la Inmigración crearon un panel de seguimiento que abarca 6 bloques de políticas, 23 líneas de actuación y 45 objetivos tácticos, y que el OBERAXE mantiene su actividad operativa de monitorización y publicación durante 2026. Se trata de mecanismos concretos de aplicación y de rendición de cuentas. No obstante, la evidencia revisada no demuestra una aplicación plena y efectiva en todas las líneas de actuación ni ofrece una evaluación independiente de los resultados del marco en su conjunto. La conclusión adecuada es, por tanto, un avance sustancial y no un cumplimiento pleno. AI-assisted pilot assessment based on public sources; human validation remains required before external launch.$es$),
  ('bd7e6ca0-62c0-475f-abed-3d240f856a60', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('eb49f084-2e07-4fb3-aa41-ccc370b5b666', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('c671ea8d-643a-4e9f-b681-039e27cb57c5', $es$La recomendación 50.19 pide a España que avance en la adopción del tercer Plan de Acción para Combatir los Delitos de Odio. El Ministerio del Interior publicó en 2025 el III Plan de Acción de Lucha contra los Delitos de Odio 2025-2028, y una nota oficial de junio de 2026 recoge la segunda reunión de su Comisión de Seguimiento. Atendiendo a la redacción estricta de la recomendación, la adopción se ha producido y el plan está en funcionamiento. Esta conclusión no implica que los delitos de odio se hayan reducido ni que todas las medidas del plan sean eficaces; los datos oficiales de 2025 muestran que los delitos e incidentes de odio registrados aumentaron, lo que pone de relieve que el problema persiste. AI-assisted pilot assessment based on public sources; human validation remains required before external launch.$es$),
  ('4299901b-e925-4b10-9de9-dcdb40a356af', $es$La recomendación 50.19 pide a España que avance en la adopción del tercer Plan de Acción para Combatir los Delitos de Odio. El Ministerio del Interior publicó en 2025 el III Plan de Acción de Lucha contra los Delitos de Odio 2025-2028, y una nota oficial de junio de 2026 recoge la segunda reunión de su Comisión de Seguimiento. Atendiendo a la redacción estricta de la recomendación, la adopción se ha producido y el plan está en funcionamiento. Esta conclusión no implica que los delitos de odio se hayan reducido ni que todas las medidas del plan sean eficaces; los datos oficiales de 2025 muestran que los delitos e incidentes de odio registrados aumentaron, lo que pone de relieve que el problema persiste.$es$),
  ('8076600c-7de7-4306-9ac4-95c40a3ea8e9', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('b99298a6-3fa3-45a8-a110-000100aa8155', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('8148b634-8889-47c5-89ed-415ac808f0d9', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('9816d9bb-097c-47e6-b883-036b2bdf332e', $es$La recomendación 50.21 pide a España que continúe la aplicación efectiva del II Plan Nacional de Derechos Humanos con la participación activa de la sociedad civil. España cuenta con una estructura formal de seguimiento y participación del Plan que da a organizaciones de la sociedad civil, consejos, universidades y personas expertas un papel en el Comité de dirección, y un convenio oficial de junio de 2026 con la Asociación Pro Derechos Humanos de España documenta una actividad concreta de la sociedad civil dentro del Plan, posterior al EPU. Estos hechos demuestran que la aplicación y la participación continúan. Sin embargo, la evidencia pública revisada no ofrece una evaluación completa y actualizada de la ejecución ni de la eficacia de las 421 medidas del Plan. Por ello el avance se valora como limitado y no como sustancial. AI-assisted pilot assessment based on public sources; human validation remains required before external launch.$es$),
  ('65882f07-16b4-4456-be8a-52f2bf5027e9', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('de648c21-9830-48bc-964f-423a0d8eef53', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('c7f23998-e883-4ac9-84ee-991dfde6ce47', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('b669ba62-d7cf-4966-96ec-4654d96d8f64', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('832da46e-fac0-4314-baaa-e468292632dd', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('ac2365a4-c468-454f-9c55-c7b6585fad29', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('f74050a6-7d5b-4ab7-bea8-8b2856dfc797', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('fc6d6052-80fb-4b7a-ada9-70e10dd6f4d6', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('c5402030-6c86-44b9-b0d4-23e8466466fb', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('d5ab2dd2-2ef6-4fcc-96f0-9351135ef6a8', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('89957c41-6123-4059-bb2f-eb24118e92f1', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('59af6278-dd1d-46bf-b383-f6beb3fd1acf', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('5c36fae2-6b8c-4f02-af8c-42df9d9e2658', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('6b0b23e4-8d8b-4b83-87c4-61e0be0c540d', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('08785d88-2070-46b0-9f83-8610d8d181ed', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('15210ed8-e967-4bec-9896-b1434a0e4576', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('0625fc0d-c94d-4825-87e0-70032f37b2e8', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('e4ed34e9-90dc-4812-a72d-678ae09006b7', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('f83cca4b-a73c-4a0b-b67b-31f2a8c84a3a', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('97dd494c-8100-40b4-a968-021d8ea466af', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('edc28ef2-2d33-4d24-932b-5e3a27f2de33', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('832095f3-aa50-4c5c-a353-11b2e90b94f0', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('c57b7a5a-ffc0-4e03-8a7d-9eb84735bce2', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('baef880b-2556-4e58-aab6-856c4949316b', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('590eb82d-3a35-4ad4-a536-d5ea84ff4e65', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$),
  ('47723ade-8e38-4e92-b93c-5cd94a9896c0', $es$Valoración del cumplimiento pendiente. Esta recomendación forma parte del catálogo piloto público y procede del registro oficial del EPU de las Naciones Unidas; la publicación de la recomendación no implica ninguna conclusión sobre su cumplimiento.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'assessments', t.k, 'rationale', x.rationale from public.assessments x join t on x.id::text = t.k
  on conflict do nothing
)
update public.assessments x set rationale = t.es from t where x.id::text = t.k;

-- Human-security dimensions and the reason each one applies.
with t (k, es) as (values
  ('economic', $es$Seguridad económica$es$),
  ('food', $es$Seguridad alimentaria$es$),
  ('health', $es$Seguridad sanitaria$es$),
  ('environmental', $es$Seguridad ambiental$es$),
  ('personal', $es$Seguridad personal$es$),
  ('community', $es$Seguridad comunitaria$es$),
  ('political', $es$Seguridad política$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'human_security_dimensions', t.k, 'name', x.name from public.human_security_dimensions x join t on x.code = t.k
  on conflict do nothing
)
update public.human_security_dimensions x set name = t.es from t where x.code = t.k;

with t (k, es) as (values
  ('economic', $es$Protección frente a la pobreza persistente, la inseguridad de los medios de vida y la privación económica grave.$es$),
  ('food', $es$Acceso físico y económico fiable a los alimentos básicos.$es$),
  ('health', $es$Protección frente a las enfermedades, los modos de vida poco saludables y el acceso insuficiente a la protección de la salud.$es$),
  ('environmental', $es$Protección frente a la degradación del medio ambiente y las amenazas ambientales para la vida y el bienestar de las personas.$es$),
  ('personal', $es$Protección frente a la violencia física, los abusos, la delincuencia y otras amenazas directas a la seguridad de las personas.$es$),
  ('community', $es$Protección de la identidad cultural, la cohesión social y las comunidades minoritarias, y de las personas frente a la violencia y la discriminación sectarias o entre comunidades.$es$),
  ('political', $es$Protección de los derechos humanos básicos y las libertades civiles, y ausencia de represión política y de abusos institucionales.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'human_security_dimensions', t.k, 'description', x.description from public.human_security_dimensions x join t on x.code = t.k
  on conflict do nothing
)
update public.human_security_dimensions x set description = t.es from t where x.code = t.k;

with t (k, es) as (values
  ('593a0d4d-6429-4542-a6f1-1f9fb7e109de:e546c6ab-2308-43ed-9c06-6c9b712a94d9', $es$Afecta directamente a la protección laboral y de los medios de vida de los trabajadores migratorios.$es$),
  ('593a0d4d-6429-4542-a6f1-1f9fb7e109de:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$La Convención incluye salvaguardias frente a los abusos y la explotación.$es$),
  ('593a0d4d-6429-4542-a6f1-1f9fb7e109de:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$Situación migratoria, inclusión social y protección de las comunidades migrantes.$es$),
  ('593a0d4d-6429-4542-a6f1-1f9fb7e109de:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La ratificación del tratado refuerza las garantías de derechos y la rendición de cuentas.$es$),
  ('2ac296ef-1333-46e6-88c8-e1bbf1097d09:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Una supervisión eficaz ayuda a proteger a las personas frente a los abusos institucionales.$es$),
  ('2ac296ef-1333-46e6-88c8-e1bbf1097d09:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Un Defensor del Pueblo con recursos suficientes favorece la supervisión de los derechos, la rendición de cuentas y la reparación.$es$),
  ('d1a25684-b8fa-4f02-9b48-aafeb185aa2e:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El odio y la discriminación pueden poner en peligro la seguridad de las personas.$es$),
  ('d1a25684-b8fa-4f02-9b48-aafeb185aa2e:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El OBERAXE se ocupa del racismo, la xenofobia y la discriminación que afectan a las comunidades minoritarias y migrantes.$es$),
  ('d1a25684-b8fa-4f02-9b48-aafeb185aa2e:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$El seguimiento de la discriminación favorece la igualdad de derechos y la rendición de cuentas de las instituciones.$es$),
  ('4669fc52-0c0d-43af-becb-60a80d45d735:053728e8-39aa-4192-95f5-ece7ae421224', $es$La violencia de género causa graves daños a la salud física y mental.$es$),
  ('4669fc52-0c0d-43af-becb-60a80d45d735:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El feminicidio y la violencia de género con armas de fuego son amenazas directas a la vida y a la integridad física.$es$),
  ('4669fc52-0c0d-43af-becb-60a80d45d735:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La violencia de género estructural afecta a la seguridad y a la igualdad en la comunidad.$es$),
  ('4e134544-0349-4298-abaa-2ac463703756:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El discurso y los delitos de odio pueden derivar en amenazas y violencia.$es$),
  ('4e134544-0349-4298-abaa-2ac463703756:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El racismo, la xenofobia y la intolerancia menoscaban directamente la seguridad de las minorías y de las comunidades.$es$),
  ('4e134544-0349-4298-abaa-2ac463703756:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La igualdad de protección, la investigación y la sanción son cuestiones centrales de la rendición de cuentas en materia de derechos.$es$),
  ('5a638b17-7e7f-467e-bf3f-93636932de6d:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El uso de la fuerza y de las armas de fuego afecta directamente a la seguridad física y a la protección frente a la violencia.$es$),
  ('5a638b17-7e7f-467e-bf3f-93636932de6d:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Las normas de actuación policial y su rendición de cuentas afectan a los derechos civiles y políticos.$es$),
  ('a9744ac9-a33c-4737-a0fa-7c0c06041508:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La manipulación puede agravar la fragmentación social y la hostilidad entre grupos.$es$),
  ('a9744ac9-a33c-4737-a0fa-7c0c06041508:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La desinformación puede debilitar la participación democrática informada y las instituciones públicas.$es$),
  ('d8d1b84d-3ec6-4939-a8e4-e9dba631ffa6:e546c6ab-2308-43ed-9c06-6c9b712a94d9', $es$Los sistemas de IA pueden condicionar el empleo y el acceso a oportunidades económicas.$es$),
  ('d8d1b84d-3ec6-4939-a8e4-e9dba631ffa6:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La diversidad en la IA afecta a la inclusión, la discriminación y la igualdad de trato de los distintos grupos.$es$),
  ('d8d1b84d-3ec6-4939-a8e4-e9dba631ffa6:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Las políticas públicas sobre IA afectan a los derechos, la rendición de cuentas y la no discriminación.$es$),
  ('ef8a1cf4-d16c-4493-afee-cd8a5b7769d3:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$La hostilidad racista puede poner en peligro la seguridad de las personas.$es$),
  ('ef8a1cf4-d16c-4493-afee-cd8a5b7769d3:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El marco se dirige contra el racismo y la xenofobia que afectan a la inclusión y la cohesión de las comunidades.$es$),
  ('ef8a1cf4-d16c-4493-afee-cd8a5b7769d3:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$El seguimiento y la rendición de cuentas protegen la igualdad de derechos.$es$),
  ('b573c4f2-06ad-414f-b58e-21aa0e49bef1:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El racismo y la xenofobia pueden traducirse en amenazas y violencia.$es$),
  ('b573c4f2-06ad-414f-b58e-21aa0e49bef1:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$Un plan nacional contra el racismo protege ante todo a los grupos frente a la exclusión y la hostilidad.$es$),
  ('b573c4f2-06ad-414f-b58e-21aa0e49bef1:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Las políticas contra la discriminación protegen la igualdad de derechos.$es$),
  ('d4e9f48d-244b-4410-ac13-bd196e0c0a75:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Los delitos de odio son amenazas directas a la seguridad de las personas.$es$),
  ('d4e9f48d-244b-4410-ac13-bd196e0c0a75:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$Los delitos de odio se dirigen contra grupos por su identidad y menoscaban la seguridad de las comunidades.$es$),
  ('d4e9f48d-244b-4410-ac13-bd196e0c0a75:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La prevención, la investigación y la respuesta requieren instituciones basadas en los derechos.$es$),
  ('e87b0056-3c7c-472a-88a0-5b483ad14e29:e546c6ab-2308-43ed-9c06-6c9b712a94d9', $es$Protección laboral y de los medios de vida de los trabajadores migratorios.$es$),
  ('e87b0056-3c7c-472a-88a0-5b483ad14e29:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Protección frente a los abusos y la explotación.$es$),
  ('e87b0056-3c7c-472a-88a0-5b483ad14e29:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$Situación migratoria e inclusión de las comunidades migrantes.$es$),
  ('e87b0056-3c7c-472a-88a0-5b483ad14e29:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Garantías internacionales de derechos y rendición de cuentas.$es$),
  ('41420354-9b55-475d-aaf3-9ab18aa8760a:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$La hostilidad antisemita puede poner en peligro la seguridad física de las personas.$es$),
  ('41420354-9b55-475d-aaf3-9ab18aa8760a:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El antisemitismo ataca la identidad judía y la seguridad de la comunidad.$es$),
  ('41420354-9b55-475d-aaf3-9ab18aa8760a:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La lucha contra el antisemitismo afecta a la igualdad de protección y a las políticas de derechos.$es$),
  ('2cca94c0-db42-4962-8f38-4ab19d810658:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$La aplicación de los derechos humanos protege a las personas frente a múltiples formas de daño.$es$),
  ('2cca94c0-db42-4962-8f38-4ab19d810658:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La participación de la sociedad civil y los derechos de los grupos afectan a la seguridad comunitaria.$es$),
  ('2cca94c0-db42-4962-8f38-4ab19d810658:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Un plan nacional de derechos humanos es un instrumento transversal de gobernanza y de rendición de cuentas.$es$),
  ('69dc4418-ef1c-43f7-8059-b928f3ea2076:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El racismo puede exponer a las personas a amenazas y violencia.$es$),
  ('69dc4418-ef1c-43f7-8059-b928f3ea2076:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El racismo menoscaba la inclusión y la seguridad de las comunidades minoritarias.$es$),
  ('69dc4418-ef1c-43f7-8059-b928f3ea2076:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Afecta a las obligaciones de igualdad de protección y de lucha contra la discriminación.$es$),
  ('65c2447c-9c70-448a-b9e7-9965abfe9cd0:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El racismo puede exponer a las personas a amenazas y violencia.$es$),
  ('65c2447c-9c70-448a-b9e7-9965abfe9cd0:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El racismo menoscaba la inclusión y la seguridad de las comunidades minoritarias.$es$),
  ('65c2447c-9c70-448a-b9e7-9965abfe9cd0:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Afecta a la igualdad de protección y a la aplicación de las recomendaciones en materia de derechos.$es$),
  ('8d837301-3e6c-4458-a4c6-857af45066b3:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El discurso de odio puede contribuir al acoso, las amenazas y la violencia.$es$),
  ('8d837301-3e6c-4458-a4c6-857af45066b3:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El discurso de odio se dirige contra grupos por su identidad y los margina.$es$),
  ('8d837301-3e6c-4458-a4c6-857af45066b3:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Las obligaciones de prevención y sensibilización del Estado protegen la igualdad y los derechos.$es$),
  ('c8ecd024-ea8e-4c22-9672-b4b71f2a8e2f:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El discurso de odio y las amenazas en Internet pueden poner directamente en peligro a las personas.$es$),
  ('c8ecd024-ea8e-4c22-9672-b4b71f2a8e2f:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La hostilidad en Internet puede dirigirse contra las comunidades minoritarias y agravar su exclusión.$es$),
  ('c8ecd024-ea8e-4c22-9672-b4b71f2a8e2f:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La protección efectiva de los derechos en Internet requiere instituciones que rindan cuentas.$es$),
  ('4361c479-ad0d-4610-9afb-04880d959051:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El perfilado étnico expone a las personas a un trato policial discriminatorio.$es$),
  ('4361c479-ad0d-4610-9afb-04880d959051:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El perfilado estigmatiza a las comunidades minoritarias y migrantes.$es$),
  ('4361c479-ad0d-4610-9afb-04880d959051:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La igualdad ante la ley y una actuación policial no discriminatoria son cuestiones centrales en materia de derechos.$es$),
  ('6174c5ad-55d9-4925-942a-e356bf7d2836:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Los controles de identidad discriminatorios afectan a la libertad y la seguridad de las personas.$es$),
  ('6174c5ad-55d9-4925-942a-e356bf7d2836:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El perfilado racial estigmatiza a las comunidades minoritarias.$es$),
  ('6174c5ad-55d9-4925-942a-e356bf7d2836:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La prohibición legal y la rendición de cuentas de la policía son salvaguardias de la seguridad política.$es$),
  ('020a4988-a975-4934-b235-1fb1c0d57d3c:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El perfilado racial expone a las personas a actuaciones coercitivas discriminatorias.$es$),
  ('020a4988-a975-4934-b235-1fb1c0d57d3c:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El perfilado estigmatiza a las comunidades racializadas.$es$),
  ('020a4988-a975-4934-b235-1fb1c0d57d3c:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La igualdad de trato por parte de las fuerzas de seguridad es una cuestión de derechos y de rendición de cuentas.$es$),
  ('490980c8-40b2-4da9-b703-5547753ff7cf:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El perfilado y la discriminación pueden poner en peligro la seguridad de las personas.$es$),
  ('490980c8-40b2-4da9-b703-5547753ff7cf:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El racismo, la xenofobia y el perfilado étnico menoscaban la inclusión y la cohesión de los grupos.$es$),
  ('490980c8-40b2-4da9-b703-5547753ff7cf:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Afecta a la actuación no discriminatoria de las fuerzas de seguridad y a la igualdad de protección.$es$),
  ('dfd7f369-4a9a-447b-a153-c20d0c8b0943:e546c6ab-2308-43ed-9c06-6c9b712a94d9', $es$Protección laboral y de los medios de vida de los trabajadores migratorios.$es$),
  ('dfd7f369-4a9a-447b-a153-c20d0c8b0943:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Protección frente a los abusos y la explotación.$es$),
  ('dfd7f369-4a9a-447b-a153-c20d0c8b0943:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$Situación migratoria e inclusión de las comunidades migrantes.$es$),
  ('dfd7f369-4a9a-447b-a153-c20d0c8b0943:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Garantías internacionales de derechos y rendición de cuentas.$es$),
  ('c71fd092-c345-4eff-b575-50ec1c37b55d:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El perfilado racial afecta a la libertad, la dignidad y la seguridad de las personas.$es$),
  ('c71fd092-c345-4eff-b575-50ec1c37b55d:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El perfilado estigmatiza a las comunidades racializadas.$es$),
  ('c71fd092-c345-4eff-b575-50ec1c37b55d:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Las medidas contra el perfilado afectan a la rendición de cuentas ante la ley y a la igualdad.$es$),
  ('d57b5b72-0b0b-4382-853e-c93cb9265a73:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El odio y el perfilado pueden generar amenazas directas para las personas.$es$),
  ('d57b5b72-0b0b-4382-853e-c93cb9265a73:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La discriminación, el discurso de odio y el perfilado menoscaban la seguridad y la inclusión de los grupos.$es$),
  ('d57b5b72-0b0b-4382-853e-c93cb9265a73:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La igualdad en la esfera pública y la rendición de cuentas de las fuerzas de seguridad afectan a la seguridad política.$es$),
  ('3fd2cb1a-393f-41b8-ab01-5b30fecfb5aa:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Los delitos de odio son una amenaza directa a la seguridad personal.$es$),
  ('3fd2cb1a-393f-41b8-ab01-5b30fecfb5aa:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$Los delitos de odio se dirigen contra las comunidades minoritarias y la identidad colectiva.$es$),
  ('3fd2cb1a-393f-41b8-ab01-5b30fecfb5aa:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La prevención y la aplicación de la ley afectan a la igualdad de derechos y a la rendición de cuentas de las instituciones.$es$),
  ('68264de1-93f5-44cf-93b2-b0a49c4c621c:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Los delitos de odio ponen en peligro la seguridad personal.$es$),
  ('68264de1-93f5-44cf-93b2-b0a49c4c621c:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El racismo y los delitos de odio menoscaban la seguridad comunitaria.$es$),
  ('68264de1-93f5-44cf-93b2-b0a49c4c621c:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La aplicación plena de la legislación contra el racismo es una obligación institucional de protección de los derechos.$es$),
  ('5d4c44ca-ac5f-4a63-bb53-9a392f1086f5:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El discurso de odio racista y xenófobo puede contribuir a las amenazas y la violencia.$es$),
  ('5d4c44ca-ac5f-4a63-bb53-9a392f1086f5:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La retórica racista ataca a las comunidades y a la cohesión social.$es$),
  ('5d4c44ca-ac5f-4a63-bb53-9a392f1086f5:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La persecución y la sanción afectan a la garantía efectiva de los derechos y a la rendición de cuentas de las instituciones.$es$),
  ('b76c2ff0-0f8f-465d-9886-c4922715ec62:e546c6ab-2308-43ed-9c06-6c9b712a94d9', $es$La discriminación en el empleo afecta a la seguridad económica.$es$),
  ('b76c2ff0-0f8f-465d-9886-c4922715ec62:053728e8-39aa-4192-95f5-ece7ae421224', $es$La discriminación en la atención sanitaria afecta a la seguridad sanitaria.$es$),
  ('b76c2ff0-0f8f-465d-9886-c4922715ec62:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La discriminación en los servicios y en los medios de comunicación afecta a la inclusión de las minorías.$es$),
  ('b76c2ff0-0f8f-465d-9886-c4922715ec62:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Una legislación integral contra la discriminación establece garantías de igualdad exigibles.$es$),
  ('5a8ccc58-6aaa-4b35-af97-390e857a905f:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La discriminación racial menoscaba la seguridad y la inclusión de las comunidades.$es$),
  ('5a8ccc58-6aaa-4b35-af97-390e857a905f:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Una legislación específica contra el racismo refuerza las garantías exigibles de igualdad de derechos.$es$),
  ('aa5fd11b-54e3-4c42-90fc-d23eaa202821:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Unas medidas eficaces contra el racismo pueden reducir las amenazas a las personas.$es$),
  ('aa5fd11b-54e3-4c42-90fc-d23eaa202821:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La aplicación de las medidas contra el racismo y la educación buscan reducir las condiciones sociales discriminatorias.$es$),
  ('aa5fd11b-54e3-4c42-90fc-d23eaa202821:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La aplicación de la legislación de igualdad es una cuestión de rendición de cuentas en materia de derechos.$es$),
  ('a36ba99d-cc54-47b3-84ae-bf04acd9e8fb:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El odio en el entorno digital puede dar lugar a acoso y amenazas.$es$),
  ('a36ba99d-cc54-47b3-84ae-bf04acd9e8fb:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El racismo y la xenofobia en los espacios digitales atacan la identidad de los grupos y la inclusión social.$es$),
  ('a36ba99d-cc54-47b3-84ae-bf04acd9e8fb:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La protección de los derechos en los espacios digitales afecta a las políticas públicas y a la rendición de cuentas.$es$),
  ('6356e143-992f-4d01-b0ec-b9ad478fffef:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El discurso de odio puede generar amenazas a la seguridad personal.$es$),
  ('6356e143-992f-4d01-b0ec-b9ad478fffef:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El racismo, la xenofobia, la intolerancia y el discurso de odio menoscaban la seguridad y la cohesión de los grupos.$es$),
  ('6356e143-992f-4d01-b0ec-b9ad478fffef:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$El refuerzo de los mecanismos afecta a la igualdad de protección y a la rendición de cuentas de las instituciones.$es$),
  ('0eb4c4de-d5dc-44ec-a3fa-df6fdb59185f:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Las garantías de los derechos civiles y políticos protegen a las personas frente a los abusos.$es$),
  ('0eb4c4de-d5dc-44ec-a3fa-df6fdb59185f:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Los mecanismos de denuncia individual y de rendición de cuentas del Pacto Internacional de Derechos Civiles y Políticos protegen los derechos civiles y políticos.$es$),
  ('849f50a5-a61f-49e9-a689-31b0c81375b9:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$El discurso de odio puede exponer a las personas a acoso y amenazas.$es$),
  ('849f50a5-a61f-49e9-a689-31b0c81375b9:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$La discriminación racial y el discurso de odio menoscaban la inclusión y la seguridad de las comunidades.$es$),
  ('849f50a5-a61f-49e9-a689-31b0c81375b9:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Las medidas contra la discriminación protegen la igualdad de derechos y la rendición de cuentas de las instituciones.$es$),
  ('61fc5b10-9c7f-45ad-b505-e2328cfb99f5:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$La prevención del genocidio responde a las amenazas más graves a la vida y a la integridad física.$es$),
  ('61fc5b10-9c7f-45ad-b505-e2328cfb99f5:7a9d893b-d48c-4c8a-8e6b-1cc4912c8735', $es$El genocidio se dirige contra grupos protegidos y contra la identidad de las comunidades.$es$),
  ('61fc5b10-9c7f-45ad-b505-e2328cfb99f5:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$Afecta a la rendición de cuentas ante el derecho internacional y a las obligaciones del Estado.$es$),
  ('3466322b-54cd-47bb-a21d-d1f0c6676bb6:053728e8-39aa-4192-95f5-ece7ae421224', $es$Las armas nucleares causan daños graves a la salud, inmediatos y a largo plazo.$es$),
  ('3466322b-54cd-47bb-a21d-d1f0c6676bb6:01f86d8a-f95a-4699-83fb-a56a92412612', $es$Los efectos nucleares amenazan los ecosistemas y la habitabilidad.$es$),
  ('3466322b-54cd-47bb-a21d-d1f0c6676bb6:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Las armas nucleares suponen una amenaza catastrófica para la vida y la seguridad física.$es$),
  ('3466322b-54cd-47bb-a21d-d1f0c6676bb6:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$El desarme y los compromisos derivados de tratados son medidas de seguridad política.$es$),
  ('ec9a4a63-9173-4205-94e3-8252807897ac:053728e8-39aa-4192-95f5-ece7ae421224', $es$Las armas nucleares causan daños graves a la salud, inmediatos y a largo plazo.$es$),
  ('ec9a4a63-9173-4205-94e3-8252807897ac:01f86d8a-f95a-4699-83fb-a56a92412612', $es$Los efectos nucleares amenazan los ecosistemas y la habitabilidad.$es$),
  ('ec9a4a63-9173-4205-94e3-8252807897ac:64c99200-7736-452a-bb8c-fe6bc07457b3', $es$Las armas nucleares suponen una amenaza catastrófica para la vida y la seguridad física.$es$),
  ('ec9a4a63-9173-4205-94e3-8252807897ac:b4ce24d2-4e81-4539-9529-26a0e6483520', $es$La participación en el desarme y los compromisos derivados de tratados son medidas de seguridad política.$es$),
  ('c9944b10-e206-4b4b-829b-6f05d588e1d1:e546c6ab-2308-43ed-9c06-6c9b712a94d9', $es$Las medidas coercitivas unilaterales pueden afectar a los medios de vida, al comercio y al acceso a los recursos.$es$),
  ('c9944b10-e206-4b4b-829b-6f05d588e1d1:592d879f-4eaa-4d1c-aa22-f285c63b27ce', $es$Las restricciones económicas generalizadas pueden afectar al acceso a los alimentos y a su asequibilidad.$es$),
  ('c9944b10-e206-4b4b-829b-6f05d588e1d1:053728e8-39aa-4192-95f5-ece7ae421224', $es$Las restricciones económicas generalizadas pueden afectar al acceso a los medicamentos y a los sistemas de salud.$es$),
  ('cace3c20-804d-441d-b668-87fa994b4420:e546c6ab-2308-43ed-9c06-6c9b712a94d9', $es$Los derechos económicos y sociales son esenciales para vivir sin miseria y con seguridad material.$es$),
  ('cace3c20-804d-441d-b668-87fa994b4420:592d879f-4eaa-4d1c-aa22-f285c63b27ce', $es$Los derechos económicos y sociales incluyen el acceso a una alimentación adecuada.$es$),
  ('cace3c20-804d-441d-b668-87fa994b4420:053728e8-39aa-4192-95f5-ece7ae421224', $es$La asistencia técnica puede favorecer los derechos económicos y sociales relacionados con la salud.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'commitment_human_security', t.k, 'rationale', x.rationale from public.commitment_human_security x join t on x.commitment_id::text || ':' || x.dimension_id::text = t.k
  on conflict do nothing
)
update public.commitment_human_security x set rationale = t.es from t where x.commitment_id::text || ':' || x.dimension_id::text = t.k;

-- Evidence records.
with t (k, es) as (values
  ('45c62db9-c4a6-4785-b52c-0799e6e70c83', $es$El Ministerio indica que el FAMI financia la recogida y el análisis de información sobre racismo y xenofobia a través del OBERAXE; la asignación nacional de España en el FAMI alcanzó los 812 millones de euros tras sumar 244 millones más en 2026.$es$),
  ('d33e09cf-4eb4-4698-a6fb-160996a4a257', $es$El OBERAXE siguió en funcionamiento y elaboró en 2026 la monitorización mensual con FARO; en mayo identificó 31.003 contenidos de odio o discriminatorios e informó de que las plataformas retiraron el 65 %.$es$),
  ('ca8bf56e-728c-45b5-b171-86dcc76f1688', $es$El Gobierno describe un marco activo de políticas contra el racismo y el discurso de odio que incluye la Ley 15/2022, estructuras de persecución de los delitos de odio, cooperación interinstitucional, monitorización en línea, FARO y HODIO, y reconoce al mismo tiempo que el discurso de odio persiste y va en aumento.$es$),
  ('5219533a-b793-4b88-9200-780384209593', $es$A 30 de junio de 2026, el Defensor del Pueblo comunicó un crédito definitivo de 23.021.800 euros y obligaciones reconocidas por 11.352.532,23 euros (ejecución del 49,3 %).$es$),
  ('cffb0f49-6a12-45c4-87a6-6265edecbaca', $es$Antes de la recomendación del EPU de 2025, el Defensor del Pueblo ya contaba con una asignación presupuestaria definitiva de 20.917.800 euros en 2024, con 19.808.692,39 euros en obligaciones reconocidas al cierre del ejercicio.$es$),
  ('4d8a5431-c222-4c98-a979-f6886dcb4782', $es$El Defensor del Pueblo siguió recibiendo en 2026 un presupuesto institucional documentado; el presupuesto publicado asciende a 20.917.800 euros entre los capítulos de personal, gastos corrientes, transferencias e inversiones.$es$),
  ('c7058e10-445b-4d48-9d1e-11ed4fdebc07', $es$A 30 de junio de 2025, el Defensor del Pueblo tenía una asignación presupuestaria definitiva de 20.917.800 euros y 10.024.856,98 euros en obligaciones reconocidas (ejecución del 47,93 %), lo que ofrece una referencia cercana al EPU para valorar la continuidad.$es$),
  ('19a08e7d-036c-4f57-9e36-449b5f6b4a4d', $es$El Ministerio del Interior publicó el III Plan de Acción de Lucha contra los Delitos de Odio 2025-2028. El plan es un documento formal de política del Gobierno y responde directamente a la petición central de la recomendación: avanzar en la adopción del tercer plan.$es$),
  ('bba69bc7-28bb-4429-bb29-2ac208d1a70c', $es$En junio de 2026, el Ministerio informó de la segunda reunión de la Comisión de Seguimiento del III Plan de Acción, lo que confirma que el plan adoptado seguía en funcionamiento y sometido a seguimiento. La misma nota informó de un aumento del 23,6 % de los delitos e incidentes de odio registrados en 2025, lo que muestra que el problema mantiene su magnitud, pero no desmiente la adopción del plan.$es$),
  ('aab3ba24-cb85-40ec-ac1d-9bf6f75db034', $es$El OBERAXE y el Observatorio Permanente de la Inmigración publicaron un panel de seguimiento del Marco Estratégico 2023-2027. El panel abarca 6 bloques de políticas, 23 líneas de actuación y 45 objetivos tácticos, y su finalidad expresa es evaluar el impacto de las políticas públicas y hacer seguimiento de su aplicación.$es$),
  ('a53a4856-8a89-48e5-ba8e-cdd0dadcff20', $es$El OBERAXE mantiene una monitorización diaria del discurso de odio racista, xenófobo, islamófobo, antisemita y antigitano en cinco grandes plataformas sociales, con sistemas propios como ALERTODIO y FARO, y publica boletines periódicos de monitorización durante 2026. Es una evidencia concreta de que la aplicación operativa continúa en un ámbito cubierto por el Marco Estratégico.$es$),
  ('fc3d8b13-3972-4c68-bcdb-b34abd5f0368', $es$El Real Decreto 709/2024 creó los órganos de coordinación, seguimiento y participación del II Plan Nacional de Derechos Humanos. El Comité de dirección tiene el cometido de examinar la ejecución y cuenta con una amplia participación de consejos y foros, cuatro organizaciones de derechos humanos de ámbito estatal, sindicatos, universidades y personas expertas; la Comisión Interministerial debe elaborar información periódica de seguimiento.$es$),
  ('d71ce31e-cc2e-4e7c-9d68-b0df46f88b2c', $es$Una resolución publicada en el BOE en junio de 2026 dio publicidad a un convenio entre la Secretaría de Estado de Relaciones con las Cortes y Asuntos Constitucionales y la Asociación Pro Derechos Humanos de España para realizar actividades de reflexión y diálogo sobre derechos humanos en el marco del II Plan Nacional de Derechos Humanos. Es una evidencia posterior al EPU de que la aplicación continúa con participación de la sociedad civil.$es$),
  ('c2818a86-ac10-4616-a35c-4ec0f842bdaa', $es$La página oficial de monitorización del OBERAXE documenta un equipo específico de ocho personas para la monitorización del discurso de odio en línea, un seguimiento diario durante todo el año, sistemas técnicos propios (ALERTODIO y FARO), la cobertura de cinco grandes plataformas y publicaciones mensuales y trimestrales periódicas. Esto demuestra que hay recursos operativos significativos en una línea de trabajo central.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'evidence', t.k, 'finding', x.finding from public.evidence x join t on x.id::text = t.k
  on conflict do nothing
)
update public.evidence x set finding = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('45c62db9-c4a6-4785-b52c-0799e6e70c83', $es$La nota menciona expresamente la recogida y el análisis de información sobre racismo y xenofobia por parte del OBERAXE entre las actividades financiadas por el FAMI.$es$),
  ('d33e09cf-4eb4-4698-a6fb-160996a4a257', $es$La monitorización mensual basada en FARO demuestra que se mantienen la capacidad de análisis y la actividad de publicación.$es$),
  ('ca8bf56e-728c-45b5-b171-86dcc76f1688', $es$La declaración de 2026 describe tanto las medidas aplicadas como los problemas que persisten.$es$),
  ('5219533a-b793-4b88-9200-780384209593', $es$La ejecución presupuestaria publicada del segundo trimestre muestra una ejecución financiera activa en personal, gastos corrientes, transferencias e inversiones.$es$),
  ('cffb0f49-6a12-45c4-87a6-6265edecbaca', $es$Presupuesto definitivo total: 20.917.800 euros; obligaciones reconocidas: 19.808.692,39 euros.$es$),
  ('4d8a5431-c222-4c98-a979-f6886dcb4782', $es$La institución publica su presupuesto de 2026 y explica que se integra en los Presupuestos Generales del Estado, dentro de la sección de las Cortes Generales.$es$),
  ('c7058e10-445b-4d48-9d1e-11ed4fdebc07', $es$Presupuesto total: 20.917.800 euros; obligaciones reconocidas: 10.024.856,98 euros; ejecución: 47,93 %.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'evidence', t.k, 'excerpt', x.excerpt from public.evidence x join t on x.id::text = t.k
  on conflict do nothing
)
update public.evidence x set excerpt = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('45c62db9-c4a6-4785-b52c-0799e6e70c83', $es$Nota sobre financiación, 17 de marzo de 2026$es$),
  ('d33e09cf-4eb4-4698-a6fb-160996a4a257', $es$Boletín del 18 de junio de 2026$es$),
  ('ca8bf56e-728c-45b5-b171-86dcc76f1688', $es$Referencia del Consejo de Ministros, 17 de marzo de 2026$es$),
  ('5219533a-b793-4b88-9200-780384209593', $es$Fila del presupuesto total, 30-06-2026$es$),
  ('cffb0f49-6a12-45c4-87a6-6265edecbaca', $es$Cuadro de ejecución presupuestaria, 31-12-2024$es$),
  ('4d8a5431-c222-4c98-a979-f6886dcb4782', $es$Presupuesto 2026; total de los capítulos I+II+III+IV+VI$es$),
  ('c7058e10-445b-4d48-9d1e-11ed4fdebc07', $es$Cuadro de ejecución presupuestaria, 30-06-2025$es$),
  ('19a08e7d-036c-4f57-9e36-449b5f6b4a4d', $es$Portada y presentación del ministro; edición de 2025$es$),
  ('bba69bc7-28bb-4429-bb29-2ac208d1a70c', $es$Nota oficial, 3 de junio de 2026$es$),
  ('aab3ba24-cb85-40ec-ac1d-9bf6f75db034', $es$Publicación del 24 de febrero de 2025$es$),
  ('a53a4856-8a89-48e5-ba8e-cdd0dadcff20', $es$Página de monitorización en línea del OBERAXE; boletines de 2026$es$),
  ('fc3d8b13-3972-4c68-bcdb-b34abd5f0368', $es$Artículos 2 a 4 y 7 a 12$es$),
  ('c2818a86-ac10-4616-a35c-4ec0f842bdaa', $es$Página de monitorización del OBERAXE; datos básicos y boletines de 2026$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'evidence', t.k, 'locator', x.locator from public.evidence x join t on x.id::text = t.k
  on conflict do nothing
)
update public.evidence x set locator = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('45c62db9-c4a6-4785-b52c-0799e6e70c83', $es$Evidencia gubernamental primaria de una vía de financiación que sostiene la actividad del OBERAXE, pero no desglosa su presupuesto total ni demuestra que sea adecuado.$es$),
  ('d33e09cf-4eb4-4698-a6fb-160996a4a257', $es$Resultado operativo primario. Demuestra capacidad y actividad, pero no por sí solo que los medios sean adecuados.$es$),
  ('ca8bf56e-728c-45b5-b171-86dcc76f1688', $es$Fuente primaria sobre políticas del Gobierno. Útil para conocer las medidas adoptadas; las afirmaciones sobre resultados deben contrastarse con otras fuentes.$es$),
  ('5219533a-b793-4b88-9200-780384209593', $es$Datos oficiales primarios de ejecución. Evidencia sólida de que los recursos no son meramente nominales.$es$),
  ('cffb0f49-6a12-45c4-87a6-6265edecbaca', $es$Datos presupuestarios primarios de la institución. Se usan como referencia anterior a la recomendación; demuestran que la recomendación se refiere a mantener la dotación de recursos y no a crear un nuevo mecanismo de financiación.$es$),
  ('4d8a5431-c222-4c98-a979-f6886dcb4782', $es$Fuente presupuestaria oficial primaria de la institución. Demuestra que se proporcionan recursos, pero su adecuación debe valorarse con datos de referencia y de contexto.$es$),
  ('c7058e10-445b-4d48-9d1e-11ed4fdebc07', $es$Datos presupuestarios primarios de la institución. Permiten la comparación con 2026 y evitan considerar la existencia de un presupuesto como una medida nueva posterior al EPU.$es$),
  ('19a08e7d-036c-4f57-9e36-449b5f6b4a4d', $es$Documento oficial primario de política pública. Esta evidencia acredita la adopción, no que el plan sea eficaz para reducir los delitos de odio.$es$),
  ('bba69bc7-28bb-4429-bb29-2ac208d1a70c', $es$Evidencia gubernamental primaria de seguimiento. La evolución de los incidentes registrados no debe interpretarse como una medida causal directa de la eficacia del plan.$es$),
  ('aab3ba24-cb85-40ec-ac1d-9bf6f75db034', $es$Mecanismo oficial de seguimiento. Su existencia es una evidencia sólida de capacidad de seguimiento, pero no prueba por sí sola la aplicación plena o efectiva de todas las líneas del marco.$es$),
  ('a53a4856-8a89-48e5-ba8e-cdd0dadcff20', $es$Resultado operativo oficial. Demuestra actividad en un ámbito importante, no la aplicación completa de todo el Marco Estratégico.$es$),
  ('fc3d8b13-3972-4c68-bcdb-b34abd5f0368', $es$Fuente jurídica primaria. El real decreto establece la estructura de participación y seguimiento, pero es anterior a la recomendación del EPU de 2025 y no demuestra por sí solo el grado de aplicación alcanzado después de la recomendación.$es$),
  ('d71ce31e-cc2e-4e7c-9d68-b0df46f88b2c', $es$Evidencia oficial primaria de una actividad concreta de la sociedad civil vinculada al Plan. No es una evaluación completa de las 421 medidas del Plan.$es$),
  ('c2818a86-ac10-4616-a35c-4ec0f842bdaa', $es$Información operativa oficial facilitada por el propio organismo. No revela la plantilla total del Observatorio, su presupuesto ni su carga de trabajo en el conjunto de su mandato legal, por lo que no permite determinar si los recursos son adecuados en su conjunto.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'evidence', t.k, 'reliability_notes', x.reliability_notes from public.evidence x join t on x.id::text = t.k
  on conflict do nothing
)
update public.evidence x set reliability_notes = t.es from t where x.id::text = t.k;

-- Sources: the UN documents point to the official Spanish version; Spanish sources keep their own title.
with t (k, es) as (values
  ('86c7a0cf-4dcc-4dcf-af6e-f7c9066d7503', $es$Informe del Grupo de Trabajo sobre el Examen Periódico Universal — España$es$),
  ('98da68ad-5438-4d92-a200-eb458fc821b0', $es$Informe del Grupo de Trabajo sobre el Examen Periódico Universal — España: Adición$es$),
  ('ba6a8321-27bd-4c3c-88c3-ab28badfb740', $es$España recibe 244 millones de euros más del Fondo Europeo de Asilo, Migración e Integración para fortalecer su modelo de gestión migratoria$es$),
  ('183a60c4-a74d-472d-a7b8-5a6930abe9a2', $es$El OBERAXE detecta 31.000 contenidos de odio en redes sociales en mayo y eleva al 65 % la retirada por parte de las plataformas$es$),
  ('edb01152-9d3a-4a98-9cb1-0b049c8ce41d', $es$Declaración institucional con motivo del Día Internacional de la Eliminación de la Discriminación Racial — 2026$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'sources', t.k, 'title', x.title from public.sources x join t on x.id::text = t.k
  on conflict do nothing
)
update public.sources x set title = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('86c7a0cf-4dcc-4dcf-af6e-f7c9066d7503', $es$Consejo de Derechos Humanos de las Naciones Unidas$es$),
  ('98da68ad-5438-4d92-a200-eb458fc821b0', $es$Gobierno de España / Consejo de Derechos Humanos de las Naciones Unidas$es$),
  ('ba6a8321-27bd-4c3c-88c3-ab28badfb740', $es$Ministerio de Inclusión, Seguridad Social y Migraciones$es$),
  ('183a60c4-a74d-472d-a7b8-5a6930abe9a2', $es$Ministerio de Inclusión, Seguridad Social y Migraciones / OBERAXE$es$),
  ('edb01152-9d3a-4a98-9cb1-0b049c8ce41d', $es$Gobierno de España / La Moncloa$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'sources', t.k, 'publisher', x.publisher from public.sources x join t on x.id::text = t.k
  on conflict do nothing
)
update public.sources x set publisher = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('86c7a0cf-4dcc-4dcf-af6e-f7c9066d7503', $es$https://docs.un.org/es/A/HRC/60/8$es$),
  ('98da68ad-5438-4d92-a200-eb458fc821b0', $es$https://docs.un.org/es/A/HRC/60/8/Add.1$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'sources', t.k, 'url', x.url from public.sources x join t on x.id::text = t.k
  on conflict do nothing
)
update public.sources x set url = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('86c7a0cf-4dcc-4dcf-af6e-f7c9066d7503', $es$es$es$),
  ('98da68ad-5438-4d92-a200-eb458fc821b0', $es$es$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'sources', t.k, 'language', x.language from public.sources x join t on x.id::text = t.k
  on conflict do nothing
)
update public.sources x set language = t.es from t where x.id::text = t.k;

-- Monitoring items: titles as published by the source, publishers, summaries and notes.
with t (k, es) as (values
  ('1eb7d5c2-74c5-4c93-985e-79491ada4984', $es$Los mensajes de odio crecen un 76 % en redes sociales coincidiendo con la crisis de Ceuta$es$),
  ('d65f5c12-4df8-4e6f-b3a2-0d1b3eb74031', $es$Los mensajes de odio crecen un 76 % en redes sociales coincidiendo con la crisis de Ceuta$es$),
  ('faa73267-d396-49c7-8845-f777461406da', $es$Los delitos e incidentes de odio aumentaron un 23,63 % en 2025, según el último informe del Ministerio del Interior$es$),
  ('028faa1d-12b7-45b5-bc92-043c1291ab75', $es$Cinco detenidos por una agresión racista denunciada en Tavernes de la Valldigna$es$),
  ('06cbbfa6-696a-4dfb-bf4c-6db903afb90c', $es$OBERAXE detectó más de 111.500 mensajes de odio en redes sociales durante el segundo trimestre de 2026$es$),
  ('1cbd1c9b-bf8e-45be-a481-72dd1b399260', $es$OBERAXE detectó más de 111.500 mensajes de odio en redes sociales durante el segundo trimestre de 2026$es$),
  ('ec5bac4f-7dc3-4d02-a6d4-89f137be57a3', $es$Cinco detenidos por una agresión racista denunciada en Tavernes de la Valldigna$es$),
  ('3000e859-dfce-4188-8bdb-37ee0e022d0d', $es$Cinco detenidos por una agresión racista denunciada en Tavernes de la Valldigna$es$),
  ('378f305b-2535-4232-9bff-096a41821be4', $es$OBERAXE detectó más de 111.500 mensajes de odio en redes sociales durante el segundo trimestre de 2026$es$),
  ('f2eaf89a-a717-47b1-9960-ce15eeaa0613', $es$Los delitos e incidentes de odio aumentaron un 23,63 % en 2025, según el último informe del Ministerio del Interior$es$),
  ('6a8f328c-f587-4a0d-b31f-28f66cb60098', $es$Los delitos e incidentes de odio aumentaron un 23,63 % en 2025, según el último informe del Ministerio del Interior$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'monitoring_items', t.k, 'title', x.title from public.monitoring_items x join t on x.id::text = t.k
  on conflict do nothing
)
update public.monitoring_items x set title = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('1eb7d5c2-74c5-4c93-985e-79491ada4984', $es$Ministerio de Inclusión / OBERAXE$es$),
  ('d65f5c12-4df8-4e6f-b3a2-0d1b3eb74031', $es$Ministerio de Inclusión / OBERAXE$es$),
  ('faa73267-d396-49c7-8845-f777461406da', $es$OBERAXE / Ministerio de Inclusión$es$),
  ('06cbbfa6-696a-4dfb-bf4c-6db903afb90c', $es$OBERAXE / Ministerio de Inclusión$es$),
  ('1cbd1c9b-bf8e-45be-a481-72dd1b399260', $es$OBERAXE / Ministerio de Inclusión$es$),
  ('378f305b-2535-4232-9bff-096a41821be4', $es$OBERAXE / Ministerio de Inclusión$es$),
  ('f2eaf89a-a717-47b1-9960-ce15eeaa0613', $es$OBERAXE / Ministerio de Inclusión$es$),
  ('6a8f328c-f587-4a0d-b31f-28f66cb60098', $es$OBERAXE / Ministerio de Inclusión$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'monitoring_items', t.k, 'publisher', x.publisher from public.monitoring_items x join t on x.id::text = t.k
  on conflict do nothing
)
update public.monitoring_items x set publisher = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('1eb7d5c2-74c5-4c93-985e-79491ada4984', $es$El OBERAXE registró en agosto de 2026 un total de 101.025 contenidos de odio y discriminatorios denunciables, un 76 % más que en julio; el 39 % estaba relacionado con la crisis migratoria de Ceuta.$es$),
  ('d65f5c12-4df8-4e6f-b3a2-0d1b3eb74031', $es$El repunte detectado por la monitorización oficial muestra que el Marco Estratégico contra el racismo y la xenofobia y sus mecanismos de seguimiento siguen siendo necesarios.$es$),
  ('faa73267-d396-49c7-8845-f777461406da', $es$Los últimos datos oficiales muestran que el problema al que responde el plan de acción contra los delitos de odio sigue siendo importante: en 2025 se registraron 2.417 delitos e incidentes de odio, un 23,63 % más.$es$),
  ('028faa1d-12b7-45b5-bc92-043c1291ab75', $es$La información describe una agresión grave que se investiga como posible delito de odio, después de que presuntamente se profirieran insultos racistas contra la víctima; ilustra los riesgos que persisten y a los que responden los compromisos contra el racismo.$es$),
  ('06cbbfa6-696a-4dfb-bf4c-6db903afb90c', $es$La monitorización oficial detectó más de 111.500 mensajes de discurso de odio en el segundo trimestre de 2026; las personas procedentes del norte de África fueron el principal grupo destinatario y los discursos sobre seguridad ciudadana, el principal detonante.$es$),
  ('1cbd1c9b-bf8e-45be-a481-72dd1b399260', $es$La monitorización oficial detectó más de 111.500 mensajes de discurso de odio en el segundo trimestre de 2026, lo que documenta que el contenido discriminatorio en Internet mantiene su magnitud.$es$),
  ('ec5bac4f-7dc3-4d02-a6d4-89f137be57a3', $es$La información sobre un incidente violento que se investiga como posible delito de odio muestra que las medidas para combatir los delitos de odio fuera de Internet siguen siendo pertinentes.$es$),
  ('3000e859-dfce-4188-8bdb-37ee0e022d0d', $es$La agresión denunciada incluyó presuntos insultos racistas y xenófobos, además de violencia física, lo que aporta contexto sobre la necesidad a la que responde la recomendación.$es$),
  ('2db05df2-7d82-4f92-bdde-2d8f19f5d1c9', $es$Norma localizada en la legislación consolidada del BOE. Debe revisarse antes de considerarla evidencia de cumplimiento.$es$),
  ('378f305b-2535-4232-9bff-096a41821be4', $es$La monitorización oficial documenta un gran volumen de contenido de odio racista y xenófobo en los espacios digitales, directamente relacionado con la dimensión digital de la recomendación.$es$),
  ('f2eaf89a-a717-47b1-9960-ce15eeaa0613', $es$Los datos oficiales recogen 2.417 delitos e incidentes de odio en 2025, un 23,63 % más que el año anterior; el racismo y la xenofobia fueron la categoría más numerosa.$es$),
  ('6a8f328c-f587-4a0d-b31f-28f66cb60098', $es$Los datos oficiales recogen un aumento de los delitos e incidentes de odio, con el racismo y la xenofobia como categoría más numerosa, lo que demuestra que las medidas contra la discriminación siguen siendo pertinentes.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'monitoring_items', t.k, 'summary', x.summary from public.monitoring_items x join t on x.id::text = t.k
  on conflict do nothing
)
update public.monitoring_items x set summary = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('9a8a29ce-5ec6-4a69-ac1f-3e326b3ec974', $es$Información sobre los trabajadores migrantes en España; no trata de la Convención en sí.$es$),
  ('f5379fc0-dd57-4825-903a-729b086c3ec6', $es$Información general sobre los trabajadores migrantes en España; no trata de la ratificación de la Convención.$es$),
  ('c6d52809-ea92-40cc-bae8-9d71d913237f', $es$Información sobre los trabajadores migrantes en España; no trata de la Convención en sí.$es$),
  ('d7a2ce1f-9530-4c54-9f2c-650a461194ae', $es$Informa de una visita del Defensor del Pueblo a Ceuta; muestra la actividad de la institución, pero no trata de sus recursos.$es$),
  ('36f0f1f1-39f6-462e-9f78-bd8b9332dadb', $es$Acto local en memoria de una víctima de violencia de género.$es$),
  ('bf12df56-8fa4-41a2-a3fb-981f6ff196a1', $es$Cita el número de mujeres asesinadas por violencia de género en España en 2026.$es$),
  ('510cde23-b0ef-41be-8926-dfed8e06414a', $es$Comunicado oficial sobre un feminicidio; muestra que el problema al que responde la recomendación persiste.$es$),
  ('04d20ad5-91d7-497b-ac09-38d4dc21b77c', $es$Informa de la cifra oficial de mujeres asesinadas por violencia de género en España en 2026.$es$),
  ('a03a82a4-5b14-47ec-9e4f-bf4456af6afb', $es$Informa de la cifra de mujeres asesinadas por violencia de género en España en 2026.$es$),
  ('a049ef8e-0f79-4f58-87d6-9bc1c4780c4a', $es$Acto local en memoria de las víctimas de violencia de género; no trata de los datos sobre feminicidios.$es$),
  ('26f8c9ba-bae7-4e8a-bdf2-d96ef2a74f74', $es$Caso concreto de violencia de género; muestra que el problema persiste, pero no trata de la recopilación de datos.$es$),
  ('a939c333-17f9-4cec-a0ef-ba23a0581dd2', $es$Información sobre un discurso político calificado de xenófobo; enfoque partidista y poco contenido factual.$es$),
  ('2960a3f6-3ee0-4e8e-8e87-4fe1c0c44365', $es$Informa de que la policía desalojó por la fuerza un asentamiento de migrantes en Ceuta antes de que se produjeran los retornos.$es$),
  ('dacf33c7-3780-45ae-ae79-e8e55fb54250', $es$Publicación en redes sociales sobre detenciones en una protesta; el titular no acredita el uso de la fuerza.$es$),
  ('a76423f3-9d3a-4508-bc45-4b207ad36dce', $es$Reunión europea sobre la aplicación de las nuevas normas de IA; no se indica relación con la diversidad ni con la no discriminación.$es$),
  ('c41014f5-60d8-4046-9147-b7911ba43d26', $es$Informa de un análisis universitario sobre los sesgos de género y la discriminación en la inteligencia artificial.$es$),
  ('6c0b8842-3ff6-473c-b209-afa7472ef224', $es$Informa de que una agresión se investigará como posible delito de odio.$es$),
  ('3359aec0-b5b7-4f27-9928-4cbd3eb82654', $es$Una fiscal especializada en delitos de odio advierte del aumento de los incidentes contra personal sanitario extranjero.$es$),
  ('3effb83d-fe65-4208-81d4-8ca4b4769600', $es$Informa de detenciones por una agresión racista; muestra que la violencia motivada por el odio persiste.$es$),
  ('4814512c-1401-4a45-9b04-8cdcbcb45118', $es$Información sobre los trabajadores migrantes en España; no trata de la Convención en sí.$es$),
  ('25f3192b-3c18-4b26-8701-b361414dcba9', $es$Información general sobre los trabajadores migrantes en España; no trata de la adhesión a la Convención.$es$),
  ('c3464fae-bc9e-400f-b4c4-23670a35ea32', $es$Información sobre los trabajadores migrantes en España; no trata de la Convención en sí.$es$),
  ('61b41414-626d-49c1-b34b-3a213dfb5ce0', $es$Informa de que la comunidad judía advierte en el Senado de un repunte del antisemitismo en España.$es$),
  ('89569948-4d3b-44b2-ae7f-a0c406408dda', $es$Es el mismo incidente que otra novedad ya revisada para esta recomendación.$es$),
  ('e92a9292-7818-445b-84f8-ab8d6d2a006b', $es$Continuación de la investigación de una posible agresión racista ya recogida en otras novedades.$es$),
  ('b8349469-5cc5-4140-9b16-953a532a568d', $es$Informa de detenciones por una agresión racista denunciada.$es$),
  ('c54f8885-3c70-491b-bd9f-d7f74414f66d', $es$Informa de amenazas lanzadas en redes sociales por grupos de extrema derecha.$es$),
  ('448b763e-cda3-49bc-b71f-a821bd3a9ed8', $es$Trata de la violencia en Internet contra mujeres con discapacidad; no es el discurso de odio al que se refiere la recomendación.$es$),
  ('e9692f37-e897-48db-821d-1472baf1135c', $es$Operación policial de identificación con menores migrantes; el titular no acredita que hubiera perfilado étnico.$es$),
  ('cd1891c4-d7f9-4142-8862-3fb19cbc0614', $es$Informa del presunto uso de la fuerza por parte de la policía contra migrantes; el texto no acredita que hubiera perfilado étnico.$es$),
  ('d531147f-50f5-4af1-8469-10f62f0793e7', $es$Informa de la presunta paliza de unos militares a un migrante; el texto no acredita que hubiera perfilado étnico.$es$),
  ('5afccb2e-c7fe-44fa-b2d9-7d52ad50de37', $es$Informa de una investigación oficial sobre presuntos malos tratos a migrantes por parte de las fuerzas de seguridad; el titular no menciona el perfilado.$es$),
  ('7efef1fb-43e8-4692-813a-c06639a1e6b4', $es$Información general sobre los trabajadores migrantes en España; no trata de la ratificación de la Convención.$es$),
  ('08a1c3f9-efa2-4fb7-8e50-7fc9a704d128', $es$Información sobre los trabajadores migrantes en España; no trata de la Convención en sí.$es$),
  ('a43fd591-0a85-4448-93bd-de0d08d809f6', $es$Información sobre los trabajadores migrantes en España; no trata de la Convención en sí.$es$),
  ('bfcf27c5-8349-4b75-9b24-c507848df3e3', $es$Información duplicada sobre la investigación de presuntos malos tratos a migrantes por parte de las fuerzas de seguridad.$es$),
  ('cd9ccd4f-2491-4525-bdfa-baf0584e191c', $es$Informa de una investigación oficial sobre presuntos malos tratos a migrantes por parte de las fuerzas de seguridad; el titular no menciona el perfilado.$es$),
  ('ebbb2bff-3185-49b7-af23-a3a76314f992', $es$Una fiscal especializada en delitos de odio advierte del aumento de los incidentes contra personal sanitario extranjero.$es$),
  ('8eb22432-5156-4620-af24-f47af89ef044', $es$Informa de que una agresión se investigará como posible delito de odio.$es$),
  ('2db05df2-7d82-4f92-bdde-2d8f19f5d1c9', $es$Real decreto por el que se aprueba el Estatuto de la Autoridad Independiente para la Igualdad de Trato y la No Discriminación.$es$),
  ('0a2a8f3c-ac5e-4f87-b56c-df4163df32ab', $es$Informa de qué grupos son las principales víctimas de la discriminación racial en España.$es$),
  ('735f66b8-0182-4813-b1af-44afd613c306', $es$Declaración de España ante la ONU sobre los discursos que estigmatizan la migración; es una declaración, no un mecanismo.$es$),
  ('c15ff5c0-8f5a-4d5e-8353-4b722bd11b26', $es$Informa de una iniciativa parlamentaria que busca apoyos para que España firme el tratado que prohíbe las armas nucleares.$es$),
  ('495d7530-c9bc-48b0-a04b-e42784fda85a', $es$Informa de que el Congreso no aprobó una propuesta para que España se adhiriera al tratado que prohíbe las armas nucleares.$es$),
  ('df1b748b-8540-443d-90e0-2815d12ac935', $es$Informa de una propuesta parlamentaria para que España firme el tratado que prohíbe las armas nucleares; es una propuesta, no una adopción.$es$),
  ('a03878bc-74c5-4808-899c-2d4d81bdead1', $es$Informa de una iniciativa parlamentaria que busca apoyos para que España firme el tratado que prohíbe las armas nucleares.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'monitoring_items', t.k, 'classification_note', x.classification_note from public.monitoring_items x join t on x.id::text = t.k
  on conflict do nothing
)
update public.monitoring_items x set classification_note = t.es from t where x.id::text = t.k;

-- Reference names.
with t (k, es) as (values
  ('c7e51ba9-ee69-4e17-9f01-2aa0771bd1e1', $es$España$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'countries', t.k, 'name', x.name from public.countries x join t on x.id::text = t.k
  on conflict do nothing
)
update public.countries x set name = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('d27077c4-3051-4586-95af-ae704b4f6484', $es$Examen Periódico Universal$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'mechanisms', t.k, 'name', x.name from public.mechanisms x join t on x.id::text = t.k
  on conflict do nothing
)
update public.mechanisms x set name = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('d27077c4-3051-4586-95af-ae704b4f6484', $es$Recomendaciones de derechos humanos del Examen Periódico Universal.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'mechanisms', t.k, 'description', x.description from public.mechanisms x join t on x.id::text = t.k
  on conflict do nothing
)
update public.mechanisms x set description = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('d27077c4-3051-4586-95af-ae704b4f6484', $es$Consejo de Derechos Humanos de las Naciones Unidas$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'mechanisms', t.k, 'source_organization', x.source_organization from public.mechanisms x join t on x.id::text = t.k
  on conflict do nothing
)
update public.mechanisms x set source_organization = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('a7b640d7-488b-447e-9a43-ff76c47d3de5', $es$Metodología de HRCT v1.0$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'methodology_versions', t.k, 'title', x.title from public.methodology_versions x join t on x.id::text = t.k
  on conflict do nothing
)
update public.methodology_versions x set title = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('a7b640d7-488b-447e-9a43-ff76c47d3de5', $es$Versión inicial de la metodología para el MVP del Human Rights Commitment Tracker.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'methodology_versions', t.k, 'description', x.description from public.methodology_versions x join t on x.id::text = t.k
  on conflict do nothing
)
update public.methodology_versions x set description = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('a64feefb-2384-42d2-b8b6-e49088ab0c7f', $es$Seguir proporcionando a la Oficina del Defensor del Pueblo recursos financieros suficientes para sostener sus funciones institucionales.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'actions', t.k, 'description', x.description from public.actions x join t on x.id::text = t.k
  on conflict do nothing
)
update public.actions x set description = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('8d42d8c2-3b58-4548-9aa0-cfe90e6e9d80', $es$Continuidad del presupuesto institucional anual$es$),
  ('8323017e-1768-4424-becb-6bd2ae9c807c', $es$Ejecución presupuestaria$es$),
  ('ac8cbca1-37fe-474b-9475-1a234a5bc873', $es$Evidencia independiente de una falta significativa de recursos$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'indicators', t.k, 'name', x.name from public.indicators x join t on x.id::text = t.k
  on conflict do nothing
)
update public.indicators x set name = t.es from t where x.id::text = t.k;

with t (k, es) as (values
  ('8d42d8c2-3b58-4548-9aa0-cfe90e6e9d80', $es$Comparar las asignaciones presupuestarias anuales y definitivas anteriores y posteriores a la recomendación y detectar cualquier retirada significativa de recursos.$es$),
  ('8323017e-1768-4424-becb-6bd2ae9c807c', $es$Hacer seguimiento de las obligaciones reconocidas y de la ejecución como evidencia de contexto de que los recursos asignados están disponibles y se utilizan.$es$),
  ('ac8cbca1-37fe-474b-9475-1a234a5bc873', $es$Comprobar si hay conclusiones independientes o institucionales creíbles que indiquen que los recursos son claramente insuficientes pese a la continuidad nominal del presupuesto.$es$)
), saved as (
  insert into public.content_translation_backup (table_name, row_key, column_name, original)
  select 'indicators', t.k, 'description', x.description from public.indicators x join t on x.id::text = t.k
  on conflict do nothing
)
update public.indicators x set description = t.es from t where x.id::text = t.k;
