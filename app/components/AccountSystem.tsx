"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type SyntheticEvent } from "react";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC9w9JM_QWc4PJeH5U2WiF84Fv8EmPA2rY",
  authDomain: "marshadow-ai.firebaseapp.com",
  projectId: "marshadow-ai",
  storageBucket: "marshadow-ai.firebasestorage.app",
  messagingSenderId: "873129582429",
  appId: "1:873129582429:web:06e41f621bb77c46a452b4",
  measurementId: "G-65WRX8680K",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

type AvatarOption = {
  key: string;
  id?: number;
  name: string;
  src: string;
  accent: string;
  fit?: "cover" | "contain";
  position?: string;
  badgePosition?: string;
  cardScale?: number;
  badgeScale?: number;
  premium?: boolean;
};

const PINTEREST_PROFILES = [
  ["ac/d6/35/acd635c3b6a90ca32318d23cbe89cecc", "#a99bb6"],
  ["c4/b1/cb/c4b1cb6a916f5d4493ed417f76fc43de", "#d7a895"],
  ["25/7b/5a/257b5a27d695409cc5f2364e2d73a4a6", "#dcd439"],
  ["88/bb/b2/88bbb2379075b7ee1f877699c6116724", "#f4f4f4"],
  ["d5/7e/82/d57e82c570707c32a5c499e9b5fe58c5", "#21b95f"],
  ["fa/90/a7/fa90a7b0e72d309d3751728122a887f2", "#5db77a"],
  ["a3/aa/6c/a3aa6cef8d018b96d6288f087a073360", "#90c2ed"],
  ["28/7f/fa/287ffa752874ac39224de84bc8fc8651", "#5356e8"],
  ["36/e9/fe/36e9fe5bbe5d885adc7ca3e2c6024c95", "#8b5cff"],
  ["a1/db/b5/a1dbb5710280bcf6e4d41235cca0931c", "#b9bbd4"],
  ["4b/ac/fa/4bacfa9a888f145bf2c7720c8d9bada5", "#efbc33"],
  ["5a/7c/5f/5a7c5f298c0db9b2fed045459126a5e9", "#99dcfe"],
  ["36/be/a6/36bea6123eaaec699c4bd4c107e11b0d", "#fa7e47"],
  ["cd/19/02/cd1902c3ab14d16c50db34b5f764dc51", "#a99087"],
  ["82/28/92/822892ac5aebb7fdacc5598c26306715", "#b65cff"],
  ["95/3b/0d/953b0d3642237c3b702813900ed94e96", "#4fb8d8"],
  ["0d/94/c3/0d94c356fa8db1869489604a66a87ab9", "#d5a6b8"],
  ["9f/f5/c3/9ff5c3069140d52575a28fbf1ca8eb8c", "#c5c5c5"],
  ["7d/d9/61/7dd961caee9417a2476cfeba64ee786b", "#8791b0"],
  ["fe/34/e4/fe34e4248cbd0085f0692ca72522e0d3", "#bdcc8e"],
  ["bc/3e/76/bc3e76fd6adeb04b56d3ef46f140adb9", "#df6054"],
  ["a9/07/5d/a9075de8cf1e94a8b96042472db577fc", "#d1a43d"],
  ["62/39/0d/62390d0d8193011ef1a7a63b125296f3", "#aaa6d1"],
  ["6a/4d/cf/6a4dcf9eceb845264befd4674f58492f", "#5ea7ff"],
  ["f0/f1/cf/f0f1cfb7a5039b564890dcc832556a3c", "#f4f4f4"],
  ["27/7b/a0/277ba0c31f4666104f86fecca87e9c23", "#c86eae"],
  ["13/b9/b4/13b9b45e4ff8c68b451b474a70c5571e", "#7389c5"],
  ["98/9e/95/989e95e189605cc6f3736e2b459653c6", "#aaa6c8"],
  ["b8/ee/d5/b8eed52d65927eded16997d3e2c62f79", "#c7c7c7"],
  ["18/45/36/184536e3019ecd7a64016423e0bd3114", "#17c47e"],
] as const;

const LEGACY_AVATAR_URLS = PINTEREST_PROFILES.map(([path]) => `https://i.pinimg.com/736x/${path}.jpg`);
const AVATARS: AvatarOption[] = PINTEREST_PROFILES.map(([, accent], index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    key: `pinterest-${number}`,
    name: `Perfil ${number}`,
    src: `assets/profile/pinterest/perfil-${number}.webp`,
    accent,
    fit: "cover",
    position: "50% 50%",
    badgePosition: "50% 50%",
    cardScale: 1,
    badgeScale: 1,
    premium: true,
  };
});
const DEFAULT_AVATAR = AVATARS[0];
const MENU_AVATARS = AVATARS.slice(0, 6);

