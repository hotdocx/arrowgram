/// <reference types="vite/client" />

declare module 'pagedjs' {
    export class Previewer {
        preview(content: string, styles: string[], container: HTMLElement): Promise<any>;
    }
}
