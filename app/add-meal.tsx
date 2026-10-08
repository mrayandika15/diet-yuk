import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { MOBILE_WIDTH, useKeyboardVisible } from "../src/lib/mobile-layout";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { analyze, refineAnalysis } from "../src/lib/managed-ai";
import { FoodImage, FoodImageCredit } from "../src/components/FoodImage";
import { FoodQuestions } from "../src/components/FoodQuestions";
import { FoodSearch } from "../src/components/FoodSearch";
import { foodImage } from "../src/lib/food-images";
import {
  Food,
  FoodQuestion,
  Meal,
  MealType,
  dayKey,
  foodSchema,
  mealLabels,
  mealTypes,
  resizeFood,
  total,
  uuid,
  validDate,
} from "../src/lib/domain";
import { matchReference } from "../src/lib/nutrition";
import { useApp } from "../src/state/AppContext";
import {
  Button,
  C,
  DateField,
  Field,
  Icon,
  Row,
  Txt,
} from "../src/components/ui";

type Step = 0 | 1 | 2;

const stepCopy = [
  {
    eyebrow: "LANGKAH 1 DARI 3",
    title: "Foto makananmu",
    body: "Ambil foto dari atas agar porsinya lebih mudah dikenali.",
  },
  {
    eyebrow: "LANGKAH 2 DARI 3",
    title: "Cek hasilnya",
    body: "Pastikan makanan dan porsinya sudah sesuai.",
  },
  {
    eyebrow: "LANGKAH 3 DARI 3",
    title: "Validasi & simpan",
    body: "Cek terakhir sebelum masuk ke catatan harian.",
  },
] as const;

function SmallIconButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 48,
        borderRadius: 15,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.line,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={18} />
      <Txt bold size={13} color={C.green}>
        {label}
      </Txt>
    </Pressable>
  );
}

