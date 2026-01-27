import React from 'react';
import '../styles.css';
import { ToastProvider } from '../context/ToastContext';
import { PaperEditor } from '../components/PaperEditor/PaperEditor';

export type ArrowgramPaperEditorProps = React.ComponentProps<typeof PaperEditor>;

export function ArrowgramPaperEditor(props: ArrowgramPaperEditorProps) {
  return (
    <ToastProvider>
      <PaperEditor {...props} />
    </ToastProvider>
  );
}

