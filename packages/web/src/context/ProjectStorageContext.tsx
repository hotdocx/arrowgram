import React from "react";
import type { ProjectMeta } from "../utils/storage";
import {
  saveProject as saveProjectLocal,
  loadProject as loadProjectLocal,
  deleteProject as deleteProjectLocal,
  listProjects as listProjectsLocal,
} from "../utils/storage";

export interface ProjectStorage {
  saveProject: (
    name: string,
    spec: string,
    type?: "diagram" | "paper"
  ) => Promise<ProjectMeta>;
  loadProject: (name: string) => Promise<ProjectMeta | undefined>;
  deleteProject: (name: string) => Promise<void>;
  listProjects: () => Promise<ProjectMeta[]>;
}

const defaultStorage: ProjectStorage = {
  saveProject: saveProjectLocal,
  loadProject: loadProjectLocal,
  deleteProject: deleteProjectLocal,
  listProjects: listProjectsLocal,
};

const ProjectStorageContext = React.createContext<ProjectStorage | null>(null);

export function ProjectStorageProvider(props: {
  children: React.ReactNode;
  storage?: ProjectStorage;
}) {
  return (
    <ProjectStorageContext.Provider value={props.storage ?? defaultStorage}>
      {props.children}
    </ProjectStorageContext.Provider>
  );
}

export function useProjectStorage(): ProjectStorage {
  const ctx = React.useContext(ProjectStorageContext);
  if (!ctx) return defaultStorage;
  return ctx;
}

