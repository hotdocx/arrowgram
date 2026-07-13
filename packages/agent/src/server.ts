import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, promises as fs, watch, type FSWatcher } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import react from "@vitejs/plugin-react";
import {
  buildStaticWorkspace,
  createProject,
  diffWorkspace,
  listProjects,
  readManifest,
  readProject,
  removeProject,
  snapshotWorkspace,
  updateProject,
  validateWorkspace,
  workspaceStatus,
} from "./workspace.js";

const requireFromHere = createRequire(import.meta.url);

function arrowgramWebDistPath(fileName: string) {
  const agentRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const candidates = [
    path.resolve(agentRoot, "../web/dist", fileName),
    path.resolve(agentRoot, "node_modules/@hotdocx/arrowgram-web/dist", fileName),
    path.resolve(process.cwd(), "node_modules/@hotdocx/arrowgram-web/dist", fileName),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Unable to locate @hotdocx/arrowgram-web dist/${fileName}. Build or install @hotdocx/arrowgram-web first.`);
  }
  return found;
}

function arrowgramEsmPath() {
  return fileURLToPath(import.meta.resolve("@hotdocx/arrowgram"));
}

export type DevServerOptions = {
  root: string;
  host: string;
  port: number;
  token?: string;
};

type SseClient = {
  id: number;
  res: ServerResponse;
};

function sendJson(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}

function sendError(res: ServerResponse, status: number, error: unknown) {
  sendJson(res, status, {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  return text.trim() ? JSON.parse(text) : {};
}

function isApiPath(pathname: string) {
  return pathname === "/__arrowgram" || pathname.startsWith("/__arrowgram/");
}

function hasValidToken(req: IncomingMessage, url: URL, token?: string) {
  if (!token) return true;
  const header = req.headers.authorization;
  return header === `Bearer ${token}` || url.searchParams.get("token") === token;
}

function editorHtml(token?: string) {
  const tokenLiteral = JSON.stringify(token ?? "");
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Arrowgram Workspace</title>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import React from "react";
    import { createRoot } from "react-dom/client";
    import "@hotdocx/arrowgram-web/dist/arrowgram-web.css";
    import { ArrowgramWorkspaceApp } from "@hotdocx/arrowgram-web/embed";
    import { createWorkspaceBridgeProjectRepository } from "@hotdocx/arrowgram-web/adapters";

    const repository = createWorkspaceBridgeProjectRepository({
      baseUrl: window.location.origin,
      token: ${tokenLiteral}
    });

    createRoot(document.getElementById("root")).render(
      React.createElement(ArrowgramWorkspaceApp, {
        repository,
        disableDashboard: false
      })
    );
  </script>
</body>
</html>`;
}

async function createSourceWatcher(root: string, onChange: () => void) {
  let watchers: FSWatcher[] = [];
  let timer: NodeJS.Timeout | null = null;

  const closeAll = () => {
    for (const watcher of watchers) watcher.close();
    watchers = [];
  };

  const emit = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void refresh();
      onChange();
    }, 150);
  };

  const watchFile = (filePath: string) => {
    try {
      watchers.push(watch(filePath, emit));
    } catch {
      // Missing files still get picked up when the manifest changes.
    }
  };

  const refresh = async () => {
    closeAll();
    watchFile(path.join(root, "arrowgram.workspace.json"));
    try {
      const manifest = await readManifest(root);
      for (const project of manifest.projects) {
        watchFile(path.join(root, project.source));
        if (project.customCss) watchFile(path.join(root, project.customCss));
      }
    } catch {
      // Invalid manifest diagnostics are reported by API status.
    }
  };

  await refresh();
  return () => {
    if (timer) clearTimeout(timer);
    closeAll();
  };
}

