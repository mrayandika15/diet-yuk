import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../src/state/AppContext";
import { Profile, calculateTarget, validateProfile } from "../src/lib/domain";
import { people } from "../src/lib/personal";
import {
  Page,
  Heading,
  Card,
  Field,
  Row,
  Chip,
  Button,
  Notice,
  Txt,
  C,
} from "../src/components/ui";
export default function ProfileScreen() {
  const app = useApp();
  const [p, setP] = useState<Profile>({
    ...app.profile,
    name: app.profile.name || app.selectedPerson || "",
    weddingDate: app.partner?.weddingDate ?? app.profile.weddingDate,
  });
  const [numbers, setNumbers] = useState({
    height: String(p.height),
    weight: String(p.weight),
    targetWeight: String(p.targetWeight),
  });
  const setNumber = (key: keyof typeof numbers, value: string) => {
    setNumbers((prev) => ({ ...prev, [key]: value }));
    setP((prev) => ({ ...prev, [key]: Number(value.replace(",", ".")) }));
  };
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof Profile, value: any) =>
    setP((prev) => ({ ...prev, [key]: value }));
  async function save() {
    setError("");
    if (!people.some((name) => name === p.name)) {
      setError("Pilih profil Raka atau Anggun dulu.");
      return;
    }
    const invalid = validateProfile(p);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    try {
      await app.saveProfile({ ...p, name: p.name.trim() });
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="Raka & Anggun"
        title={p.name ? "Bio " + p.name : "Profil & target"}
        subtitle="Lengkapi sekali, lalu mulai catat makananmu."
      />
      <Card>
        {!app.selectedPerson && (
          <Txt bold size={13}>
            Ini profil siapa?
          </Txt>
        )}
        {!app.selectedPerson && (
          <Row style={{ justifyContent: "flex-start" }}>
            {people.map((name) => (
              <Chip
                key={name}
                title={name}
                selected={p.name === name}
                onPress={() => set("name", name)}
              />
            ))}
          </Row>
        )}
        <Field
          label="Bio singkat (opsional)"
          placeholder="Tujuan kecilmu untuk lebih sehat…"
          value={p.bio ?? ""}
          multiline
          maxLength={300}
          onChangeText={(value) => set("bio", value)}
        />
        <Row style={{ justifyContent: "flex-start" }}>
          <Chip
            title="Laki-laki"
            selected={p.sex === "male"}
            onPress={() => set("sex", "male")}
          />
          <Chip
            title="Perempuan"
            selected={p.sex === "female"}
            onPress={() => set("sex", "female")}
          />
        </Row>
        <Field
          label="Tanggal lahir · YYYY-MM-DD"
          value={p.birthDate}
          onChangeText={(v) => set("birthDate", v)}
          autoCapitalize="none"
        />
        <Row>
          <Field
            label="Tinggi · cm"
            value={numbers.height}
            onChangeText={(v) => setNumber("height", v)}
            keyboardType="decimal-pad"
          />
          <Field
            label="Berat awal · kg"
            value={numbers.weight}
            onChangeText={(v) => setNumber("weight", v)}
            keyboardType="decimal-pad"
          />
        </Row>
        <Field
          label="Target berat · kg"
          value={numbers.targetWeight}
          onChangeText={(v) => setNumber("targetWeight", v)}
          keyboardType="decimal-pad"
        />
        <Txt size={12} color={C.muted} bold>
          Aktivitas sehari-hari
        </Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            ["Banyak duduk", 1.2],
            ["Ringan", 1.375],
            ["Sedang", 1.55],
            ["Aktif", 1.725],
          ].map(([name, value]) => (
            <Chip
              key={name}
              title={String(name)}
              selected={p.activity === value}
              onPress={() => set("activity", value)}
            />
          ))}
        </View>
      </Card>
      <Card color={C.mint}>
        <Txt bold>Target harianmu</Txt>
        <Field
          label="Kalori · kkal"
          value={String(p.calorieTarget || "")}
          onChangeText={(v) => set("calorieTarget", Number(v))}
          keyboardType="number-pad"
        />
        <Button
          title="Hitung dari profil"
          variant="ghost"
          onPress={() => {
            const invalid = validateProfile({ ...p, calorieTarget: 1900 });
            if (invalid) setError(invalid);
            else {
              set("calorieTarget", calculateTarget(p));
              setError("");
            }
          }}
        />
        <Txt size={12} color={C.green}>
          Estimasi awal untuk orang dewasa. Sesuaikan dengan kebutuhan dan saran
          tenaga kesehatan.
        </Txt>
      </Card>
      <Field
        label="Hari pernikahan · YYYY-MM-DD"
        value={p.weddingDate}
        onChangeText={(v) => set("weddingDate", v)}
      />
      <Notice text={error} error />
      <Button title="Simpan bio & mulai" onPress={save} loading={busy} />
      {!!app.profile.name && (
        <Button title="Kembali" variant="ghost" onPress={() => router.back()} />
      )}
    </Page>
  );
}
