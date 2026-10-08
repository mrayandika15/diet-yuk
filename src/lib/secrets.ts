import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
let webToken = "";
export async function getToken() {
  return Platform.OS === "web"
    ? webToken
    : ((await SecureStore.getItemAsync("diet-yuk-ai-token")) ?? "");
}
export async function setToken(token: string) {
  if (Platform.OS === "web") {
    webToken = token;
    return;
  }
  if (token) await SecureStore.setItemAsync("diet-yuk-ai-token", token);
  else await SecureStore.deleteItemAsync("diet-yuk-ai-token");
}