export async function startDevServer(options: DevServerOptions) {
  const root = path.resolve(options.root);
  const clients = new Map<number, SseClient>();
  let nextClientId = 1;

  const broadcast = (event: string, data: unknown) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients.values()) {
      client.res.write(payload);
    }
  };

  const closeWatcher = await createSourceWatcher(root, () => {
    broadcast("change", { type: "workspace.changed", at: new Date().toISOString() });
  });

  const vite = await createViteServer({
    root,
    appType: "custom",
    resolve: {
      alias: [
        { find: /^react$/, replacement: requireFromHere.resolve("react") },
        { find: /^react-dom$/, replacement: requireFromHere.resolve("react-dom") },
        { find: /^react-dom\/client$/, replacement: requireFromHere.resolve("react-dom/client") },
        { find: /^react\/jsx-runtime$/, replacement: requireFromHere.resolve("react/jsx-runtime") },
        { find: /^react\/jsx-dev-runtime$/, replacement: requireFromHere.resolve("react/jsx-dev-runtime") },
        { find: "@hotdocx/arrowgram-web/embed", replacement: arrowgramWebDistPath("embed.js") },
        { find: "@hotdocx/arrowgram-web/adapters", replacement: arrowgramWebDistPath("adapters.js") },
        {
          find: "@hotdocx/arrowgram-web/dist/arrowgram-web.css",
          replacement: arrowgramWebDistPath("arrowgram-web.css"),
        },
        { find: "@hotdocx/arrowgram", replacement: arrowgramEsmPath() },
      ],
    },
    server: {
      middlewareMode: true,
      hmr: {
        server: undefined,
      },
    },
    plugins: [react() as any],
  });

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      if (isApiPath(url.pathname)) {
        if (!hasValidToken(req, url, options.token)) {
          sendJson(res, 401, { ok: false, error: "Unauthorized" });
          return;
        }

        if (url.pathname === "/__arrowgram/healthz") {
          sendJson(res, 200, { ok: true });
          return;
        }

        if (url.pathname === "/__arrowgram/events") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
            Connection: "keep-alive",
          });
          const id = nextClientId++;
          clients.set(id, { id, res });
          res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
          req.on("close", () => clients.delete(id));
          return;
        }

        if (url.pathname === "/__arrowgram/projects" && req.method === "GET") {
          const projects = await listProjects(root);
          sendJson(res, 200, { ok: true, projects });
          return;
        }

        if (url.pathname === "/__arrowgram/projects" && req.method === "POST") {
          const body = await readJson(req);
          const project = await createProject(root, {
            type: body.type === "paper" ? "paper" : "diagram",
            title: typeof body.title === "string" ? body.title : undefined,
            content: typeof body.content === "string" ? body.content : undefined,
            paper: body.paper && typeof body.paper === "object" ? body.paper : undefined,
          });
          broadcast("change", { type: "project.created", id: project.id });
          sendJson(res, 200, { ok: true, project });
          return;
        }

        const projectMatch = url.pathname.match(/^\/__arrowgram\/projects\/([^/]+)$/);
        if (projectMatch) {
          const id = decodeURIComponent(projectMatch[1]!);
          if (req.method === "GET") {
            sendJson(res, 200, { ok: true, project: await readProject(root, id) });
            return;
          }
          if (req.method === "PUT") {
            const body = await readJson(req);
            const project = await updateProject(root, {
              id,
              title: typeof body.title === "string" ? body.title : undefined,
              content: typeof body.content === "string" ? body.content : undefined,
              paper: body.paper && typeof body.paper === "object" ? body.paper : undefined,
            });
            broadcast("change", { type: "project.updated", id });
            sendJson(res, 200, { ok: true, project });
            return;
          }
          if (req.method === "DELETE") {
            await removeProject(root, id);
            broadcast("change", { type: "project.deleted", id });
            sendJson(res, 200, { ok: true });
            return;
          }
        }

        if (url.pathname === "/__arrowgram/status" && req.method === "GET") {
          sendJson(res, 200, await workspaceStatus(root));
          return;
        }

        if (url.pathname === "/__arrowgram/diff" && req.method === "GET") {
          sendJson(res, 200, { ok: true, ...(await diffWorkspace(root)) });
          return;
        }

        if (url.pathname === "/__arrowgram/snapshot" && req.method === "POST") {
          const body = await readJson(req).catch(() => ({}));
          const result = await snapshotWorkspace(
            root,
            typeof body.message === "string" && body.message.trim()
              ? body.message.trim()
              : "Save Arrowgram snapshot"
          );
          broadcast("change", { type: "workspace.snapshot", sha: result.sha });
          sendJson(res, 200, { ok: true, ...result });
          return;
        }

        if (url.pathname === "/__arrowgram/diagnostics" && req.method === "GET") {
          sendJson(res, 200, { ok: true, diagnostics: await validateWorkspace(root) });
          return;
        }

        sendJson(res, 404, { ok: false, error: "Not found" });
        return;
      }

      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const html = await vite.transformIndexHtml(url.pathname, editorHtml(options.token));
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      vite.middlewares(req, res, () => {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
      });
    } catch (error) {
      sendError(res, 500, error);
    }
  });

  await new Promise<void>((resolve) => server.listen(options.port, options.host, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  const url = `http://${options.host === "0.0.0.0" ? "localhost" : options.host}:${port}`;
  console.log(`Arrowgram bridge running at ${url}`);

  const close = async () => {
    closeWatcher();
    for (const client of clients.values()) client.res.end();
    clients.clear();
    await vite.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };

  return { close, url };
}

export async function validate(root: string) {
  const diagnostics = await validateWorkspace(path.resolve(root));
  return diagnostics;
}

export async function build(root: string, out: string) {
  await buildStaticWorkspace(path.resolve(root), path.resolve(root, out));
}

export function packageDir() {
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)));
}
