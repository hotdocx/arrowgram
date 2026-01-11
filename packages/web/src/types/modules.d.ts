declare module 'save-svg-as-png' {
    export interface SaveSVGOptions {
        scale?: number;
        backgroundColor?: string;
        left?: number;
        top?: number;
        width?: number;
        height?: number;
    }
    export function saveSvgAsPng(el: Element, name: string, options?: SaveSVGOptions): Promise<void>;
}

declare module 'file-saver' {
    export function saveAs(data: Blob | string, filename?: string, options?: any): void;
}
