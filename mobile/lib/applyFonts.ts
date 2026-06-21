import { Text, TextInput, StyleSheet } from 'react-native';

// Map a fontWeight to the matching static Satoshi family. Using per-weight
// families gives true Satoshi weights (no synthetic/faux bolding) on both
// iOS and Android.
function familyForWeight(weight?: string | number): string {
  const w = weight == null ? '400' : String(weight);
  switch (w) {
    case '500':
      return 'Satoshi-Medium';
    case '600':
    case '700':
    case 'bold':
      return 'Satoshi-Bold';
    case '800':
    case '900':
      return 'Satoshi-Black';
    default:
      return 'Satoshi-Regular';
  }
}

/**
 * Force Satoshi on every <Text> and <TextInput> app-wide. NativeWind applies
 * styles through the `style` prop, which overrides component defaultProps — so a
 * render patch is the reliable way to inject the font family everywhere while
 * still honoring each element's weight (and leaving explicit families like
 * monospace addresses untouched).
 */
export function applyGlobalFont() {
  for (const Comp of [Text, TextInput] as any[]) {
    const original = Comp.render;
    if (!original || Comp.__satoshiPatched) continue;

    Comp.render = function patchedRender(props: any, ref: any) {
      const flat = StyleSheet.flatten(props?.style) || {};
      const fontFamily = flat.fontFamily || familyForWeight(flat.fontWeight);
      // family encodes the weight, so clear fontWeight to avoid faux-bolding
      const style = [props?.style, { fontFamily, fontWeight: undefined }];
      return original.call(this, { ...props, style }, ref);
    };

    Comp.__satoshiPatched = true;
  }
}
