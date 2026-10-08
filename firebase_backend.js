// Firebase Yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyB_bpBj_cs-EVR3H97bSj92OYUUKjQraCU",
  authDomain: "lexiq-6d699.firebaseapp.com",
  projectId: "lexiq-6d699",
  storageBucket: "lexiq-6d699.firebasestorage.app",
  messagingSenderId: "452877974071",
  appId: "1:452877974071:web:ef6c8cfd5984b8b5a91db2",
  measurementId: "G-L0WX1FBXL8"
};

// Firebase'i Başlat
let app, auth, db, storage;
try {
  if (typeof firebase !== 'undefined') {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    if (typeof firebase.storage === 'function') {
      storage = firebase.storage();
    }
    console.log("Firebase başarıyla başlatıldı.");
  }
} catch (e) {
  console.error("Firebase başlatılamadı:", e);
}

// Global Durum
window.fbUser = null;
window.cachedFbUserData = null;

// Firebase Hata Mesajlarını Türkçeleştirme
function getAuthErrorMessage(error) {
  if (!error) return "Bilinmeyen bir hata oluştu.";
  const code = error.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "Geçersiz e-posta formatı. Lütfen kontrol ediniz.";
    case "auth/user-disabled":
      return "Bu kullanıcı hesabı devre dışı bırakılmıştır.";
    case "auth/user-not-found":
      return "Bu e-posta adresine ait kayıtlı bir hesap bulunamadı.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-posta adresi veya şifre hatalı.";
    case "auth/email-already-in-use":
      return "Bu e-posta adresi zaten kullanımda. Lütfen 'Giriş Yap' sekmesinden giriş yapınız.";
    case "auth/weak-password":
      return "Şifreniz çok zayıf. En az 6 karakter giriniz.";
    case "auth/operation-not-allowed":
      return "E-posta ile giriş yöntemi şu an aktif değil.";
    case "auth/network-request-failed":
      return "Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol ediniz.";
    case "auth/too-many-requests":
      return "Çok fazla başarısız deneme yapıldı. Lütfen biraz bekleyiniz.";
    default:
      return error.message || "İşlem sırasında bir hata oluştu.";
  }
}
window.getAuthErrorMessage = getAuthErrorMessage;

// Auth Durumunu Dinle
if (auth) {
  let isInitialAuthCheck = true;
  auth.onAuthStateChanged((user) => {
    if (user) {
      window.fbUser = user;
      isInitialAuthCheck = false;
      console.log("Kullanıcı giriş yaptı:", user.uid, user.email);
      syncUserData(user);
    } else {
      const wasLoggedIn = !!window.fbUser;
      window.fbUser = null;
      window.cachedFbUserData = null;
      console.log("Kullanıcı çıkış yaptı veya giriş yapmadı.");
      // SADECE daha önce oturumu açık olan bir kullanıcı çıkış yaptıysa onUserLogout çağır.
      // İlk açılışta veya misafir modunda asla kullanıcıyı dışarı atma!
      if (wasLoggedIn && !isInitialAuthCheck && typeof window.onUserLogout === 'function') {
        window.onUserLogout();
      }
      isInitialAuthCheck = false;
    }
  });
}

