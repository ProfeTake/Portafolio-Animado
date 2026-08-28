# Portafolio — Francisco Figueroa

Sitio personal de una sola página. Ingeniero en Informática, Rancagua, Chile.

**Sin framework, sin dependencias y sin paso de build.** Se clona, se abre
`index.html` en el navegador y funciona.

## Cómo correrlo

```bash
git clone <este-repo>
```

Y abrir `index.html`. No hay `npm install` porque no hay nada que instalar.

Para servirlo por HTTP (recomendado, para que las rutas se comporten igual
que en producción):

```bash
npx serve .
```

## Estructura

| Archivo | Qué contiene |
|---|---|
| `index.html` | Marcado completo. El contenido es estático: se lee sin JavaScript. |
| `styles.css` | Paleta en variables CSS, layout y 21 animaciones `@keyframes`. |
| `main.js` | Los efectos. Organizado en configuración → utilidades → efectos → arranque. |

## Decisiones técnicas

**El JavaScript no decide cómo se ve nada.** Los colores, tamaños y
transiciones viven en `styles.css`. `main.js` solo decide *cuándo* pasan las
cosas: añade la clase `.on`, anima texto y calcula el desplazamiento del
parallax. Cambiar la paleta es tocar un archivo, no dos.

**Los efectos se disparan con `IntersectionObserver`,** no con un listener de
`scroll`. Así no se pierde nada al entrar por una `#ancla`, al recargar con la
página ya desplazada ni al hacer zoom — y no cuesta un handler por elemento.

**El parallax mide una sola vez.** Los elementos y sus factores se calculan al
arrancar; el bucle de scroll solo escribe transforms, limitado con
`requestAnimationFrame` para no calcular fotogramas que nadie llega a ver.

**El contenido no depende de JavaScript.** Las tarjetas y la línea de tiempo
están en el HTML, no generadas por JS. Los contadores traen su valor final
escrito. Sin JS se pierden las animaciones, no la información.

**Accesibilidad:** un solo `<h1>`, la línea de tiempo es un `<ol>`, las capas
decorativas y los textos duplicados del marquee van con `aria-hidden`, y el
CSS respeta `prefers-reduced-motion`.

## Créditos

Dirección de diseño, estructura y contenido: Francisco Figueroa.
Maquetación y efectos implementados con apoyo de IA — el mismo criterio de
transparencia que declara la sección de proyectos del sitio.

Tipografías: [Anton](https://fonts.google.com/specimen/Anton),
[Archivo Black](https://fonts.google.com/specimen/Archivo+Black) y
[Space Mono](https://fonts.google.com/specimen/Space+Mono) (Google Fonts).

## Contacto

fco.figueroa97@gmail.com · Rancagua, O'Higgins · Remoto CL
