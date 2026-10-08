import { useState } from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useApp } from "../src/state/AppContext";
import {
  Page,
  Txt,
  Button,
  Notice,
  Mascots,
  C,
  Icon,
  Row,
} from "../src/components/ui";

export default function Welcome() {
  const app = useApp();
  const params = useLocalSearchParams<{
    error?: string;
    error_description?: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (app.session)
    return <Redirect href={app.profile.name ? "/" : "/profile"} />;
  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await app.signInWithGoogle();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      center
      footer={
        <>
          <Notice
            text={
              error ||
              app.error ||
              (params.error
                ? "Login belum berhasil. Coba lagi dengan akun Google yang terdaftar."
                : "")
            }
            error
          />
          <Button
            title="Masuk dengan Google"
            onPress={() => void start()}
            loading={busy}
          />
          <Txt size={12} color={C.muted} style={{ textAlign: "center" }}>
            Khusus akun Raka & Anggun.
          </Txt>
        </>
      }
    >
      <View style={{ gap: 28 }}>
        <View style={{ alignItems: "center", gap: 24 }}>
          <Txt size={12} bold color={C.green} style={{ letterSpacing: 2 }}>
            RAKA & ANGGUN
          </Txt>
          <View
            style={{
              width: 190,
              height: 160,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.mint,
              borderRadius: 48,
            }}
          >
            <Mascots />
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Txt bold size={36} accessibilityRole="header">
            Sehat bareng,{"\n"}satu hari lagi.
          </Txt>
          <Txt size={16} color={C.muted}>
            Foto makananmu, kenali kebutuhan tubuh, dan saling dukung sampai
            hari kita.
          </Txt>
        </View>
        <View style={{ gap: 14 }}>
          <Row style={{ justifyContent: "flex-start" }}>
            <Icon name="camera" size={20} />
            <Txt size={14}>Catat dari foto, cek porsinya.</Txt>
          </Row>
          <Row style={{ justifyContent: "flex-start" }}>
            <Icon name="heart" size={20} />
            <Txt size={14}>Jalani prosesnya berdua.</Txt>
          </Row>
        </View>
      </View>
    </Page>
  );
}
