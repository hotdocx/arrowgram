declare module 'save-svg-as-png' {
    export interface SaveSVGOptions {
        scale?: number;
        backgroundColor?: string;
        left?: number;
        top?: number;
        width?: number;
        height?: number;
        encoderOptions?: number;
        excludeCss?: boolean;
    }
    export function saveSvgAsPng(el: Element, name: string, options?: SaveSVGOptions): Promise<void>;
    export function svgAsPngUri(el: Element, options?: SaveSVGOptions): Promise<string>;
}

declare module 'file-saver' {
    export function saveAs(data: Blob | string, filename?: string, options?: any): void;
}
