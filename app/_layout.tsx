import React from "react";
import { Stack, Redirect, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "../src/state/AppContext";
import { C, Txt, Button, Notice } from "../src/components/ui";
export { ErrorBoundary } from "expo-router";
function Routes() {
  const app = useApp();
  const segments = useSegments();
  if (!app.ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <ActivityIndicator color={C.green} />
        <Txt>Menyiapkan hari yang baik…</Txt>
      </View>
    );
  if (!app.local && !app.session && segments[0] !== "welcome")
    return <Redirect href="/welcome" />;
  if (
    (app.local || app.session) &&
    !app.profile.name &&
    segments[0] !== "profile"
  ) {
    if (app.error)
      return (
        <View
          style={{ flex: 1, padding: 30, justifyContent: "center", gap: 16 }}
        >
          <Notice text={app.error} error />
          <Button
            title="Coba sambungkan lagi"
            onPress={() => void app.reload().catch(() => {})}
          />
          <Button title="Keluar" onPress={() => void app.signOut()} />
        </View>
      );
    return <Redirect href="/profile" />;
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="add-meal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
export default function Layout() {
  const [loaded, error] = useFonts({ Nunito_600SemiBold, Nunito_800ExtraBold });
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <Routes />
      </AppProvider>
    </SafeAreaProvider>
  );
}
