import React from "react";
import {
  createLocalAttachmentRepository,
  type AttachmentRepository,
} from "../utils/attachmentRepository";

const defaultRepository: AttachmentRepository = createLocalAttachmentRepository();

const AttachmentRepositoryContext =
  React.createContext<AttachmentRepository | null>(null);

export function AttachmentRepositoryProvider(props: {
  children: React.ReactNode;
  repository?: AttachmentRepository;
}) {
  return (
    <AttachmentRepositoryContext.Provider
      value={props.repository ?? defaultRepository}
    >
      {props.children}
    </AttachmentRepositoryContext.Provider>
  );
}

export function useAttachmentRepository(): AttachmentRepository {
  const ctx = React.useContext(AttachmentRepositoryContext);
  return ctx ?? defaultRepository;
}

