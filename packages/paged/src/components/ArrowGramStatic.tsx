import { useMemo } from 'react';
import { ArrowGramDiagram, computeDiagram } from '@hotdocx/arrowgram';
import { Edit2 } from 'lucide-react';

interface ArrowGramStaticProps {
    spec: string;
    className?: string;
    onEdit?: () => void;
}

export function ArrowGramStatic({ spec, className, onEdit }: ArrowGramStaticProps) {
    const { diagram, error } = useMemo(() => {
        try {
            const result = computeDiagram(spec);
            return { diagram: result, error: null };
        } catch (e: any) {
            return { diagram: null, error: e.message || 'Unknown error' };
        }
    }, [spec]);

    if (error) {
        return (
            <div className={`p-4 border border-red-200 bg-red-50 text-red-600 rounded text-sm font-mono whitespace-pre-wrap ${className}`}>
                Failed to render diagram: {error}
            </div>
        );
    }

    if (!diagram) return null;

    return (
        <div className={`relative group inline-block ${className}`}>
            <div className="arrowgram-container">
                <svg
                    viewBox={diagram.viewBox}
                    className="w-full h-auto max-w-full"
                    style={{ minWidth: '200px', minHeight: '100px' }}
                >
                    <ArrowGramDiagram diagram={diagram} />
                </svg>
            </div>

            {onEdit && (
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log("Edit button clicked");
                            onEdit();
                        }}
                        className="pointer-events-auto bg-white/90 hover:bg-white text-gray-800 shadow-lg border border-gray-200 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all"
                    >
                        <Edit2 size={16} />
                        Edit Visual
                    </button>
                </div>
            )}
        </div>
    );
}
