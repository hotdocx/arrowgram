import { createLastRevisionProjectRepository } from "../adapters/lastrevisionProjectRepository";
import { createLastRevisionAttachmentRepository } from "../adapters/lastrevisionAttachmentRepository";

describe("LastRevision adapter auth transport", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses bearer header and credentials=omit for project API calls", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "d1",
          title: "Untitled",
          spec: "{}",
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    (global as any).fetch = fetchMock;

    const repo = createLastRevisionProjectRepository({
      apiBaseUrl: "http://localhost:3000",
      getToken: () => "token-123",
    });

    await repo.create({
      type: "diagram",
      title: "Test",
      content: "{}",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/api/my/diagrams");
    expect(init.credentials).toBe("omit");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("calls onUnauthorized when API returns 401", async () => {
    const onUnauthorized = jest.fn();
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );
    (global as any).fetch = fetchMock;

    const repo = createLastRevisionProjectRepository({
      apiBaseUrl: "http://localhost:3000",
      getToken: () => "expired-token",
      onUnauthorized,
    });

    await expect(
      repo.create({
        type: "diagram",
        title: "Test",
        content: "{}",
      })
    ).rejects.toThrow("401");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("uses credentials=omit and calls onUnauthorized for attachment API", async () => {
    const onUnauthorized = jest.fn();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "a1",
              projectType: "paper",
              projectId: "p1",
              fileName: "note.md",
              contentType: "text/markdown",
              sizeBytes: 100,
              createdAt: new Date().toISOString(),
              storageKey: "attachments/a1",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    (global as any).fetch = fetchMock;

    const repo = createLastRevisionAttachmentRepository({
      apiBaseUrl: "http://localhost:3000",
      getToken: () => "token-123",
      onUnauthorized,
    });

    await expect(repo.list("paper:p1")).rejects.toThrow("401");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    await repo.list("paper:p1");
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.credentials).toBe("omit");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });
});
