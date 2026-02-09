---
title: My New Paper
authors: Author Name
---

# Introduction

EXAMPLES:


1. **Pullback Square (Corner)**

 <div class="arrowgram">
{
  "version": 1,
  "nodes": [
    { "name": "P", "left": 100, "top": 100, "label": "$P$" },
    { "name": "A", "left": 300, "top": 100, "label": "$A$" },
    { "name": "B", "left": 100, "top": 300, "label": "$B$" },
    { "name": "C", "left": 300, "top": 300, "label": "$C$" }
  ],
  "arrows": [
    { "from": "P", "to": "A", "label": "$p_1$" },
    { "from": "P", "to": "B", "label": "$p_2$" },
    { "from": "A", "to": "C", "label": "$f$" },
    { "from": "B", "to": "C", "label": "$g$" },
    { "from": "P", "to": "C", "style": { "mode": "corner" } }
  ]
}
</div>




2. **Natural Transformation (2-cell)**
 <div class="arrowgram">
{
  "nodes": [
    { "name": "A", "left": 100, "top": 200, "label": "$A$" },
    { "name": "B", "left": 400, "top": 200, "label": "$B$" }
  ],
  "arrows": [
    { "name": "F", "from": "A", "to": "B", "label": "$F$", "curve": 250 },
    { "name": "G", "from": "A", "to": "B", "label": "$G$", "curve": -250 },
    { "from": "F", "to": "G", "label": "$\\alpha$", "style": { "level": 2 } }
  ]
}
</div>