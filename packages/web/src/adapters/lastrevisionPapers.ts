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
};

export class LastRevisionPapersClient {
    private readonly apiBaseUrl: string;
    private readonly getBearerToken: () => string | null;

    constructor(opts: LastRevisionPapersClientOptions) {
        this.apiBaseUrl = opts.apiBaseUrl.replace(/\/+$/, '');
        this.getBearerToken = opts.getBearerToken;
    }

    private authHeaders(): Record<string, string> {
        const token = this.getBearerToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    async listMyPapers(): Promise<RemotePaper[]> {
        const res = await fetch(`${this.apiBaseUrl}/api/my/papers`, {
            headers: { ...this.authHeaders() },
        });
        if (!res.ok) throw new Error(`listMyPapers failed (${res.status})`);
        return await res.json();
    }

    async createPaper(input?: { title?: string; markdown?: string; isPublic?: boolean }): Promise<RemotePaper> {
        const res = await fetch(`${this.apiBaseUrl}/api/my/papers`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...this.authHeaders() },
            body: JSON.stringify(input ?? {}),
        });
        if (!res.ok) throw new Error(`createPaper failed (${res.status})`);
        return await res.json();
    }

    async getPaper(paperId: string): Promise<RemotePaper> {
        const res = await fetch(`${this.apiBaseUrl}/api/my/papers/${encodeURIComponent(paperId)}`, {
            headers: { ...this.authHeaders() },
        });
        if (!res.ok) throw new Error(`getPaper failed (${res.status})`);
        return await res.json();
    }

    async updatePaper(
        paperId: string,
        patch: { title?: string; markdown?: string; isPublic?: boolean }
    ): Promise<RemotePaper> {
        const res = await fetch(`${this.apiBaseUrl}/api/my/papers/${encodeURIComponent(paperId)}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json', ...this.authHeaders() },
            body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`updatePaper failed (${res.status})`);
        return await res.json();
    }

    async deletePaper(paperId: string): Promise<{ ok: true }> {
        const res = await fetch(`${this.apiBaseUrl}/api/my/papers/${encodeURIComponent(paperId)}`, {
            method: 'DELETE',
            headers: { ...this.authHeaders() },
        });
        if (!res.ok) throw new Error(`deletePaper failed (${res.status})`);
        return await res.json();
    }
}

