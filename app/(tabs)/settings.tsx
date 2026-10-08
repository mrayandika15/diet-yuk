import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useApp } from "../../src/state/AppContext";
import { testAI } from "../../src/lib/managed-ai";
import { reminders } from "../../src/lib/reminders";
import { companionName } from "../../src/lib/personal";
import {
  Page,
  Heading,
  Card,
  Row,
  Txt,
  C,
  Toggle,
  Field,
  Button,
  Notice,
} from "../../src/components/ui";
export default function Settings() {
  const app = useApp();
  const partnerName = app.partner?.name || companionName(app.profile.name);
  const [enabled, setEnabled] = useState(false);
  const [hours, setHours] = useState(["7", "12", "19"]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    AsyncStorage.getItem("diet-yuk:reminders")
      .then((v) => {
        if (v) {
          const p = JSON.parse(v);
          setEnabled(p.enabled);
          setHours(p.hours.map(String));
        }
      })
      .catch(() => {});
  }, []);
  async function run(
    name: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(name);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <Page tabs>
      <Heading
        eyebrow="Raka & Anggun"
        title="Profil & pengaturan"
        subtitle="Profilmu dan koneksi kita."
      />
      <Notice text={error} error />
      <Notice text={message} />
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={22} bold>
              {app.profile.name}
            </Txt>
            <Txt size={13} color={C.muted}>
              {app.session?.user.email}
            </Txt>
          </View>
          <Txt size={30}>🌷</Txt>
        </Row>
        <Row
          style={{
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: C.line,
          }}
        >
          <Txt size={13} color={C.muted}>
            Target harian
          </Txt>
          <Txt size={16} bold color={C.green}>
            {app.profile.calorieTarget.toLocaleString("id-ID")} kkal
          </Txt>
        </Row>
        {!!app.profile.bio && (
          <Txt color={C.muted} size={13}>
            {app.profile.bio}
          </Txt>
        )}
        <Button
          title="Edit profil & target"
          variant="soft"
          onPress={() => router.push("/profile")}
        />
      </Card>
      <Card color={C.pink}>
        <Txt size={20} bold>
          Bersama {partnerName}
        </Txt>
        <Txt>Raka dan Anggun terhubung otomatis ♡</Txt>
        <Txt size={13} color={C.muted}>
          Progres harian dan semangat kita dibagikan bersama setelah masuk
          dengan akun Google masing-masing.
        </Txt>
        {app.partner?.ready === false && (
          <Txt size={13} color={C.rose}>
            {partnerName} belum melengkapi profil. Progresnya akan muncul
            setelah onboarding selesai.
          </Txt>
        )}
      </Card>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Txt bold size={18}>
              Analisis foto
            </Txt>
            <Txt size={13} color={C.muted}>
              Siap dipakai setelah masuk. Pilih foto makanan untuk melihat
              estimasi nutrisi.
            </Txt>
          </View>
          <Txt size={27}>📷</Txt>
        </Row>
        <Button
          title="Cek ketersediaan"
          variant="ghost"
          onPress={() =>
            void run("test", () => testAI(), "Analisis foto siap digunakan.")
          }
          loading={busy === "test"}
          disabled={!!busy}
        />
      </Card>
      {Platform.OS !== "web" && (
        <Card>
          <Row>
            <View style={{ flex: 1 }}>
              <Txt size={18} bold>
                Pengingat lembut
              </Txt>
              <Txt size={13} color={C.muted}>
                Makan harian & timbang tiap Senin.
              </Txt>
            </View>
            <Toggle
              accessibilityLabel="Aktifkan pengingat"
              value={enabled}
              onValueChange={setEnabled}
            />
          </Row>
          <Row>
            {["Pagi", "Siang", "Malam"].map((label, i) => (
              <Field
                key={label}
                label={label + " · jam :30"}
                value={hours[i]}
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={(v) =>
                  setHours((prev) => prev.map((x, j) => (i === j ? v : x)))
                }
              />
            ))}
          </Row>
          <Button
            title="Simpan pengingat"
            variant="soft"
            disabled={!!busy}
            onPress={() =>
              void run(
                "reminders",
                async () => {
                  const values = hours.map(Number);
                  if (
                    hours.some((v) => !v.trim()) ||
                    values.some((n) => !Number.isInteger(n) || n < 0 || n > 23)
                  )
                    throw Error("Jam harus 0–23.");
                  await reminders(enabled, values);
                  await AsyncStorage.setItem(
                    "diet-yuk:reminders",
                    JSON.stringify({ enabled, hours: values }),
                  );
                },
                "Jadwal pengingat tersimpan.",
              )
            }
          />
        </Card>
      )}
      <Button
        title="Keluar dari akun"
        variant="danger"
        onPress={() => void run("logout", () => app.signOut(), "")}
        disabled={!!busy}
      />
      <Txt size={13} color={C.muted} style={{ textAlign: "center" }}>
        Raka & Anggun ♡
      </Txt>
    </Page>
  );
}
