import { svgAsPngUri } from 'save-svg-as-png';
import { toBlob } from 'html-to-image';
// @ts-ignore
import katexCss from 'katex/dist/katex.min.css?inline';

const CDN_FONTS_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/";

function getFixedKatexCss(): string {
  return katexCss.replace(/url\((['"]?)(?:\.\/)?fonts\//g, (_match: string, quote: string) => {
    return `url(${quote}${CDN_FONTS_URL}`;
  });
}

export async function captureDiagramScreenshot(svgElement: SVGElement, filename: string): Promise<Blob> {
  const viewBoxToUse = svgElement.getAttribute('viewBox') || "0 0 1000 600";
  const parts = viewBoxToUse.split(' ').map(parseFloat);
  
  // Clone and inject fixed CSS
  const clonedSvg = svgElement.cloneNode(true) as SVGElement;
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = getFixedKatexCss();
  clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);

  // We must temporarily mount the clone for save-svg-as-png to work best?
  // Actually svgAsPngUri works on detached elements if we provide enough info, 
  // but save-svg-as-png usually prefers the element to be in DOM or at least valid.
  // However, the original function passed the live svgElement. 
  // Passing a clone might miss some computed styles if not careful, 
  // but here we are explicitly providing the critical KaTeX styles.
  
  // To avoid 404s from the *original* stylesheets that save-svg-as-png tries to read,
  // we can use the 'excludeCss' option if we trust our injected CSS is enough.
  // KaTeX diagrams rely almost entirely on KaTeX CSS.
  // But we also need the diagram's own styles (strokes, fills). 
  // Those are usually inline attributes or utility classes.
  
  const uri = await svgAsPngUri(clonedSvg, {
    backgroundColor: 'white',
    scale: 2,
    left: parts[0],
    top: parts[1],
    width: parts[2],
    height: parts[3],
    encoderOptions: 0.9,
    // EXCLUDE external CSS to stop it from fetching relative fonts from the page's stylesheets
    excludeCss: true 
  });

  // Convert URI to Blob
  const byteString = atob(uri.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: 'image/png' });
}

export async function capturePaperScreenshot(element: HTMLElement): Promise<Blob> {
    // For Paper, we also want to ensure fonts load. 
    // html-to-image allows embedding font CSS.
    
    const blob = await toBlob(element, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        fontEmbedCSS: getFixedKatexCss(), // Inject valid font paths
        // Filter out the problematic local font requests if possible?
        // html-to-image doesn't have a direct "exclude original CSS" but 'fontEmbedCSS' helps.
        // We can also try to suppress errors.
    });
    
    if (!blob) {
        throw new Error("Failed to capture screenshot");
    }
    
    return blob;
}
