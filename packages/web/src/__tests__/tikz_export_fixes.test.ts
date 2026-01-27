
import { exportToTikz } from '../utils/tikz';

describe('TikZ Export Fixes', () => {
  const problemSpec = JSON.stringify({
    "version": 1,
    "nodes": [
      { "name": "N1", "label": "N1", "left": 360, "top": 40 },
      { "name": "N2", "label": "N2", "left": 360, "top": 240 },
      { "name": "N3", "label": "N3", "left": 560, "top": 240 },
      { "name": "N4", "label": "$\\sigma_k$", "left": 560, "top": 40, "color": "#0062ff" },
      { "name": "N5", "label": "N5", "left": 200, "top": 440 },
      { "name": "N6", "label": "N6", "left": 760, "top": 440 },
      { "name": "N7", "label": "N7", "left": 520, "top": 280 }
    ],
    "arrows": [
      { "name": "arrow1", "label": "$g \\to p$", "from": "N1", "to": "N2", "curve": 104, "label_alignment": "left", "color": "#41a2af", "label_color": "#04ff00", "uniqueId": "arrow1" },
      { "name": "arrow2", "label": "", "from": "arrow1", "to": "N3", "uniqueId": "arrow2" },
      { "name": "arrow3", "label": "f", "from": "N3", "to": "N4", "color": "#d51515", "uniqueId": "arrow3" },
      { "name": "arrow4", "label": "", "from": "N3", "to": "N3", "angle": 0, "radius": 40, "shorten": { "source": 48, "target": 32 }, "uniqueId": "arrow4" },
      { "name": "arrow5", "label": "", "from": "arrow1", "to": "arrow3", "style": { "level": 2 }, "uniqueId": "arrow5" },
      { "name": "arrow6", "label": "f", "from": "N5", "to": "N6", "shorten": { "source": 119 }, "uniqueId": "arrow6" }
    ]
  });

  test('Correctly formats label colors', () => {
    const output = exportToTikz(problemSpec);
    // Should contain "label"'{text=color}. Note: ' outside braces.
    // The label is "$g \to p$". Cleaned: "g \to p".
    // Color #04ff00 -> {rgb,255:red,4;green,255;blue,0}
    
    // We expect: "\"{g \\to p}\"'{text={rgb,255:red,4;green,255;blue,0}}"
    expect(output).toContain('"{g \\to p}"\'{text={rgb,255:red,4;green,255;blue,0}}');
  });

  test('Clamps shorten values for loops', () => {
    const output = exportToTikz(problemSpec);
    // arrow4 is a loop. source=48, target=32.
    // 48 * 0.75 * 0.4 = 14.4 -> 14pt.
    // 32 * 0.75 * 0.4 = 9.6 -> 10pt.
    
    expect(output).toContain('shorten <=14pt'); 
    expect(output).toContain('shorten >=10pt');
    
    // Verify non-loop arrow6 (source 119) is scaled by 0.75
    // 119 * 0.75 = 89.25 -> 89pt
    expect(output).toContain('shorten <=89pt');

    // Verify curve scaling
    // Curve 104 * 1.3 = 135.2.
    // 2 * atan(2 * 135.2 / 200) -> 107 deg.
    expect(output).toContain('bend left=107');
  });

  test('Exports 2-arrows (arrows between arrows)', () => {
    const output = exportToTikz(problemSpec);
    // Arrow indices:
    // arrow1: index 0
    // arrow2: index 1 (from arrow1 to N3)
    // arrow3: index 2 (from N3 to N4)
    // arrow4: index 3
    // arrow5: index 4 (from arrow1 to arrow3)
    
    // arrow1 (index 0) should have anchor label: ""{name=0, anchor=center, inner sep=0}
    expect(output).toContain('""{name=0, anchor=center, inner sep=0}');
    
    // arrow3 (index 2) should have anchor label: ""{name=2, anchor=center, inner sep=0}
    expect(output).toContain('""{name=2, anchor=center, inner sep=0}');
    
    // arrow5 (index 4) should connect 0 to 2: from=0, to=2
    expect(output).toContain('from=0');
    expect(output).toContain('to=2');
  });
  
  test('Exports mixed Node to Arrow connection', () => {
      const output = exportToTikz(problemSpec);
      // arrow2 (index 1) connects arrow1 (index 0) to N3
      
      expect(output).toContain('from=0'); // arrow1 is index 0
      
      // N3 coordinate check (unchanged logic)
      // N3 relative: r=6, c=10. -> 6-10.
      expect(output).toContain('to=6-10');
  });
});