function sameAvatar(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return left === right || left.endsWith(right) || right.endsWith(left);
}

function findAvatar(src?: string | null) {
  return AVATARS.find((option) => sameAvatar(option.src, src));
}

function resolveProfilePhoto(src?: string | null) {
  if (!src) return DEFAULT_AVATAR.src;
  const localAvatar = findAvatar(src);
  if (localAvatar) return localAvatar.src;
  const legacyIndex = LEGACY_AVATAR_URLS.findIndex((legacy) => sameAvatar(legacy, src));
  if (legacyIndex >= 0) return AVATARS[legacyIndex % AVATARS.length].src;
  if (!src.includes("/assets/") && !/^(?:\.\/|\/)?assets\//.test(src)) return src;
  return DEFAULT_AVATAR.src;
}

function fallbackProfileImage(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  const fallback = new URL(DEFAULT_AVATAR.src, window.location.href).href;
  if (image.src !== fallback) {
    image.src = fallback;
    return;
  }
  image.hidden = true;
}

function avatarVisualStyle(option: AvatarOption, badge = false) {
  return {
    "--avatar-accent": option.accent,
    "--avatar-fit": option.fit || "contain",
    "--avatar-position": (badge && option.badgePosition) || option.position || "50% 50%",
    "--avatar-scale": String(badge ? option.badgeScale || 1.4 : option.cardScale || 1.08),
  } as CSSProperties;
}

type AuthMode = "login" | "signup" | "reset";
type UserSnapshot = Pick<User, "uid" | "email" | "displayName" | "photoURL" | "emailVerified">;
export type TrainerProfile = { name: string; photo: string; accent: string };

function snapshotUser(user: User): UserSnapshot {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

function friendlyAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos. Confira os dados e tente outra vez.",
    "auth/invalid-email": "Esse endereço de e-mail não parece válido.",
    "auth/email-already-in-use": "Já existe uma conta ligada a esse e-mail.",
    "auth/weak-password": "Sua senha precisa ter pelo menos 6 caracteres.",
    "auth/missing-password": "Digite sua senha para continuar.",
    "auth/too-many-requests": "Muitas tentativas seguidas. Espere um pouco e tente novamente.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir o login.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.",
    "auth/unauthorized-domain": "Este domínio ainda não foi autorizado no Firebase.",
    "auth/operation-not-allowed": "O login por e-mail ainda precisa ser ativado no Firebase.",
    "auth/network-request-failed": "A conexão falhou. Confira sua internet e tente novamente.",
  };
  return messages[code] || "A sombra oscilou e algo deu errado. Tente novamente.";
}

