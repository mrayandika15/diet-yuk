import { useState } from "react";
import { View, Pressable } from "react-native";
import { Redirect } from "expo-router";
import { useApp } from "../src/state/AppContext";
import { people, Person } from "../src/lib/personal";
import {
  Page,
  Card,
  Txt,
  Button,
  Notice,
  Mascots,
  C,
} from "../src/components/ui";

export default function Welcome() {
  const app = useApp();
  const [chosen, setChosen] = useState<Person | null>(app.selectedPerson);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (app.session || app.local)
    return <Redirect href={app.profile.name ? "/" : "/profile"} />;

  async function start() {
    if (!chosen || busy) return;
    setBusy(true);
    setError("");
    try {
      await app.choosePerson(chosen);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <View style={{ paddingTop: 24, alignItems: "center", gap: 14 }}>
        <Txt bold size={12} color={C.green} style={{ letterSpacing: 3 }}>
          RAKA & ANGGUN
        </Txt>
        <Mascots />
        <Txt bold size={32}>
          Ini HP siapa?
        </Txt>
        <Txt color={C.muted} style={{ textAlign: "center" }}>
          Pilih namamu, lalu lengkapi bio.{"\n"}Cukup sekali di perangkat ini.
        </Txt>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {people.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={"Pilih " + name}
            accessibilityState={{ selected: chosen === name }}
            disabled={busy}
            onPress={() => setChosen(name)}
            style={{ flex: 1 }}
          >
            <Card
              color={chosen === name ? C.mint : C.white}
              style={{
                alignItems: "center",
                paddingVertical: 28,
                borderColor: chosen === name ? C.green : C.line,
                borderWidth: 2,
              }}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  backgroundColor: name === "Raka" ? C.peach : C.pink,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt bold size={26}>
                  {name[0]}
                </Txt>
              </View>
              <Txt bold size={21}>
                {name}
              </Txt>
              <Txt size={12} color={C.green}>
                {chosen === name ? "Dipilih ✓" : "Pilih profil"}
              </Txt>
            </Card>
          </Pressable>
        ))}
      </View>
      <Notice text={error || app.error} error />
      <Button
        title={chosen ? "Lanjut sebagai " + chosen : "Pilih nama dulu"}
        onPress={() => void start()}
        disabled={!chosen || busy}
        loading={busy}
      />
      <Txt size={12} color={C.muted} style={{ textAlign: "center" }}>
        Pilihanmu diingat di browser ini. Bio dan catatan disimpan ke akun
        perangkatmu.
      </Txt>
    </Page>
  );
}
