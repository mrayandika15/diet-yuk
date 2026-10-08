import { useEffect, useState } from "react";
import { Platform, Switch, View, Share } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useApp } from "../../src/state/AppContext";
import { testAI, endpoint } from "../../src/lib/ai";
import { reminders } from "../../src/lib/reminders";
import { companionName } from "../../src/lib/personal";
import { isPerson } from "../../src/lib/personal";
import {
  Page,
  Heading,
  Card,
  Row,
  Txt,
  C,
  Field,
  Button,
  Notice,
} from "../../src/components/ui";
export default function Settings() {
  const app = useApp();
  const partnerName = app.partner?.name || companionName(app.profile.name);
  const [showAI, setShowAI] = useState(false);
  const [ai, setAI] = useState(app.ai);
  const [code, setCode] = useState("");
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
    <Page bottom={132}>
      <Heading
        eyebrow="Raka & Anggun"
        title="Pengaturan"
        subtitle="Profilmu dan koneksi kita."
      />
      <Notice text={error} error />
      <Notice text={message} />
      <Card>
        <Row>
          <View>
            <Txt size={22} bold>
              {app.profile.name}
            </Txt>
            <Txt size={13} color={C.muted}>
              {app.local
                ? "Tersimpan di perangkat ini"
                : app.session?.user.is_anonymous
                  ? "Profil tersimpan · HP ini diingat"
                  : app.session?.user.email}
            </Txt>
          </View>
          <Txt size={30}>🌷</Txt>
        </Row>
        {!!app.profile.bio && (
          <Txt color={C.muted} size={13}>
            {app.profile.bio}
          </Txt>
        )}
        <Button
          title="Edit profil & target →"
          variant="soft"
          onPress={() => router.push("/profile")}
        />
        {app.local && (
          <View style={{ gap: 8 }}>
            <Button
              title="Hubungkan HP ini ke Supabase"
              disabled={!!busy || !isPerson(app.profile.name)}
              onPress={() => {
                const name = app.profile.name;
                if (isPerson(name))
                  void run(
                    "connect",
                    () => app.choosePerson(name),
                    "HP terhubung.",
                  );
              }}
            />
            <Txt size={12} color={C.muted}>
              Catatan lokal lama tetap di browser. Setelah terhubung, lengkapi
              bio untuk mulai menyimpan ke Supabase.
            </Txt>
          </View>
        )}
      </Card>
      <Card color={C.pink}>
        <Txt size={20} bold>
          Bersama {partnerName}
        </Txt>
        {app.partner ? (
          <>
            <Txt>
              {app.partner.name
                ? `Terhubung dengan ${app.partner.name} ♡`
                : `Bagikan kode ini ke ${partnerName}.`}
            </Txt>
            <Txt size={25} bold selectable style={{ letterSpacing: 2 }}>
              {app.partner.inviteCode}
            </Txt>
            <Button
              title="Bagikan kode pasangan"
              variant="ghost"
              onPress={() =>
                void Share.share({
                  message: `Catatan Raka & Anggun ♡ Kode untuk terhubung: ${app.partner!.inviteCode}`,
                }).catch((e) => setError(e.message))
              }
            />
          </>
        ) : (
          <>
            <Txt size={13}>
              Hubungkan sekali agar catatan kita saling terlihat.
            </Txt>
            <Button
              title="Buat kode undangan"
              variant="soft"
              onPress={() =>
                void run(
                  "pair",
                  () => app.pair(),
                  "Kode undangan siap dibagikan.",
                )
              }
              disabled={!!busy || app.local}
            />
            <Field
              label="Kode pasangan"
              placeholder="12 karakter kode undangan"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              maxLength={12}
            />
            <Button
              title={`Hubungkan dengan ${partnerName}`}
              variant="ghost"
              onPress={() =>
                void run("pair", () => app.pair(code), "Sudah terhubung ♡")
              }
              disabled={!!busy || app.local || code.length !== 12}
            />
            {app.local && (
              <Txt size={12} color={C.rose}>
                Masuk akun terlebih dahulu untuk berbagi progres.
              </Txt>
            )}
          </>
        )}
      </Card>
      <Button
        title={showAI ? "Tutup pengaturan foto" : "Atur analisis foto"}
        variant="ghost"
        onPress={() => setShowAI(!showAI)}
      />
      {showAI && (
        <Card>
          <Row>
            <View style={{ flex: 1 }}>
              <Txt bold size={18}>
                Analisis foto
              </Txt>
              <Txt size={12} color={C.muted}>
                Analisis foto makanan
              </Txt>
            </View>
            <Txt size={27}>📷</Txt>
          </Row>
          <Row>
            <View style={{ flex: 1 }}>
              <Txt bold>Mode simulasi</Txt>
              <Txt size={12} color={C.muted}>
                Pakai contoh hasil untuk mencoba alur.
              </Txt>
            </View>
            <Switch
              accessibilityLabel="Mode simulasi AI"
              value={ai.mock}
              onValueChange={(mock) => setAI((s) => ({ ...s, mock }))}
              trackColor={{ true: C.green }}
            />
          </Row>
          <Field
            label="AI Base URL · HTTPS"
            value={ai.url}
            onChangeText={(url) => setAI((s) => ({ ...s, url }))}
            placeholder="https://ai.domainmu.com"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Token server AI"
            value={ai.token}
            onChangeText={(token) => setAI((s) => ({ ...s, token }))}
            placeholder="Bearer token"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {Platform.OS === "web" && (
            <Txt size={12} color={C.muted}>
              Token disimpan selama sesi halaman ini.
            </Txt>
          )}
          <Button
            title="Simpan pengaturan AI"
            onPress={() =>
              void run(
                "saveAI",
                async () => {
                  if (!ai.mock) {
                    endpoint(ai.url);
                    if (!ai.token.trim()) throw Error("Token AI belum diisi.");
                  }
                  await app.saveAI({
                    ...ai,
                    url: ai.url.trim(),
                    token: ai.token.trim(),
                  });
                },
                "Pengaturan AI tersimpan.",
              )
            }
            disabled={!!busy}
          />
          <Button
            title="Tes koneksi"
            variant="ghost"
            onPress={() =>
              void run("test", () => testAI(ai), "Server AI tersambung.")
            }
            loading={busy === "test"}
            disabled={!!busy}
          />
        </Card>
      )}
      {Platform.OS !== "web" && (
        <Card>
          <Row>
            <View style={{ flex: 1 }}>
              <Txt size={18} bold>
                Pengingat lembut
              </Txt>
              <Txt size={12} color={C.muted}>
                Makan harian & timbang tiap Senin.
              </Txt>
            </View>
            <Switch
              accessibilityLabel="Aktifkan pengingat"
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ true: C.green }}
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
      {!app.session?.user.is_anonymous && (
        <Button
          title={app.local ? "Keluar dari mode lokal" : "Keluar dari akun"}
          variant="ghost"
          onPress={() => void run("logout", () => app.signOut(), "")}
          disabled={!!busy}
        />
      )}
      {app.session?.user.is_anonymous && (
        <Txt size={12} color={C.muted}>
          Buka dari browser atau PWA yang sama agar profilmu dikenali. Menghapus
          data browser akan menghapus sesi perangkat.
        </Txt>
      )}
      <Txt size={12} color={C.muted} style={{ textAlign: "center" }}>
        Raka & Anggun ♡
      </Txt>
    </Page>
  );
}
