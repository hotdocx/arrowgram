import { DiagramSpec, ArrowSpec, NodeSpec } from 'arrowgram';

const GRID_SCALE = 150;
const CURVE_SCALE_FACTOR = -25;

const QUIVER_LABEL_ALIGNMENT: Record<string, number> = {
	left: 0,
	centre: 1, // Not directly supported by arrowgram, maps to 'over'
	right: 2,
	over: 3,
};

const ARROWGRAM_LABEL_ALIGNMENT = ["left", "over", "right", "over"];

const QUIVER_HEAD_STYLE: Record<string, string[]> = {
	normal: ["epi"],
	epi: ["epi", "epi"],
	none: [],
};

const QUIVER_TAIL_STYLE: Record<string, string[]> = {
	mono: ["mono"],
	none: [],
};

const QUIVER_DASH_STYLE: Record<string, string> = {
	solid: "SOLID",
	dashed: "DASHED",
	dotted: "DOTTED",
};

function quiverStyleToArrowgram(options: any): any {
	const style: any = {};
	if (options.style) {
		const headStyle = JSON.stringify(options.style.heads);
		if (headStyle === JSON.stringify(QUIVER_HEAD_STYLE.epi)) {
			style.head = { name: "epi" };
		} else if (headStyle === JSON.stringify(QUIVER_HEAD_STYLE.none)) {
			style.head = { name: "none" };
		}

		const tailStyle = JSON.stringify(options.style.tails);
		if (tailStyle === JSON.stringify(QUIVER_TAIL_STYLE.mono)) {
			style.tail = { name: "mono" };
		}

		if (options.style.dash_style === QUIVER_DASH_STYLE.dashed) {
			style.body = { name: "dashed" };
		} else if (options.style.dash_style === QUIVER_DASH_STYLE.dotted) {
			style.body = { name: "dotted" };
		}
	}
	return style;
}

export function decodeQuiverUrl(url: string): DiagramSpec {
	try {
		const fragment = new URL(url).hash.substring(1);
		const qParam = fragment.split("&").find((p) => p.startsWith("q="));

		if (!qParam) {
			throw new Error("No 'q' parameter found in URL fragment.");
		}
		const base64String = qParam.substring(2);

		const decodedString = atob(base64String);
		const bytes = new Uint8Array(decodedString.length);
		for (let i = 0; i < decodedString.length; i++) {
			bytes[i] = decodedString.charCodeAt(i);
		}
		const jsonString = new TextDecoder().decode(bytes);
		const quiverArray = JSON.parse(jsonString);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [version, vertexCount, ...cells] = quiverArray;

		const spec: DiagramSpec = {
            version: 1,
			nodes: [],
			arrows: [],
		};

		const cellMap: any[] = [];

		for (let i = 0; i < vertexCount; i++) {
			const cell = cells[i];
			const [x, y, label = ""] = cell;
			const nodeName = `v${i}`;

			spec.nodes.push({
				name: nodeName,
				left: x * GRID_SCALE,
				top: y * GRID_SCALE,
				label: label ? `$${label}$` : "",
			});
			cellMap[i] = { name: nodeName, type: "node" };
		}

		for (let i = vertexCount; i < cells.length; i++) {
			const cell = cells[i];
			const [
				sourceIdx,
				targetIdx,
				label = "",
				alignment = 3,
				options = {},
			] = cell;

			const sourceName = cellMap[sourceIdx]?.name;
			const targetName = cellMap[targetIdx]?.name;

			if (sourceName && targetName) {
				const arrowName = `e${i - vertexCount}`;
				const arrow: ArrowSpec = {
					name: arrowName,
					from: sourceName,
					to: targetName,
					label: label ? `$${label}$` : "",
					curve: (options.curve || 0) * CURVE_SCALE_FACTOR,
					shift: options.offset || 0,
					// @ts-ignore
					level: options.level || 1,
					// @ts-ignore
					label_alignment: ARROWGRAM_LABEL_ALIGNMENT[alignment] || "over",
				};

				const agStyle = quiverStyleToArrowgram(options);
				if (Object.keys(agStyle).length > 0) {
					arrow.style = agStyle;
				}

				if (spec.arrows) {
                    spec.arrows.push(arrow);
                } else {
                    spec.arrows = [arrow];
                }
				cellMap[i] = { name: arrowName, type: "arrow" };
			}
		}

		return spec;
	} catch (error) {
		console.error("Failed to decode Quiver URL:", error);
		throw new Error("Failed to decode URL. Please check the format.");
	}
}

