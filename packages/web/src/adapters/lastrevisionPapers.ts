export type RemotePaper = {
    id: string;
    ownerUserId: string;
    title: string;
    markdown: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
};

export type LastRevisionPapersClientOptions = {
    apiBaseUrl: string;
    getBearerToken: () => string | null;
    onUnauthorized?: () => void;
};

export class LastRevisionPapersClient {
    private readonly apiBaseUrl: string;
    private readonly getBearerToken: () => string | null;
    private readonly onUnauthorized?: () => void;

    constructor(opts: LastRevisionPapersClientOptions) {
        this.apiBaseUrl = opts.apiBaseUrl.replace(/\/+$/, '');
        this.getBearerToken = opts.getBearerToken;
        this.onUnauthorized = opts.onUnauthorized;
    }

    private toApiError(message: string, status: number) {
        const err = new Error(`${message} (${status})`) as Error & { status?: number };
        err.status = status;
        return err;
    }

    private async request(path: string, init?: RequestInit): Promise<Response> {
        const headers = new Headers(init?.headers);
        const token = this.getBearerToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
        const res = await fetch(`${this.apiBaseUrl}${path}`, {
            ...init,
            headers,
            credentials: "omit",
        });
        if (res.status === 401) this.onUnauthorized?.();
        return res;
    }

    async listMyPapers(): Promise<RemotePaper[]> {
        const res = await this.request('/api/my/papers');
        if (!res.ok) throw this.toApiError('listMyPapers failed', res.status);
        return await res.json();
    }

    async createPaper(input?: { title?: string; markdown?: string; isPublic?: boolean }): Promise<RemotePaper> {
        const res = await this.request('/api/my/papers', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(input ?? {}),
        });
        if (!res.ok) throw this.toApiError('createPaper failed', res.status);
        return await res.json();
    }

    async getPaper(paperId: string): Promise<RemotePaper> {
        const res = await this.request(`/api/my/papers/${encodeURIComponent(paperId)}`);
        if (!res.ok) throw this.toApiError('getPaper failed', res.status);
        return await res.json();
    }

    async updatePaper(
        paperId: string,
        patch: { title?: string; markdown?: string; isPublic?: boolean }
    ): Promise<RemotePaper> {
        const res = await this.request(`/api/my/papers/${encodeURIComponent(paperId)}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(patch),
        });
        if (!res.ok) throw this.toApiError('updatePaper failed', res.status);
        return await res.json();
    }

    async deletePaper(paperId: string): Promise<{ ok: true }> {
        const res = await this.request(`/api/my/papers/${encodeURIComponent(paperId)}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw this.toApiError('deletePaper failed', res.status);
        return await res.json();
    }
}