// Kullanıcı verisini senkronize et (Firestore <-> LocalStorage <-> State)
async function syncUserData(user) {
  const currentUser = user || window.fbUser || (auth && auth.currentUser);
  if (!currentUser) return;

  const uid = currentUser.uid;
  let docData = null;

  if (db) {
    try {
      const userRef = db.collection('users').doc(uid);
      const doc = await userRef.get();
      if (doc.exists) {
        docData = doc.data();
      }
    } catch (err) {
      console.warn("Firestore kullanıcı bilgisi okunamadı:", err);
    }
  }

  // Bilgileri çöz ve önceliklendir (Firestore -> Auth -> LocalStorage -> Varsayılan)
  const localName = localStorage.getItem('lexiq_user_name');
  const resolvedName = (docData && docData.displayName && docData.displayName !== 'İsimsiz Kahraman' && docData.displayName !== 'Öğrenci')
    ? docData.displayName
    : (currentUser.displayName || localName || 'Öğrenci');

  const resolvedAvatar = (docData && docData.avatar) || localStorage.getItem('lexiq_user_avatar') || '🦊';
  const resolvedEmail = currentUser.email || (docData && docData.email) || localStorage.getItem('lexiq_user_email') || '';
  const resolvedTrack = (docData && docData.track) || localStorage.getItem('lexiq_user_track') || '4A';
  const resolvedLevel = (docData && docData.level) || localStorage.getItem('lexiq_user_level') || 'A2';
  const resolvedLang = (docData && docData.lang) || localStorage.getItem('kelime_active_lang') || 'EN-TR';

  const localXP = parseInt(localStorage.getItem('kelime_xp') || '0', 10);
  const fbXP = (docData && typeof docData.xp === 'number') ? docData.xp : 0;
  const bestXP = Math.max(fbXP, localXP);

  // Öğrenilen Kelimeler, Rozetler ve Seri Senkronizasyonu
  const localLearnedMap = JSON.parse(localStorage.getItem('kelime_learned_map') || '{}');
  const fbLearnedMap = (docData && docData.learnedMap && typeof docData.learnedMap === 'object') ? docData.learnedMap : {};
  const mergedLearnedMap = Object.assign({}, fbLearnedMap, localLearnedMap);

  const localBadges = JSON.parse(localStorage.getItem('kelime_unlocked_badges') || '[]');
  const fbBadges = (docData && Array.isArray(docData.unlockedBadges)) ? docData.unlockedBadges : [];
  const mergedBadges = Array.from(new Set([...fbBadges, ...localBadges]));

  const localMaxStreak = parseInt(localStorage.getItem('kelime_max_streak') || '0', 10);
  const fbMaxStreak = (docData && typeof docData.maxStreak === 'number') ? docData.maxStreak : 0;
  const bestMaxStreak = Math.max(fbMaxStreak, localMaxStreak);

  const localArenaSolved = parseInt(localStorage.getItem('kelime_arena_solved') || '0', 10);
  const fbArenaSolved = (docData && typeof docData.arenaSolved === 'number') ? docData.arenaSolved : 0;
  const bestArenaSolved = Math.max(fbArenaSolved, localArenaSolved);

  // 1. Oyun İstatistikleri (gameStats) Senkronizasyonu
  const localGameStats = JSON.parse(localStorage.getItem('kelime_game_stats') || '{}');
  const fbGameStats = (docData && docData.gameStats && typeof docData.gameStats === 'object') ? docData.gameStats : {};
  const mergedGameStats = Object.assign({}, fbGameStats);
  for (const [k, v] of Object.entries(localGameStats)) {
    mergedGameStats[k] = Math.max(mergedGameStats[k] || 0, typeof v === 'number' ? v : 0);
  }

  // 2. Saf Zihin / Kusursuz Galibiyet (cleanWins)
  const localCleanWins = parseInt(localStorage.getItem('kelime_clean_wins') || '0', 10);
  const fbCleanWins = (docData && typeof docData.cleanWins === 'number') ? docData.cleanWins : 0;
  const bestCleanWins = Math.max(fbCleanWins, localCleanWins);

  // 3. Çalışma & Zaman Takibi (timeTracking: kartlar, oyunlar, ünite tamamlama süreleri)
  const fbTT = (docData && docData.timeTracking && typeof docData.timeTracking === 'object') ? docData.timeTracking : {};
  const localTimeCards = parseInt(localStorage.getItem('lexiq_time_cards') || '0', 10);
  const localTimeGames = parseInt(localStorage.getItem('lexiq_time_games') || '0', 10);
  const localFirstStart = parseInt(localStorage.getItem('lexiq_first_started_at') || '0', 10);
  const localRegAt = parseInt(localStorage.getItem('lexiq_registered_at') || '0', 10);
  const localUnitDurations = JSON.parse(localStorage.getItem('lexiq_unit_durations') || '{}');

  const bestCardSeconds = Math.max(fbTT.cardSeconds || 0, localTimeCards);
  const bestGameSeconds = Math.max(fbTT.gameSeconds || 0, localTimeGames);
  const bestFirstStart = (fbTT.firstStartedAt && localFirstStart) 
    ? Math.min(fbTT.firstStartedAt, localFirstStart) 
    : (fbTT.firstStartedAt || localFirstStart || Date.now());
  const bestRegAt = fbTT.registeredAt || localRegAt || (docData && docData.createdAt ? (docData.createdAt.toMillis ? docData.createdAt.toMillis() : Date.now()) : 0);
  const mergedUnitDurations = Object.assign({}, fbTT.unitDurations || {}, localUnitDurations);

  const syncedTimeTracking = {
    cardSeconds: bestCardSeconds,
    gameSeconds: bestGameSeconds,
    firstStartedAt: bestFirstStart,
    registeredAt: bestRegAt,
    unitDurations: mergedUnitDurations
  };

  const syncedProfile = {
    uid: uid,
    displayName: resolvedName,
    avatar: resolvedAvatar,
    email: resolvedEmail,
    track: resolvedTrack,
    level: resolvedLevel,
    lang: resolvedLang,
    xp: bestXP,
    learnedMap: mergedLearnedMap,
    unlockedBadges: mergedBadges,
    maxStreak: bestMaxStreak,
    arenaWordsSolved: bestArenaSolved,
    gameStats: mergedGameStats,
    cleanWins: bestCleanWins,
    timeTracking: syncedTimeTracking
  };

  const localDayStreak = parseInt(localStorage.getItem('lexiq_day_streak') || '1', 10);
  const localMaxDayStreak = parseInt(localStorage.getItem('lexiq_max_day_streak') || '1', 10);
  const bestDayStreak = Math.max(docData?.dayStreak || 1, localDayStreak);
  const bestMaxDayStreak = Math.max(docData?.maxDayStreak || 1, localMaxDayStreak, bestDayStreak);
  const resolvedLastStudyDate = docData?.lastStudyDate || localStorage.getItem('lexiq_last_study_date') || '';

  // LocalStorage güncelle
  localStorage.setItem('lexiq_user_name', resolvedName);
  localStorage.setItem('lexiq_user_avatar', resolvedAvatar);
  localStorage.setItem('lexiq_user_email', resolvedEmail);
  localStorage.setItem('lexiq_user_track', resolvedTrack);
  localStorage.setItem('lexiq_user_level', resolvedLevel);
  localStorage.setItem('kelime_active_lang', resolvedLang);
  localStorage.setItem('kelime_xp', bestXP.toString());
  localStorage.setItem('kelime_learned_map', JSON.stringify(mergedLearnedMap));
  localStorage.setItem('kelime_unlocked_badges', JSON.stringify(mergedBadges));
  localStorage.setItem('kelime_max_streak', bestMaxStreak.toString());
  localStorage.setItem('kelime_arena_solved', bestArenaSolved.toString());
  localStorage.setItem('kelime_game_stats', JSON.stringify(mergedGameStats));
  localStorage.setItem('kelime_clean_wins', bestCleanWins.toString());
  localStorage.setItem('lexiq_time_cards', bestCardSeconds.toString());
  localStorage.setItem('lexiq_time_games', bestGameSeconds.toString());
  localStorage.setItem('lexiq_first_started_at', bestFirstStart.toString());
  localStorage.setItem('lexiq_registered_at', bestRegAt.toString());
  localStorage.setItem('lexiq_unit_durations', JSON.stringify(mergedUnitDurations));
  localStorage.setItem('lexiq_day_streak', bestDayStreak.toString());
  localStorage.setItem('lexiq_max_day_streak', bestMaxDayStreak.toString());
  if (resolvedLastStudyDate) localStorage.setItem('lexiq_last_study_date', resolvedLastStudyDate);
  const hasOnboarded = !!((docData && docData.track && docData.lang) || localStorage.getItem('lexiq_user_onboarded') === 'true');
  if (hasOnboarded) {
    localStorage.setItem('lexiq_user_onboarded', 'true');
  }

  window.cachedFbUserData = syncedProfile;

  // Firestore'u güncelle (Giriş zamanı ve birleştirilmiş veriler)
  if (db) {
    try {
      await db.collection('users').doc(uid).set({
        displayName: resolvedName,
        avatar: resolvedAvatar,
        email: resolvedEmail,
        track: resolvedTrack,
        level: resolvedLevel,
        lang: resolvedLang,
        xp: bestXP,
        learnedMap: mergedLearnedMap,
        unlockedBadges: mergedBadges,
        maxStreak: bestMaxStreak,
        dayStreak: bestDayStreak,
        maxDayStreak: bestMaxDayStreak,
        lastStudyDate: resolvedLastStudyDate,
        arenaWordsSolved: bestArenaSolved,
        gameStats: mergedGameStats,
        cleanWins: bestCleanWins,
        timeTracking: syncedTimeTracking,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Firestore sync update hatası:", e);
    }
  }

  // App UI ve State güncelle
  if (typeof window.applyUserData === 'function') {
    window.applyUserData(syncedProfile);
  }
  if (typeof window.onUserLogin === 'function') {
    window.onUserLogin(currentUser);
  }
}
window.syncUserData = syncUserData;

// E-posta ile Kayıt Ol
window.registerWithEmail = async function(email, password, name, avatar) {
  if (!auth) {
    return { success: false, error: "Firebase kimlik doğrulama servisi başlatılamadı." };
  }
  try {
    const trimmedName = (name || '').trim() || 'Öğrenci';
    const chosenAvatar = avatar || (window.state && window.state.userAvatar) || localStorage.getItem('lexiq_user_avatar') || '🦊';
    const chosenTrack = (window.state && window.state.userTrack) || localStorage.getItem('lexiq_user_track') || '4A';
    const chosenLevel = (window.state && window.state.userLevel) || localStorage.getItem('lexiq_user_level') || 'A2';
    const chosenLang = (window.state && window.state.activeLanguage) || localStorage.getItem('kelime_active_lang') || 'EN-TR';
    const localXP = parseInt(localStorage.getItem('kelime_xp') || '0', 10);

    // 1. Önce yerel verileri hazırla
    localStorage.setItem('lexiq_user_name', trimmedName);
    localStorage.setItem('lexiq_user_email', email);
    localStorage.setItem('lexiq_user_avatar', chosenAvatar);
    localStorage.setItem('lexiq_user_track', chosenTrack);
    localStorage.setItem('lexiq_user_level', chosenLevel);
    localStorage.setItem('kelime_active_lang', chosenLang);

    if (window.state) {
      window.state.userName = trimmedName;
      window.state.userEmail = email;
      window.state.userAvatar = chosenAvatar;
      window.state.userTrack = chosenTrack;
      window.state.userLevel = chosenLevel;
      window.state.activeLanguage = chosenLang;
    }

    // 2. Firebase Auth hesabı oluştur
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // 3. Auth displayName profilini güncelle
    try {
      await user.updateProfile({ displayName: trimmedName });
    } catch (pErr) {
      console.warn("Auth profile güncelleme:", pErr);
    }

    // 4. Firestore veritabanına kullanıcı dökümanını kaydet
    if (db) {
      const s = window.state || {};
      const regTimeTracking = {
        cardSeconds: (s.timeTracking && s.timeTracking.cardSeconds) || parseInt(localStorage.getItem('lexiq_time_cards') || '0', 10),
        gameSeconds: (s.timeTracking && s.timeTracking.gameSeconds) || parseInt(localStorage.getItem('lexiq_time_games') || '0', 10),
        firstStartedAt: (s.timeTracking && s.timeTracking.firstStartedAt) || parseInt(localStorage.getItem('lexiq_first_started_at') || '0', 10) || Date.now(),
        registeredAt: Date.now(),
        unitDurations: (s.timeTracking && s.timeTracking.unitDurations) || JSON.parse(localStorage.getItem('lexiq_unit_durations') || '{}')
      };
      const regGameStats = (s.gameStats) || JSON.parse(localStorage.getItem('kelime_game_stats') || '{}');
      const regCleanWins = (s.cleanWins !== undefined) ? s.cleanWins : parseInt(localStorage.getItem('kelime_clean_wins') || '0', 10);

      await db.collection('users').doc(user.uid).set({
        displayName: trimmedName,
        email: email,
        avatar: chosenAvatar,
        track: chosenTrack,
        level: chosenLevel,
        lang: chosenLang,
        xp: localXP,
        learnedMap: (s.learnedMap) || JSON.parse(localStorage.getItem('kelime_learned_map') || '{}'),
        unlockedBadges: (s.unlockedBadges) || JSON.parse(localStorage.getItem('kelime_unlocked_badges') || '[]'),
        maxStreak: (s.maxStreak !== undefined) ? s.maxStreak : parseInt(localStorage.getItem('kelime_max_streak') || '0', 10),
        arenaWordsSolved: (s.arenaWordsSolved !== undefined) ? s.arenaWordsSolved : parseInt(localStorage.getItem('kelime_arena_solved') || '0', 10),
        gameStats: regGameStats,
        cleanWins: regCleanWins,
        timeTracking: regTimeTracking,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    const profileData = {
      uid: user.uid,
      displayName: trimmedName,
      email: email,
      avatar: chosenAvatar,
      track: chosenTrack,
      level: chosenLevel,
      lang: chosenLang,
      xp: localXP
    };

    window.cachedFbUserData = profileData;
    window.fbUser = user;

    if (typeof window.applyUserData === 'function') {
      window.applyUserData(profileData, { isRegistration: true });
    }

    return { success: true, user: user };
  } catch (error) {
    console.error("Kayıt hatası:", error);
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// E-posta ile Giriş Yap
window.loginWithEmail = async function(email, password) {
  if (!auth) {
    return { success: false, error: "Firebase kimlik doğrulama servisi başlatılamadı." };
  }
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    window.fbUser = user;

    await syncUserData(user);

    return { success: true, user: user };
  } catch (error) {
    console.error("Giriş hatası:", error);
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// Çıkış Yap
window.logoutUser = async function() {
  try {
    if (auth) {
      await auth.signOut();
    }
    window.fbUser = null;
    window.cachedFbUserData = null;
    localStorage.removeItem('lexiq_user_email');
    if (typeof window.onUserLogout === 'function') {
      window.onUserLogout();
    }
  } catch (error) {
    console.error("Çıkış hatası:", error);
  }
};

// Şifre Sıfırlama E-postası Gönder (Şifremi Unuttum)
window.resetPasswordWithEmail = async function(email) {
  if (!auth) {
    return { success: false, error: "Firebase kimlik doğrulama servisi başlatılamadı." };
  }
  if (!email || !email.includes('@')) {
    return { success: false, error: "Lütfen geçerli bir e-posta adresi giriniz." };
  }
  try {
    await auth.sendPasswordResetEmail(email.trim());
    return { success: true };
  } catch (error) {
    console.error("Şifre sıfırlama hatası:", error);
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// Şifre Değiştir (Mevcut Şifre + Yeni Şifre)
window.changeUserPassword = async function(currentPassword, newPassword) {
  if (!auth || !auth.currentUser) {
    return { success: false, error: "Oturum açmış bir kullanıcı bulunamadı." };
  }
  if (!currentPassword) {
    return { success: false, error: "Lütfen mevcut şifrenizi giriniz." };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Yeni şifreniz en az 6 karakter olmalıdır." };
  }
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    
    // 1. Mevcut şifreyi doğrula (re-authenticate)
    await user.reauthenticateWithCredential(credential);
    
    // 2. Yeni şifreyi güncelle
    await user.updatePassword(newPassword);
    return { success: true };
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    const code = error.code || "";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      return { success: false, error: "Mevcut şifrenizi hatalı girdiniz. Lütfen kontrol ediniz veya 'Şifremi Unuttum' seçeneğini kullanınız." };
    }
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// XP Artırma Fonksiyonu (Oyun bitimlerinde çağrılır)
window.addXPToFirebase = function(xpGained) {
  if (!window.fbUser || !db || xpGained <= 0) return;
  
  const userRef = db.collection('users').doc(window.fbUser.uid);
  userRef.update({
    xp: firebase.firestore.FieldValue.increment(xpGained),
    lastActive: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => {
    console.error("XP artırma hatası:", err);
  });
};

// İlerleme, Oyun İstatistikleri & Zaman Takibi Senkronizasyonu (Debounced + Immediate Desteği)
window.syncProgressToFirebase = function(customData, immediate = false) {
  if (!window.fbUser || !db) return;
  const s = window.state || {};
  
  const doSync = () => {
    const localTimeCards = parseInt(localStorage.getItem('lexiq_time_cards') || '0', 10);
    const localTimeGames = parseInt(localStorage.getItem('lexiq_time_games') || '0', 10);
    const localFirstStart = parseInt(localStorage.getItem('lexiq_first_started_at') || '0', 10);
    const localRegAt = parseInt(localStorage.getItem('lexiq_registered_at') || '0', 10);
    const localUnitDurations = JSON.parse(localStorage.getItem('lexiq_unit_durations') || '{}');
    const localGameStats = JSON.parse(localStorage.getItem('kelime_game_stats') || '{}');
    const localCleanWins = parseInt(localStorage.getItem('kelime_clean_wins') || '0', 10);

    const timeTrackingPayload = {
      cardSeconds: Math.max(s.timeTracking?.cardSeconds || 0, localTimeCards),
      gameSeconds: Math.max(s.timeTracking?.gameSeconds || 0, localTimeGames),
      firstStartedAt: (s.timeTracking?.firstStartedAt || localFirstStart || Date.now()),
      registeredAt: (s.timeTracking?.registeredAt || localRegAt || 0),
      unitDurations: Object.assign({}, localUnitDurations, (s.timeTracking?.unitDurations || {}))
    };

    const payload = {
      displayName: s.userName || localStorage.getItem('lexiq_user_name') || 'Öğrenci',
      avatar: s.userAvatar || localStorage.getItem('lexiq_user_avatar') || '🦊',
      lang: s.activeLanguage || localStorage.getItem('kelime_active_lang') || 'EN-TR',
      learnedMap: s.learnedMap || JSON.parse(localStorage.getItem('kelime_learned_map') || '{}'),
      unlockedBadges: s.unlockedBadges || JSON.parse(localStorage.getItem('kelime_unlocked_badges') || '[]'),
      maxStreak: (s.maxStreak !== undefined) ? s.maxStreak : (parseInt(localStorage.getItem('kelime_max_streak'), 10) || 0),
      dayStreak: (s.dayStreak !== undefined) ? s.dayStreak : (parseInt(localStorage.getItem('lexiq_day_streak'), 10) || 1),
      maxDayStreak: (s.maxDayStreak !== undefined) ? s.maxDayStreak : (parseInt(localStorage.getItem('lexiq_max_day_streak'), 10) || 1),
      lastStudyDate: s.lastStudyDate || localStorage.getItem('lexiq_last_study_date') || '',
      arenaWordsSolved: (s.arenaWordsSolved !== undefined) ? s.arenaWordsSolved : (parseInt(localStorage.getItem('kelime_arena_solved'), 10) || 0),
      xp: (s.xp !== undefined) ? s.xp : (parseInt(localStorage.getItem('kelime_xp'), 10) || 0),
      gameStats: Object.assign({}, localGameStats, (s.gameStats || {})),
      cleanWins: Math.max(s.cleanWins || 0, localCleanWins),
      timeTracking: timeTrackingPayload,
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (customData && typeof customData === 'object') {
      Object.assign(payload, customData);
    }
    db.collection('users').doc(window.fbUser.uid).set(payload, { merge: true })
      .catch(err => console.warn("İlerleme bulut yedekleme hatası:", err));
  };

  clearTimeout(window._fbSyncTimeout);
  if (immediate) {
    doSync();
  } else {
    window._fbSyncTimeout = setTimeout(doSync, 800);
  }
};

// Liderlik Tablosunu Getir
window.fetchLeaderboard = async function() {
  if (!db) return [];
  try {
    const snapshot = await db.collection('users')
                             .orderBy('xp', 'desc')
                             .limit(100)
                             .get();
    
    const leaders = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      leaders.push({
        uid: doc.id,
        displayName: data.displayName || 'İsimsiz Kahraman',
        avatar: data.avatar || '👤',
        xp: data.xp || 0,
        lang: data.lang || data.activeLanguage || 'EN-TR'
      });
    });
    return leaders;
  } catch (e) {
    console.error("Liderlik tablosu alınamadı:", e);
    return [];
  }
};

// Profil Bilgilerini Güncelle (Ayarlar veya Onboarding sonrası)
window.updateFirebaseProfile = function(name, avatar, track, level, lang) {
  if (!window.fbUser || !db) return;
  const updateData = {
    lastActive: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (name) updateData.displayName = name;
  if (avatar) updateData.avatar = avatar;
  if (track) updateData.track = track;
  if (level) updateData.level = level;
  if (lang) updateData.lang = lang;

  db.collection('users').doc(window.fbUser.uid).set(updateData, { merge: true })
    .catch(err => console.error("Profil güncelleme hatası:", err));

  if (name && auth && auth.currentUser) {
    auth.currentUser.updateProfile({ displayName: name }).catch(() => {});
  }
};

// Özel Avatar Yükle (Resim dosyası)
window.uploadCustomAvatar = async function(fileBlob) {
  if (!window.fbUser) throw new Error("Oturum açmadınız.");
  if (!storage) throw new Error("Depolama servisi aktif değil.");
  
  const storageRef = storage.ref();
  const avatarRef = storageRef.child('avatars/' + window.fbUser.uid + '.jpg');
  
  const snapshot = await avatarRef.put(fileBlob);
  const downloadURL = await snapshot.ref.getDownloadURL();
  
  await db.collection('users').doc(window.fbUser.uid).set({
    avatar: downloadURL
  }, { merge: true });
  
  return downloadURL;
};
