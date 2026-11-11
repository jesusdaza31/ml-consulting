/* =============================================
   ML CONSULTING — seed-modulo-0.js
   Poblar el Módulo 0 (Orientación y Fundamentos Legales)
   con formato interactivo y enriquecido.
   Uso: node scripts/seed-modulo-0.js
============================================= */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const TARGET_COURSE_ID = '47606ff5-c85d-4954-8b77-e98fbbf7105c';

const MODULOS_LIST = [
  'Módulo 0 — Orientación y fundamentos legales',
  'Módulo 1 — Fundamentos del Form 1040',
  'Módulo 2 — Trabajadores independientes y pequeños negocios',
  'Módulo 3 — Situaciones especiales',
  'Módulo 4 — Software y flujo de trabajo profesional',
  'Módulo 5 — Construir el negocio'
];

const CONTENIDO_ITEMS = [
  {
    tipo: 'texto',
    titulo: 'Módulo 0 — Orientación y Fundamentos Legales',
    widthPct: 100,
    texto: `### Módulo 0 — Orientación y Fundamentos Legales
> [!NOTE] Objetivo del módulo: Comprender el panorama legal de la profesión, el trámite del PTIN, y el alcance de lo que puede y no puede hacer un preparador de impuestos no acreditado.

¡Te damos la bienvenida al inicio de tu formación profesional! En este módulo sentamos las bases legales, éticas y operativas indispensables antes de calcular una sola cifra en una declaración tributaria.`
  },
  {
    tipo: 'texto',
    titulo: 'Lección 1 — Bienvenida y Mapa del Curso',
    widthPct: 100,
    texto: `### Lección 1 — Bienvenida y Mapa del Curso

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

> [!IMPORTANT] Pauta del grupo: úsalo para preguntas y avances del curso, no lo conviertas en chat personal — así nadie pierde un mensaje importante entre notificaciones que no le corresponden.`
  },
  {
    tipo: 'texto',
    titulo: 'Lección 2 — El Ecosistema de Credenciales Fiscales en EE.UU.',
    widthPct: 100,
    texto: `### Lección 2 — El Ecosistema de Credenciales Fiscales en EE.UU.

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
- Es la opción para casos de litigio fiscal, planeación patrimonial compleja, o disputas legales serias con el IRS.`
  },
  {
    tipo: 'texto',
    titulo: 'Lección 3 — Cómo Obtener tu PTIN Paso a Paso',
    widthPct: 100,
    texto: `### Lección 3 — Cómo Obtener tu PTIN Paso a Paso

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

> [!IMPORTANT] Actividad práctica de la semana: Completa tu solicitud de PTIN esta misma semana y comparte una captura de pantalla de tu confirmación en el grupo de WhatsApp del curso.`
  },
  {
    tipo: 'texto',
    titulo: 'Lección 4 — Circular 230: Ética Profesional y Penalidades',
    widthPct: 100,
    texto: `### Lección 4 — Circular 230: Ética Profesional y Penalidades

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

> [!WARNING] El IRS utiliza análisis automatizado de patrones en las declaraciones enviadas con tu PTIN. Mantener una conducta ética impecable es la mejor inversión para un negocio sólido y duradero.`
  },
  {
    tipo: 'texto',
    titulo: 'Lección 5 — Panorama de Ingresos Reales y Cómo Escalar',
    widthPct: 100,
    texto: `### Lección 5 — Panorama de Ingresos Reales y Cómo Escalar

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

> [!TIP] Llegar a 200 clientes no es solo hacer más publicidad: es tener un flujo de trabajo ordenado para atender con calidad y sin errores costosos.`
  },
  {
    tipo: 'texto',
    titulo: 'Actividad Práctica, Sesión en Vivo y Cierre del Módulo 0',
    widthPct: 100,
    texto: `### Actividad Práctica, Sesión en Vivo y Cierre del Módulo 0

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

> [!TIP] Nos vemos en la primera lección del Módulo 1. ¡Sigamos adelante con entusiasmo!`
  }
];

function seed() {
  console.log('Iniciando seed de Módulo 0...');
  
  if (!fs.existsSync(COURSES_FILE)) {
    console.error('No se encontró el archivo courses.json en:', COURSES_FILE);
    process.exit(1);
  }

  const raw = fs.readFileSync(COURSES_FILE, 'utf8');
  const data = JSON.parse(raw);
  const courses = data.courses || [];

  let course = courses.find(c => c.id === TARGET_COURSE_ID);
  if (!course) {
    console.log('Curso con ID ' + TARGET_COURSE_ID + ' no encontrado. Buscando por nombre...');
    course = courses.find(c => c.nombre && c.nombre.toLowerCase().includes('impuestos'));
  }

  if (!course) {
    console.error('No se encontró el curso de impuestos para actualizar.');
    process.exit(1);
  }

  console.log('Actualizando curso:', course.nombre, '(' + course.id + ')');

  // Actualizar metadatos
  course.nombre = 'Curso Profesional de Preparación de Impuestos Personales en EE.UU. (Form 1040)';
  course.descripcion = 'Formación integral para convertirte en preparador de impuestos profesional habilitado por el IRS. Aprende el marco legal de la profesión, trámite del PTIN, dominio del Form 1040, créditos familiares, trabajadores independientes, casos con ITIN, software profesional y estrategias comerciales para conseguir tus primeros clientes.';
  course.objetivoGeneral = 'Capacitar al estudiante para tramitar su PTIN ante el IRS, preparar y firmar declaraciones de impuestos personales (Form 1040 y anexos) con total apego normativo, y construir una práctica tributaria rentable y ética.';
  course.resultadoEsperado = 'Al finalizar el curso completo, tendrás tu PTIN activo, sabrás preparar declaraciones W-2, trabajadores por cuenta propia (Schedule C), casos con ITIN e inversiones, manejarás software profesional y contarás con una estrategia clara para captar y atender a tus primeros clientes.';
  course.modulos = MODULOS_LIST;

  // Preservar videos o recursos existentes si los hay, pero anteponer las lecciones del Módulo 0
  const existingNonModuleItems = (course.contenido || []).filter(item => {
    // Si era el texto de bienvenida genérico anterior, lo reemplazamos
    if (item.tipo === 'texto' && item.titulo && item.titulo.includes('¡Bienvenido al curso!')) return false;
    return true;
  });

  // Generar IDs y asignar orden
  const formattedItems = CONTENIDO_ITEMS.map((item, index) => ({
    id: crypto.randomUUID(),
    tipo: item.tipo,
    titulo: item.titulo,
    texto: item.texto,
    videoUrl: null,
    r2VideoId: null,
    r2Key: null,
    docFile: null,
    docNombre: null,
    docMime: null,
    docSize: null,
    docCategory: null,
    widthPct: item.widthPct || 100,
    rowId: crypto.randomUUID(),
    orden: index + 1
  }));

  // Re-ordenar items existentes después de los nuevos
  existingNonModuleItems.forEach((item, idx) => {
    item.orden = formattedItems.length + idx + 1;
  });

  course.contenido = formattedItems.concat(existingNonModuleItems);

  // Guardar archivo
  fs.writeFileSync(COURSES_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('✓ Curso actualizado con éxito en data/courses.json');
  console.log('  Total módulos registrados:', course.modulos.length);
  console.log('  Total lecciones/items cargados:', course.contenido.length);
}

seed();
