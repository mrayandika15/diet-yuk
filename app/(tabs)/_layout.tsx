import { Tabs } from "expo-router";
import { FloatingTabBar } from "../../src/components/FloatingTabBar";
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: 100,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Hari ini" }} />
      <Tabs.Screen name="progress" options={{ title: "Perjalanan" }} />
      <Tabs.Screen name="meals" options={{ title: "Catatan" }} />
      <Tabs.Screen name="settings" options={{ title: "Pengaturan" }} />
    </Tabs>
  );
}
