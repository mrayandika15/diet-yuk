import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, Icon, Txt } from "./ui";

const labels: Record<string, string> = {
  index: "Hari ini",
  progress: "Perjalanan",
  meals: "Catatan",
  settings: "Atur",
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
  const left = state.routes.slice(0, 2);
  const right = state.routes.slice(2, 4);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex((item) => item.key === route.key);
    const focused = state.index === index;
    const openTab = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={labels[route.name]}
        onPress={openTab}
        onLongPress={() =>
          navigation.emit({ type: "tabLongPress", target: route.key })
        }
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 58,
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          opacity: pressed ? 0.62 : 1,
        })}
      >
        <View
          style={{
            width: 38,
            height: 30,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: focused ? C.mint : "transparent",
          }}
        >
          <Icon
            name={icons[route.name]}
            size={20}
            color={focused ? C.green : "#9A9D92"}
          />
        </View>
        <Txt size={9} bold color={focused ? C.green : C.muted}>
          {labels[route.name]}
        </Txt>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 14,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 650,
          alignSelf: "center",
          height: 72,
          borderRadius: 28,
          backgroundColor: "rgba(255,255,255,0.98)",
          borderWidth: 1,
          borderColor: "#E8E9E1",
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 7,
          shadowColor: "#334338",
          shadowOpacity: 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
          ...(Platform.OS === "web"
            ? ({ boxShadow: "0 12px 35px rgba(51,67,56,0.14)" } as object)
            : {}),
        }}
      >
        {left.map(renderTab)}
        <View style={{ width: 78 }} />
        {right.map(renderTab)}
      </View>
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: -25,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tambah makanan"
          onPress={() => router.push("/add-meal")}
          style={({ pressed }) => ({
            alignItems: "center",
            gap: 3,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}
        >
          <LinearGradient
            colors={["#5B8666", C.green]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 68,
              height: 68,
              borderRadius: 25,
              borderWidth: 6,
              borderColor: C.bg,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: C.green,
              shadowOpacity: 0.28,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 7 },
              elevation: 14,
            }}
          >
            <Icon name="plus" color={C.white} size={29} />
          </LinearGradient>
          <Txt size={9} bold color={C.green}>
            TAMBAH
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}
