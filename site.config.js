/**
 * CONFIGURACIÓN DE RALL TURBO LASER
 * Modifica solamente este archivo para conectar las redes, las transmisiones y la agenda.
 * No coloques aquí claves, contraseñas, tokens ni información privada.
 */
window.RALL_CONFIG = {
  name: "RALL Turbo Laser",
  social: {
    // Ejemplo: "https://www.tiktok.com/@tuusuario"
    tiktok: "https://www.tiktok.com/@rallturbolaser07",
    facebook: "https://www.facebook.com/profile.php?id=61586975919776&sk=directory_links",
    youtube: "",
    instagram: "",
    // WhatsApp con indicativo de Colombia sin + ni espacios, ej. 573001234567
    whatsapp: ""
  },
  live: {
    // Cambia a true SOLO cuando tu equipo confirme que está transmitiendo.
    isLive: false,
    title: "La próxima descarga se está preparando",
    // ID de video en directo o grabación de YouTube, ej. "jfKfPfyJRdk"
    youtubeVideoId: "",
    // Enlace PUBLICO de video en Facebook (no el enlace a la página de Facebook).
    facebookVideoUrl: "",
    // Enlace de una PUBLICACIÓN de TikTok; los LIVE de TikTok se abren en TikTok.
    tiktokVideoUrl: ""
  },
  events: [
    // Ejemplo (quita //, pon datos verdaderos):
    // { date: "2026-12-15", time: "8:00 PM", title: "Noche de peñonazos", location: "Barranquilla", link: "https://..." }
  ]
  ,
  // Álbum y DJ: puedes cambiar los nombres y textos aquí, sin tocar HTML ni JS.
  // Las imágenes deben subirse primero a /assets y ser .webp con nombres sencillos.
  gallery: [
    { image: 'rall-sesion-01.webp', thumb: 'rall-sesion-01-thumb.webp', title: 'El RALL en la cabina', category: 'djs', alt: 'DJ frente a dos tornamesas bajo las luces y el logotipo de RALL Turbo Laser' },
    { image: 'rall-sesion-05.webp', thumb: 'rall-sesion-05-thumb.webp', title: 'El sonido nítido', category: 'pico', alt: 'El frontal luminoso del picó con la inscripción El RALL' },
    { image: 'rall-sesion-02.webp', thumb: 'rall-sesion-02-thumb.webp', title: 'Concentración absoluta', category: 'djs', alt: 'DJ con auriculares operando un equipo de sonido por la noche' },
    { image: 'rall-sesion-03.webp', thumb: 'rall-sesion-03-thumb.webp', title: 'Entre mezclas y color', category: 'djs', alt: 'DJ de pie detrás de las tornamesas RALL Turbo Laser con arte colorido al fondo' },
    { image: 'rall-sesion-04.webp', thumb: 'rall-sesion-04-thumb.webp', title: 'Vinilo en movimiento', category: 'djs', alt: 'Primer plano de un DJ manipulando el brazo de una tornamesa' },
    { image: 'rall-sesion-06.webp', thumb: 'rall-sesion-06-thumb.webp', title: 'Arte que retumba', category: 'pico', alt: 'Panel del RALL Turbo Laser con su ilustración tropical y discos de vinilo' },
    { image: 'rall-pico.webp', title: 'La máquina original', category: 'pico', alt: 'Torre del picó RALL Turbo Laser con arte musical de colores' },
    { image: 'rall-ambiente.webp', title: 'África tropical', category: 'cultura', alt: 'Escena ilustrada de ambiente tropical con el picó y un músico' },
    { image: 'rall-logo.webp', title: 'Orgullo RALL', category: 'cultura', alt: 'Logotipo de RALL Turbo Laser sobre fondo negro' }
  ],
  // Nombres de sesión provisionales: sustituye por los nombres artísticos confirmados.
  djs: [
    { photo: 'rall-sesion-01-thumb.webp', name: 'Sesión en cabina', subtitle: 'El ritmo comienza aquí', label: '01 / LA CABINA' },
    { photo: 'rall-sesion-02-thumb.webp', name: 'Bajo las luces', subtitle: 'Detrás de cada mezcla', label: '02 / BACKSTAGE' },
    { photo: 'rall-sesion-03-thumb.webp', name: 'Flow RALL', subtitle: 'La energía de la Costa', label: '03 / EL ESTILO' },
    { photo: 'rall-sesion-04-thumb.webp', name: 'Puro vinilo', subtitle: 'Pasión por las tornamesas', label: '04 / LOS SURCOS' }
  ]

};