function FoodRow({
  food,
  photo,
  onChange,
  onRemove,
}: {
  food: Food;
  photo?: string;
  onChange: (food: Food) => void;
  onRemove: () => void;
}) {
  const [grams, setGrams] = useState(String(Math.round(food.portion_g)));

  useEffect(() => {
    setGrams(String(Math.round(food.portion_g)));
  }, [food.portion_g]);

  function commit() {
    const value = Number(grams.replace(",", "."));
    if (value > 0 && value <= 10000) onChange(resizeFood(food, value));
    else setGrams(String(Math.round(food.portion_g)));
  }

  return (
    <View
      style={{
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 17,
        padding: 12,
        gap: 9,
      }}
    >
      <Row style={{ gap: 8 }}>
        <FoodImage
          name={food.name}
          imageUrl={food.image_url}
          fallbackUri={photo}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt bold numberOfLines={2} size={15}>
            {food.name}
          </Txt>
          <Txt size={12} color={C.muted}>
            P {Math.round(food.protein_g)} · K {Math.round(food.carbs_g)} · L{" "}
            {Math.round(food.fat_g)} g
          </Txt>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Txt bold size={15} color={C.green}>
            {Math.round(food.calories)}
          </Txt>
          <Txt size={12} color={C.muted}>
            kkal
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={"Hapus " + food.name}
          onPress={onRemove}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt bold color={C.rose}>
            ×
          </Txt>
        </Pressable>
      </Row>
      <Row style={{ justifyContent: "flex-start", gap: 7 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kurangi porsi 10 gram"
          onPress={() =>
            onChange(resizeFood(food, Math.max(1, food.portion_g - 10)))
          }
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: C.mint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt bold>−</Txt>
        </Pressable>
        <TextInput
          accessibilityLabel={"Porsi " + food.name + " dalam gram"}
          value={grams}
          onChangeText={setGrams}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          style={{
            width: 76,
            height: 44,
            fontSize: 16,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 10,
            textAlign: "center",
            color: C.ink,
            fontFamily: "Nunito_800ExtraBold",
          }}
        />
        <Txt size={11} color={C.muted}>
          gram
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tambah porsi 10 gram"
          onPress={() =>
            onChange(resizeFood(food, Math.min(10000, food.portion_g + 10)))
          }
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: C.mint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt bold>+</Txt>
        </Pressable>
      </Row>
    </View>
  );
}

export default function AddMeal() {
  const params = useLocalSearchParams<{
    id?: string;
    type?: MealType;
    photoOnly?: string;
  }>();
  const app = useApp();
  const { width, height } = useWindowDimensions();
  const compact = height < 720;
  const keyboard = useKeyboardVisible();
  const existing = app.meals.find((meal) => meal.id === params.id);
  const photoOnly = !existing && params.photoOnly === "1";
  const id = useRef(existing?.id ?? uuid());
  const [step, setStep] = useState<Step>(existing ? 1 : 0);
  const [items, setItems] = useState<Food[]>(existing?.items ?? []);
  const [photo, setPhoto] = useState(existing?.photo);
  const [photoPath, setPhotoPath] = useState(existing?.photoPath);
  const [base64, setBase64] = useState("");
  const [date, setDate] = useState(existing?.date ?? dayKey());
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [analysisJob, setAnalysisJob] = useState("");
  const [questions, setQuestions] = useState<FoodQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmationDone, setConfirmationDone] = useState(false);
  const confirming = step === 1 && questions.length > 0 && !confirmationDone;
  const [manual, setManual] = useState({
    name: "",
    portion_g: "100",
    calories: "",
    protein_g: "0",
    carbs_g: "0",
    fat_g: "0",
  });

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  const defaultType: MealType =
    hour < 10
      ? "breakfast"
      : hour < 15
        ? "lunch"
        : hour < 18
          ? "snack"
          : "dinner";
  const [type, setType] = useState<MealType>(
    existing?.type ??
      (mealTypes.includes(params.type as MealType)
        ? params.type!
        : defaultType),
  );

  const totals = total(items);

  function close() {
    const changed = existing
      ? JSON.stringify(items) !== JSON.stringify(existing.items) ||
        date !== existing.date ||
        type !== existing.type ||
        note !== existing.note ||
        photo !== existing.photo
      : items.length > 0 || Boolean(photo);
    if (changed) {
      if (Platform.OS === "web") {
        if (!window.confirm("Tutup tanpa menyimpan catatan ini?")) return;
        router.replace(existing ? "/(tabs)/meals" : "/");
      } else {
        Alert.alert("Tutup catatan?", "Perubahan belum disimpan.", [
          { text: "Lanjut edit", style: "cancel" },
          {
            text: "Tutup",
            style: "destructive",
            onPress: () => router.replace("/"),
          },
        ]);
      }
      return;
    }
    router.replace(existing ? "/(tabs)/meals" : "/");
  }

  async function pick(camera: boolean) {
    setError("");
    setBusy("Menyiapkan foto…");
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw Error("Izinkan kamera agar kamu bisa memotret makanan.");
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.8,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      const compressed = await manipulateAsync(
        asset.uri,
        [{ resize: { width: Math.min(asset.width, 1024) } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true },
      );
      setPhoto(compressed.uri);
      setPhotoPath(undefined);
      setBase64(compressed.base64 ?? "");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function analyzePhoto() {
    setError("");
    setBusy("Mengenali makanan…");
    try {
      const data = await analyze(base64);
      if (!data.items.length)
        throw Error("Makanan belum terdeteksi. Coba foto lain.");
      setItems(
        data.items.map((food, index) => {
          const estimated: Food = { ...food, source: "ai" };
          return data.questions.some((q) => q.item_index === index)
            ? estimated
            : matchReference(estimated);
        }),
      );
      setNote(data.notes);
      setAnalysisJob(data.jobId);
      setQuestions(data.questions);
      setAnswers({});
      setConfirmationDone(false);
      setStep(1);
    } catch (reason) {
      const issue = reason as Error;
      setError(
        issue.name === "TimeoutError"
          ? "Analisis terlalu lama. Silakan coba lagi."
          : issue.message,
      );
    } finally {
      setBusy("");
    }
  }

  async function confirmFoods() {
    const selected = Object.fromEntries(
      Object.entries(answers).filter(([, value]) => value !== "__unknown"),
    );
    if (!Object.keys(selected).length) {
      setError("");
      setConfirmationDone(true);
      return;
    }
    setError("");
    setBusy("Menyesuaikan estimasi…");
    try {
      const data = await refineAnalysis(analysisJob, selected);
      // Keep previously displayed TKPI values for unanswered foods, and never
      // undo a confirmed recipe by matching it to a generic reference.
      const affected = new Set(
        questions.filter((q) => selected[q.id]).map((q) => q.item_index),
      );
      setItems(
        data.items.map((food, index) =>
          affected.has(index) ? { ...food, source: "ai" } : items[index],
        ),
      );
      setNote(data.notes);
      setConfirmationDone(true);
    } catch (reason) {
      setError(
        (reason as Error).message + " Kamu juga bisa melewati konfirmasi.",
      );
    } finally {
      setBusy("");
    }
  }

  async function save() {
    setError("");
    setBusy("Menyimpan…");
    try {
      if (!items.length) throw Error("Tambahkan setidaknya satu makanan.");
      items.forEach((food) => foodSchema.parse(food));
      if (!validDate(date) || date > dayKey())
        throw Error("Tanggal harus valid dan tidak boleh di masa depan.");
      const meal: Meal = {
        id: id.current,
        date,
        type,
        items,
        photo,
        photoPath,
        note,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      await app.saveMeal(meal);
      if (Platform.OS !== "web")
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      router.replace(existing ? "/(tabs)/meals" : "/");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  function confirmRemove() {
    const remove = async () => {
      setBusy("Menghapus…");
      try {
        await app.deleteMeal(id.current);
        router.replace(existing ? "/(tabs)/meals" : "/");
      } catch (reason) {
        setError((reason as Error).message);
        setBusy("");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm("Hapus catatan ini?")) void remove();
      return;
    }
    Alert.alert("Hapus catatan?", "Catatan dan fotonya akan dihapus.", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => void remove() },
    ]);
  }

  function openPicker() {
    setManualMode(false);
    setPickerOpen(true);
  }

  function addFood(food: Food) {
    setItems((current) => [...current, { ...food }]);
    setPickerOpen(false);
    setError("");
  }

  function addManual() {
    const illustration = foodImage(manual.name, Platform.OS !== "web");
    if (!illustration && !photo) {
      setError("Tambahkan foto untuk makanan ini terlebih dahulu.");
      return;
    }
    try {
      const food = foodSchema.parse({
        ...manual,
        ...(illustration
          ? { image_url: illustration, image_source: "TheMealDB" }
          : {}),
        portion_g: Number(manual.portion_g.replace(",", ".")),
        calories: Number(manual.calories.replace(",", ".")),
        protein_g: Number(manual.protein_g.replace(",", ".")),
        carbs_g: Number(manual.carbs_g.replace(",", ".")),
        fat_g: Number(manual.fat_g.replace(",", ".")),
      });
      if (!manual.calories.trim()) throw Error();
      setItems((current) => [...current, { ...food, source: "manual" }]);
      setManual({
        name: "",
        portion_g: "100",
        calories: "",
        protein_g: "0",
        carbs_g: "0",
        fat_g: "0",
      });
      setPickerOpen(false);
      setError("");
    } catch {
      setError("Lengkapi nama, porsi, kalori, dan makronya.");
    }
  }

  const copy = confirming
    ? {
        ...stepCopy[1],
        title: "Konfirmasi sebentar",
        body: "Opsional · agar estimasinya lebih sesuai makananmu.",
      }
    : existing && step === 1
      ? {
          ...stepCopy[step],
          title: "Edit catatanmu",
          body: "Sesuaikan makanan dan porsinya sebelum menyimpan.",
        }
      : stepCopy[step];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: MOBILE_WIDTH,
            alignSelf: "center",
            paddingHorizontal: 20,
            paddingVertical: compact ? 8 : 14,
            gap: compact ? 9 : 13,
          }}
        >
          <Row>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                step === 0 || (existing && step === 1) ? "Tutup" : "Kembali"
              }
              onPress={() =>
                step === 0 || (existing && step === 1)
                  ? close()
                  : setStep((step - 1) as Step)
              }
              disabled={!!busy}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: C.white,
                borderWidth: 1,
                borderColor: C.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {step === 0 ? (
                <Txt bold size={19}>
                  ×
                </Txt>
              ) : (
                <Icon name="back" size={19} />
              )}
            </Pressable>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  style={{
                    width: index === step ? 30 : 9,
                    height: 8,
                    borderRadius: 99,
                    backgroundColor: index <= step ? C.green : "#DDE1D8",
                  }}
                />
              ))}
            </View>
            <View style={{ width: 44 }} />
          </Row>

          <View style={{ gap: 3 }}>
            <Txt size={12} bold color={C.green} style={{ letterSpacing: 1.6 }}>
              {copy.eyebrow}
            </Txt>
            <Txt bold size={compact ? 23 : 27}>
              {copy.title}
            </Txt>
            <Txt size={14} color={C.muted}>
              {copy.body}
            </Txt>
          </View>

          {!!(error || busy) && (
            <View
              accessibilityRole="alert"
              style={{
                borderRadius: 13,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: error ? C.pink : C.mint,
              }}
            >
              <Txt size={11} color={error ? "#8F3D4A" : C.green}>
                {error || busy}
              </Txt>
            </View>
          )}

          {step === 0 && (
            <>
              <View
                style={{
                  flex: 1,
                  minHeight: 0,
                  borderRadius: 24,
                  overflow: "hidden",
                  backgroundColor: C.mint,
                  borderWidth: 1,
                  borderColor: "#D9E6D1",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {photo ? (
                  <>
                    <Image
                      source={{ uri: photo }}
                      accessibilityLabel="Foto makanan"
                      resizeMode="cover"
                      style={{ width: "100%", height: "100%" }}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Hapus foto"
                      onPress={() => {
                        setPhoto(undefined);
                        setPhotoPath(undefined);
                        setBase64("");
                      }}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        backgroundColor: "rgba(255,255,255,0.9)",
                        paddingHorizontal: 12,
                        minHeight: 44,
                        justifyContent: "center",
                        paddingVertical: 10,
                        borderRadius: 14,
                      }}
                    >
                      <Txt bold size={13} color={C.rose}>
                        Ganti foto
                      </Txt>
                    </Pressable>
                  </>
                ) : (
                  <View style={{ alignItems: "center", gap: 8, padding: 28 }}>
                    <View
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 24,
                        backgroundColor: C.white,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="camera" size={30} />
                    </View>
                    <Txt bold size={17}>
                      Arahkan ke piring
                    </Txt>
                    <Txt
                      size={12}
                      color={C.muted}
                      style={{ textAlign: "center", maxWidth: 260 }}
                    >
                      Pastikan seluruh makanan terlihat dan tidak terlalu gelap.
                    </Txt>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 9 }}>
                <SmallIconButton
                  icon="camera"
                  label="Buka kamera"
                  onPress={() => void pick(true)}
                  disabled={!!busy}
                />
                <SmallIconButton
                  icon="image"
                  label="Pilih galeri"
                  onPress={() => void pick(false)}
                  disabled={!!busy}
                />
              </View>
              {photo || photoOnly ? (
                <Button
                  title="Analisis foto"
                  onPress={() => void analyzePhoto()}
                  loading={busy === "Mengenali makanan…"}
                  disabled={!!busy || !base64}
                />
              ) : (
                <Button
                  title="Lanjut tanpa foto"
                  variant="soft"
                  onPress={() => {
                    setError("");
                    setStep(1);
                  }}
                />
              )}
            </>
          )}

          {confirming && (
            <>
              <ScrollView
                key="food-questions"
                style={{ flex: 1, minHeight: 0 }}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                <FoodQuestions
                  questions={questions}
                  photo={photo}
                  items={items}
                  answers={answers}
                  onAnswer={(id, value) =>
                    setAnswers((current) => ({ ...current, [id]: value }))
                  }
                  disabled={!!busy}
                />
              </ScrollView>
              <Button
                title="Lanjut ke hasil"
                loading={!!busy}
                onPress={() => void confirmFoods()}
              />
              <Button
                title="Lewati, pakai estimasi awal"
                variant="ghost"
                disabled={!!busy}
                onPress={() => {
                  setConfirmationDone(true);
                  setError("");
                }}
              />
            </>
          )}
          {step === 1 && !confirming && (
            <>
              <View
                style={{
                  backgroundColor: C.mint,
                  borderRadius: 20,
                  padding: 13,
                }}
              >
                <Row>
                  <View>
                    <Txt size={12} bold color={C.green}>
                      TOTAL ESTIMASI
                    </Txt>
                    <Txt bold size={24} color={C.green}>
                      {Math.round(totals.calories)} kkal
                    </Txt>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tambah makanan"
                    onPress={openPicker}
                    style={{
                      height: 44,
                      paddingHorizontal: 14,
                      borderRadius: 13,
                      backgroundColor: C.green,
                      flexDirection: "row",
                      gap: 5,
                      alignItems: "center",
                    }}
                  >
                    <Icon name="plus" size={16} color={C.white} />
                    <Txt bold size={12} color={C.white}>
                      Tambah
                    </Txt>
                  </Pressable>
                </Row>
              </View>
              <View style={{ flex: 1, minHeight: 0 }}>
                {items.length ? (
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {items.map((food, index) => (
                      <FoodRow
                        key={food.name + index}
                        food={food}
                        photo={photo}
                        onChange={(next) =>
                          setItems((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? next : item,
                            ),
                          )
                        }
                        onRemove={() =>
                          setItems((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      />
                    ))}
                    <FoodImageCredit />
                  </ScrollView>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tambah makanan"
                    onPress={openPicker}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: "#C9D6C2",
                      borderRadius: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      backgroundColor: C.white,
                    }}
                  >
                    <Txt size={30}>🥗</Txt>
                    <Txt bold>Belum ada hasil</Txt>
                    <Txt size={12} color={C.muted}>
                      Ketuk untuk menambahkan makanan
                    </Txt>
                  </Pressable>
                )}
              </View>
              <Button
                title="Sudah sesuai, lanjut"
                onPress={() => {
                  setError("");
                  setStep(2);
                }}
                disabled={!items.length}
              />
            </>
          )}

          {step === 2 && (
            <>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ padding: 16, gap: 16 }}
                style={{
                  flex: 1,
                  minHeight: 0,
                  backgroundColor: C.white,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: C.line,
                }}
              >
                <Row>
                  <View
                    style={{
                      flex: 1,
                      minWidth: 0,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {photo ? (
                      <Image
                        source={{ uri: photo }}
                        style={{ width: 50, height: 50, borderRadius: 14 }}
                        accessibilityLabel="Foto makanan"
                      />
                    ) : (
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 14,
                          backgroundColor: C.mint,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Txt>🥗</Txt>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt bold>{items.length} makanan</Txt>
                      <Txt size={12} color={C.muted}>
                        P {Math.round(totals.protein_g)} · K{" "}
                        {Math.round(totals.carbs_g)} · L{" "}
                        {Math.round(totals.fat_g)} g
                      </Txt>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Txt bold size={20} color={C.green}>
                      {Math.round(totals.calories)}
                    </Txt>
                    <Txt size={12} color={C.green}>
                      kkal
                    </Txt>
                  </View>
                </Row>

                <View style={{ gap: 7 }}>
                  <Txt size={13} bold color={C.muted}>
                    WAKTU MAKAN
                  </Txt>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {mealTypes.map((mealType) => {
                      const selected = type === mealType;
                      return (
                        <Pressable
                          key={mealType}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setType(mealType)}
                          style={{
                            width: "48%",
                            flexGrow: 1,
                            minHeight: 48,
                            borderRadius: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: selected ? C.green : C.bg,
                          }}
                        >
                          <Txt
                            bold
                            size={12}
                            color={selected ? C.white : C.muted}
                            numberOfLines={2}
                          >
                            {mealLabels[mealType]}
                          </Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <DateField
                  label="Tanggal makan"
                  value={date}
                  onChangeText={setDate}
                  max={dayKey()}
                />
                <Field
                  label="Catatan (opsional)"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Tambahkan catatan singkat…"
                  maxLength={6000}
                  multiline
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setStep(1)}
                  style={{
                    alignSelf: "center",
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: 16,
                  }}
                >
                  <Txt bold size={12} color={C.green}>
                    Ubah makanan
                  </Txt>
                </Pressable>
              </ScrollView>
              <Button
                title={busy === "Menyimpan…" ? "Menyimpan…" : "Simpan catatan"}
                onPress={() => void save()}
                loading={busy === "Menyimpan…"}
                disabled={!!busy}
              />
              {existing && (
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmRemove}
                  disabled={!!busy}
                  style={{
                    alignSelf: "center",
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: 16,
                  }}
                >
                  <Txt size={13} bold color={C.rose}>
                    Hapus catatan
                  </Txt>
                </Pressable>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View
          style={{ flex: 1, justifyContent: "flex-end", alignItems: "center" }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup pilihan makanan"
            onPress={() => setPickerOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(36,44,37,0.42)",
            }}
          />
          <SafeAreaView
            edges={["bottom"]}
            style={{
              width: "100%",
              maxWidth: MOBILE_WIDTH,
              maxHeight: keyboard ? "95%" : "86%",
              backgroundColor: C.bg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              overflow: "hidden",
              flexShrink: 1,
            }}
          >
            <View style={{ padding: 18, gap: 12, flexShrink: 1, minHeight: 0 }}>
              <Row style={{ flexShrink: 0 }}>
                <Txt bold size={21}>
                  {manualMode ? "Isi makanan" : "Tambah makanan"}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tutup"
                  onPress={() => setPickerOpen(false)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: C.white,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: C.line,
                  }}
                >
                  <Txt bold>×</Txt>
                </Pressable>
              </Row>

              {manualMode ? (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 11 }}
                >
                  <Row style={{ gap: 12 }}>
                    <FoodImage name={manual.name} fallbackUri={photo} />
                    <View style={{ flex: 1 }}>
                      <Txt bold size={14}>
                        Gambar makanan
                      </Txt>
                      <Txt size={12} color={C.muted}>
                        {foodImage(manual.name)
                          ? "Ilustrasi tersedia untuk menu ini."
                          : photo
                            ? "Foto makananmu akan ikut disimpan."
                            : "Tambahkan foto agar catatanmu punya gambar."}
                      </Txt>
                    </View>
                  </Row>
                  <Button
                    title={
                      photo ? "Ganti foto makanan" : "Tambahkan foto makanan"
                    }
                    variant="soft"
                    onPress={() => void pick(false)}
                    loading={!!busy}
                  />
                  {!!error && (
                    <Txt accessibilityRole="alert" size={13} color={C.rose}>
                      {error}
                    </Txt>
                  )}
                  <Field
                    label="Nama makanan"
                    value={manual.name}
                    placeholder="Contoh: Sup ayam"
                    onChangeText={(value) =>
                      setManual((current) => ({ ...current, name: value }))
                    }
                  />
                  <View style={{ flexDirection: "row", gap: 9 }}>
                    <Field
                      label="Porsi (g)"
                      value={manual.portion_g}
                      keyboardType="decimal-pad"
                      onChangeText={(value) =>
                        setManual((current) => ({
                          ...current,
                          portion_g: value,
                        }))
                      }
                    />
                    <Field
                      label="Kalori"
                      value={manual.calories}
                      keyboardType="decimal-pad"
                      onChangeText={(value) =>
                        setManual((current) => ({
                          ...current,
                          calories: value,
                        }))
                      }
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 9 }}>
                    {(
                      [
                        ["protein_g", "Protein"],
                        ["carbs_g", "Karbo"],
                        ["fat_g", "Lemak"],
                      ] as const
                    ).map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        value={manual[key]}
                        keyboardType="decimal-pad"
                        onChangeText={(value) =>
                          setManual((current) => ({
                            ...current,
                            [key]: value,
                          }))
                        }
                      />
                    ))}
                  </View>
                  <Button title="Tambahkan" onPress={addManual} />
                  <Button
                    title="Kembali ke pencarian"
                    variant="ghost"
                    onPress={() => setManualMode(false)}
                  />
                </ScrollView>
              ) : (
                <FoodSearch
                  active={pickerOpen}
                  keyboard={keyboard}
                  onAdd={addFood}
                  onManual={() => setManualMode(true)}
                  onPhoto={() => {
                    setPickerOpen(false);
                    setStep(0);
                  }}
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