function arrowgramStyleToQuiver(arrow: ArrowSpec) {
	const options: any = { style: {} };

	const head = arrow.style?.head?.name || "normal";
	if (head !== "normal") {
		options.style.heads = QUIVER_HEAD_STYLE[head];
	}

	const tail = arrow.style?.tail?.name || "none";
	if (tail !== "none") {
		options.style.tails = QUIVER_TAIL_STYLE[tail];
	}

	const body = arrow.style?.body?.name || "solid";
	if (body !== "solid") {
		options.style.dash_style = QUIVER_DASH_STYLE[body];
	}
	
	if (Object.keys(options.style).length === 0) {
		delete options.style;
	}

	return options;
}

export function encodeArrowgram(spec: DiagramSpec) {
	try {
		const vertices: any[] = [];
		const edges: any[] = [];
		const nameMap = new Map();

		spec.nodes.forEach((node: NodeSpec, index: number) => {
			const quiverVertex = [
				Math.round(node.left / GRID_SCALE),
				Math.round(node.top / GRID_SCALE),
			];
			if (node.label) {
				quiverVertex.push(node.label.replace(/\$/g, ""));
			}
			vertices.push(quiverVertex);
			nameMap.set(node.name, index);
		});

		(spec.arrows || []).forEach((arrow: ArrowSpec, index: number) => {
			if (arrow.name) {
				nameMap.set(arrow.name, vertices.length + index);
			}
		});

		(spec.arrows || []).forEach((arrow: ArrowSpec) => {
			const sourceIndex = nameMap.get(arrow.from);
			const targetIndex = nameMap.get(arrow.to);

			if (sourceIndex === undefined || targetIndex === undefined) {
				console.warn("Skipping arrow with missing nodes:", arrow);
				return;
			}

			const quiverEdge = [sourceIndex, targetIndex];
			const options = arrowgramStyleToQuiver(arrow);

			if (arrow.curve) {
				const curveValue = Math.round(arrow.curve / CURVE_SCALE_FACTOR);
				if (curveValue !== 0) {
					options.curve = curveValue;
				}
			}
			if (arrow.shift) options.offset = arrow.shift;
			if (arrow.style?.level && arrow.style.level > 1) options.level = arrow.style.level;
			
            // @ts-ignore
			const alignment = QUIVER_LABEL_ALIGNMENT[arrow.label_alignment || 'over'];
			
			const hasOptions = Object.keys(options).length > 0;
			const hasAlignment = alignment !== QUIVER_LABEL_ALIGNMENT.over;

			if (arrow.label || hasAlignment || hasOptions) {
				quiverEdge.push((arrow.label || "").replace(/\$/g, ""));
			}
			if (hasAlignment || hasOptions) {
				quiverEdge.push(alignment);
			}
			if (hasOptions) {
				quiverEdge.push(options);
			}
			edges.push(quiverEdge);
		});

		const quiverArray = [0, vertices.length, ...vertices, ...edges];
		const jsonString = JSON.stringify(quiverArray);
		
		const uint8Array = new TextEncoder().encode(jsonString);
		// @ts-ignore
		const charString = String.fromCharCode.apply(null, uint8Array);
		return btoa(charString);

	} catch (error) {
		console.error("Failed to encode Arrowgram spec:", error);
		throw new Error("Failed to encode spec.");
	}
}