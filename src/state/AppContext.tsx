import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  Meal,
  Food,
  foodSchema,
  Profile,
  WeightLog,
  defaultProfile,
  uuid,
  dayKey,
  total,
} from "../lib/domain";
import { AISettings } from "../lib/ai";
import { getToken, setToken } from "../lib/secrets";
import { File, Paths } from "expo-file-system";
import { Platform, AppState } from "react-native";
import { isPerson, Person } from "../lib/personal";
import {
  connectionError,
  devicePersonKey,
  profileCacheKey,
  restorePerson,
} from "../lib/device-profile";
type Data = {
  profile: Profile;
  meals: Meal[];
  weights: WeightLog[];
  favorites: Food[];
};
type Partner = {
  name: string;
  target: number;
  calories: number;
  coupleId: string;
  inviteCode: string;
  weddingDate: string;
};
type Context = Data & {
  ready: boolean;
  session: Session | null;
  local: boolean;
  error: string;
  partner: Partner | null;
  cheer: string;
  ai: AISettings;
  selectedPerson: Person | null;
  choosePerson: (name: Person) => Promise<void>;
  reload: () => Promise<void>;
  enterLocal: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  saveMeal: (m: Meal) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  saveWeight: (w: WeightLog) => Promise<void>;
  toggleFavorite: (food: Food) => Promise<void>;
  saveAI: (s: AISettings) => Promise<void>;
  pair: (code?: string) => Promise<void>;
  sendCheer: (emoji: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Context | null>(null);
const empty = (): Data => ({
  profile: { ...defaultProfile },
  meals: [],
  weights: [],
  favorites: [],
});
function check(error: any) {
  if (error) throw Error(connectionError(error));
}
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(empty);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [local, setLocal] = useState(false);
  const [error, setError] = useState("");
  const [partner, setPartner] = useState<Partner | null>(null);
  const [cheer, setCheer] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const selecting = useRef(false);
  const [ai, setAI] = useState<AISettings>({
    url: process.env.EXPO_PUBLIC_AI_BASE_URL || "",
    token: "",
    mock: true,
  });
  const owner = useRef("");
  const version = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;
  async function load(userId: string, isLocal: boolean) {
    const seq = ++version.current;
    try {
      if (isLocal) {
        const cached = await AsyncStorage.getItem("diet-yuk:local");
        if (seq !== version.current) return;
        setData(cached ? { ...empty(), ...JSON.parse(cached) } : empty());
        setPartner(null);
      } else if (supabase) {
        const [
          profileRes,
          mealsRes,
          weightsRes,
          coupleRes,
          cheerRes,
          favoritesRes,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("data")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("meals")
            .select("*")
            .eq("user_id", userId)
            .order("eaten_on", { ascending: false }),
          supabase
            .from("weight_logs")
            .select("*")
            .eq("user_id", userId)
            .order("logged_on", { ascending: false }),
          supabase.rpc("couple_summary"),
          supabase
            .from("cheers")
            .select("emoji")
            .eq("to_user", userId)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase.from("favorites").select("food").eq("user_id", userId),
        ]);
        for (const r of [
          profileRes,
          mealsRes,
          weightsRes,
          coupleRes,
          cheerRes,
          favoritesRes,
        ])
          check(r.error);
        const meals: Meal[] = await Promise.all(
          (mealsRes.data ?? []).map(async (m: any) => {
            let photo: string | undefined;
            if (m.photo_path) {
              const signed = await supabase!.storage
                .from("meal-photos")
                .createSignedUrl(m.photo_path, 3600);
              photo = signed.data?.signedUrl;
            }
            return {
              id: m.id,
              date: m.eaten_on,
              type: m.meal_type,
              items: m.items,
              photo,
              photoPath: m.photo_path,
              note: m.note,
              createdAt: m.created_at,
            };
          }),
        );
        if (seq !== version.current) return;
        const profile = profileRes.data?.data ?? { ...defaultProfile };
        setData({
          profile,
          meals,
          favorites: (favoritesRes.data ?? []).map((r: any) => r.food),
          weights: (weightsRes.data ?? []).map((w: any) => ({
            date: w.logged_on,
            weight: Number(w.weight_kg),
          })),
        });
        setPartner(coupleRes.data ?? null);
        setCheer(cheerRes.data?.[0]?.emoji ?? "");
        if (isPerson(profile.name)) {
          setSelectedPerson(profile.name);
          await AsyncStorage.setItem(devicePersonKey, profile.name);
          await AsyncStorage.setItem(
            profileCacheKey(userId),
            JSON.stringify(profile),
          );
        }
      }
      setError("");
    } catch (e) {
      if (seq === version.current) setError((e as Error).message);
      throw e;
    } finally {
      if (seq === version.current) setReady(true);
    }
  }
  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem("diet-yuk:mode"),
      AsyncStorage.getItem("diet-yuk:ai"),
      getToken(),
      supabase?.auth.getSession(),
      AsyncStorage.getItem(devicePersonKey),
    ])
      .then(async ([mode, saved, token, result, savedPerson]) => {
        if (!mounted) return;
        check(result?.error);
        if (saved) setAI({ ...JSON.parse(saved), token });
        const sess = result?.data.session ?? null;
        setSelectedPerson(
          restorePerson(savedPerson, sess?.user.user_metadata.person),
        );
        const isLocal = !sess && mode === "local";
        setSession(sess);
        setLocal(isLocal);
        owner.current = sess?.user.id ?? (isLocal ? "local" : "");
        if (sess) {
          const cached = await AsyncStorage.getItem(
            profileCacheKey(sess.user.id),
          );
          if (!mounted) return;
          if (cached) setData({ ...empty(), profile: JSON.parse(cached) });
        }
        if (owner.current) void load(owner.current, isLocal).catch(() => {});
        else setReady(true);
      })
      .catch((e) => {
        setError(e.message);
        setReady(true);
      });
    const subscription = supabase?.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      // Bootstrap and explicit device selection each load once themselves.
      if (_event === "INITIAL_SESSION" || selecting.current) return;
      setSession(sess);
      if (sess && owner.current !== sess.user.id) {
        owner.current = sess.user.id;
        setLocal(false);
        setReady(false);
        setData(empty());
        setPartner(null);
        setTimeout(() => void load(sess.user.id, false).catch(() => {}), 0);
      } else if (!sess && owner.current && owner.current !== "local") {
        owner.current = "";
        version.current++;
        setData(empty());
        setPartner(null);
        setCheer("");
        setReady(true);
      }
    });
    return () => {
      mounted = false;
      version.current++;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);
  async function reload() {
    if (owner.current) await load(owner.current, local);
  }
  useEffect(() => {
    if (!session || !supabase) return;
    const channel = supabase
      .channel("diet-yuk:" + session.user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meals" },
        () => void reload().catch(() => {}),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cheers" },
        () => void reload().catch(() => {}),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "couple_members" },
        () => void reload().catch(() => {}),
      )
      .subscribe();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void reload().catch(() => {});
    });
    return () => {
      void supabase!.removeChannel(channel);
      sub.remove();
    };
  }, [session?.user.id, local]);
  async function persist(next: Data) {
    await AsyncStorage.setItem("diet-yuk:local", JSON.stringify(next));
    dataRef.current = next;
    setData(next);
  }
  async function enterLocal() {
    if (session) throw Error("Keluar dari akun sebelum masuk mode lokal.");
    await AsyncStorage.setItem("diet-yuk:mode", "local");
    owner.current = "local";
    setLocal(true);
    setReady(false);
    await load("local", true);
  }
  async function choosePerson(name: Person) {
    if (!isPerson(name)) throw Error("Pilih Raka atau Anggun.");
    if (selecting.current) return;
    selecting.current = true;
    try {
      if (!supabase) throw Error("Koneksi Supabase belum dikonfigurasi.");
      const restored = await supabase.auth.getSession();
      check(restored.error);
      const known = restored.data.session?.user.user_metadata.person;
      if (isPerson(known) && known !== name)
        throw Error("Perangkat ini sudah terhubung sebagai " + known + ".");
      await AsyncStorage.setItem(devicePersonKey, name);
      setSelectedPerson(name);
      if (restored.data.session) {
        setReady(false);
        setSession(restored.data.session);
        setLocal(false);
        owner.current = restored.data.session.user.id;
        await load(owner.current, false);
      } else {
        const result = await supabase.auth.signInAnonymously({
          options: { data: { person: name } },
        });
        check(result.error);
        if (!result.data.session)
          throw Error("Sesi perangkat belum tersimpan. Coba lagi.");
        setReady(false);
        setSession(result.data.session);
        setLocal(false);
        owner.current = result.data.session.user.id;
        await load(owner.current, false);
      }
      await AsyncStorage.removeItem("diet-yuk:mode");
    } finally {
      selecting.current = false;
    }
  }
  async function saveProfile(profile: Profile) {
    if (local) return persist({ ...dataRef.current, profile });
    if (!supabase || !session) throw Error("Masuk ke akun terlebih dahulu.");
    if (selectedPerson && profile.name !== selectedPerson)
      throw Error("Gunakan profil " + selectedPerson + " untuk perangkat ini.");
    check(
      (
        await supabase
          .from("profiles")
          .upsert({ id: session.user.id, data: profile })
      ).error,
    );
    await AsyncStorage.setItem(devicePersonKey, profile.name);
    await AsyncStorage.setItem(
      profileCacheKey(session.user.id),
      JSON.stringify(profile),
    );
    if (isPerson(profile.name)) setSelectedPerson(profile.name);
    if (partner)
      check(
        (
          await supabase.rpc("set_wedding_date", {
            wedding: profile.weddingDate,
          })
        ).error,
      );
    await reload();
  }
  async function saveMeal(meal: Meal) {
    if (local) {
      let photo = meal.photo;
      if (
        photo &&
        Platform.OS !== "web" &&
        !photo.startsWith(Paths.document.uri)
      ) {
        const file = new File(photo);
        const dest = new File(Paths.document, meal.id + "-" + uuid() + ".jpg");
        file.copy(dest);
        photo = dest.uri;
      }
      return persist({
        ...dataRef.current,
        meals: [
          { ...meal, photo },
          ...dataRef.current.meals.filter((m) => m.id !== meal.id),
        ],
      });
    }
    if (!supabase || !session) throw Error("Masuk ke akun terlebih dahulu.");
    let photoPath = meal.photoPath;
    let newUpload = false;
    if (meal.photo && !meal.photoPath) {
      const bytes =
        Platform.OS === "web"
          ? await (await fetch(meal.photo)).arrayBuffer()
          : await new File(meal.photo).arrayBuffer();
      photoPath = session.user.id + "/" + meal.id + "-" + uuid() + ".jpg";
      check(
        (
          await supabase.storage.from("meal-photos").upload(photoPath, bytes, {
            contentType: "image/jpeg",
            upsert: true,
          })
        ).error,
      );
      newUpload = true;
    }
    const result = await supabase.rpc("save_meal", {
      meal: { ...meal, photo: undefined, photoPath },
    });
    if (result.error) {
      /* Keep upload on ambiguous network failure: retry uses same meal UUID/path. */ throw Error(
        result.error.message +
          (newUpload ? " Foto tersimpan; coba simpan kembali." : ""),
      );
    }
    await reload();
  }
  async function deleteMeal(id: string) {
    const meal = dataRef.current.meals.find((m) => m.id === id);
    if (local) {
      await persist({
        ...dataRef.current,
        meals: dataRef.current.meals.filter((m) => m.id !== id),
      });
      if (
        meal?.photo &&
        Platform.OS !== "web" &&
        meal.photo.startsWith(Paths.document.uri)
      ) {
        const f = new File(meal.photo);
        if (f.exists) f.delete();
      }
      return;
    }
    if (!supabase || !session) throw Error("Masuk terlebih dahulu.");
    check(
      (
        await supabase
          .from("meals")
          .delete()
          .eq("id", id)
          .eq("user_id", session.user.id)
      ).error,
    );
    if (meal?.photoPath) {
      const removal = await supabase.storage
        .from("meal-photos")
        .remove([meal.photoPath]);
      if (removal.error)
        setError(
          "Catatan dihapus, tetapi foto belum terhapus dari penyimpanan.",
        );
    }
    await reload();
  }
  async function saveWeight(weight: WeightLog) {
    if (
      !Number.isFinite(weight.weight) ||
      weight.weight < 30 ||
      weight.weight > 350
    )
      throw Error("Berat badan harus 30–350 kg.");
    if (local)
      return persist({
        ...dataRef.current,
        weights: [
          weight,
          ...dataRef.current.weights.filter((w) => w.date !== weight.date),
        ],
      });
    if (!supabase || !session) throw Error("Masuk terlebih dahulu.");
    check(
      (
        await supabase.from("weight_logs").upsert(
          {
            user_id: session.user.id,
            logged_on: weight.date,
            weight_kg: weight.weight,
          },
          { onConflict: "user_id,logged_on" },
        )
      ).error,
    );
    await reload();
  }
  async function saveAI(settings: AISettings) {
    await setToken(settings.token);
    await AsyncStorage.setItem(
      "diet-yuk:ai",
      JSON.stringify({ url: settings.url, mock: settings.mock }),
    );
    setAI(settings);
  }
  async function pair(code?: string) {
    if (local || !supabase)
      throw Error("Hubungkan Supabase dan masuk ke akun untuk pairing.");
    check(
      (
        await supabase.rpc(
          code ? "join_couple" : "create_couple",
          code
            ? { code: code.trim().toUpperCase() }
            : { wedding: data.profile.weddingDate },
        )
      ).error,
    );
    await reload();
  }
  async function toggleFavorite(food: Food) {
    foodSchema.parse(food);
    const exists = dataRef.current.favorites.some((f) => f.name === food.name);
    if (local)
      return persist({
        ...dataRef.current,
        favorites: exists
          ? dataRef.current.favorites.filter((f) => f.name !== food.name)
          : [food, ...dataRef.current.favorites],
      });
    if (!supabase || !session) throw Error("Masuk terlebih dahulu.");
    const result = exists
      ? await supabase
          .from("favorites")
          .delete()
          .eq("user_id", session.user.id)
          .eq("name", food.name)
      : await supabase
          .from("favorites")
          .upsert({ user_id: session.user.id, name: food.name, food });
    check(result.error);
    await reload();
  }
  async function sendCheer(emoji: string) {
    if (!supabase || local) throw Error("Masuk untuk memberi semangat.");
    check((await supabase.rpc("send_cheer", { emoji })).error);
  }
  async function signOut() {
    if (session && supabase) check((await supabase.auth.signOut()).error);
    await AsyncStorage.removeItem("diet-yuk:mode");
    version.current++;
    owner.current = "";
    setSession(null);
    setLocal(false);
    setPartner(null);
    setCheer("");
    setData(empty());
  }
  return (
    <Context.Provider
      value={{
        ...data,
        ready,
        session,
        local,
        error,
        partner,
        cheer,
        ai,
        selectedPerson,
        choosePerson,
        reload,
        enterLocal,
        saveProfile,
        saveMeal,
        deleteMeal,
        saveWeight,
        toggleFavorite,
        saveAI,
        pair,
        sendCheer,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const ctx = useContext(Context);
  if (!ctx) throw Error("AppProvider missing");
  return ctx;
}