export default function AccountSystem({ onProfileChange }: { onProfileChange?: (profile: TrainerProfile | null) => void }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<UserSnapshot | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [trainerName, setTrainerName] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR.src);
  const [avatarQuery, setAvatarQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void setPersistence(auth, browserLocalPersistence).catch(() => undefined);
    return onAuthStateChanged(auth, (user) => {
      setAccount(user ? snapshotUser(user) : null);
      setReady(true);
      if (user) {
        setTrainerName(user.displayName || user.email?.split("@")[0] || "Treinador");
        setAvatar(resolveProfilePhoto(user.photoURL));
        if (!user.displayName) {
          setOnboarding(true);
          setProfileOpen(true);
        }
      } else {
        setMenuOpen(false);
        setProfileOpen(false);
        setOnboarding(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  useEffect(() => {
    if (!ready) return;
    const photo = resolveProfilePhoto(account?.photoURL);
    onProfileChange?.(account ? {
      name: account.displayName || account.email?.split("@")[0] || "Treinador",
      photo,
      accent: findAvatar(photo)?.accent || "#b65cff",
    } : null);
  }, [account, onProfileChange, ready]);

  const firstName = useMemo(() => {
    const name = account?.displayName || account?.email?.split("@")[0] || "TREINADOR";
    return name.trim().split(/\s+/)[0].toUpperCase();
  }, [account]);

  const filteredAvatars = useMemo(() => {
    const query = avatarQuery.trim().toLocaleLowerCase("pt-BR");
    return query ? AVATARS.filter((option) => option.name.toLocaleLowerCase("pt-BR").includes(query)) : AVATARS;
  }, [avatarQuery]);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage("");
    setSuccess(false);
    setPassword("");
    setConfirmation("");
  };

  const authenticateWithEmail = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      await setPersistence(auth, browserLocalPersistence);
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email.trim());
        setSuccess(true);
        setMessage("Link de recuperação enviado. Confira seu e-mail.");
      } else if (mode === "signup") {
        if (password !== confirmation) throw { code: "local/password-mismatch" };
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        setTrainerName(email.trim().split("@")[0] || "Treinador");
        setAvatar(DEFAULT_AVATAR.src);
        setAccount(snapshotUser(credential.user));
        setOnboarding(true);
        setProfileOpen(true);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setMessage(code === "local/password-mismatch" ? "As duas senhas precisam ser iguais." : friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const authenticateWithGoogle = async () => {
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithPopup(auth, googleProvider);
      const isNew = getAdditionalUserInfo(credential)?.isNewUser;
      if (isNew) {
        setTrainerName(credential.user.displayName || "Treinador");
        setAvatar(DEFAULT_AVATAR.src);
        setOnboarding(true);
        setProfileOpen(true);
      }
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = trainerName.trim();
    if (cleanName.length < 3 || cleanName.length > 20) {
      setMessage("Seu nome de treinador precisa ter entre 3 e 20 caracteres.");
      return;
    }
    if (!auth.currentUser) return;
    setBusy(true);
    setMessage("");
    try {
      await updateProfile(auth.currentUser, { displayName: cleanName, photoURL: avatar });
      setAccount(snapshotUser(auth.currentUser));
      setProfileOpen(false);
      setOnboarding(false);
      setMenuOpen(false);
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const editProfile = () => {
    setTrainerName(account?.displayName || account?.email?.split("@")[0] || "Treinador");
    setAvatar(resolveProfilePhoto(account?.photoURL));
    setAvatarQuery("");
    setMessage("");
    setOnboarding(false);
    setProfileOpen(true);
    setMenuOpen(false);
  };

  if (!ready) {
    return <div className="account-gate account-gate--loading" aria-label="Sincronizando conta"><span /><b>SINCRONIZANDO TREINADOR</b></div>;
  }

  if (!account) {
    return (
      <section className="account-gate" aria-modal="true" role="dialog" aria-labelledby="account-title">
        <div className="account-gate__ambient" aria-hidden="true"><i /><i /><i /></div>
        <div className="account-gate__shell">
          <aside className="account-gate__visual">
            <span className="account-gate__index">DEX // 0802</span>
            <div>
              <small>MARSHADOW DEX</small>
              <h2>SUA DEX.<br />SUA EQUIPE.<br /><em>SUA SOMBRA.</em></h2>
              <p>Uma identidade para atravessar a Pokédex, o laboratório tático e a inteligência do Marshadow.</p>
            </div>
            <span className="account-gate__status"><i /> NEXUS FIREBASE ATIVO</span>
          </aside>

          <div className="account-gate__form-panel">
            <div className="account-gate__brand"><span className="brand__sigil"><i /></span><b>MARSHADOW DEX</b></div>
            <div className="account-gate__form-copy">
              <span className="eyebrow"><i /> IDENTIDADE DE TREINADOR</span>
              <h1 id="account-title">{mode === "signup" ? "CRIE SUA CONTA" : mode === "reset" ? "RECUPERE O ACESSO" : "ENTRE NAS SOMBRAS"}</h1>
              <p>{mode === "signup" ? "Monte seu perfil e escolha o Pokémon que vai representar você." : mode === "reset" ? "Enviaremos um link seguro para redefinir sua senha." : "Sua jornada começa onde a luz não alcança."}</p>
            </div>

            {mode !== "reset" && (
              <div className="account-tabs" role="tablist" aria-label="Entrar ou criar conta">
                <button className={mode === "login" ? "is-active" : ""} onClick={() => changeMode("login")} type="button">ENTRAR</button>
                <button className={mode === "signup" ? "is-active" : ""} onClick={() => changeMode("signup")} type="button">CRIAR CONTA</button>
              </div>
            )}

            <form className="account-form" onSubmit={authenticateWithEmail}>
              <label><span>E-MAIL</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="treinador@exemplo.com" required /></label>
              {mode !== "reset" && <label><span>SENHA</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Mínimo de 6 caracteres" minLength={6} required /></label>}
              {mode === "signup" && <label><span>CONFIRME A SENHA</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Digite a senha novamente" minLength={6} required /></label>}
              {message && <div className={`account-message ${success ? "is-success" : ""}`} role="status">{message}</div>}
              <button className="account-submit" type="submit" disabled={busy}><span>{busy ? "PROCESSANDO..." : mode === "signup" ? "CRIAR MINHA CONTA" : mode === "reset" ? "ENVIAR LINK" : "ENTRAR NA MARSHADOW DEX"}</span><i>→</i></button>
            </form>

            {mode === "login" && <button className="account-forgot" type="button" onClick={() => changeMode("reset")}>ESQUECI MINHA SENHA</button>}
            {mode === "reset" && <button className="account-forgot" type="button" onClick={() => changeMode("login")}>← VOLTAR PARA O LOGIN</button>}

            {mode !== "reset" && (
              <>
                <div className="account-divider"><span>OU CONTINUE COM</span></div>
                <button className="account-google" type="button" onClick={authenticateWithGoogle} disabled={busy}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.25-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.11-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.94 12 5.94Z"/></svg>
                  GOOGLE
                </button>
              </>
            )}
            <small className="account-privacy">A autenticação e a senha são protegidas pelo Firebase. A Marshadow Dex não lê nem armazena sua senha.</small>
          </div>
        </div>
      </section>
    );
  }

  const accountPhoto = resolveProfilePhoto(account.photoURL);
  const accountAvatarOption = findAvatar(accountPhoto) || {
    key: "external-profile",
    name: account.displayName || "Treinador",
    src: accountPhoto,
    accent: "#b45cff",
    fit: "cover" as const,
    position: "50% 50%",
    badgeScale: 1.04,
  };

  return (
    <>
      <div className="account-control" ref={menuRef}>
        <button className="account-control__trigger" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Abrir menu da conta">
          <span className="account-avatar" style={avatarVisualStyle(accountAvatarOption, true)}><img src={accountPhoto} alt="" onError={fallbackProfileImage} /></span>
          <span className="account-control__copy"><small>TREINADOR</small><b>{firstName}</b></span>
          <i className={menuOpen ? "is-open" : ""}>⌄</i>
        </button>
        {menuOpen && (
          <div className="account-menu">
            <div><span className="account-avatar account-avatar--large" style={avatarVisualStyle(accountAvatarOption, true)}><img src={accountPhoto} alt="" onError={fallbackProfileImage} /></span><p><b>{account.displayName || "TREINADOR"}</b><small>{account.email}</small></p></div>
            <button className="account-menu__profile-picker" type="button" onClick={editProfile}>
              <span className="account-menu__profile-copy"><b>ESCOLHER FOTO DE PERFIL</b><small>{AVATARS.length} FOTOS DA PASTA MAI</small></span>
              <span className="account-menu__avatar-strip" aria-hidden="true">
                {MENU_AVATARS.map((option) => <img key={option.key} src={option.src} alt="" loading="eager" onError={fallbackProfileImage} />)}
              </span>
            </button>
            <button type="button" onClick={editProfile}><span>EDITAR NOME E PERFIL</span><i>↗</i></button>
            <button type="button" onClick={() => void signOut(auth)}><span>SAIR DA CONTA</span><i>→</i></button>
          </div>
        )}
      </div>

      {profileOpen && (
        <section className="profile-selector" aria-modal="true" role="dialog" aria-labelledby="profile-title">
          <div className="profile-selector__shell">
            <button className="profile-selector__close" type="button" onClick={() => setProfileOpen(false)} disabled={onboarding} aria-label="Fechar">×</button>
            <span className="eyebrow"><i /> PERFIL DE TREINADOR</span>
            <h2 id="profile-title">QUEM ESTÁ<br /><em>TREINANDO?</em></h2>
            <p>Escolha uma das 30 fotos da sua pasta MAI para representar sua conta.</p>
            <form onSubmit={saveProfile}>
              <label className="profile-name"><span>NOME DE TREINADOR</span><input value={trainerName} onChange={(event) => setTrainerName(event.target.value)} minLength={3} maxLength={20} autoComplete="nickname" placeholder="Seu nome no Nexus" required /></label>
              <div className="profile-avatar-tools">
                <label><span>BUSCAR PERFIL</span><input value={avatarQuery} onChange={(event) => setAvatarQuery(event.target.value)} placeholder="Ex.: Perfil 01, Perfil 12..." /></label>
                <b>{filteredAvatars.length.toString().padStart(2, "0")}<small>/ {AVATARS.length} PERFIS</small></b>
              </div>
              <div className="profile-avatar-scroll">
                <div className="profile-avatars" role="radiogroup" aria-label="Escolha sua foto de perfil">
                  {filteredAvatars.map((option) => (
                    <button key={option.key} className={`${sameAvatar(avatar, option.src) ? "is-selected" : ""} ${option.premium ? "is-premium" : "is-dex-art"}`} style={avatarVisualStyle(option)} type="button" role="radio" aria-checked={sameAvatar(avatar, option.src)} onClick={() => setAvatar(option.src)}>
                      <span className="profile-avatar-art"><i aria-hidden="true" /><em>MAI</em><img src={option.src} alt="" loading="lazy" decoding="async" onError={fallbackProfileImage} /></span>
                      <span className="profile-avatar-label"><b>{option.name}</b><small>PASTA MAI</small></span>
                    </button>
                  ))}
                </div>
                {!filteredAvatars.length && <div className="profile-avatar-empty">NENHUM PERFIL EMERGIU COM ESSE NOME.</div>}
              </div>
              {message && <div className="account-message" role="status">{message}</div>}
              <button className="profile-save" type="submit" disabled={busy}><span>{busy ? "SALVANDO..." : "ESTE SOU EU"}</span><i>→</i></button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
