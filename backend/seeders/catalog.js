// Referencias consultadas el 20/10/2026. La fecha indica revisión editorial,
// no fecha de publicación de las páginas de origen. No se copian artículos.
export const institutions = [{ name: 'Universidad Nacional de Formosa (UNaF)', sourceUrl: 'https://www.unf.edu.ar/' }];
export const categories = [
  { name: 'Lugares útiles', slug: 'lugares-utiles', description: 'Puntos de consulta y servicios para tus primeros días.' },
  { name: 'Movilidad', slug: 'movilidad', description: 'Información para preparar tus desplazamientos por Formosa.' },
  { name: 'Vida estudiantil', slug: 'vida-estudiantil', description: 'Herramientas y referencias de tu vida académica.' },
  { name: 'Cultura y costumbres', slug: 'cultura-costumbres', description: 'Un espacio para conocer la vida cotidiana de la ciudad.' },
  { name: 'Recomendaciones', slug: 'recomendaciones', description: 'Orientaciones prácticas, siempre con su origen identificado.' },
];
export const contents = [
  { slug: 'portal-unaf', title: 'Tu punto de partida en la UNaF', categorySlug: 'vida-estudiantil', institutional: true,
    summary: 'Encontrá la web institucional de la Universidad Nacional de Formosa.',
    body: 'La Universidad Nacional de Formosa cuenta con un portal institucional con noticias y enlaces académicos. Si vas a estudiar allí, utilizá esta referencia para comenzar a consultar información de la universidad.\n\nLos requisitos y las fechas de cada trámite deben confirmarse en la publicación correspondiente o con tu unidad académica. Esta ficha no reemplaza los avisos de la institución.',
    sourceLabel: 'Universidad Nacional de Formosa — portal institucional', sourceUrl: 'https://www.unf.edu.ar/' },
  { slug: 'siu-guarani', title: 'Conocé el acceso a SIU Guaraní', categorySlug: 'vida-estudiantil', institutional: true,
    summary: 'Una referencia para acceder a la autogestión académica de la UNaF.',
    body: 'El acceso de SIU Guaraní de la UNaF informa que el sistema permite inscribirse a materias y exámenes, consultar el plan de estudios y la historia académica, y actualizar datos personales.\n\nAccedé desde el enlace oficial. Forbook no solicita ni almacena tus credenciales de SIU Guaraní. Para habilitar el acceso o resolver problemas con tu cuenta, consultá a la universidad.',
    sourceLabel: 'UNaF — SIU Guaraní', sourceUrl: 'https://guarani.unf.edu.ar/autogestion/acceso?auth=form' },
  { slug: 'unaf-virtual', title: 'UNaF Virtual: una referencia académica', categorySlug: 'recomendaciones', institutional: true,
    summary: 'Consultá el espacio de educación virtual de la universidad.',
    body: 'UNaF Virtual se presenta como un espacio de la Universidad Nacional de Formosa para el intercambio y la comunicación de la comunidad universitaria.\n\nRevisá la información de tu carrera para conocer qué entornos utiliza. La existencia de este portal no significa que todas las carreras se cursen a distancia.',
    sourceLabel: 'Universidad Nacional de Formosa — UNaF Virtual', sourceUrl: 'https://sied.unf.edu.ar/' },
  { slug: 'portal-municipal', title: 'Consultá el portal municipal', categorySlug: 'lugares-utiles', institutional: false,
    summary: 'Una puerta de entrada a información y trámites de la ciudad de Formosa.',
    body: 'El portal municipal de Formosa ofrece una sección de trámites. Podés consultarlo como punto inicial para identificar el área municipal relacionada con una gestión.\n\nAntes de trasladarte, confirmá en la fuente los requisitos, el lugar y el horario vigentes. Esta ficha no afirma horarios de atención ni requisitos específicos.',
    sourceLabel: 'Municipalidad de Formosa — portal web', sourceUrl: 'https://www.formosatuciudad.gob.ar/index.php' },
];
