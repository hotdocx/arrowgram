# @hotdocx/arrowgram

The core library for rendering commutative diagrams.

## Installation

```bash
npm install arrowgram
```

## Usage

```javascript
import { ArrowGram, computeDiagram } from '@hotdocx/arrowgram';

// 1. React Component
<ArrowGram spec={jsonSpecString} />

// 2. Headless Logic
const model = computeDiagram(jsonSpecString);
console.log(model.arrows);
```
