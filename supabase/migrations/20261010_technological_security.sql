-- Adds technological security as an eighth human-security dimension, next to the seven of the
-- UNDP framework, and links it to the recommendations of A/HRC/60/8 whose official text refers
-- expressly to the digital environment, the Internet, artificial intelligence or new
-- technologies, or spyware.
-- It is added as a further dimension: the primary dimension of each recommendation is unchanged.
-- Safe to run again: existing links are left as they are.

insert into public.human_security_dimensions (code, name, description, sort_order) values
  ('technological', 'Seguridad tecnológica', $es$Protección frente a las amenazas vinculadas a las tecnologías digitales, como la violencia y el odio en línea, la vigilancia intrusiva o los usos discriminatorios de la inteligencia artificial, y acceso seguro y en igualdad al entorno digital.$es$, 8)
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

create temp table technological_hs (n int primary key, rationale text);

insert into technological_hs values
  -- Artificial intelligence and new technologies
  (16, $es$La diversidad en el diseño y el uso de la inteligencia artificial reduce el riesgo de sesgos y de exclusión en los sistemas automatizados.$es$),
  (74, $es$Un marco ético y respetuoso de los derechos para la inteligencia artificial limita los riesgos que su uso plantea para las personas.$es$),
  (75, $es$El uso de la inteligencia artificial y de otras nuevas tecnologías puede dar lugar a discriminación y a restricciones de la privacidad y de otras libertades.$es$),
  (261, $es$Conocer los efectos y los riesgos de la inteligencia artificial, en especial para los menores, permite un uso más seguro de la tecnología.$es$),
  -- Hate speech and hate crime on the Internet
  (25, $es$Internet amplifica la incitación al odio y las amenazas, por lo que la respuesta exige actuar también en el entorno digital.$es$),
  (32, $es$Los delitos de odio se cometen también en línea, por lo que la respuesta exige actuar en el entorno digital.$es$),
  (34, $es$El discurso de odio racista y xenófobo se difunde también en línea, por lo que la respuesta exige actuar en el entorno digital.$es$),
  (35, $es$El discurso de odio se difunde también por Internet, por lo que la legislación contra la discriminación debe abarcar el entorno digital.$es$),
  (38, $es$El racismo y la xenofobia se manifiestan también en los espacios digitales, donde alcanzan una difusión mayor.$es$),
  (86, $es$La respuesta al discurso de odio y al extremismo en línea depende de la actuación de las plataformas de medios sociales.$es$),
  (281, $es$La incitación al odio se difunde también por Internet, por lo que la respuesta exige actuar en el entorno digital.$es$),
  (284, $es$La incitación al odio se difunde también por Internet, por lo que la respuesta exige actuar en el entorno digital.$es$),
  -- Children and adolescents in digital environments
  (76, $es$Los entornos digitales exponen a niños, niñas y adolescentes a riesgos específicos para su seguridad y sus derechos.$es$),
  (248, $es$Los entornos digitales exponen a niños, niñas y adolescentes a riesgos específicos para su seguridad y sus derechos.$es$),
  (249, $es$Los entornos digitales exponen a niños, niñas y adolescentes a riesgos específicos de violencia y explotación.$es$),
  (259, $es$Los entornos digitales exponen a niños, niñas y adolescentes a riesgos específicos para su seguridad y sus derechos.$es$),
  (260, $es$Los entornos digitales exponen a niños, niñas y adolescentes a riesgos específicos para su seguridad y sus derechos.$es$),
  -- Digital rights and online violence
  (77, $es$Los derechos digitales y la protección frente a la violencia en línea determinan la seguridad de las personas en el entorno digital.$es$),
  (219, $es$La violencia de género se ejerce también por medios digitales, lo que exige respuestas frente a los abusos en línea.$es$),
  (225, $es$La ciberviolencia y los sesgos sexistas de la inteligencia artificial trasladan al entorno digital la violencia y la discriminación contra las mujeres y las niñas.$es$),
  (233, $es$La violencia contra las mujeres y los niños se ejerce también por medios digitales, lo que exige respuestas específicas frente a la ciberviolencia.$es$),
  -- Surveillance
  (87, $es$Los programas de espionaje permiten una vigilancia intrusiva de los dispositivos y las comunicaciones, que vulnera la privacidad.$es$),
  -- Digital skills
  (198, $es$La formación en inteligencia artificial y nuevas tecnologías condiciona el acceso en igualdad al entorno digital y su uso seguro.$es$),
  (199, $es$La alfabetización digital condiciona el acceso en igualdad al entorno digital y su uso seguro.$es$);

insert into public.commitment_human_security (commitment_id, dimension_id, is_primary, rationale)
select c.id, d.id, false, t.rationale
from technological_hs t
  join public.commitments c on c.public_id = 'ESP-UPR4-050.' || t.n
  join public.human_security_dimensions d on d.code = 'technological'
on conflict (commitment_id, dimension_id) do nothing;

drop table technological_hs;
