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
import { File, Paths } from "expo-file-system";
import { Platform, AppState } from "react-native";
import { isPerson, Person } from "../lib/personal";
import {
  connectionError,
  devicePersonKey,
  profileCacheKey,
} from "../lib/device-profile";
import { googlePerson, accessDeniedMessage } from "../lib/auth";
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
  ready: boolean;
  weddingDate: string;
};
type Context = Data & {
  ready: boolean;
  session: Session | null;
  local: boolean;
  error: string;
  partner: Partner | null;
  cheer: string;
  selectedPerson: Person | null;
  signInWithGoogle: () => Promise<void>;
  reload: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  saveMeal: (m: Meal) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  saveWeight: (w: WeightLog) => Promise<void>;
  toggleFavorite: (food: Food) => Promise<void>;
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
    let authRevision = 0;
    async function applySession(sess: Session | null) {
      if (!mounted) return;
      const person = googlePerson(sess?.user);
      if (sess && !person) {
        version.current++;
        owner.current = "";
        setSession(null);
        setSelectedPerson(null);
        setLocal(false);
        setData(empty());
        setPartner(null);
        setCheer("");
        setError(accessDeniedMessage);
        setReady(true);
        await supabase?.auth.signOut({ scope: "local" });
        return;
      }
      setSession(sess);
      setSelectedPerson(person);
      setLocal(false);
      if (sess) {
        if (owner.current === sess.user.id) return;
        owner.current = sess.user.id;
        setReady(false);
        setData(empty());
        setPartner(null);
        setCheer("");
        await load(sess.user.id, false).catch(() => {});
      } else {
        owner.current = "";
        version.current++;
        setData(empty());
        setPartner(null);
        setCheer("");
        setReady(true);
      }
    }
    // Do not await Supabase methods inside its auth callback (auth lock).
    const subscription = supabase?.auth.onAuthStateChange((event, sess) => {
      if (event === "INITIAL_SESSION") return;
      const revision = ++authRevision;
      setTimeout(() => {
        if (mounted && revision === authRevision) void applySession(sess);
      }, 0);
    });
    const initialRevision = authRevision;
    Promise.all([
      supabase?.auth.getSession(),
      AsyncStorage.removeItem("diet-yuk:mode"),
    ])
      .then(async ([result]) => {
        if (!mounted) return;
        check(result?.error);
        if (initialRevision === authRevision)
          await applySession(result?.data.session ?? null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message);
        setReady(true);
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
  async function signInWithGoogle() {
    if (!supabase) throw Error("Koneksi Supabase belum dikonfigurasi.");
    if (Platform.OS !== "web")
      throw Error("Buka Diet Yuk melalui browser untuk masuk dengan Google.");
    setError("");
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/welcome",
        queryParams: { prompt: "select_account" },
      },
    });
    check(result.error);
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
    setSelectedPerson(null);
    setError("");
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
        selectedPerson,
        signInWithGoogle,
        reload,
        saveProfile,
        saveMeal,
        deleteMeal,
        saveWeight,
        toggleFavorite,
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
