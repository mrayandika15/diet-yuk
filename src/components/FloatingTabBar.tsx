import { router, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, Icon, Txt } from "./ui";
import {
  MOBILE_WIDTH,
  TAB_BAR_HEIGHT,
  TAB_BAR_GAP,
  useKeyboardVisible,
} from "../lib/mobile-layout";

const labels: Record<string, string> = {
  index: "Hari ini",
  progress: "Progres",
  meals: "Catatan",
  settings: "Profil",
};
const icons: Record<string, string> = {
  index: "home",
  progress: "chart",
  meals: "list",
  settings: "settings",
};
type FloatingTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

export function FloatingTabBar({ state, navigation }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  if (keyboard) return null;
  const renderTab = (route: (typeof state.routes)[number]) => {
    const focused =
      state.index === state.routes.findIndex((item) => item.key === route.key);
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={labels[route.name]}
        onPress={() => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented)
            navigation.navigate(route.name, route.params);
        }}
        onLongPress={() =>
          navigation.emit({ type: "tabLongPress", target: route.key })
        }
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 44,
          minHeight: 60,
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <View
          style={{
            width: 38,
            height: 30,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: focused ? C.mint : "transparent",
          }}
        >
          <Icon
            name={icons[route.name]}
            size={22}
            color={focused ? C.green : C.muted}
          />
        </View>
        <Txt size={11} bold color={focused ? C.green : C.muted}>
          {labels[route.name]}
        </Txt>
      </Pressable>
    );
  };
  return (
    <View
      testID="bottom-navigation"
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingBottom: Math.max(insets.bottom, 12) + TAB_BAR_GAP,
        maxWidth: MOBILE_WIDTH,
        width: "100%",
        alignSelf: "center",
        marginHorizontal: "auto",
      }}
    >
      <View
        style={{
          height: TAB_BAR_HEIGHT,
          borderRadius: 24,
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.line,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 4,
          shadowColor: C.ink,
          shadowOpacity: 0.07,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        {state.routes.slice(0, 2).map(renderTab)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Foto makanan"
          onPress={() => router.push("/add-meal?photoOnly=1")}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 60,
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View
            style={{
              width: 46,
              height: 34,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.green,
            }}
          >
            <Icon name="camera" color={C.white} size={23} />
          </View>
          <Txt size={11} bold color={C.green}>
            Foto
          </Txt>
        </Pressable>
        {state.routes.slice(2, 4).map(renderTab)}
      </View>
    </View>
  );
}
