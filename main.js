/* ==========================================================================
   FRANCISCO FIGUEROA — portafolio
   Efectos de scroll, contadores, glitch tipográfico y parallax.
   Portado desde el <helmet> de "Portafolio Francisco Figueroa.dc.html".

   CÓMO ESTÁ ORGANIZADO ESTE ARCHIVO
     1. Configuración .... todos los números y textos ajustables, juntos
     2. Utilidades ....... helpers cortos que usan varios efectos
     3. Efectos .......... un bloque por efecto, independiente del resto
     4. Arranque ......... el único lugar donde se conecta todo al DOM

   IDEA CLAVE: el JS nunca decide *cómo se ve* algo, solo *cuándo pasa*.
   Los colores, tamaños y transiciones viven en styles.css. Aquí solo se
   añaden clases (.on), se anima texto y se calcula el desplazamiento del
   parallax. Por eso cambiar la paleta es tocar un archivo, no dos.

   El marcado se conecta con este archivo mediante atributos data-*:
     [data-reveal]  aparece al entrar en pantalla     -> revelar()
     [data-anim]    variante con animación con nombre -> (solo CSS)
     [data-count]   número que cuenta hacia arriba    -> contar()
     [data-typer]   titular "HABLEMOS." del footer    -> tipear()
     [data-px]      capa con parallax vertical        -> moverParallax()
     [data-pxbg]    fondo con parallax                -> moverParallax()
     [data-fig]     apellido FIGUEROA (dispara morph) -> activarMorphDelNombre()
     [data-fran]    las 3 capas de FRANCISCO          -> morphNombre()
     [data-glyph]   símbolo gigante del hero          -> rotarGlifo()
   ========================================================================== */

