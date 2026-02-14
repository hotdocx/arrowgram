import { svgAsPngUri } from 'save-svg-as-png';
import { toBlob } from 'html-to-image';
// @ts-ignore
import katexCss from 'katex/dist/katex.min.css?inline';
import type { PaperRenderTemplate } from './projectRepository';

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findSnapshotTarget(
  root: HTMLElement,
  renderTemplate: PaperRenderTemplate,
  timeoutMs = 2500
): Promise<HTMLElement> {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    if (renderTemplate === "paged") {
      const firstPage = root.querySelector<HTMLElement>(".pagedjs_page");
      if (firstPage) return firstPage;
    } else {
      const revealRoot = root.querySelector<HTMLElement>(".reveal");
      const firstSlide = revealRoot?.querySelector<HTMLElement>(".slides > section");
      if (revealRoot && firstSlide) return revealRoot;
    }
    await sleep(50);
  }

  throw new Error("Snapshot target not ready");
}

async function captureElementToBlob(element: HTMLElement): Promise<Blob> {
  const blob = await toBlob(element, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    fontEmbedCSS: getFixedKatexCss(), // Inject valid font paths
  });

  if (!blob) {
    throw new Error("Failed to capture screenshot");
  }

  return blob;
}

function createRevealFirstSlideSnapshot(
  revealRoot: HTMLElement
): { node: HTMLElement; cleanup: () => void } {
  const firstSlide = revealRoot.querySelector<HTMLElement>(".slides > section");
  if (!firstSlide) throw new Error("Snapshot target not ready");

  const width = Math.max(1, Math.round(revealRoot.getBoundingClientRect().width || 960));
  const height = Math.max(1, Math.round(revealRoot.getBoundingClientRect().height || 700));

  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "-100000px";
  mount.style.top = "0";
  mount.style.width = `${width}px`;
  mount.style.height = `${height}px`;
  mount.style.opacity = "0";
  mount.style.pointerEvents = "none";
  mount.style.overflow = "hidden";

  const scopedRoot = revealRoot.parentElement;
  const scopedClone = (scopedRoot?.cloneNode(false) as HTMLElement | undefined) ?? document.createElement("div");
  scopedClone.style.width = `${width}px`;
  scopedClone.style.height = `${height}px`;
  scopedClone.style.overflow = "hidden";

  const revealClone = revealRoot.cloneNode(false) as HTMLElement;
  revealClone.style.width = "100%";
  revealClone.style.height = "100%";
  revealClone.style.minHeight = "0";
  revealClone.style.overflow = "hidden";

  const slidesClone = document.createElement("div");
  slidesClone.className = "slides";
  slidesClone.style.width = "100%";
  slidesClone.style.height = "100%";

  const firstSlideClone = firstSlide.cloneNode(true) as HTMLElement;
  firstSlideClone.classList.add("present");
  firstSlideClone.classList.remove("past", "future");
  firstSlideClone.removeAttribute("hidden");
  firstSlideClone.removeAttribute("aria-hidden");
  firstSlideClone.style.display = "block";
  firstSlideClone.style.visibility = "visible";
  firstSlideClone.style.opacity = "1";
  firstSlideClone.style.transform = "none";
  firstSlideClone.style.position = "absolute";
  firstSlideClone.style.inset = "0";
  firstSlideClone.style.width = "100%";
  firstSlideClone.style.height = "100%";

  slidesClone.appendChild(firstSlideClone);
  revealClone.appendChild(slidesClone);
  scopedClone.appendChild(revealClone);
  mount.appendChild(scopedClone);
  document.body.appendChild(mount);

  return {
    node: scopedClone,
    cleanup: () => {
      mount.remove();
    },
  };
}

export async function capturePaperScreenshot(
  root: HTMLElement,
  renderTemplate: PaperRenderTemplate
): Promise<Blob> {
  const target = await findSnapshotTarget(root, renderTemplate);
  if (renderTemplate === "reveal") {
    const snapshot = createRevealFirstSlideSnapshot(target);
    try {
      return await captureElementToBlob(snapshot.node);
    } finally {
      snapshot.cleanup();
    }
  }

  return await captureElementToBlob(target);
}
