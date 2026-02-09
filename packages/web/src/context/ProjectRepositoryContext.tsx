import React from "react";
import {
  createLocalProjectRepository,
  type ProjectRepository,
} from "../utils/projectRepository";

const defaultRepository: ProjectRepository = createLocalProjectRepository();

const ProjectRepositoryContext = React.createContext<ProjectRepository | null>(
  null
);

export function ProjectRepositoryProvider(props: {
  children: React.ReactNode;
  repository?: ProjectRepository;
}) {
  return (
    <ProjectRepositoryContext.Provider
      value={props.repository ?? defaultRepository}
    >
      {props.children}
    </ProjectRepositoryContext.Provider>
  );
}

export function useProjectRepository(): ProjectRepository {
  const ctx = React.useContext(ProjectRepositoryContext);
  return ctx ?? defaultRepository;
}

