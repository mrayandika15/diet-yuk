import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextInputProps,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Ellipse } from "react-native-svg";
export const C = {
  bg: "#FFF9F4",
  ink: "#343C35",
  muted: "#85887B",
  line: "#EAE8DF",
  green: "#426C50",
  mint: "#E7EFDF",
  pink: "#F8E4E5",
  rose: "#B9707B",
  peach: "#F6E8D3",
  white: "#FFFFFF",
};
export function Txt({
  children,
  size = 15,
  bold = false,
  color = C.ink,
  style,
  ...rest
}: React.ComponentProps<typeof Text> & {
  size?: number;
  bold?: boolean;
  color?: string;
}) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: bold ? "Nunito_800ExtraBold" : "Nunito_600SemiBold",
          fontSize: size,
          lineHeight: size * 1.4,
          color,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Page({
  children,
  refresh,
  bottom = 28,
}: {
  children: React.ReactNode;
  refresh?: () => Promise<void>;
  bottom?: number;
}) {
  const [refreshing, setRefreshing] = React.useState(false);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 24,
          paddingBottom: bottom,
          width: "100%",
          maxWidth: 650,
          alignSelf: "center",
          gap: 22,
        }}
        refreshControl={
          refresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                refresh().finally(() => setRefreshing(false));
              }}
              tintColor={C.green}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Card({
  children,
  color = C.white,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderRadius: 26,
          padding: 22,
          borderWidth: 1,
          borderColor: color === C.white ? C.line : color,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "soft" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg =
    variant === "primary"
      ? C.green
      : variant === "soft"
        ? C.mint
        : variant === "danger"
          ? C.pink
          : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: bg,
        paddingVertical: 15,
        paddingHorizontal: 18,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 52,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "white" : C.green} />
      ) : (
        <Txt
          bold
          color={
            variant === "primary"
              ? "white"
              : variant === "danger"
                ? C.rose
                : C.green
          }
        >
          {title}
        </Txt>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7, flex: 1, minWidth: 0 }}>
      <Txt size={12} bold color={C.muted}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9B9D93"
        {...props}
        style={[
          {
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 15,
            padding: 14,
            minHeight: 50,
            color: C.ink,
            backgroundColor: C.white,
            fontFamily: "Nunito_600SemiBold",
            fontSize: 16,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Chip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 11,
        minHeight: 44,
        borderRadius: 99,
        backgroundColor: selected ? C.green : C.white,
        borderWidth: 1,
        borderColor: selected ? C.green : C.line,
      }}
    >
      <Txt size={13} bold color={selected ? "white" : C.muted}>
        {title}
      </Txt>
    </Pressable>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return text ? (
    <View
      accessibilityRole="alert"
      style={{
        padding: 15,
        borderRadius: 16,
        backgroundColor: error ? C.pink : C.mint,
      }}
    >
      <Txt size={13} color={error ? "#8F3D4A" : C.green}>
        {text}
      </Txt>
    </View>
  ) : null;
}
export function Heading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      {!!eyebrow && (
        <Txt size={11} bold color={C.green} style={{ letterSpacing: 2 }}>
          {eyebrow.toUpperCase()}
        </Txt>
      )}
      <Txt size={30} bold>
        {title}
      </Txt>
      {!!subtitle && <Txt color={C.muted}>{subtitle}</Txt>}
    </View>
  );
}
export function Empty({
  icon = "🌱",
  title,
  body,
}: {
  icon?: string;
  title: string;
  body: string;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
      <Txt size={35}>{icon}</Txt>
      <Txt bold>{title}</Txt>
      <Txt
        size={13}
        color={C.muted}
        style={{ textAlign: "center", maxWidth: 280 }}
      >
        {body}
      </Txt>
    </View>
  );
}
export function Icon({
  name,
  color = C.green,
  size = 22,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
    chart: "M4 20V11m8 9V4m8 16v-7",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
    list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
    camera: "M3 7h4l2-3h6l2 3h4v13H3ZM12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    plus: "M12 5v14M5 12h14",
    heart: "M12 21 3 12C-2 5 7 0 12 7c5-7 14-2 9 5Z",
    back: "m15 5-7 7 7 7",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={paths[name] || paths.plus}
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function Mascots() {
  return (
    <Svg width="145" height="104" viewBox="0 0 160 116">
      <Ellipse cx="80" cy="105" rx="66" ry="7" fill="#D9E2D0" />
      <Path
        d="M18 72Q12 43 30 35Q40 8 53 36Q77 28 83 59L86 99Q54 114 21 96Z"
        fill="#F5EAD3"
        stroke="#716A55"
        strokeWidth="2"
      />
      <Path
        d="M78 76Q76 37 95 35Q111 4 121 37Q145 41 143 77L140 101Q105 111 81 98Z"
        fill="#F9F7EC"
        stroke="#716A55"
        strokeWidth="2"
      />
      <Circle cx="39" cy="65" r="3" fill="#43483B" />
      <Circle cx="61" cy="65" r="3" fill="#43483B" />
      <Path d="m45 73 5 4 5-4" fill="none" stroke="#43483B" strokeWidth="2" />
      <Circle cx="99" cy="65" r="3" fill="#43483B" />
      <Circle cx="121" cy="65" r="3" fill="#43483B" />
      <Path d="m105 73 5 4 5-4" fill="none" stroke="#43483B" strokeWidth="2" />
      <Ellipse cx="32" cy="74" rx="7" ry="4" fill="#E6B4A3" />
      <Ellipse cx="128" cy="74" rx="7" ry="4" fill="#E9BAC1" />
      <Path d="m40 88 10 5 10-5v13l-10-5-10 5Z" fill="#50735C" />
      <Path
        d="M94 38q16-20 31 2"
        stroke="#E2B8BD"
        strokeWidth="6"
        fill="none"
      />
      <Path
        d="M73 23q-8-14-14-5-5 8 14 18 18-10 13-18-6-9-13 5"
        fill="#CF8F99"
      />
    </Svg>
  );
}
export function Ring({ value, target }: { value: number; target: number }) {
  const pct = Math.min(1, value / Math.max(1, target));
  return (
    <View
      style={{
        width: 190,
        height: 190,
        alignSelf: "center",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={190} height={190} style={StyleSheet.absoluteFill}>
        <Circle
          cx={95}
          cy={95}
          r={80}
          fill="none"
          stroke="#EDF0E8"
          strokeWidth={13}
        />
        <Circle
          cx={95}
          cy={95}
          r={80}
          fill="none"
          stroke={value > target ? C.rose : C.green}
          strokeWidth={13}
          strokeDasharray={`${pct * 503} 503`}
          strokeLinecap="round"
          transform="rotate(-90 95 95)"
        />
      </Svg>
      <Txt size={38} bold>
        {Math.round(value).toLocaleString("id-ID")}
      </Txt>
      <Txt size={12} color={C.muted}>
        dari {target.toLocaleString("id-ID")} kkal
      </Txt>
      <Txt size={11} bold color={C.green} style={{ marginTop: 6 }}>
        LANGKAH KECIL, TIAP HARI
      </Txt>
    </View>
  );
}
