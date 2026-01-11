import React from 'react';
import katex from 'katex';
import { ComputedDiagram } from '../types';

const FONT_SIZE = 16;
const ARROW_COLOR = "#333333";

interface LabelContentProps {
  label: string | undefined;
  textProps: React.SVGProps<SVGTextElement>;
  isNodeLabel?: boolean;
}

function LabelContent({ label, textProps, isNodeLabel = false }: LabelContentProps) {
  if (typeof label !== 'string' || label.trim() === '') return null;

  const isMath = label.includes('$');
  const finalProps: React.SVGProps<SVGTextElement> = {
    ...textProps,
    fontWeight: isNodeLabel ? 'bold' : 'normal',
    fontSize: FONT_SIZE,
    paintOrder: "stroke",
    stroke: "white",
    strokeWidth: isNodeLabel ? "0" : "6px",
    strokeLinecap: "butt",
    strokeLinejoin: "miter",
    fill: ARROW_COLOR,
  };

  if (!isMath) {
    return <text {...finalProps}>{label}</text>;
  }

  const mathString = label.replace(/\$/g, '');
  const html = katex.renderToString(mathString, {
    throwOnError: false,
    displayMode: false,
  });

  const width = 150;
  const height = 50;
  // @ts-ignore - props are compatible but TS might complain about optionality
  const x = (finalProps.x as number) - width / 2;
   // @ts-ignore
  const y = (finalProps.y as number) - height / 2;

  return (
    <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: 'visible' }}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: `${FONT_SIZE}px`,
          fontWeight: isNodeLabel ? 'bold' : 'normal',
          color: ARROW_COLOR,
          textAlign: 'center',
        }}
      >
        <style>{`.katex{line-height:1.2;}`}</style>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </foreignObject>
  );
}

export interface ArrowGramDiagramProps {
  diagram: ComputedDiagram;
}

export function ArrowGramDiagram({ diagram }: ArrowGramDiagramProps) {
  if (!diagram) return null;

  return (
    <g>
      {diagram.arrows.map((arrow) => (
        <g key={arrow.key}>
          {arrow.paths.map((path, i) => (
            <path key={i} {...path} />
          ))}
          {arrow.label.text && (
            // @ts-ignore
            <LabelContent label={arrow.label.text} textProps={arrow.label.props} />
          )}
          {arrow.heads.map((head, i) => (
            <path key={`h-${i}`} {...head.props} />
          ))}
          {arrow.tail.map((tail, i) => (
            <path key={`t-${i}`} {...tail.props} />
          ))}
        </g>
      ))}
      {diagram.nodes.map((node) => (
        <g key={node.name} transform={`translate(${node.left}, ${node.top})`}>
          <LabelContent
            label={node.label}
            textProps={{
              x: 0,
              y: 0,
              textAnchor: "middle",
              dominantBaseline: "middle",
            }}
            isNodeLabel={true}
          />
        </g>
      ))}
    </g>
  );
}
