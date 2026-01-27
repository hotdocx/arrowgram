import React from 'react';
import katex from 'katex';
import { ComputedDiagram } from '../types';

const FONT_SIZE = 16;
const ARROW_COLOR = "#333333";

interface LabelContentProps {
  label: string | undefined;
  color?: string;
  textProps: React.SVGProps<SVGTextElement>;
  isNodeLabel?: boolean;
}

function LabelContent({ label, color, textProps, isNodeLabel = false }: LabelContentProps) {
  if (typeof label !== 'string' || label.trim() === '') return null;

  const isMath = label.includes('$');
  const finalProps: React.SVGProps<SVGTextElement> = {
    ...textProps,
    fontWeight: isNodeLabel ? 'bold' : 'normal',
    fontSize: FONT_SIZE,
    fill: color || ARROW_COLOR,
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
  
  const x = (typeof finalProps.x === 'number' ? finalProps.x : 0) - width / 2;
  const y = (typeof finalProps.y === 'number' ? finalProps.y : 0) - height / 2;

  return (
    <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: 'visible' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: `${FONT_SIZE}px`,
          fontWeight: isNodeLabel ? 'bold' : 'normal',
          color: color || ARROW_COLOR,
          textAlign: 'center',
        }}
      >
        <style>{`.katex{line-height:1.2;}.katex-mathml{display:none;}`}</style>
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
      <defs>
        {diagram.masks && diagram.masks.map(mask => (
          <mask 
            key={mask.id} 
            id={mask.id} 
            maskUnits="userSpaceOnUse"
            x="-10000" y="-10000" width="20000" height="20000"
          >
             {mask.paths.map((p, i) => (
               <path key={i} {...p} />
             ))}
          </mask>
        ))}
      </defs>
      {diagram.arrows.map((arrow) => (
        <g key={arrow.key} className="arrow-visual">
          {arrow.paths.map((path, i) => (
            <path key={i} {...path} />
          ))}
          {arrow.label.text && (
            // @ts-ignore
            <LabelContent label={arrow.label.text} color={arrow.label.color} textProps={arrow.label.props} />
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
            color={node.color}
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
