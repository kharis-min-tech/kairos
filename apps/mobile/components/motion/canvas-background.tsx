import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useColors } from '@kairos/ui-native';

const DOT_SPACING = 20;
const DOT_AREA = 340;

/**
 * The Canvas ground: the theme page colour, a purple tint pooling from the
 * top-left and a gold one from the bottom-right, and over the top ~340pt a dot
 * grid (1pt dots, 20pt apart, foreground at 12%) that fades out downwards.
 * Static — nothing here moves.
 */
export function CanvasBackground() {
  const c = useColors();
  const { width, height } = useWindowDimensions();
  const cols = Math.ceil(width / DOT_SPACING) + 1;
  const rows = Math.ceil(DOT_AREA / DOT_SPACING);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.page }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="tintPurple" cx="0" cy="0" r="0.95">
            <Stop offset="0" stopColor="#5D3FD3" stopOpacity={0.3} />
            <Stop offset="1" stopColor="#5D3FD3" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="tintGold" cx="1" cy="1" r="0.85">
            <Stop offset="0" stopColor="#F8B537" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#F8B537" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#tintPurple)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#tintGold)" />
        <G fill={c.ink}>
          {Array.from({ length: rows }).map((_, r) => {
            const y = DOT_SPACING / 2 + r * DOT_SPACING;
            // Linear fade: full 12% at the top, nothing at the bottom edge.
            const opacity = 0.12 * Math.max(0, 1 - y / DOT_AREA);
            return Array.from({ length: cols }).map((__, k) => (
              <Circle
                key={`${r}-${k}`}
                cx={DOT_SPACING / 2 + k * DOT_SPACING}
                cy={y}
                r={0.5}
                opacity={opacity}
              />
            ));
          })}
        </G>
      </Svg>
    </View>
  );
}
