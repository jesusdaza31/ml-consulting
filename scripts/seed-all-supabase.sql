-- ====================================================================
-- SCRIPT MAESTRO COMPLETO: CURSO 1040 + MÓDULO 0 + MÓDULO 1 + INSCRIPCIONES
-- ====================================================================

DO $$
DECLARE
  v_course_id UUID := '47606ff5-c85d-4954-8b77-e98fbbf7105c';
BEGIN
  -- 1. Crear o actualizar el curso principal con su temario oficial
  INSERT INTO courses (
    id, nombre, tipo, descripcion, objetivo_general, resultado_esperado, 
    modulos, duracion_dias, created_at
  )
  VALUES (
    v_course_id,
    'Curso Profesional de Preparación de Impuestos Personales en EE.UU. (Form 1040)',
    'curso',
    'Formación integral para convertirte en preparador de impuestos profesional habilitado por el IRS. Aprende el marco legal de la profesión, trámite del PTIN, dominio del Form 1040, créditos familiares, trabajadores independientes, casos con ITIN, software profesional y estrategias comerciales para conseguir tus primeros clientes.',
    'Capacitar al estudiante para tramitar su PTIN ante el IRS, preparar y firmar declaraciones de impuestos personales (Form 1040 y anexos) con total apego normativo, y construir una práctica tributaria rentable y ética.',
    'Al finalizar el curso completo, tendrás tu PTIN activo, sabrás preparar declaraciones W-2, trabajadores por cuenta propia (Schedule C), casos con ITIN e inversiones, manejarás software profesional y contarás con una estrategia clara para captar y atender a tus primeros clientes.',
    '[
      "Módulo 0 — Orientación y fundamentos legales",
      "Módulo 1 — Fundamentos del Form 1040",
      "Módulo 2 — Trabajadores independientes y pequeños negocios",
      "Módulo 3 — Situaciones especiales",
      "Módulo 4 — Software y flujo de trabajo profesional",
      "Módulo 5 — Construir el negocio"
    ]'::jsonb,
    365,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    objetivo_general = EXCLUDED.objetivo_general,
    resultado_esperado = EXCLUDED.resultado_esperado,
    modulos = EXCLUDED.modulos,
    duracion_dias = 365;

  -- 2. Limpiar lecciones de texto anteriores para evitar duplicados
  DELETE FROM contenido WHERE course_id = v_course_id AND tipo = 'texto';

  -- 3. Insertar todas las lecciones del Módulo 0 y Módulo 1 (contenido completo)
  INSERT INTO contenido (course_id, tipo, titulo, texto, orden, width_pct)
  VALUES
  (
    v_course_id,
    'texto',
    'Módulo 0 — Orientación y Fundamentos Legales',
    $lesson$### Módulo 0 — Orientación y Fundamentos Legales
> [!NOTE] Objetivo del módulo: Comprender el panorama legal de la profesión, el trámite del PTIN, y el alcance de lo que puede y no puede hacer un preparador de impuestos no acreditado.

¡Te damos la bienvenida al inicio de tu formación profesional! En este módulo sentamos las bases legales, éticas y operativas indispensables antes de calcular una sola cifra en una declaración tributaria.$lesson$,
    1,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 1 — Bienvenida y Mapa del Curso',
    $lesson$### Lección 1 — Bienvenida y Mapa del Curso

#### De qué trata esta lección
¡Bienvenido y bienvenida! Si estás viendo esto, es porque tomaste una decisión importante: la de **convertirte en preparador o preparadora de impuestos**, con todo lo que eso significa — un negocio propio, flexible, y con una demanda que nunca desaparece, porque impuestos hay que presentar todos los años, pase lo que pase en la economía.

Antes de entrar de lleno al contenido, quiero que tengas clarísimo tres cosas: qué vas a poder hacer cuando termines este curso, cómo está organizado todo lo que viene, y cómo sacarle el máximo provecho a la comunidad y a nuestras sesiones en vivo. Vamos a eso.

#### Qué vas a poder hacer al terminar este curso
Al final de este curso, vas a tener tu **PTIN activo** — es decir, vas a estar legalmente habilitado por el IRS para preparar y firmar declaraciones de impuestos y cobrar por ese servicio. No es un diploma decorativo, es tu llave para empezar a ejercer.

- Vas a saber preparar con confianza los casos que más se van a repetir en tu día a día: empleados con W-2, familias con hijos, trabajadores independientes, conductores de plataformas como Uber o DoorDash, gente con inversiones, con propiedades en renta, y también casos con ITIN — algo clave si vas a atender, como muchos de nosotros, a la comunidad hispana.
- Vas a aprender a usar un software profesional de principio a fin, no solo la teoría en papel.
- Vas a salir con un plan de lanzamiento propio: tu estructura legal, tus precios, y una lista concreta de dónde vas a buscar a tus primeros clientes.

> [!TIP] Aquí no estás aprendiendo impuestos por aprender. Estás construyendo la capacidad de generar un ingreso real, con la libertad de decidir cuántos clientes atender y cuándo.

#### Cómo está organizado el curso
Te voy a dar el mapa completo para que sepas hacia dónde vamos:

- **Módulo 0 — Orientación y fundamentos legales:** el terreno legal y ético antes de tocar un solo número.
- **Módulo 1 — Fundamentos del Form 1040:** el corazón técnico del curso — cómo se arma la declaración de un asalariado, con todos sus créditos y deducciones comunes.
- **Módulo 2 — Trabajadores independientes y pequeños negocios:** Schedule C, trabajadores de plataformas, y todo lo relacionado con el trabajo por cuenta propia.
- **Módulo 3 — Situaciones especiales:** inversiones, alquiler, ITIN, y casos multi-estado.
- **Módulo 4 — Software y flujo de trabajo profesional:** donde llevamos todo esto a un software profesional real.
- **Módulo 5 — Construir el negocio:** donde pasamos de "ya sé preparar declaraciones" a "tengo un negocio con clientes pagando" — precios, marketing, cómo conseguir tus primeros clientes.

El orden no es casualidad — vamos de lo más común a lo más especializado, igual que se construye una declaración real. Cada módulo se apoya en el anterior, así que no te saltes nada.

#### Cómo usar la comunidad
La comunidad no es un extra, es donde vive buena parte de tu aprendizaje real — ahí es donde vas a compartir tus dudas, tus avances, y donde vas a ver casos de otros estudiantes que te van a enseñar tanto como el contenido grabado.

Nuestra comunidad es un grupo exclusivo de WhatsApp — únete hoy mismo para no perderte anuncios y soporte entre semana:

[whatsapp:https://chat.whatsapp.com/:Unirse al Grupo Oficial de WhatsApp]

- Úsalo para hacer preguntas entre semana sin tener que esperar a la sesión en vivo.
- Comparte tu progreso en las actividades prácticas — por ejemplo, cuando tramites tu PTIN esta semana, comparte ahí tu captura de confirmación.
- Conecta con tus compañeros: muchos de ellos se convertirán en tu red de apoyo y de referidos.

> [!IMPORTANT] Pauta del grupo: úsalo para preguntas y avances del curso, no lo conviertas en chat personal — así nadie pierde un mensaje importante entre notificaciones que no le corresponden.$lesson$,
    2,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 2 — El Ecosistema de Credenciales Fiscales en EE.UU.',
    $lesson$### Lección 2 — El Ecosistema de Credenciales Fiscales en EE.UU.

"¿Necesito ser contador para hacer esto legalmente?" La respuesta corta es **no** — y esa es la base de todo el negocio que estás construyendo. Pero *"poder preparar declaraciones"* y *"poder representar a un cliente ante el IRS"* son dos cosas distintas, y esa distinción es la que vas a dominar en esta lección.

#### 1. El principio base: cualquiera con PTIN puede preparar
Cualquier profesional fiscal con un PTIN vigente del IRS está autorizado a preparar declaraciones federales de impuestos por compensación. No se requiere título universitario, licencia estatal (salvo excepciones como California u Oregón) ni examen para obtener el PTIN en sí. Esto es lo que hace que esta industria sea accesible — y también por qué la calidad varía tanto entre preparadores.

#### 2. La gran distinción: derechos de representación
Aquí es donde se separan los niveles. "Representación" significa poder hablar y actuar en nombre del cliente frente al IRS — en una auditoría, una disputa de cobro, o una apelación.

- *PTIN holder sin AFSP:* puede preparar y firmar declaraciones. Punto. No tiene ningún derecho de representación ante el IRS.
- *AFSP (Annual Filing Season Program) — Record of Completion:* tiene derechos de representación limitados. Puede representar únicamente a los clientes cuyas declaraciones él mismo preparó y firmó, y solo ante agentes de servicio al cliente, agentes de ingresos en auditorías iniciales, y el Taxpayer Advocate Service. No puede representar en apelaciones, ante oficiales de cobro, o ante el asesor legal del IRS.
- *Enrolled Agent (EA), CPA, y abogado tributario:* tienen derechos de representación ilimitados. Pueden representar a cualquier cliente (haya preparado o no su declaración) en cualquier asunto: auditorías, cobros, apelaciones.

> [!TIP] Punto clave para remarcar: el AFSP es voluntario, pero es la diferencia entre "solo puedo escribir la declaración" y "puedo acompañar a mi cliente si el IRS le manda una carta". Ese salto vale mucho para diferenciarte frente a otros preparadores.

#### ¿Qué significa esto para ti como estudiante?
Al terminar este curso vas a salir como **PTIN holder**, capaz de preparar y firmar declaraciones legalmente y cobrar por ello. Eso ya es un negocio viable. El AFSP es tu siguiente paso natural — no cuesta mucho tiempo adicional y te da el directorio público más el respaldo de poder acompañar a un cliente en una auditoría inicial.

El camino a EA es para cuando quieras escalar a manejar casos más complejos o representar clientes en disputas serias: es una inversión de tiempo mayor (el examen SEE no es trivial) pero abre la puerta a cobrar tarifas más altas y a un mercado de clientes con necesidades más avanzadas.

#### 3. Requisitos de cada credencial

*PTIN holder* [badge:gold:Nivel de Entrada]
- Requisito: Solicitud online, $18.75 USD, ~15 minutos.
- Sin examen ni educación continua obligatoria.
- Autoridad: Preparar y firmar declaraciones únicamente.

*AFSP — Annual Filing Season Program* [badge:wine:Recomendado Año 1]
- Requisito: 18 horas de educación continua al año, incluyendo un curso de repaso federal (AFTR) de 6 horas con examen de 100 preguntas (70% para aprobar, máximo 6 intentos).
- PTIN vigente + aceptar las obligaciones de la Circular 230.
- Beneficio adicional: Aparecer en el directorio público de preparadores del IRS — herramienta de marketing gratuita que hay que aprovechar.
- Nota: preparadores con credenciales estatales activas (CTEC en California, por ejemplo) están exentos del curso AFTR pero igual deben completar 15 horas de CE.

*Enrolled Agent (EA)* [badge:blue:Especialista Federal]
- Licenciado directamente por el IRS (es la única credencial fiscal que emite el IRS mismo).
- Requiere aprobar el Special Enrollment Examination (SEE), examen de 3 partes sobre planeación fiscal individual, de negocios, y representación.
- 72 horas de educación continua cada 3 años.
- Derechos de representación ilimitados en cualquier estado del país.

*CPA (Certified Public Accountant)* [badge:dark:Contador Público]
- Licenciado por la junta de contabilidad de cada estado.
- Requiere examen uniforme de CPA + requisitos de experiencia y educación (generalmente 150 créditos universitarios).
- Su alcance va mucho más allá de impuestos (auditoría, contabilidad financiera).

*Abogado tributario* [badge:dark:Litigio y Ley]
- Título en Derecho + especialización fiscal, colegiado en al menos un estado.
- Es la opción para casos de litigio fiscal, planeación patrimonial compleja, o disputas legales serias con el IRS.$lesson$,
    3,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 3 — Cómo Obtener tu PTIN Paso a Paso',
    $lesson$### Lección 3 — Cómo Obtener tu PTIN Paso a Paso

#### De qué trata esta lección
Después de entender en la lección anterior qué es el PTIN y por qué importa, esta lección es puramente práctica: caminarte por el proceso real de solicitud en el sistema del IRS, para que termines la semana con tu **PTIN activo o en trámite**.

Es la primera "victoria" tangible del curso — el momento en que pasas de "estar aprendiendo sobre la profesión" a "ya estar legalmente habilitado para ejercerla".

#### Checklist de documentos e información necesaria
Marca los elementos conforme los tengas listos en tu mesa de trabajo:

- [ ] Número de Seguro Social (SSN).
- [ ] Información personal: Nombre legal completo, fecha de nacimiento, dirección física postal actualizada.
- [ ] Correo electrónico personal y seguro (que revises frecuentemente; el IRS envía avisos seguros aquí).
- [ ] Información de la declaración de impuestos personal más reciente (se usa para validar tu identidad ante el IRS).
- [ ] Explicación por escrito si tienes alguna obligación pendiente o plan de pagos con el IRS.
- [ ] Tarjeta de crédito, débito o cuenta bancaria (eCheck) para pagar la cuota de $18.75 USD (no reembolsable).

> [!NOTE] Si presentaste tu declaración en las últimas 8 semanas, utiliza los datos de la declaración del año previo, ya que el sistema puede no haber actualizado aún la más reciente.

#### El proceso paso a paso

1. Ir al sistema de PTIN del IRS desde **IRS.gov/taxpros** y seleccionar *"Renew or Register"*.
2. Crear una cuenta con tu nombre y correo electrónico personal permanente (el PTIN pertenece a tu persona, no a una empresa ni a tu futuro empleador).
3. Completar la solicitud en línea, respondiendo las preguntas de antecedentes personales, declaración de referencia y cumplimiento fiscal.
4. Pagar la cuota reglamentaria de **$18.75 USD** con tarjeta o eCheck.
5. Recibir la confirmación de inmediato con tu número de PTIN asignado (empieza con la letra **P** seguida de 8 dígitos).

[btn:https://www.irs.gov/tax-professionals/ptin-system:Ir al Sistema de PTIN en IRS.gov]

#### La alternativa en papel (y por qué no debes usarla)
Existe la opción de solicitar por correo postal usando el Form W-12, pero el procesamiento toma entre **4 y 6 semanas**. La vía online es inmediata: en 15 minutos sales con tu número activo. Solo recurre al Form W-12 si no tienes historial de declaraciones tributarias personales en EE.UU.

#### Errores comunes a evitar
- Usar un correo electrónico corporativo o temporal de un trabajo que luego cambies.
- No verificar la ortografía exacta del nombre respecto a tu tarjeta de Seguro Social.
- Ingresar datos de una declaración presentada hace menos de 8 semanas que aún no esté procesada.

#### Renovación anual
El PTIN expira cada **31 de diciembre** y debe renovarse todos los años. La ventana de renovación abre a mediados de octubre para el año siguiente. Es un trámite rápido de unos 5 minutos, pero no debes dejarlo pasar antes del inicio de temporada en enero.

> [!IMPORTANT] Actividad práctica de la semana: Completa tu solicitud de PTIN esta misma semana y comparte una captura de pantalla de tu confirmación en el grupo de WhatsApp del curso.$lesson$,
    4,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 4 — Circular 230: Ética Profesional y Penalidades',
    $lesson$### Lección 4 — Circular 230: Ética Profesional y Penalidades

La **Circular 230** es el documento del Departamento del Tesoro que regula la conducta de quienes ejercen ante el IRS. Es el código de conducta ético y legal de la profesión. Esta lección cubre sus cuatro pilares más críticos para un preparador:

#### 1. Diligencia debida (Due Diligence)
Diligencia debida significa que el preparador tiene la obligación legal de **hacer preguntas razonables** y no simplemente aceptar cualquier dato o número que el cliente le entregue sin cuestionarlo, especialmente cuando algo no cuadra o parece inconsistente.

- La norma no exige que actúes como detective privado o audites facturas, pero sí que uses buen juicio profesional: si un cliente reporta dependientes o gastos de negocio exorbitantes que no encajan con su oficio, estás obligado a indagar y solicitar soporte.
- **Formulario 8867:** Esta obligación se vuelve legalmente estricta con los créditos reembolsables: *Earned Income Tax Credit (EITC)*, *Child Tax Credit (CTC)*, *Head of Household (HOH)* y *American Opportunity Tax Credit (AOTC)*. En cada declaración con estos beneficios, debes completar y firmar el Form 8867.

> [!IMPORTANT] El Formulario 8867 es el área de mayor riesgo de auditoría para preparadores nuevos. Preguntar dos veces y documentar las respuestas protege tanto a tu cliente como a ti de sanciones directas.

#### 2. Confidencialidad del cliente (IRC Sección 7216)
Toda la información financiera, familiar y fiscal que un cliente comparte contigo es **estrictamente confidencial por ley**.

- Ningún preparador puede divulgar ni usar esa información para ningún propósito distinto a preparar la declaración sin consentimiento explícito y por escrito del cliente (prohibido compartir con terceros, vender listas o usarla para ofrecer otros productos financieros no autorizados).
- Al recibir documentos por canales digitales (portales, correo o mensajería), asegúrate de almacenar los archivos de manera segura y confidencial.

#### 3. La prohibición absoluta de garantizar reembolsos
Ningún preparador puede prometer o garantizar un resultado específico:
- No puedes asegurar un monto exacto de reembolso antes de analizar los datos reales.
- No puedes afirmar que "conmigo nunca hay auditoría" o que "este truco siempre funciona".
- **Está terminantemente prohibido cobrar honorarios calculados como porcentaje del reembolso del cliente.**

> [!TIP] Los preparadores negligentes prometen reembolsos gigantescos para atraer clientes y terminan en problemas legales graves. Diferénciate por tu transparencia, ética y conocimiento técnico.

#### 4. Penalidades reales por negligencia o fraude
Las normas tributarias contemplan sanciones monetarias y penales directas al preparador:

- *Posición irrazonable en una declaración (IRC 6694(a)):* La mayor cifra entre **$1,000 USD** o el 50% de los honorarios cobrados.
- *Conducta dolosa o temeraria (IRC 6694(b)):* La mayor cifra entre **$5,000 USD** o el 75% de los honorarios cobrados.
- *Fallas de diligencia debida en créditos reembolsables (IRC 6695(g)):* Penalidad de varios cientos de dólares **por cada crédito y por cada declaración**, sin límite máximo. Se acumulan rápidamente.
- *Fallas administrativas (IRC 6695):* No firmar la declaración, no entregar copia completa al cliente o no incluir tu PTIN.
- *Fraude tributario (IRC 7206 y 7207):* Delito federal que conlleva multas severas y penas de prisión federal.

> [!WARNING] El IRS utiliza análisis automatizado de patrones en las declaraciones enviadas con tu PTIN. Mantener una conducta ética impecable es la mejor inversión para un negocio sólido y duradero.$lesson$,
    5,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 5 — Panorama de Ingresos Reales y Cómo Escalar',
    $lesson$### Lección 5 — Panorama de Ingresos Reales y Cómo Escalar

Esta lección aterriza las expectativas financieras desde el primer día: cuánto se cobra realmente por tipo de declaración en el mercado actual, cómo se distribuye el trabajo a lo largo del año y cómo evolucionar de tus primeros 10 clientes a un negocio de más de 200 declaraciones por temporada.

#### Rangos de tarifas por tipo de declaración (Mercado de referencia)

- *Form 1040 básico (W-2, deducción estándar):* **$220 – $290 USD**. Un preparador nuevo suele comenzar en el rango de $180 - $220 para armar cartera inicial.
- *1040 con deducciones detalladas (Schedule A):* **$320 – $420 USD**.
- *Trabajador independiente / Schedule C (freelancers, Uber, DoorDash):* **$300 – $600 USD**, variando según el volumen y orden de los gastos.
- *Ingresos de alquiler (Schedule E):* Suplemento de **$75 – $150 USD** por propiedad rentada.
- *Declaraciones multi-estado:* Recargo adicional de **$50 – $150 USD** por cada estado adicional.
- *Pequeños negocios formales (LLC, sociedades, S-Corp):* **$500 a más de $1,500 USD** por declaración comercial.

> [!NOTE] La complejidad y el tiempo dedicado determinan el precio de tu trabajo, nunca el tamaño del reembolso. Cobrar por valor protege la rentabilidad de tu negocio.

#### Temporadas altas y bajas en la industria fiscal

1. **Temporada alta (finales de enero a mediados de abril):** Concentra el mayor volumen de clientes y facturación anual. Las últimas tres semanas son de máxima demanda.
2. **Temporada de extensiones (abril a octubre):** Clientes con negocios, inversiones complejas o que presentan extemporáneamente. Proporciona un flujo de caja regular en primavera y verano.
3. **Temporada baja (mayo a diciembre):** Tiempo estratégico para educarte, renovar tu PTIN, implementar mejoras en software y ofrecer planeación fiscal para el cierre de año.

#### Las 4 etapas para escalar de 10 a 200 clientes

- *Etapa 1 — Los primeros 10 a 20 clientes (Temporada 1):* Círculo cercano, familiares, amigos y referidos directos. El objetivo principal no es maximizar margen sino afianzar el flujo técnico y conseguir testimonios de 5 estrellas.
- *Etapa 2 — De 20 a 60 clientes (Temporadas 2-3):* Los referidos empiezan a llegar orgánicamente y el marketing local rinde frutos. A tiempo parcial puedes gestionar este volumen con holgura.
- *Etapa 3 — De 60 a 150 clientes:* Surge la necesidad de sistematizar: filtrar clientes subiendo tarifas, delegar agendamiento y recepción de documentos para enfocarte solo en preparar.
- *Etapa 4 — De 150 a 200+ clientes:* Práctica consolidada. Involucra procesos estandarizados, soporte administrativo y eventualmente preparadores junior bajo tu supervisión.

> [!TIP] Llegar a 200 clientes no es solo hacer más publicidad: es tener un flujo de trabajo ordenado para atender con calidad y sin errores costosos.$lesson$,
    6,
    100
  ),
  (
    v_course_id,
    'texto',
    'Actividad Práctica, Sesión en Vivo y Cierre del Módulo 0',
    $lesson$### Actividad Práctica, Sesión en Vivo y Cierre del Módulo 0

#### Actividad práctica de la semana
1. Reúne los documentos de la checklist de la Lección 3.
2. Ingresa a **IRS.gov/taxpros** y completa tu solicitud de PTIN.
3. Toma una captura de pantalla de tu confirmación oficial (ocultando datos sensibles).
4. Compártela en el grupo de WhatsApp de la comunidad con tu nombre para celebrar tu primer gran hito.

[whatsapp:https://chat.whatsapp.com/:Compartir mi PTIN en el Grupo de WhatsApp]

#### Sesión en vivo del módulo
- **Espacio:** Q&A abierto sobre el trámite de PTIN, dudas legales y resolución de casos reales.
- Prepara tus preguntas anotadas para sacar el máximo provecho de la sesión.

---

#### Cierre del Módulo y Próximos Pasos
¡Felicidades por completar el **Módulo 0**! Ya conoces el marco regulatorio de los preparadores de impuestos en EE.UU., los derechos de representación, las normas éticas de la Circular 230 y el potencial de ingresos de esta profesión.

En el **Módulo 1**, nos adentraremos de lleno en la parte técnica:
- Aprenderás a desarmar el **Form 1040** línea por línea.
- Dominarás el estado civil para efectos de la declaración (*Filing Status*).
- Aprenderás las reglas de dependientes y créditos tributarios más comunes (*Child Tax Credit*, *Earned Income Tax Credit*).

> [!TIP] Nos vemos en la primera lección del Módulo 1. ¡Sigamos adelante con entusiasmo!$lesson$,
    7,
    100
  ),
  (
    v_course_id,
    'texto',
    'Módulo 1 — Fundamentos del Form 1040',
    $lesson$### Módulo 1 — Fundamentos del Form 1040
> [!NOTE] Objetivo del módulo: Que el estudiante domine la estructura del 1040 y pueda preparar declaraciones de asalariados con distintos perfiles familiares y fuentes de ingreso simples.

El corazón técnico del curso — cómo se arma la declaración de un asalariado, con todos sus créditos y deducciones comunes.$lesson$,
    8,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 1 — Anatomía del Form 1040 y Schedules 1, 2 y 3',
    $lesson$### Lección 1 — Anatomía del Form 1040

El Form 1040 es el documento central de toda declaración individual — todo lo demás que se enseña en el curso (Schedule C, E, D, créditos, etc.) eventualmente “aterriza” en alguna línea de este formulario.

El objetivo de esta lección es que el estudiante entienda el mapa completo: qué reporta cada sección, y cómo los Schedules 1, 2 y 3 son básicamente extensiones del 1040 para situaciones que no caben en las líneas principales.

> [!IMPORTANT] Nota sobre el año fiscal 2025 (declaraciones que se presentan en 2026): Trae cambios significativos por la “One Big Beautiful Bill Act” (OBBBA) — deducción estándar más alta, un nuevo Schedule 1-A, y ajustes al tope de SALT. Muchos estudiantes habrán visto el 1040 de años anteriores y notarán diferencias.

#### Página 1: Información personal, estado civil y dependientes
Antes de llegar a cualquier número, el 1040 pide identificar quién presenta la declaración:
- Nombre y número de seguro social.
- Estado civil (soltero, casado conjunto, casado separado, cabeza de familia, viudo calificado).
- Sección de dependientes con sus números de seguro social y la relación con el contribuyente.

Este bloque determina automáticamente qué tabla de impuestos y qué deducción estándar aplican, así que un error aquí afecta todo lo demás.

#### Líneas 1 a 9: El ingreso total
Esta sección suma todas las fuentes de ingreso del contribuyente:
- **Línea 1:** Salarios de Form W-2 (con sub-líneas para casos especiales como propinas calificadas bajo la nueva exclusión de OBBBA).
- **Líneas 2-3:** Intereses y dividendos (alimentados por Schedule B cuando superan cierto umbral).
- **Líneas 4-5:** Distribuciones de IRA y pensiones/retiro.
- **Línea 6:** Beneficios del Seguro Social.
- **Línea 7:** Ganancias o pérdidas de capital (de Schedule D).
- **Línea 8:** Ingreso adicional que viene de Schedule 1, Parte I — aquí es donde entra el ingreso de negocio (Schedule C), ingreso de alquiler (Schedule E), desempleo, y otros ingresos que no tienen su propia línea dedicada.
- **Línea 9:** El total de ingreso — la suma de todo lo anterior.

#### Líneas 10-11: De ingreso total a ingreso bruto ajustado (AGI)
La línea 10 resta los “ajustes al ingreso” que vienen de Schedule 1, Parte II (IRA tradicional, intereses de préstamos estudiantiles, la mitad del self-employment tax, HSA, entre otros).

El resultado en la línea 11 es el **Adjusted Gross Income (AGI)** — probablemente el número más importante de toda la declaración, porque de él dependen los límites de elegibilidad de casi todos los créditos y deducciones que se enseñan más adelante en el curso.

> [!NOTE] Para el año fiscal 2025 se incorpora el nuevo Schedule 1-A, que incluye deducciones especiales creadas por la OBBBA: la deducción para personas mayores de 65 años, la exclusión de propinas calificadas, y la deducción de intereses de préstamos de vehículos, entre otras — todas con sus propios límites de ingreso para el phase-out.

#### Líneas 12-15: De AGI a ingreso gravable
Aquí se resta la deducción estándar (o el total de Schedule A si el cliente detalla) y, si aplica, la deducción de ingreso de negocio calificado (QBI, Sección 199A). El resultado es el **taxable income** — la base real sobre la que se calcula el impuesto.

#### Página 2: Del impuesto tentativo al impuesto final
- **Línea 16:** El impuesto calculado según las tablas o tasas progresivas correspondientes al ingreso gravable.
- **Línea 17:** Impuestos adicionales que vienen de Schedule 2 — aquí aparecen el Impuesto Mínimo Alternativo (AMT, calculado en Form 6251), y otros montos que “suben” el impuesto base.
- **Líneas 19-21:** Créditos fiscales — el Child Tax Credit y otros créditos por dependientes se calculan aquí directamente, mientras que créditos adicionales vienen de Schedule 3, Parte I (crédito por cuidado de dependientes, crédito educativo, crédito fiscal extranjero, entre otros).
- **Líneas 22-23:** El resultado después de créditos, más cualquier otro impuesto de Schedule 2 Parte II (self-employment tax, Additional Medicare Tax, Net Investment Income Tax vía Form 8960, impuestos de retiro anticipado).
- **Línea 24:** El impuesto total — el número que realmente se debe.

#### Pagos y balance final
Las líneas siguientes suman lo que el contribuyente ya pagó durante el año:
- Retenciones de W-2.
- Pagos estimados trimestrales.
- Créditos reembolsables (EITC, Additional Child Tax Credit, y otros pagos que vienen de Schedule 3, Parte II, como el Premium Tax Credit).

La comparación entre el impuesto total y los pagos determina si hay reembolso o saldo a pagar.

#### Cómo pensar en los tres Schedules numerados (mapa mental)
- *Schedule 1 =* “Ingreso y ajustes que no caben en la página 1” (negocio propio, alquiler, desempleo, ajustes como IRA o intereses estudiantiles).
- *Schedule 2 =* “Impuestos adicionales que no son el impuesto normal sobre el ingreso” (AMT, self-employment tax, impuestos de Medicare adicional, NIIT).
- *Schedule 3 =* “Créditos y pagos que no tienen su propia línea en el 1040” (créditos no reembolsables como educación y crédito extranjero, y créditos/pagos reembolsables como el Premium Tax Credit).

> [!TIP] Entender esta estructura general es lo que te va a permitir, en cualquier declaración futura —por compleja que sea— ubicar rápidamente en qué parte del formulario “vive” cada pieza de información del cliente, en lugar de sentirte perdido ante un caso nuevo.$lesson$,
    9,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 2 — Estado Civil (Filing Status) y Casos Límite',
    $lesson$### Lección 2 — Estado Civil (Filing Status)

El estado civil es la primera decisión de toda declaración y una de las que más impacto tiene en el resultado final — determina la deducción estándar, las tablas de impuestos, y la elegibilidad para varios créditos. También es una de las áreas donde más preguntas van a llegar de clientes con situaciones de vida complicadas (separaciones, divorcios, parejas que viven juntas sin estar casadas).

#### Las cinco categorías

*Soltero (Single)*
Aplica a quien no está casado, divorciado, o legalmente separado al 31 de diciembre del año fiscal, y no califica para cabeza de familia o viudo calificado.

*Casado presentando en conjunto (Married Filing Jointly)*
La pareja combina todo su ingreso, deducciones y créditos en una sola declaración. Es, en la gran mayoría de los casos, la opción que resulta en menor impuesto total — por eso el IRS la coloca al final de la lista de opciones en el propio formulario, indicando que suele ser la más favorable a quien califique. Para 2025 tiene la deducción estándar más alta de las cinco categorías.

*Casado presentando por separado (Married Filing Separately)*
Cada cónyuge presenta su propia declaración con su propio ingreso y deducciones. Casi siempre resulta en más impuesto combinado que presentar en conjunto, y además elimina el acceso a varios créditos importantes (EITC, créditos educativos, entre otros). Tiene sentido en casos específicos:
- Cuando uno de los cónyuges no quiere ser responsable de errores o deudas fiscales del otro (responsabilidad conjunta y solidaria).
- En situaciones de separación en proceso.
- Cuando hay planes de pago de préstamos estudiantiles basados en ingreso donde separar puede reducir el pago mensual del préstamo aunque suba el impuesto.

*Cabeza de familia (Head of Household)*
Para alguien no casado (o considerado no casado) que pagó más de la mitad del costo de mantener su hogar durante el año, y que tuvo un dependiente calificado viviendo con él más de la mitad del año. Tiene una deducción estándar más alta que soltero y tablas de impuesto más favorables — es una categoría que muchos clientes no saben que pueden reclamar.

*Viudo(a) calificado(a) con dependiente (Qualifying Surviving Spouse)*
Para quien perdió a su cónyuge y tiene un hijo dependiente, permite usar las tablas y deducción estándar de casado conjunto durante los dos años posteriores al fallecimiento (sin contar el año del fallecimiento, en el que normalmente se presenta como casado conjunto todavía).

#### Casos límite que hay que dominar

*Parejas casadas legalmente separadas o en proceso de divorcio*
El estado civil se determina por la situación al **31 de diciembre del año fiscal**, sin importar qué pasó el resto del año:
- Si el divorcio se finalizó legalmente antes del 31 de diciembre, el contribuyente ya no puede presentar como casado para ese año, aunque haya estado casado los primeros 11 meses.
- Si al 31 de diciembre siguen legalmente casados pero viven separados, en principio siguen siendo “casados” para efectos fiscales.
- **Regla de "considerado no casado" (considered unmarried):** Un contribuyente casado puede calificar para presentar como Cabeza de Familia si vivió separado de su cónyuge los últimos 6 meses del año, pagó más de la mitad del costo del hogar, y tiene un dependiente calificado viviendo con él más de la mitad del año — sin necesidad de estar legalmente divorciado o separado.

> [!TIP] Esta regla de “considerado no casado” es una de las que más valor agrega en la práctica, porque muchos clientes en proceso de separación no saben que pueden acceder a Cabeza de Familia en vez de quedar atrapados en Casado Separado.

*Divorcio a mitad de año*
Lo que importa es el estado al 31 de diciembre, no un promedio ni la fecha exacta del divorcio dentro del año. Un cliente que se divorció en marzo presenta como soltero (o cabeza de familia si califica) para todo ese año fiscal — no hay una división proporcional entre “casado” y “soltero” dentro del mismo año.

*¿Quién reclama a los hijos después de un divorcio o separación?*
La regla general del IRS es que el hijo es dependiente del padre con quien vivió más noches durante el año (el “custodial parent”), independientemente de lo que diga un acuerdo de divorcio sobre manutención.
- El padre custodio puede ceder el derecho a reclamar al hijo como dependiente usando el **Form 8332**, lo cual es común en acuerdos de divorcio negociados.
- **Punto crítico:** Ceder el dependiente con el Form 8332 **no** transfiere automáticamente el derecho a usar Cabeza de Familia ni el EITC, que siguen perteneciendo únicamente al padre con quien el hijo vivió más tiempo.

> [!IMPORTANT] Cuando dos ex-parejas son clientes, la prioridad es simplemente aplicar la regla del IRS con la información real de convivencia — no asumir automáticamente lo que dice un documento legal de divorcio, que no necesariamente coincide con las reglas fiscales.

*Parejas que viven juntas sin estar casadas*
No existe un estado civil de “unión libre” para efectos federales — cada uno presenta como soltero o, si califica por tener un dependiente y cumplir los requisitos de aporte al hogar, como Cabeza de Familia.

#### Cómo elegir entre las opciones cuando hay más de una posible
Cuando un contribuyente califica para más de un estado civil, la regla práctica es siempre calcular ambos escenarios y elegir el que resulte en menor impuesto — el IRS permite elegir la opción más favorable siempre que se cumplan los requisitos.$lesson$,
    10,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 3 — Dependientes: Qualifying Child vs. Qualifying Relative',
    $lesson$### Lección 3 — Dependientes

Determinar correctamente los dependientes es la base de la que dependen el Child Tax Credit, el Credit for Other Dependents, Cabeza de Familia, y varios créditos más. El IRS reconoce dos categorías completamente distintas con pruebas diferentes para cada una.

#### Dependiente calificado (Qualifying Child)
Debe cumplir cinco pruebas simultáneamente:
1. **Relación:** Hijo, hijastro, hijo adoptivo, hijo de crianza (foster), hermano, medio hermano, o un descendiente de cualquiera de ellos (nieto, sobrino).
2. **Edad:** Menor de 19 años al final del año, o menor de 24 si es estudiante de tiempo completo, o de cualquier edad si tiene una discapacidad permanente y total.
3. **Residencia:** Vivió con el contribuyente más de la mitad del año (con excepciones por ausencias temporales como escuela, vacaciones, hospitalización, o servicio militar).
4. **Manutención:** El dependiente no proveyó más de la mitad de su propio sostenimiento durante el año — esta prueba mira cuánto se mantuvo a sí mismo, no cuánto aportó el contribuyente.
5. **Declaración conjunta:** El dependiente no presenta una declaración conjunta con su cónyuge (salvo que sea únicamente para reclamar un reembolso de retenciones, sin generar impuesto).

> [!NOTE] A diferencia del pariente calificado, aquí **no hay límite de ingreso** del dependiente — un adolescente con un trabajo de medio tiempo que gana varios miles de dólares puede seguir siendo dependiente calificado, siempre que no haya aportado más de la mitad de su propio sostenimiento.

#### Pariente calificado (Qualifying Relative)
Cubre a personas que el contribuyente mantiene económicamente pero que no cumplen los requisitos de edad de dependiente calificado (el ejemplo clásico es un padre o abuelo mayor). Se deben cumplir cuatro pruebas:
1. **No ser dependiente calificado de nadie:** Si la persona ya califica como dependiente calificado de alguien, no puede reclamarse como pariente calificado.
2. **Relación o convivencia:** Debe ser un familiar de la lista reconocida por el IRS (padre, abuelo, hermano, sobrino, suegro, entre otros — sin necesidad de vivir junto al contribuyente), o bien cualquier persona que haya vivido como miembro del hogar durante todo el año.
3. **Prueba de ingreso bruto:** El ingreso bruto de la persona debe ser menor a **$5,200 para el año fiscal 2025** (ingreso gravable; beneficios del Seguro Social o veteranos generalmente no cuentan para este límite).
4. **Prueba de manutención:** El contribuyente debe haber aportado más de la mitad del sostenimiento total de esa persona durante el año.

> [!TIP] Cuando varios familiares se reparten el aporte económico de una persona mayor sin que ninguno llegue solo al 50%, existe la opción del acuerdo de soporte múltiple (**Form 2120**), donde los que aportan al menos el 10% se ponen de acuerdo en quién reclama el dependiente ese año.

#### Custodia compartida: quién reclama al hijo
El hijo es dependiente del padre custodio: aquel con quien el hijo vivió **más noches durante el año**. En caso de un número idéntico de noches, gana el padre con mayor ingreso bruto ajustado (AGI).

- Si el padre custodio cede el derecho firmando el **Form 8332**, solo transfiere el Child Tax Credit y el Credit for Other Dependents.
- **No transfiere** Cabeza de Familia, el EITC, ni el crédito por cuidado de dependientes, que se quedan siempre con el padre custodio real.

#### Dependientes que trabajan
- **Dependiente calificado (hijo):** Puede trabajar sin límite de ingreso — lo que importa es si usó ese dinero para cubrir más de la mitad de su propio sostenimiento. Un adolescente que gana $8,000 en un trabajo de verano pero vive en casa de sus padres (quienes cubren vivienda y comida) sigue siendo dependiente calificado.
- **Pariente calificado:** Tiene un límite estricto de ingreso bruto ($5,200 en 2025) — si lo supera, deja de calificar sin importar cuánto aporte el contribuyente.
- El hijo dependiente que trabaja y recibe su propio W-2 generalmente debe presentar su propia declaración si supera ciertos umbrales, pero eso no le impide seguir siendo reclamado como dependiente en la declaración de sus padres.$lesson$,
    11,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 4 — Ingreso W-2 y Casos con Múltiples Empleadores',
    $lesson$### Lección 4 — Ingreso W-2

El W-2 es, junto con el 1099-NEC, el documento que más van a ver los estudiantes en su práctica diaria. El objetivo es que sepas leer cada casilla con confianza, entiendas cómo se traducen las retenciones al 1040, y sepas manejar sin errores los casos de múltiples empleadores.

#### Lectura del formulario, casilla por casilla
- **Casilla 1 (Wages, tips, other compensation):** El ingreso sujeto a impuesto federal que va a la línea 1a del 1040. Ya viene reducido por aportaciones pre-impuesto como 401(k) o seguro médico, así que casi nunca coincide con el salario bruto total que el cliente cree que ganó.
- **Casilla 2 (Federal income tax withheld):** Lo que el empleador ya retuvo y envió al IRS a cuenta del impuesto del empleado — se resta directamente del impuesto total para determinar reembolso o saldo a pagar.
- **Casillas 3 y 4 (Social Security wages / tax withheld):** Base y retención de Seguro Social, con tope anual de ingreso sujeto a este impuesto.
- **Casillas 5 y 6 (Medicare wages / tax withheld):** Similar a Seguro Social, pero Medicare no tiene tope de ingreso.
- **Casilla 7 (Social Security tips):** Empleados que reciben propinas reportadas al empleador — relevante por la nueva deducción de propinas calificadas.
- **Casilla 12 (Códigos con letra):**
  - Código D: Aportaciones a 401(k).
  - Código DD: Costo del seguro médico patrocinado por el empleador (informativo, no gravable).
  - Códigos nuevos bajo la OBBBA relacionados con propinas y horas extra calificadas (para 2025 el reporte separado es voluntario para el empleador).
- **Casilla 14 (Other):** Espacio libre usado para cuotas sindicales, seguro de incapacidad estatal, o montos de horas extra/propinas calificadas.
- **Casillas 15-17 (State, employer’s state ID, state wages, state income tax):** El equivalente estatal de las casillas 1 y 2.

#### Retenciones federales y estatales
La retención federal (casilla 2) y estatal (casilla 17) son pagos anticipados de impuesto que el cliente ya hizo durante el año a través de su nómina.
- En la declaración federal, la retención se compara contra el impuesto total calculado para determinar si hay reembolso o saldo a pagar.
- **Concepto clave:** La retención no es “lo que se debe de impuesto”, es solo un adelanto. Alguien puede tener mucha retención y aun así deber más si su situación cambió durante el año (por ejemplo, un segundo trabajo o un cambio de estado civil no ajustado a tiempo en el Form W-4).

#### Casos con múltiples empleadores
- **Exceso de retención de Seguro Social:** Cuando un cliente trabajó para más de un empleador en el mismo año y su ingreso combinado superó el tope anual de base de Seguro Social, entre ambos empleadores le retuvieron de más. Ese exceso se reclama como un crédito directamente en el 1040.
- **Ajuste de retención federal insuficiente:** Cada empleador calcula la retención como si ese fuera el único ingreso del año. Alguien con dos o tres trabajos simultáneos casi siempre termina con menos retención federal de la que realmente necesita, resultando en un saldo a pagar inesperado.
- **Trabajo en distintos estados:** Revisar las casillas 15-17 de cada W-2 con cuidado cuando los empleadores están en distintos estados o el cliente se mudó a mitad de año.$lesson$,
    12,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 5 — Ingreso 1099-INT, 1099-DIV y 1099-R',
    $lesson$### Lección 5 — Ingreso 1099-INT, 1099-DIV y 1099-R

Estos tres formularios cubren la mayoría de los ingresos “pasivos”: intereses bancarios, dividendos de inversiones y distribuciones de cuentas de retiro. Cada uno tiene su propio tratamiento fiscal.

#### Form 1099-INT: Intereses
Reporta intereses ganados en cuentas bancarias, certificados de depósito y bonos:
- **Casilla 1 (Interest income):** Va a la línea 2b del 1040. Si supera $1,500 obliga a completar el Schedule B.
- **Casilla 3 (Interest on U.S. Savings Bonds and Treasury obligations):** Exento de impuesto estatal, aunque sí gravable a nivel federal.
- **Casilla 8 (Tax-exempt interest):** Interés de bonos municipales, exento de impuesto federal. Se reporta informativamente en la línea 2a del 1040 (puede afectar la tributación de beneficios del Seguro Social).

#### Form 1099-DIV: Dividendos calificados vs. ordinarios
- **Casilla 1a (Total ordinary dividends):** Total de dividendos recibidos. Se gravan a las tasas normales de impuesto sobre la renta (hasta 37%).
- **Casilla 1b (Qualified dividends):** La porción de la casilla 1a que califica para tasas preferenciales de ganancias de capital a largo plazo (0%, 15% o 20%).

> [!NOTE] Tasas para dividendos calificados en 2025:
> - **0%:** Ingreso gravable hasta ~$48,350 (soltero) o ~$96,700 (casado conjunto).
> - **15%:** Ingresos en el rango intermedio.
> - **20%:** Ingreso gravable por encima de ~$533,400 (soltero) o ~$600,050 (casado conjunto).

Para calificar, deben provenir de corporación estadounidense (o extranjera calificada) y mantenerse más de 60 días dentro del período de 121 días alrededor de la fecha ex-dividendo (el broker lo determina y reporta en la casilla 1b).
- **Casilla 2a (Total capital gain distributions):** Ganancias de capital distribuidas por fondos mutuos (gravadas a largo plazo).
- **Casilla 12 (Exempt-interest dividends):** Dividendos de fondos de bonos municipales, exentos de impuesto federal.

#### Form 1099-R: Distribuciones de cuentas de retiro
Reporta distribuciones de pensiones, IRAs, 401(k)s, anualidades y planes similares:
- **Casilla 1 (Gross distribution):** Monto total distribuido.
- **Casilla 2a (Taxable amount):** Porción gravable (puede ser $0 en Roth IRA calificada o contribuciones after-tax).
- **Casilla 7 (Distribution code):**
  - Código 1: Retiro anticipado sin excepción conocida.
  - Código 7: Distribución normal (mayor de 59½ años).
  - Código G: Rollover directo a otra cuenta calificada (no gravable).
  - Código Q: Distribución calificada de Roth IRA.

#### Penalidades por retiro anticipado
Cuando la casilla 7 indica retiro anticipado (antes de 59½ años) sin excepción, se suma una **penalidad adicional del 10%** sobre el monto gravable en el Schedule 2, además del impuesto normal sobre la renta.

Excepciones comunes que eliminan la penalidad del 10%:
- Gastos médicos que superan el umbral del AGI.
- Compra de primera vivienda (límite de por vida de $10,000 para IRAs).
- Gastos de educación superior calificados.
- Desempleo para pagar primas de seguro médico.
- Discapacidad total y permanente o fallecimiento del titular.
- Regla de pagos periódicos sustancialmente iguales (72(t)).

> [!WARNING] Estas excepciones eliminan la penalidad del 10%, pero **no eliminan el impuesto sobre la renta normal** que sigue aplicando sobre la porción gravable.$lesson$,
    13,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 6 — Child Tax Credit, Credit for Other Dependents y ACTC',
    $lesson$### Lección 6 — Child Tax Credit y Dependientes

Estos dos créditos son, junto con el EITC, los que más impacto tienen en el reembolso de familias con hijos o dependientes.

#### Child Tax Credit (CTC): Monto y elegibilidad
Para el año fiscal 2025, el crédito vale **hasta $2,200 por hijo calificado** (subió de $2,000 bajo la nueva ley OBBBA, y se ajusta por inflación).

Requisitos para calificar:
- Ser menor de 17 años al final del año.
- Cumplir la prueba de dependiente calificado (relación, residencia, manutención).
- Tener un número de Seguro Social válido para trabajar, emitido antes de la fecha límite de la declaración.

> [!IMPORTANT] Un hijo con solo número ITIN no califica para el CTC, pero sí califica para el Credit for Other Dependents.

#### Credit for Other Dependents (ODC)
Para dependientes que no cumplen los requisitos del CTC (hijos de 17 años en adelante, padres o abuelos dependientes, o dependientes con ITIN en vez de Seguro Social), existe un crédito de **$500 por dependiente, no reembolsable**.

#### Phaseout (Reducción progresiva) por ingreso
El crédito combinado (CTC + ODC) empieza a reducirse cuando el MAGI supera:
- **$200,000** (soltero, cabeza de familia, casado separado).
- **$400,000** (casado conjunto).
Por cada $1,000 (o fracción) de MAGI por encima del umbral, el crédito se reduce en $50.

#### La parte reembolsable: Additional Child Tax Credit (ACTC)
El CTC es no reembolsable (solo reduce el impuesto hasta $0). El **Additional Child Tax Credit (ACTC)** es la porción reembolsable calculada en el **Schedule 8812**, y para 2025 puede llegar **hasta $1,700 por hijo calificado**.

Lógica de cálculo del ACTC:
1. Se calcula el CTC completo según el número de hijos calificados.
2. Se resta la parte que ya se usó para reducir el impuesto a $0.
3. Lo que sobra del crédito se compara contra el **15% del ingreso ganado (earned income) que exceda $2,500**.
4. El monto final reembolsable es el menor entre ese cálculo y el tope de $1,700 por hijo.

*Ejemplo:* Familia con dos hijos calificados ($4,400 de CTC total). Con impuesto antes de créditos en $0 e ingreso ganado de $20,000:
15% de ($20,000 − $2,500) = $2,625. Como está por debajo del tope de $3,400 ($1,700 x 2 hijos), reciben **$2,625 como reembolso**.

> [!TIP] Sin ingreso ganado por encima de $2,500 (por ejemplo, quien vive solo de beneficios), se recibe $0 de ACTC.$lesson$,
    14,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 7 — Deducción Estándar vs. Detallada (Schedule A)',
    $lesson$### Lección 7 — Deducción Estándar vs. Detallada

Cada declaración exige comparar: usar la deducción estándar o detallar gastos específicos en el Schedule A.

#### La deducción estándar para el año fiscal 2025
- **$15,000** para soltero o casado separado.
- **$30,000** para casado conjunto o viudo calificado.
- **$22,500** para cabeza de familia.

Existe además un monto adicional para contribuyentes de 65 años o más, o legalmente ciegos, y bajo la OBBBA una deducción adicional específica en el nuevo Schedule 1-A.

#### Gastos deducibles en Schedule A

*Gastos médicos y dentales*
Se pueden deducir los que superen el **7.5% del AGI** del contribuyente. Califican primas pagadas de su propio bolsillo, gastos dentales, de visión y millaje médico.

*Impuestos estatales y locales (SALT)*
Bajo la nueva ley OBBBA, para los años fiscales 2025 a 2029, el tope subió a **$40,000** ($20,000 si se presenta como casado separado), en lugar del tope anterior de $10,000.
- Phaseout para altos ingresos: Empieza a reducirse cuando el MAGI supera $500,000 ($250,000 casado separado), disminuyendo un 30% por cada dólar por encima del umbral, sin bajar nunca del piso de $10,000.
- Incluye impuesto estatal sobre la renta (o impuesto sobre ventas en estados sin income tax como Texas o Florida) más impuestos sobre la propiedad.

*Intereses hipotecarios*
Deducibles sobre deuda de adquisición de vivienda hasta **$750,000** ($1,000,000 si la hipoteca es anterior a diciembre de 2017).

*Donaciones caritativas*
Deducibles hasta el 60% del AGI para donaciones en efectivo a organizaciones 501(c)(3) calificadas:
- Donaciones de $250 o más requieren acuse de recibo por escrito.
- Donaciones no monetarias que superen $500 en total requieren el Form 8283 y deben estar en buen estado.

#### Cómo decidir en la práctica: El ejercicio de comparación
1. Sumar gastos médicos que superen el 7.5% del AGI.
2. Sumar impuestos estatales/locales, limitados al nuevo tope de $40,000.
3. Sumar intereses hipotecarios.
4. Sumar donaciones caritativas documentadas.
5. Comparar el total contra la deducción estándar correspondiente. Si no supera la deducción estándar, se usa la deducción estándar.

> [!NOTE] Verdadero o Falso: “El tope de la deducción de impuestos estatales y locales (SALT) sigue siendo $10,000 para todos los contribuyentes en 2025.” → **Falso**. Subió a $40,000 para los años 2025-2029 (con phaseout para MAGI superior a $500,000 y piso de $10,000).$lesson$,
    15,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 8 — Earned Income Tax Credit (EITC) y Form 8867',
    $lesson$### Lección 8 — Earned Income Tax Credit (EITC)

El EITC es el crédito reembolsable más grande para trabajadores de ingresos bajos y medianos, y el más propenso a errores según el IRS. Por ello exige la obligación legal de completar el **Form 8867**.

#### Montos máximos del crédito para 2025
- **$8,046** con tres o más hijos calificados.
- **$7,152** con dos hijos calificados.
- **$4,328** con un hijo calificado.
- **$649** sin hijos calificados (trabajadores entre 25 y 64 años).

Funciona con una curva de tres tramos: sube con el ingreso ganado hasta el máximo, se mantiene en una meseta, y baja gradualmente hasta $0.

#### Reglas de elegibilidad
- **Ingreso ganado:** Debe tener salario, propinas o ingreso neto de trabajo independiente (inversiones, Seguro Social o desempleo no cuentan).
- **Límite de ingreso de inversión:** No puede superar **$11,950 para 2025** (límite absoluto: superarlo por $1 elimina el crédito completo).
- **Número de Seguro Social válido:** Contribuyente, cónyuge e hijos deben tener SSN válido para trabajar emitido antes de la fecha límite.
- **Estado civil:** No se puede reclamar como Casado Separado (salvo la regla especial para separados que vivieron aparte el segundo semestre y cumplen requisitos de cabeza de familia).
- **Residencia:** Haber vivido en Estados Unidos más de la mitad del año.
- **Hijos calificados:** Mismas pruebas de relación, edad y residencia (no es obligatorio que sea dependiente en ciertos casos de custodia compartida).

#### La obligación de diligencia debida: Form 8867
El IRS exige a todo preparador remunerado completar el **Form 8867 (Paid Preparer’s Due Diligence Checklist)**:
- Hacer preguntas razonables cuando la información parece incompleta, inconsistente o incorrecta.
- Documentar por escrito las preguntas hechas y las respuestas del cliente.
- Conservar los registros por al menos 3 años.

> [!WARNING] No cumplir con la diligencia debida conlleva penalidades de varios cientos de dólares por cada falla y por cada crédito, acumulativas en cada declaración.$lesson$,
    16,
    100
  ),
  (
    v_course_id,
    'texto',
    'Lección 9 — Créditos Educativos: AOTC vs. LLC y Form 1098-T',
    $lesson$### Lección 9 — Créditos Educativos

Ambos créditos educativos federales se calculan en el Form 8863 y usan el Form 1098-T, pero tienen reglas y montos distintos.

#### American Opportunity Tax Credit (AOTC)
Vale **hasta $2,500 por estudiante** (100% de los primeros $2,000 de gastos calificados + 25% de los siguientes $2,000):
- Aplica solo a los **primeros cuatro años** de educación superior hacia un título o credencial reconocida.
- Requiere estar inscrito al menos medio tiempo durante al menos un semestre del año.
- Máximo 4 años por estudiante de por vida.
- Cubre matrícula, cuotas obligatorias, libros y materiales del curso.
- **40% es reembolsable (hasta $1,000).**
- Phaseout: Aplica completo hasta MAGI de $80,000 ($160,000 casado conjunto), reduciéndose hasta desaparecer en $90,000 ($180,000 casado conjunto).

#### Lifetime Learning Credit (LLC)
Vale **hasta $2,000 por declaración** (20% de hasta $10,000 en gastos calificados):
- El límite es por declaración completa, sin importar el número de estudiantes.
- No hay límite de años (se puede reclamar indefinidamente).
- No requiere perseguir un título ni carga de medio tiempo (un solo curso califica).
- Cubre solo matrícula y cuotas pagadas directamente a la institución (no cubre libros ni materiales).
- **No es reembolsable** (solo reduce el impuesto a $0).
- Mismos límites de phaseout que el AOTC ($80,000-$90,000 soltero / $160,000-$180,000 casado conjunto).

#### Reglas de compatibilidad
- No se pueden reclamar ambos créditos para el mismo estudiante en el mismo año.
- Sí se puede reclamar AOTC para un estudiante y LLC para otro estudiante dentro de la misma declaración.

#### Form 1098-T: Documento de origen
- **Casilla 1:** Pagos recibidos por gastos calificados.
- **Casilla 5:** Becas o subvenciones (se deben restar de la casilla 1). Se pueden sumar libros pagados aparte para el AOTC.
- Tanto el contribuyente como el estudiante deben tener **número de Seguro Social válido** (no basta ITIN).

#### Quién puede reclamar el crédito
Si el estudiante es dependiente de otra persona (sus padres), solo quien lo reclama como dependiente puede tomar el crédito, sin importar quién pagó físicamente la matrícula. Si el estudiante no es dependiente de nadie, él mismo reclama el crédito en su declaración.

> [!TIP] Con estos créditos completos, dominas el panorama completo de ingreso, ajustes, deducciones y créditos principales de una declaración de asalariado.$lesson$,
    17,
    100
  );

  -- 4. Auto-inscribir a los usuarios existentes en estado 'activo' (sin usar ON CONFLICT)
  INSERT INTO inscripciones (course_id, client_id, estado, vencimiento, horas_usadas, created_at)
  SELECT 
    v_course_id, 
    p.id, 
    'activo', 
    NOW() + INTERVAL '365 days', 
    0, 
    NOW()
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM inscripciones i 
    WHERE i.course_id = v_course_id 
      AND i.client_id = p.id 
      AND i.estado = 'activo'
  );

  RAISE NOTICE '¡Script maestro completado con éxito! % lecciones insertadas.', 17;
END $$;
