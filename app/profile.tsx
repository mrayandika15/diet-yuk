import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../src/state/AppContext";
import { Profile, dayKey, validateProfile } from "../src/lib/domain";
import {
  activityLevels,
  CaloriePlan,
  validatePlanInput,
} from "../src/lib/calorie-plan";
import { planCalories } from "../src/lib/managed-ai";
import {
  Page,
  Heading,
  Card,
  Field,
  DateField,
  Icon,
  Row,
  Chip,
  Button,
  Notice,
  Txt,
  C,
  Toggle,
} from "../src/components/ui";

const goalLabels = {
  lose: "Turun bertahap",
  maintain: "Pertahankan berat",
  gain: "Naik bertahap",
};

export default function ProfileScreen() {
  const app = useApp();
  const onboarding = !app.profile.name;
  const [p, setP] = useState<Profile>({
    ...app.profile,
    name: app.profile.name || app.selectedPerson || "",
    birthDate: onboarding ? "" : app.profile.birthDate,
    height: onboarding ? NaN : app.profile.height,
    weight: onboarding ? NaN : app.profile.weight,
    targetWeight: onboarding ? NaN : app.profile.targetWeight,
    weddingDate: app.partner?.weddingDate ?? app.profile.weddingDate,
  });
  const [numbers, setNumbers] = useState({
    height: onboarding ? "" : String(p.height),
    weight: onboarding ? "" : String(p.weight),
    targetWeight: onboarding ? "" : String(p.targetWeight),
  });
  const [sexChosen, setSexChosen] = useState(!onboarding);
  const [activityChosen, setActivityChosen] = useState(!onboarding);
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<CaloriePlan | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setP((prev) => ({ ...prev, [key]: value }));
    setPlan(null);
    setError("");
  };
  const setNumber = (key: keyof typeof numbers, value: string) => {
    setNumbers((prev) => ({ ...prev, [key]: value }));
    set(key, value.trim() ? Number(value.replace(",", ".")) : NaN);
  };
  function next() {
    if (!sexChosen) {
      setError("Pilih jenis kelamin untuk perhitungan.");
      return;
    }
    const issue = validatePlanInput(
      {
        ...p,
        targetWeight: p.weight,
        activity: 1.2,
        requiresClinicalPlan: false,
      },
      dayKey(),
    );
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    setStep(1);
  }
  async function calculate() {
    setError("");
    if (!activityChosen) {
      setError("Pilih aktivitas sehari-hari.");
      return;
    }
    const issue = validatePlanInput(p, dayKey());
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    try {
      const result = await planCalories({
        birthDate: p.birthDate,
        sex: p.sex,
        height: p.height,
        weight: p.weight,
        targetWeight: p.targetWeight,
        activity: p.activity,
        bio: p.bio ?? "",
        requiresClinicalPlan: p.requiresClinicalPlan ?? false,
      });
      setPlan(result);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!plan || plan.needsReview) return;
    const profile = {
      ...p,
      calorieTarget: plan.calorieTarget,
      caloriePlan: plan,
    };
    const issue = validateProfile(profile);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await app.saveProfile(profile);
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function back() {
    setError("");
    setStep(step - 1);
  }

  return (
    <Page
      resetKey={step}
      footer={
        <>
          {" "}
          <Notice text={error} error />
          {busy && step === 1 && (
            <Txt size={13} color={C.muted}>
              Menghitung kebutuhan energi dan membaca ceritamu…
            </Txt>
          )}
          {step === 0 && <Button title="Lanjut" onPress={next} />}
          {step === 1 && (
            <Button
              title="Hitung target harian"
              onPress={calculate}
              loading={busy}
              disabled={p.requiresClinicalPlan}
            />
          )}
          {step === 2 && plan && !plan.needsReview && (
            <Button
              title={
                onboarding ? "Gunakan target & mulai" : "Simpan profil & target"
              }
              onPress={save}
              loading={busy}
            />
          )}
        </>
      }
    >
      {(step > 0 || !onboarding) && (
        <Row>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              step > 0
                ? "Kembali ke langkah sebelumnya"
                : "Kembali ke dashboard"
            }
            disabled={busy}
            onPress={() => (step > 0 ? back() : router.back())}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: C.white,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: C.line,
            }}
          >
            <Icon name="back" />
          </Pressable>
          <Txt size={13} color={C.muted}>
            Langkah {step + 1} dari 3
          </Txt>
        </Row>
      )}
      <Heading
        eyebrow={onboarding ? `Kenalan dulu, ${p.name}` : `Profil ${p.name}`}
        title={
          ["Mulai dari tubuhmu", "Rutinitas & tujuanmu", "Target harianmu"][
            step
          ]
        }
        subtitle="Kebutuhan kalorimu dihitung otomatis dari profil."
      />
      <Row style={{ gap: 8 }}>
        {["Data tubuh", "Aktivitas", "Hasil"].map((label, index) => (
          <View key={label} style={{ flex: 1, gap: 6 }}>
            <View
              style={{
                height: 4,
                borderRadius: 4,
                backgroundColor: index <= step ? C.green : C.line,
              }}
            />
            <Txt size={12} bold color={index === step ? C.green : C.muted}>
              {index + 1}. {label}
            </Txt>
          </View>
        ))}
      </Row>
      {step === 0 && (
        <Card>
          <Txt bold>Data untuk menghitung kebutuhan energi</Txt>
          <Txt size={13} color={C.muted}>
            Isi sesuai kondisi tubuhmu saat ini.
          </Txt>
          <Txt size={12} bold color={C.muted}>
            Jenis kelamin untuk rumus metabolisme
          </Txt>
          <Row style={{ justifyContent: "flex-start" }}>
            {(
              [
                ["Laki-laki", "male"],
                ["Perempuan", "female"],
              ] as const
            ).map(([label, value]) => (
              <Chip
                key={value}
                title={label}
                selected={sexChosen && p.sex === value}
                onPress={() => {
                  set("sex", value);
                  setSexChosen(true);
                }}
              />
            ))}
          </Row>
          <DateField
            label="Tanggal lahir"
            value={p.birthDate}
            max={`${Number(dayKey().slice(0, 4)) - 18}${dayKey().slice(4)}`}
            onChangeText={(v) => set("birthDate", v)}
          />
          <Row>
            <Field
              label="Tinggi · cm"
              placeholder="170"
              value={numbers.height}
              onChangeText={(v) => setNumber("height", v)}
              keyboardType="decimal-pad"
            />
            <Field
              label="Berat saat ini · kg"
              placeholder="70"
              value={numbers.weight}
              onChangeText={(v) => setNumber("weight", v)}
              keyboardType="decimal-pad"
            />
          </Row>
        </Card>
      )}
      {step === 1 && (
        <>
          <Card>
            <Txt bold>Berat yang ingin kamu capai</Txt>
            <Field
              label="Target berat · kg"
              placeholder="65"
              value={numbers.targetWeight}
              editable={!busy}
              onChangeText={(v) => setNumber("targetWeight", v)}
              keyboardType="decimal-pad"
            />
            <Button
              title="Pertahankan berat saat ini"
              variant="ghost"
              disabled={busy}
              onPress={() => setNumber("targetWeight", String(p.weight))}
            />
            <Txt size={13} color={C.muted}>
              Target di bawah, sama dengan, atau di atas berat saat ini
              menentukan arah penyesuaian kalori.
            </Txt>
          </Card>
          <Card>
            <Txt bold>Seberapa aktif harimu?</Txt>
            {activityLevels.map((level) => (
              <Pressable
                key={level.value}
                accessibilityRole="button"
                accessibilityState={{
                  selected: activityChosen && p.activity === level.value,
                }}
                disabled={busy}
                onPress={() => {
                  set("activity", level.value);
                  setActivityChosen(true);
                }}
                style={{
                  borderWidth: 1,
                  borderColor:
                    activityChosen && p.activity === level.value
                      ? C.green
                      : C.line,
                  borderRadius: 16,
                  padding: 14,
                  gap: 3,
                  backgroundColor:
                    activityChosen && p.activity === level.value
                      ? C.mint
                      : C.white,
                }}
              >
                <Row>
                  <Txt bold size={15} style={{ flex: 1 }}>
                    {level.label}
                  </Txt>
                  {activityChosen && p.activity === level.value && (
                    <Icon name="check" size={18} />
                  )}
                </Row>
                <Txt size={13} color={C.muted}>
                  {level.detail}
                </Txt>
              </Pressable>
            ))}
            <Field
              label="Cerita aktivitas & tujuan (opsional)"
              placeholder="Kerja banyak duduk, jalan sore, ingin turun berat bertahap…"
              value={p.bio ?? ""}
              multiline
              maxLength={300}
              editable={!busy}
              onChangeText={(v) => set("bio", v)}
            />
            <Txt size={13} color={C.muted}>
              AI membaca ceritamu untuk menjelaskan hasil. Pilihan aktivitas di
              atas dipakai dalam perhitungan.
            </Txt>
          </Card>
          <Card>
            <Row>
              <Txt size={13} style={{ flex: 1 }}>
                Sedang hamil/menyusui atau membutuhkan rencana nutrisi medis
              </Txt>
              <Toggle
                accessibilityLabel="Membutuhkan rencana nutrisi khusus"
                disabled={busy}
                value={p.requiresClinicalPlan ?? false}
                onValueChange={(v) => set("requiresClinicalPlan", v)}
              />
            </Row>
            {p.requiresClinicalPlan && (
              <Txt size={13} color={C.rose}>
                Target otomatis belum dapat dipakai. Bahas kebutuhan energi
                dengan tenaga kesehatan terlebih dahulu.
              </Txt>
            )}
            <DateField
              label="Hari pernikahan"
              value={p.weddingDate}
              editable={!busy}
              onChangeText={(v) => set("weddingDate", v)}
            />
          </Card>
        </>
      )}
      {step === 2 && plan && (
        <>
          {plan.needsReview ? (
            <Card color={C.peach}>
              <Txt bold>Profilmu perlu ditinjau dulu</Txt>
              <Txt>{plan.reviewReason}</Txt>
              <Txt size={13} color={C.muted}>
                Target otomatis belum diterapkan. Periksa kembali data atau
                bahas kebutuhan energi dengan tenaga kesehatan.
              </Txt>
            </Card>
          ) : (
            <>
              <Card color={C.mint}>
                <Txt size={12} bold color={C.green}>
                  {goalLabels[plan.goal]}
                </Txt>
                <Txt size={48} bold color={C.green}>
                  {plan.calorieTarget.toLocaleString("id-ID")}
                </Txt>
                <Txt bold color={C.green}>
                  kkal / hari
                </Txt>
                <Txt>{plan.explanation}</Txt>
                {plan.floorApplied && (
                  <Txt size={12} color={C.green}>
                    Batas bawah aplikasi diterapkan agar pengurangan energi
                    tidak terlalu besar.
                  </Txt>
                )}
              </Card>
              <Card>
                <Txt bold>Bagaimana angka ini dihitung?</Txt>
                {[
                  [
                    "Energi dasar · Mifflin–St Jeor",
                    `${plan.bmr.toLocaleString("id-ID")} kkal`,
                  ],
                  [
                    "Setelah aktivitas",
                    `${plan.maintenance.toLocaleString("id-ID")} kkal`,
                  ],
                  [
                    "Penyesuaian tujuan",
                    `${plan.adjustment > 0 ? "+" : ""}${plan.adjustment} kkal`,
                  ],
                ].map(([label, value]) => (
                  <Row key={label}>
                    <Txt size={13} color={C.muted} style={{ flex: 1 }}>
                      {label}
                    </Txt>
                    <Txt size={13} bold>
                      {value}
                    </Txt>
                  </Row>
                ))}
                {!!plan.activityInsight && (
                  <Txt size={13}>{plan.activityInsight}</Txt>
                )}
                <Txt size={13} color={C.muted}>
                  {plan.explanationSource === "ai"
                    ? "Penjelasan dibantu AI. "
                    : "AI belum memberi penjelasan; rumus tetap berhasil dihitung. "}
                  Ini estimasi awal untuk orang dewasa. Tinjau berdasarkan
                  perubahan berat dan kondisi tubuh.
                </Txt>
                <Button
                  title="Lihat dasar rumus"
                  variant="ghost"
                  onPress={() => {
                    Linking.openURL(
                      "https://pubmed.ncbi.nlm.nih.gov/2305711/",
                    ).catch(() => setError("Tautan belum dapat dibuka."));
                  }}
                />
              </Card>
            </>
          )}
        </>
      )}
    </Page>
  );
}
