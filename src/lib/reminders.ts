import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function reminders(enabled: boolean, hours = [7, 12, 19]) {
  if (Platform.OS === "web")
    throw Error("Pengingat tersedia di aplikasi iPhone/Android.");
  if (enabled) {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted)
      throw Error("Izin notifikasi belum diberikan. Buka Settings perangkat.");
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("meals", {
      name: "Pengingat makan",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  for (let i = 0; i < hours.length; i++)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: [
          "Selamat pagi, sayang ☀️",
          "Waktunya makan siang 🥗",
          "Makan malam dulu, yuk 🌙",
        ][i],
        body: "Sudah makan? Catat makananmu dan rayakan langkah kecil hari ini.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours[i],
        minute: 30,
        channelId: Platform.OS === "android" ? "meals" : undefined,
      },
    });
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Check-in mingguan 🌷",
      body: "Catat berat badanmu. Progres punya ritmenya sendiri.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,
      hour: 6,
      minute: 30,
    },
  });
}