(() => {
  'use strict';

  /* =========================================================================
     1. CONFIGURACIÓN
     Todo lo ajustable en un solo sitio: si un efecto va muy rápido o muy
     lento, se cambia aquí y no hay que buscar el número dentro de la lógica.
     ====================================================================== */

  // Alfabeto del "ruido": los símbolos que aparecen cuando un texto se rompe.
  const CARACTERES_RUIDO = '#@%&*!?$/\u00a7\u00b1<>~^';

  const REVELADO = {
    // Cada elemento entra 70 ms después del anterior, en grupos de 4, para
    // que una grilla de tarjetas aparezca en cascada y no todas de golpe.
    RETARDO_ESCALONADO: 70,
    ELEMENTOS_POR_GRUPO: 4,
    // Margen inferior negativo = "espera a que suba un poco más antes de
    // dispararlo". Equivale al 92 % / 95 % de la altura de pantalla.
    MARGEN_REVELADO: '0px 0px -8% 0px',
    MARGEN_DISPARO: '0px 0px -5% 0px',
  };

  const CONTADOR = { DURACION: 1400 };

  const TITULAR = {
    RUIDO_INTERVALO: 3000,   // cuánto dura el texto "roto"
    RUIDO_FOTOGRAMA: 70,     // cada cuánto se recalculan los símbolos
    RUIDO_DENSIDAD: 0.45,    // proporción de letras sustituidas por ruido
    PAUSA_TRAS_RUIDO: 3000,  // texto legible en pantalla antes de tipear
    TIPEO_TOTAL: 4000,       // tiempo total de escritura de la frase larga
    PAUSA_TRAS_TIPEO: 1400,  // frase completa en pantalla antes de borrarla
    PAUSA_ANTES_DE_REPETIR: 400,
    TAMANO_MINIMO: 18,       // px: suelo del autoajuste, para no desaparecer
    MARGEN_SEGURIDAD: 0.97,  // 3 % de aire al calcular el tamaño que cabe
  };

  const MORPH = {
    FOTOGRAMAS: 22,          // 22 x 34 ms ≈ 750 ms de transición
    FOTOGRAMA_MS: 34,
    VENTANA_RUIDO: 0.45,     // cuánto antes de fijarse empieza a temblar cada letra
    DENSIDAD_RUIDO: 0.7,
    NOMBRE: 'FRANCISCO',
    APODO: 'TAKE',
  };

  // El mismo corte que la media query del menú en styles.css: si cambia
  // uno, cambia el otro.
  const MENU = { ANCHO_MAXIMO: 760 };

  const GLIFO = {
    SIMBOLOS: ['\u2620', '\\m/', '</>', '{ ; }', '&&', 'SQL', '#!', '\u269b'],
    VARIABLES_COLOR: ['--mag', '--cya', '--yel'],  // se leen de styles.css
    ESPERA_INICIAL: 2200,
    PERIODO: 2600,           // cada cuánto cambia de símbolo
    FOTOGRAMAS_RUIDO: 8,
    RUIDO_MS: 55,
    OPACIDAD_RUIDO: '0.34',
    OPACIDAD_REPOSO: '0.26',
  };

  /* =========================================================================
     2. UTILIDADES
     ====================================================================== */

  const uno = (selector) => document.querySelector(selector);
  const todos = (selector) => [...document.querySelectorAll(selector)];

  /** Un símbolo cualquiera del alfabeto de ruido. */
  const caracterAlAzar = () =>
    CARACTERES_RUIDO[Math.floor(Math.random() * CARACTERES_RUIDO.length)];

  /** Promesa que se resuelve en `ms`. Permite escribir secuencias de
   *  animación con await, en vez de anidar setTimeout dentro de setTimeout. */
  const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

  /** Lee un color desde las variables CSS de :root, para no repetir los
   *  hex aquí. La paleta tiene un único dueño: styles.css. */
  const colorDeCSS = (variable) =>
    getComputedStyle(document.documentElement).getPropertyValue(variable).trim();

  /**
   * Ejecuta `accion(elemento)` la primera vez que cada elemento del selector
   * entra en pantalla, y deja de vigilarlo (los efectos son de una sola vez).
   *
   * Por qué IntersectionObserver y no el evento scroll: el original sondeaba
   * el DOM cada 250 ms porque el lienzo de diseño se re-renderizaba solo.
   * Aquí el marcado es estático, y el observer no se pierde nada — ni al
   * entrar por una #ancla, ni al recargar con la página ya desplazada, ni
   * al hacer zoom. Y no cuesta un handler de scroll por elemento.
   */
  function alSerVisible(selector, margen, accion) {
    const elementos = todos(selector);

    // Navegador antiguo sin soporte: se muestra todo de inmediato. Peor la
    // animación que el contenido invisible.
    if (!('IntersectionObserver' in window)) {
      elementos.forEach(accion);
      return;
    }

    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        observador.unobserve(entrada.target);
        accion(entrada.target);
      }
    }, { rootMargin: margen, threshold: 0 });

    elementos.forEach((el) => observador.observe(el));
  }

  /* =========================================================================
     3. EFECTOS
     ====================================================================== */

  /* --- 3.1 Revelado al entrar en pantalla -------------------------------
     El CSS deja los [data-reveal] en opacity:0 y recortados; añadir .on
     los devuelve a su sitio. Todo el movimiento es CSS: aquí solo se pone
     la clase y se reparte el retardo de la cascada.                      */

  /**
   * Reparte el retardo escalonado ANTES de que nada sea visible.
   * El índice se toma sobre el documento completo, así que cuatro tarjetas
   * hermanas reciben 0, 70, 140 y 210 ms y entran en abanico.
   * Los [data-anim] se saltan: llevan su propio animation-delay en el HTML.
   */
  function repartirRetardos() {
    todos('[data-reveal]').forEach((el, i) => {
      if (el.hasAttribute('data-anim')) return;
      const retardo = (i % REVELADO.ELEMENTOS_POR_GRUPO) * REVELADO.RETARDO_ESCALONADO;
      el.style.transitionDelay = `${retardo}ms`;
    });
  }

  /** Dispara la transición de entrada de un elemento. */
  const revelar = (el) => el.classList.add('on');

  /* --- 3.2 Contadores ---------------------------------------------------
     Los "10 años", "45 alumnos", "5+ proyectos" del manifiesto.          */

  /**
   * Cuenta de 0 hasta data-count con desaceleración (ease-out cúbico: se
   * lanza rápido y frena al final).
   *
   * El sufijo de data-suffix ("+") solo se pinta al terminar, para que
   * durante la cuenta no se lea un "3+" que aún no es el número real.
   * El HTML ya trae el valor final escrito, así que sin JS igual se lee.
   */
  function contar(el) {
    const objetivo = parseInt(el.getAttribute('data-count'), 10);
    const sufijo = el.getAttribute('data-suffix') || '';
    const inicio = performance.now();

    (function fotograma(ahora) {
      const avance = Math.min(1, ((ahora || performance.now()) - inicio) / CONTADOR.DURACION);
      const suavizado = 1 - Math.pow(1 - avance, 3);
      const terminado = avance >= 1;

      el.textContent = terminado
        ? objetivo + sufijo
        : String(Math.round(objetivo * suavizado));

      if (!terminado) requestAnimationFrame(fotograma);
    })();
  }

  /* --- 3.3 Titular "HABLEMOS." del footer -------------------------------
     Ciclo infinito de cuatro tiempos:
       1. el texto base tiembla convertido en símbolos      (3 s)
       2. se estabiliza y se queda legible                  (3 s)
       3. se escribe letra a letra la frase larga alterna   (4 s)
       4. pausa breve y vuelta a empezar                  (0,4 s)         */

  async function tipear(el) {
    const base = el.dataset.typer || 'HABLEMOS.';
    const alterna = el.dataset.typerBeg || 'H\u00c1BLAME PORFA';

    /**
     * Reduce el tamaño de letra para que `texto` quepa en una sola línea.
     *
     * Detalle importante: mide con un Range en vez de con el ancho del
     * elemento. El h2 es un bloque y siempre ocupa el 100 % del contenedor,
     * así que su ancho no dice nada; el Range mide lo que ocupan las letras.
     * El tamaño original se guarda en data-basefs la primera vez, porque
     * después de la primera reducción ya no se puede leer del CSS.
     */
    function ajustarTamano(texto) {
      const contenedor = el.parentNode;
      const disponible = contenedor ? contenedor.clientWidth : window.innerWidth;

      if (!el.dataset.basefs) {
        el.dataset.basefs = parseFloat(getComputedStyle(el).fontSize) || 90;
      }
      const tamanoBase = parseFloat(el.dataset.basefs);

      // Se mide con el texto puesto y luego se restaura lo que había.
      const textoPrevio = el.textContent;
      el.style.fontSize = `${tamanoBase}px`;
      el.textContent = texto;

      let ancho;
      try {
        const rango = document.createRange();
        rango.selectNodeContents(el);
        ancho = rango.getBoundingClientRect().width;
      } catch {
        ancho = el.scrollWidth;
      }

      el.textContent = textoPrevio;

      if (ancho > disponible && ancho > 0) {
        const ajustado = tamanoBase * (disponible / ancho) * TITULAR.MARGEN_SEGURIDAD;
        el.style.fontSize = `${Math.max(TITULAR.TAMANO_MINIMO, ajustado)}px`;
      }
    }

    /** Paso 1: rompe el texto en símbolos y lo vuelve a armar. */
    async function romper() {
      ajustarTamano(base);

      const ruido = setInterval(() => {
        el.textContent = [...base]
          .map((c) => (c === ' ' || Math.random() >= TITULAR.RUIDO_DENSIDAD ? c : caracterAlAzar()))
          .join('');
      }, TITULAR.RUIDO_FOTOGRAMA);

      await esperar(TITULAR.RUIDO_INTERVALO);
      clearInterval(ruido);
      el.textContent = base;
    }

    /** Paso 3: escribe la frase alterna con un símbolo haciendo de cursor. */
    async function escribir() {
      ajustarTamano(alterna);
      el.textContent = '';

      const porLetra = TITULAR.TIPEO_TOTAL / alterna.length;
      for (let i = 1; i <= alterna.length; i++) {
        const ultima = i === alterna.length;
        el.textContent = alterna.slice(0, i) + (ultima ? '' : caracterAlAzar());
        await esperar(ultima ? TITULAR.PAUSA_TRAS_TIPEO : porLetra);
      }
    }

    // El bucle no termina nunca: es la animación de reposo del footer.
    for (;;) {
      await romper();
      await esperar(TITULAR.PAUSA_TRAS_RUIDO);
      await escribir();
      await esperar(TITULAR.PAUSA_ANTES_DE_REPETIR);
    }
  }

  /* --- 3.4 Parallax -----------------------------------------------------
     Las capas decorativas del hero y la grilla de la sección de proyectos
     se mueven a distinta velocidad que la página.                        */

  /**
   * Prepara el parallax: mide una sola vez qué elementos participan y con
   * qué factor, y luego solo actualiza transforms en cada fotograma.
   *
   * El factor de data-px es un multiplicador del scroll: 0.22 baja a un
   * quinto de la velocidad de la página, y en negativo sube en contra.
   *
   * Se limita con requestAnimationFrame porque el evento scroll dispara
   * muchas más veces de las que el navegador puede pintar; sin esto se
   * calcularían transforms que nadie llega a ver.
   */
  function activarParallax() {
    const capas = todos('[data-px]').map((el) => ({
      el,
      factor: parseFloat(el.dataset.px) || 0,
      giro: parseFloat(el.dataset.pxRot) || 0,
    }));

    const fondos = todos('[data-pxbg]').map((el) => ({
      el,
      factor: parseFloat(el.dataset.pxbg) || 0,
    }));

    if (!capas.length && !fondos.length) return;

    let pendiente = false;

    function moverParallax() {
      if (pendiente) return;
      pendiente = true;

      requestAnimationFrame(() => {
        pendiente = false;
        const y = window.scrollY || window.pageYOffset || 0;

        for (const { el, factor, giro } of capas) {
          const desplazamiento = `translateY(${y * factor}px)`;
          el.style.transform = giro ? `${desplazamiento} rotate(${y * giro}deg)` : desplazamiento;
        }

        for (const { el, factor } of fondos) {
          el.style.backgroundPosition = `0 ${y * factor}px`;
        }
      });
    }

    window.addEventListener('scroll', moverParallax, { passive: true });
    moverParallax();  // posición correcta si se recarga a media página
  }

  /* --- 3.5 FRANCISCO <-> TAKE -------------------------------------------
     Al pasar el ratón por FIGUEROA, el nombre de arriba se transforma en
     el apodo. El cambio de color lo hace .hero__figueroa:hover en el CSS;
     aquí solo se anima el texto.                                         */

  let morphEnCurso = null;

  /**
   * Transforma el texto de las tres capas de FRANCISCO hasta `destino`.
   *
   * Cada letra se fija en un momento distinto: la posición i se estabiliza
   * cuando el avance llega a (i+1)/total, así que el nombre se resuelve de
   * izquierda a derecha. Justo antes de fijarse, cada letra pasa por una
   * ventana en la que tiembla entre ruido y su valor final.
   *
   * Las tres capas (cian, magenta y la principal) reciben el mismo texto
   * en cada fotograma: el desfase de color lo dan las animaciones CSS.
   */
  function morphNombre(destino) {
    const capas = todos('[data-fran]');
    if (!capas.length) return;

    // Un hover rápido de entrada y salida no debe dejar dos morphs peleando.
    if (morphEnCurso) clearInterval(morphEnCurso);

    const origen = capas[0].textContent;
    const largo = Math.max(origen.length, destino.length);
    let fotograma = 0;

    morphEnCurso = setInterval(() => {
      fotograma++;
      const avance = fotograma / MORPH.FOTOGRAMAS;

      let texto = '';
      for (let i = 0; i < largo; i++) {
        const letraFinal = destino[i] || '';
        const letraOriginal = origen[i] || '';
        const seFijaEn = (i + 1) / largo;

        if (avance >= seFijaEn) {
          texto += letraFinal;                                   // ya llegó
        } else if (avance > seFijaEn - MORPH.VENTANA_RUIDO) {
          texto += Math.random() < MORPH.DENSIDAD_RUIDO           // temblando
            ? caracterAlAzar()
            : (letraFinal || letraOriginal);
        } else {
          texto += letraOriginal || caracterAlAzar();             // aún sin tocar
        }
      }

      capas.forEach((capa) => { capa.textContent = texto; });

      if (fotograma >= MORPH.FOTOGRAMAS) {
        clearInterval(morphEnCurso);
        morphEnCurso = null;
        capas.forEach((capa) => { capa.textContent = destino; });  // sin residuos
      }
    }, MORPH.FOTOGRAMA_MS);
  }

  /** Conecta el hover de FIGUEROA con el morph del nombre. */
  function activarMorphDelNombre() {
    const apellido = uno('[data-fig]');
    if (!apellido) return;

    apellido.addEventListener('mouseenter', () => morphNombre(MORPH.APODO));
    apellido.addEventListener('mouseleave', () => morphNombre(MORPH.NOMBRE));
  }

  /* --- 3.6 Glifo del hero -----------------------------------------------
     El símbolo gigante detrás del nombre va rotando entre iconos de dev.  */

  /**
   * Cambia el símbolo cada 2,6 s: primero unos fotogramas de ruido (con la
   * opacidad algo más alta, como un parpadeo) y luego el símbolo nuevo con
   * el siguiente color de la paleta.
   *
   * Símbolos y colores son listas de largo distinto (8 y 3), así que las
   * combinaciones no se repiten en el mismo orden cada vuelta.
   */
  async function rotarGlifo() {
    const glifo = uno('[data-glyph]');
    if (!glifo) return;

    const colores = GLIFO.VARIABLES_COLOR.map(colorDeCSS);
    const duracionRuido = GLIFO.FOTOGRAMAS_RUIDO * GLIFO.RUIDO_MS;
    let i = 0;

    await esperar(GLIFO.ESPERA_INICIAL);

    for (;;) {
      i++;

      for (let n = 1; n <= GLIFO.FOTOGRAMAS_RUIDO; n++) {
        // A partir de la mitad son tres símbolos en vez de dos: el ruido
        // "crece" antes de resolverse.
        const tercero = n > GLIFO.FOTOGRAMAS_RUIDO / 2 ? caracterAlAzar() : '';
        glifo.textContent = caracterAlAzar() + caracterAlAzar() + tercero;
        glifo.style.opacity = GLIFO.OPACIDAD_RUIDO;
        await esperar(GLIFO.RUIDO_MS);
      }

      glifo.textContent = GLIFO.SIMBOLOS[i % GLIFO.SIMBOLOS.length];
      glifo.style.color = colores[i % colores.length];
      glifo.style.opacity = GLIFO.OPACIDAD_REPOSO;

      await esperar(GLIFO.PERIODO - duracionRuido);
    }
  }

  /* --- 3.7 Menú móvil ---------------------------------------------------
     Bajo 760px el nav es una cortina a pantalla completa. Fiel a la idea
     del archivo, aquí solo se enciende y se apaga la clase .is-open: la
     cortina, la cascada de los enlaces y la X del botón son CSS.         */

  function activarMenuMovil() {
    const cabecera = uno('.site-header');
    const boton = uno('.nav__toggle');
    const menu = uno('.nav');
    if (!cabecera || !boton || !menu) return;

    const esMovil = window.matchMedia(`(max-width: ${MENU.ANCHO_MAXIMO}px)`);

    /** Único sitio donde cambia el estado del menú. */
    const mostrar = (abierto) => {
      cabecera.classList.toggle('is-open', abierto);
      // El bloqueo del scroll vive en <html>, junto a .js-on.
      document.documentElement.classList.toggle('menu-abierto', abierto);
      boton.setAttribute('aria-expanded', String(abierto));
      boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    };

    boton.addEventListener('click', () => {
      mostrar(!cabecera.classList.contains('is-open'));
    });

    // Tocar un enlace ya lleva a su sección: dejar la cortina encima sobra.
    menu.addEventListener('click', (evento) => {
      if (evento.target.closest('.nav__link')) mostrar(false);
    });

    document.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Escape') return;
      if (!cabecera.classList.contains('is-open')) return;
      mostrar(false);
      boton.focus();
    });

    // Si la ventana crece hasta escritorio la cortina deja de existir; hay
    // que limpiar el estado o el scroll se quedaría bloqueado sin menú.
    esMovil.addEventListener('change', (evento) => {
      if (!evento.matches) mostrar(false);
    });
  }

  /* =========================================================================
     4. ARRANQUE
     El único punto donde los efectos se enganchan al documento. Si algo no
     se dispara, se empieza a mirar por aquí.

     Nota: la clase .js-on la pone un <script> en el <head> de index.html,
     no este archivo. Tiene que aplicarse antes del primer pintado, o los
     [data-reveal] se verían un instante antes de esconderse.
     ====================================================================== */

  repartirRetardos();

  alSerVisible('[data-reveal]', REVELADO.MARGEN_REVELADO, revelar);
  alSerVisible('[data-count]', REVELADO.MARGEN_DISPARO, contar);
  alSerVisible('[data-typer]', REVELADO.MARGEN_DISPARO, tipear);

  activarParallax();
  activarMorphDelNombre();
  activarMenuMovil();
  rotarGlifo();
})();
