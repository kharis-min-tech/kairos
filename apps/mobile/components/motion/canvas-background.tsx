import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useColors } from '@kairos/ui-native';

const DOT_SPACING = 20;
const DOT_AREA = 340;
// The brief says 1pt dots at 12%. On a phone that is close to invisible once
// the purple glow sits underneath, so they are a touch larger and stronger.
const DOT_RADIUS = 0.75;
const DOT_ALPHA = 0.22;

/**
 * The Canvas ground: the theme page colour, a purple tint pooling from the
 * top-left and a gold one from the bottom-right, and over the top ~340pt a dot
 * grid (20pt apart, fading out downwards).
 * Static — nothing here moves.
 */
export function CanvasBackground({ children }: { children?: ReactNode }) {
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
      </Svg>
      {/* Anything passed in (the ambient glow) sits between the tints and the
          dots, so the dots read across it instead of being washed out by it. */}
      {children}
      <Svg width={width} height={DOT_AREA} style={styles.dots}>
        <G fill={c.ink}>
          {Array.from({ length: rows }).map((_, r) => {
            const y = DOT_SPACING / 2 + r * DOT_SPACING;
            // Linear fade: full strength at the top, nothing at the bottom edge.
            const opacity = DOT_ALPHA * Math.max(0, 1 - y / DOT_AREA);
            return Array.from({ length: cols }).map((__, k) => (
              <Circle
                key={`${r}-${k}`}
                cx={DOT_SPACING / 2 + k * DOT_SPACING}
                cy={y}
                r={DOT_RADIUS}
                opacity={opacity}
              />
            ));
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { position: 'absolute', top: 0, left: 0 },
});
