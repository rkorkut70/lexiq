/**
 * Çok Dilli Kelime Öğrenme Uygulaması - Temel Mantık ve Deneyim Katmanı
 * Kurallar: .antigravityrules.txt ile %100 uyumludur.
 * Sadece Vanilla JS & Standart Web API'leri kullanılmıştır.
 */

(function () {
  'use strict';

  const APP_VERSION = 'v1.3.9';
  const CURRENT_APP_BUILD = 'lexiq_build_15_clean';

  // Build 13 temiz kurulum / sıfırlama güvencesi (Kullanıcı verilerini sıfırla, Hoş Geldin ekranını garantile)
  if (!localStorage.getItem(CURRENT_APP_BUILD)) {
    try {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(CURRENT_APP_BUILD, 'true');
      if (window.firebase && window.firebase.auth) {
        window.firebase.auth().signOut().catch(() => {});
      }
    } catch (e) {
      console.warn('Build clean reset error:', e);
    }
  }

  // Manuel test için URL reset parametresi kontrolü (?reset=1)
  if (window.location.search.includes('reset')) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace(window.location.pathname);
  }

  // ==========================================
  // UYGULAMA DURUMU (STATE)
  // ==========================================
  const state = {
    activeLanguage: localStorage.getItem('kelime_active_lang') || null,
    activeTheme: localStorage.getItem('kelime_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    cardTheme: localStorage.getItem('kelime_card_theme') || 'white',
    cardFont: localStorage.getItem('kelime_card_font') || 'normal',
    gameFont: localStorage.getItem('kelime_game_font') || 'normal',
    cardHaptic: localStorage.getItem('kelime_card_haptic') !== 'false',
    gameHaptic: localStorage.getItem('kelime_game_haptic') !== 'false',
    fontFamily: localStorage.getItem('kelime_font_family') || 'system',
    flipSpeed: localStorage.getItem('kelime_flip_speed') || 'normal',
    linedPaper: localStorage.getItem('kelime_lined_paper') === 'true',
    reverseMode: localStorage.getItem('kelime_reverse_mode') === 'true',
    autoplayAudio: localStorage.getItem('kelime_autoplay_audio') === 'true',
    studyReminder: localStorage.getItem('kelime_study_reminder') === 'true',
    studyReminderDays: JSON.parse(localStorage.getItem('kelime_study_reminder_days') || '[1,2,3,4,5,6,0]'), // 1=Pzt, ..., 0=Paz
    studyReminderTimes: JSON.parse(localStorage.getItem('kelime_study_reminder_times') || '["20:00"]'),
    speechSpeed: parseFloat(localStorage.getItem('kelime_speech_speed') || '1.0'),
    isShuffled: localStorage.getItem('kelime_shuffle') === 'true',
    srsPriority: localStorage.getItem('kelime_srs_priority') === 'true',
    readExampleAudio: localStorage.getItem('kelime_read_example_audio') === 'true',
    slideshowActive: false,
    slideshowTimer: null,
    activeEnAccent: localStorage.getItem('kelime_en_accent') || 'US', // 'US' | 'UK'
    dailyGoal: parseInt(localStorage.getItem('kelime_daily_goal'), 10) || 15,
    dailyGoalExtra: 0,
    sessionLearnedIds: new Set(),
    activeUnitNo: null,
    activeFilter: (function() {
      const f = localStorage.getItem('kelime_active_filter');
      return f === 'learned' ? 'learned' : 'pending';
    })(), // 'pending' | 'learned'
    currentIndex: 0,
    isFlipped: false,
    words: [],
    // Öğrenilmiş kelime kimlikleri ve tekrar tarihleri: { [wordId]: { learned: true, timestamp: number } }
    learnedMap: JSON.parse(localStorage.getItem('kelime_learned_map') || '{}'),
    touchStartX: 0,
    touchEndX: 0,

    // Oyunlaştırma & Ödül Sistemi Durumu
    xp: parseInt(localStorage.getItem('kelime_xp'), 10) || 0,
    streak: 0,
    maxStreak: parseInt(localStorage.getItem('kelime_max_streak'), 10) || 0,
    dayStreak: parseInt(localStorage.getItem('lexiq_day_streak'), 10) || 1,
    maxDayStreak: parseInt(localStorage.getItem('lexiq_max_day_streak'), 10) || 1,
    lastStudyDate: localStorage.getItem('lexiq_last_study_date') || '',
    arenaWordsSolved: parseInt(localStorage.getItem('kelime_arena_solved'), 10) || 0,
    unlockedBadges: JSON.parse(localStorage.getItem('kelime_unlocked_badges') || '[]'),
    activeMode: 'home', // 'home' | 'flashcards' | 'arena'
    activeGame: null,
    roundUsedHint: false,
    cleanWins: parseInt(localStorage.getItem('kelime_clean_wins'), 10) || 0,
    gameStats: JSON.parse(localStorage.getItem('kelime_game_stats') || '{}'),
    streakPledge: (function() {
      try {
        return JSON.parse(localStorage.getItem('lexiq_streak_pledge') || 'null');
      } catch (e) {
        return null;
      }
    })(),
 // null | 'match' | 'truefalse' | 'tetris' | 'anagram' | 'listen' | 'quiz' | 'scramble' | 'cloze'
    
    // Kullanıcı Profil & İlk Kurulum (Onboarding) Durumu
    userName: localStorage.getItem('lexiq_user_name') || 'Öğrenci',
    userAvatar: localStorage.getItem('lexiq_user_avatar') || '🦊',
    userEmail: localStorage.getItem('lexiq_user_email') || '',
    userTrack: localStorage.getItem('lexiq_user_track') || '4A',
    userLevel: localStorage.getItem('lexiq_user_level') || 'A2',
    isOnboarded: localStorage.getItem('lexiq_user_onboarded') === 'true',

    // Oyun Aktif Kelime Durumu & Arena Tercihleri
    clozeAutoTranslate: localStorage.getItem('kelime_cloze_auto_translate') === 'true',
    currentAnagramWord: null,
    anagramUserLetters: [],
    currentClozeWord: null,
    tetrisTimerInterval: null,
    tetrisActive: false,

    // Etkinlik & Zaman Takip İstatistikleri
    timeTracking: {
      cardSeconds: parseInt(localStorage.getItem('lexiq_time_cards') || '0', 10),
      gameSeconds: parseInt(localStorage.getItem('lexiq_time_games') || '0', 10),
      firstStartedAt: parseInt(localStorage.getItem('lexiq_first_started_at') || '0', 10) || Date.now(),
      registeredAt: parseInt(localStorage.getItem('lexiq_registered_at') || '0', 10) || 0,
      unitDurations: JSON.parse(localStorage.getItem('lexiq_unit_durations') || '{}'),
      unitStartTimes: JSON.parse(localStorage.getItem('lexiq_unit_start_times') || '{}')
    }
  };

  // İlk başlama tarihi henüz yoksa hemen kaydet
  if (!localStorage.getItem('lexiq_first_started_at')) {
    localStorage.setItem('lexiq_first_started_at', String(state.timeTracking.firstStartedAt));
  }

  window.state = state;


  // ==========================================
  // XP, ROZET & İPUCU CEZASI HESAPLAMA YARDIMCILARI
  // ==========================================
  function getLearnedCount(s) {
    if (!s || !s.learnedMap) return 0;
    return Object.values(s.learnedMap).filter(v => v && v.learned === true).length;
  }

  function getLearnedCountFor(s, lang, level = null) {
    if (!s || !s.learnedMap) return 0;
    const allWords = getWordsData();
    const learnedIds = new Set(Object.keys(s.learnedMap).filter(id => s.learnedMap[id] && s.learnedMap[id].learned));
    return allWords.filter(w => learnedIds.has(String(w.id)) && (!lang || w.dil === lang) && (!level || w.seviye === level)).length;
  }

  function isMultiLingual(s, threshold = 30) {
    if (!s || !s.learnedMap) return false;
    const countEn = getLearnedCountFor(s, 'EN-TR');
    const countDe = getLearnedCountFor(s, 'DE-TR');
    const countFr = getLearnedCountFor(s, 'FR-TR');
    let metCount = 0;
    if (countEn >= threshold) metCount++;
    if (countDe >= threshold) metCount++;
    if (countFr >= threshold) metCount++;
    return metCount >= 2;
  }

  function updateLiveXpDisplays(wasDeduction = false) {
    if (dom.headerXpText) dom.headerXpText.textContent = state.xp;
    if (dom.arenaXpText) dom.arenaXpText.textContent = state.xp;
    if (dom.modalTotalXpText) dom.modalTotalXpText.textContent = `${(state.xp || 0).toLocaleString('tr-TR')} XP`;
    if (dom.arenaUserXp) dom.arenaUserXp.textContent = `⭐ ${state.xp} XP`;
    if (dom.activeGameLiveXpVal) dom.activeGameLiveXpVal.textContent = state.xp;

    if (dom.activeGameLiveXpBadge && wasDeduction) {
      dom.activeGameLiveXpBadge.classList.add('xp-decreased');
      setTimeout(() => {
        if (dom.activeGameLiveXpBadge) dom.activeGameLiveXpBadge.classList.remove('xp-decreased');
      }, 500);
    }
  }

  function deductWrongAnswerPenalty(penalty = 1) {
    state.xp = Math.max(0, state.xp - penalty);
    localStorage.setItem('kelime_xp', state.xp);
    updateLiveXpDisplays(true);
    if (typeof window.syncProgressToFirebase === 'function') {
      window.syncProgressToFirebase(null, true);
    }
  }

  function useHintWithPenalty(cost = 5, customMsg = null) {
    state.roundUsedHint = true;
    state.xp = Math.max(0, state.xp - cost);
    localStorage.setItem('kelime_xp', state.xp);
    updateLiveXpDisplays(true);
    if (typeof window.syncProgressToFirebase === 'function') {
      window.syncProgressToFirebase(null, true);
    }
    const msg = customMsg || `💡 İpucu kullanıldı: -${cost} XP düşüldü!`;
    showToast(msg);
  }

  // 15-20 Eğlenceli, Çeşitli ve Motive Edici Kutlama Mesajları Havuzu
  const CELEBRATION_MESSAGES = [
    'Harika çözdün! 🎉',
    'Kusursuz hamle! ⚡',
    'Aklına sağlık, süper gidiyorsun! 🚀',
    'Nokta atışı bildin! 🎯',
    'Muazzam refleks! 🧠✨',
    'Kelime canavarı iş başında! 🔥',
    'Zihnin parlıyor! 🌟',
    'Bunu da cebe attın! 🏆',
    'Durdurulamıyorsun! 🌪️',
    'Efsane bir cevap! 👏',
    'Hafızan zehir gibi! 💯',
    'Tam isabet, devam et! 🚀',
    'Bravo, harika bir tempo! 🎈',
    'Saniyeler içinde çözdün! ⏱️⚡',
    'Müthişsin, kim tutar seni! 🌟',
    'Kelime hazinene bir yıldız daha! ⭐',
    'Bunu biliyordun zaten! 😎',
    'Harika odaklanma! 🎯',
    'Öğrenme hızına hayran kaldık! 🚀',
    'Kelimeler senden korksun! 🦁'
  ];

  let lastCelebrationMsgIdx = -1;
  function getRandomCelebrationMessage() {
    let idx;
    do {
      idx = Math.floor(Math.random() * CELEBRATION_MESSAGES.length);
    } while (idx === lastCelebrationMsgIdx && CELEBRATION_MESSAGES.length > 1);
    lastCelebrationMsgIdx = idx;
    return CELEBRATION_MESSAGES[idx];
  }

  const CELEBRATION_ICONS = ['🎉', '⚡', '🏆', '🔥', '🌟', '🎯', '💎', '👑', '🚀', '✨'];
  let lastCelebrationIconIdx = -1;
  function getRandomCelebrationIcon() {
    let idx;
    do {
      idx = Math.floor(Math.random() * CELEBRATION_ICONS.length);
    } while (idx === lastCelebrationIconIdx && CELEBRATION_ICONS.length > 1);
    lastCelebrationIconIdx = idx;
    return CELEBRATION_ICONS[idx];
  }

  // 15-20 Esprili, Destekleyici ve Motive Edici Yanlış Cevap Mesajları Havuzu
  const ENCOURAGEMENT_MESSAGES = [
    'Yaklaştın! Bir dahaki sefere kaçış yok! 😉',
    'Nazar boncuğu olsun, pes etmek yok! 🧿',
    'Beyin fırtınası hızlandı, bir daha dene! ⚡',
    'Küçük bir takılma, şampiyonlar böyle öğrenir! 🥊',
    'Kelimeler bazen kurnazdır, bir sonrakinde yakalarsın! 🦊',
    'Hafıza şimdi kaydediyor, hiç sorun değil! 💾✨',
    'Çok yakındın, enerjini düşürme! 🚀',
    'Bir tebessüm et ve devam et, harika gidiyorsun! 😊',
    'Hata yok, sadece yeni bir öğrenme adımı var! 💡',
    'Klavye/parmak sürçmesi sayıyoruz, yola devam! 🕹️',
    'Hemen toparlanırsın, sana güvenimiz tam! 🌟',
    'Kelimeler sana meydan okuyor, cevabını ver! 🦁',
    'Derin bir nefes al, sıradaki tam senin kelimen! 🧘‍♂️',
    'Antrenman zorlu olur ama zafer tatlıdır! 🏆',
    'Beyin kasların şu an gelişiyor, hissettin mi? 💪',
    'Ufak bir virajdı, düzlüğe çıktın bile! 🏎️💨',
    'Sıkıntı yok, bu kelime artık aklına kazındı! 📌',
    'Hedefe giderken küçük molalar serbest! 🎯',
    'Asıl başarı tekrar denemektir, devam! 🌈',
    'Robotlar bile bazen yanılır, sen harika gidiyorsun! 🤖✨'
  ];

  let lastEncouragementMsgIdx = -1;
  function getRandomEncouragementMessage() {
    let idx;
    do {
      idx = Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length);
    } while (idx === lastEncouragementMsgIdx && ENCOURAGEMENT_MESSAGES.length > 1);
    lastEncouragementMsgIdx = idx;
    return ENCOURAGEMENT_MESSAGES[idx];
  }

  const ENCOURAGEMENT_ICONS = ['💪', '🎯', '🌱', '💡', '✨', '🔥', '🧠', '🛡️'];
  let lastEncouragementIconIdx = -1;
  function getRandomEncouragementIcon() {
    let idx;
    do {
      idx = Math.floor(Math.random() * ENCOURAGEMENT_ICONS.length);
    } while (idx === lastEncouragementIconIdx && ENCOURAGEMENT_ICONS.length > 1);
    lastEncouragementIconIdx = idx;
    return ENCOURAGEMENT_ICONS[idx];
  }

  function getUnlearnedWordsCountInActiveUnit() {
    try {
      const targetLevel = state.userLevel || getLevelForTrack(state.activeLanguage, state.userTrack);
      const allWords = getWordsData().filter(w => w.dil === state.activeLanguage && (!targetLevel || w.seviye === targetLevel));
      let unitWords = allWords.filter(w => w.unite_no === state.activeUnitNo && (!targetLevel || w.seviye === targetLevel));
      if (unitWords.length === 0) unitWords = allWords;
      const unlearned = unitWords.filter(w => {
        const isLearned = state.learnedMap[w.id] && state.learnedMap[w.id].learned === true;
        return !isLearned;
      });
      return unlearned.length;
    } catch (e) {
      console.warn('getUnlearnedWordsCountInActiveUnit error:', e);
      return 999;
    }
  }

  function recordGameWin(gameName, basePoints) {
    state.gameStats = state.gameStats || {};
    state.gameStats[gameName] = (state.gameStats[gameName] || 0) + 1;
    localStorage.setItem('kelime_game_stats', JSON.stringify(state.gameStats));

    const earned = addXp(basePoints);
    const winTitle = getRandomCelebrationMessage();
    const winIcon = getRandomCelebrationIcon();

    if (!state.roundUsedHint) {
      state.cleanWins = (state.cleanWins || 0) + 1;
      localStorage.setItem('kelime_clean_wins', state.cleanWins);
      const bonus = 5;
      state.xp += bonus;
      localStorage.setItem('kelime_xp', state.xp);
      if (dom.headerXpText) dom.headerXpText.textContent = state.xp;
      if (dom.modalTotalXpText) dom.modalTotalXpText.textContent = `${(state.xp || 0).toLocaleString('tr-TR')} XP`;
      showCelebrationBanner(winTitle, 'Saf Zihin Bonusu (+5 XP)', `+${earned + bonus} XP`, winIcon);
    } else {
      showCelebrationBanner(winTitle, '', `+${earned} XP`, winIcon);
    }
    updateLiveXpDisplays(false);
    checkBadgeUnlocks();
    if (typeof window.syncProgressToFirebase === 'function') {
      window.syncProgressToFirebase(null, true);
    }
    return earned;
  }

  // Başarım Rozetleri Konfigürasyonu (Renkli & Prestijli Rozetler)
    const BADGES_CONFIG = [
    // --- 1. XP SEVİYE LİGLERİ (10 ROZET) ---
    { id: 'bronze_explorer', name: 'Çırak Kaşif', icon: '🥉', desc: '100 XP seviyesine ulaş', type: 'bronze', category: 'xp', check: (s) => s.xp >= 100 },
    { id: 'silver_hunter', name: 'Gümüş Avcı', icon: '🥈', desc: '500 XP seviyesine ulaş', type: 'silver', category: 'xp', check: (s) => s.xp >= 500 },
    { id: 'gold_master', name: 'Altın Usta', icon: '🥇', desc: '1.500 XP seviyesine ulaş', type: 'gold', category: 'xp', check: (s) => s.xp >= 1500 },
    { id: 'diamond_wizard', name: 'Elmas Dilbaz', icon: '💎', desc: '3.500 XP seviyesine ulaş', type: 'diamond', category: 'xp', check: (s) => s.xp >= 3500 },
    { id: 'legend_champion', name: 'Efsane Şampiyon', icon: '👑', desc: '7.500 XP seviyesine ulaş', type: 'legend', category: 'xp', check: (s) => s.xp >= 7500 },
    { id: 'titanium_master', name: 'Titanyum Efendi', icon: '🛡️', desc: '15.000 XP seviyesine ulaş', type: 'titanium', category: 'xp', check: (s) => s.xp >= 15000 },
    { id: 'cosmic_sage', name: 'Kozmik Bilge', icon: '🌌', desc: '30.000 XP seviyesine ulaş', type: 'cosmic', category: 'xp', check: (s) => s.xp >= 30000 },
    { id: 'star_conqueror', name: 'Yıldız Fatihi', icon: '⚡', desc: '50.000 XP seviyesine ulaş', type: 'legend', category: 'xp', check: (s) => s.xp >= 50000 },
    { id: 'immortal_linguist', name: 'Ölümsüz Dilbilimci', icon: '🔮', desc: '75.000 XP seviyesine ulaş', type: 'cosmic', category: 'xp', check: (s) => s.xp >= 75000 },
    { id: 'galactic_polyglot', name: 'Galaktik Poliglot', icon: '🪐', desc: '100.000 XP seviyesine ulaş', type: 'legend', category: 'xp', check: (s) => s.xp >= 100000 },

    // --- 2. KELİME DAĞARCIĞI (8 ROZET) ---
    { id: 'vocab_seed', name: 'İlk Tohum', icon: '🌱', desc: '10 kelimeyi başarıyla öğren', type: 'bronze', category: 'vocab', check: (s) => getLearnedCount(s) >= 10 },
    { id: 'vocab_apprentice', name: 'Kelime Çırağı', icon: '📖', desc: '50 kelimeyi başarıyla öğren', type: 'silver', category: 'vocab', check: (s) => getLearnedCount(s) >= 50 },
    { id: 'vocab_bookworm', name: 'Sözlük Kurdu', icon: '📚', desc: '150 kelimeyi başarıyla öğren', type: 'gold', category: 'vocab', check: (s) => getLearnedCount(s) >= 150 },
    { id: 'vocab_vault', name: 'Hafıza Deposu', icon: '🧠', desc: '300 kelimeyi başarıyla öğren', type: 'diamond', category: 'vocab', check: (s) => getLearnedCount(s) >= 300 },
    { id: 'vocab_collector', name: 'Kelime Koleksiyoncusu', icon: '🏛️', desc: '600 kelimeyi başarıyla öğren', type: 'legend', category: 'vocab', check: (s) => getLearnedCount(s) >= 600 },
    { id: 'vocab_master', name: 'Kelime Efendisi', icon: '🏰', desc: '1.200 kelimeyi başarıyla öğren', type: 'titanium', category: 'vocab', check: (s) => getLearnedCount(s) >= 1200 },
    { id: 'vocab_revolution', name: 'Dil Devrimi', icon: '🌍', desc: '2.500 kelimeyi başarıyla öğren', type: 'cosmic', category: 'vocab', check: (s) => getLearnedCount(s) >= 2500 },
    { id: 'vocab_encyclopedia', name: 'Büyük Ansiklopedi', icon: '👑', desc: '4.500 kelimeyi başarıyla öğren', type: 'legend', category: 'vocab', check: (s) => getLearnedCount(s) >= 4500 },

    // --- 3. OYUN & ARENA UZMANLIĞI (8 ROZET) ---
    { id: 'game_match_master', name: 'Hafıza Kartalı', icon: '🃏', desc: '15 kez Eşleştirme oyununu tamamla', type: 'gold', category: 'game', check: (s) => (s.gameStats?.match || 0) >= 15 },
    { id: 'game_tf_master', name: 'Keskin Göz', icon: '🎯', desc: '15 kez Doğru/Yanlış oyununu kazan', type: 'silver', category: 'game', check: (s) => (s.gameStats?.truefalse || 0) >= 15 },
    { id: 'game_scramble_master', name: 'Kelime Mimarı', icon: '🧩', desc: '15 kez Cümle Kurma tamamla', type: 'diamond', category: 'game', check: (s) => (s.gameStats?.scramble || 0) >= 15 },
    { id: 'game_listen_master', name: 'Altın Kulak', icon: '🎧', desc: '15 kez Dinle & Yaz oyununu tamamla', type: 'gold', category: 'game', check: (s) => (s.gameStats?.listen || 0) >= 15 },
    { id: 'game_tetris_master', name: 'Tetris Ustası', icon: '🕹️', desc: '15 kez Harf Tetrisi oyununu tamamla', type: 'titanium', category: 'game', check: (s) => (s.gameStats?.tetris || 0) >= 15 },
    { id: 'game_anagram_master', name: 'Anagram Dâhisi', icon: '🔤', desc: '15 kez Harf Karıştırma çöz', type: 'silver', category: 'game', check: (s) => (s.gameStats?.anagram || 0) >= 15 },
    { id: 'game_cloze_master', name: 'Metin Dedektifi', icon: '📝', desc: '15 kez Boşluk Doldurma çöz', type: 'diamond', category: 'game', check: (s) => (s.gameStats?.cloze || 0) >= 15 },
    { id: 'game_quiz_master', name: 'Test Profesörü', icon: '🎓', desc: '30 kez 4 Şıklı Testi doğru yanıtla', type: 'legend', category: 'game', check: (s) => (s.gameStats?.quiz || 0) >= 30 },

    // --- 4. SERİ & ODAKLANMA (10 ROZET) ---
    { id: 'streak_fire', name: 'Ateşli Seri', icon: '🔥', desc: 'Arenada ardı ardına 5 doğru yap', type: 'streak', category: 'streak', check: (s) => s.streak >= 5 || s.maxStreak >= 5 },
    { id: 'streak_inferno', name: 'Şimşek Fırtınası', icon: '⚡', desc: 'Arenada ardı ardına 10 doğru yap', type: 'streak', category: 'streak', check: (s) => s.streak >= 10 || s.maxStreak >= 10 },
    { id: 'streak_unstoppable', name: 'Durdurulamaz', icon: '☄️', desc: 'Arenada ardı ardına 20 doğru yap', type: 'streak', category: 'streak', check: (s) => s.streak >= 20 || s.maxStreak >= 20 },
    { id: 'daily_streak_3', name: '3 Günlük İstikrar', icon: '🌱', desc: '3 gün aralıksız kelime çalış', type: 'bronze', category: 'streak', check: (s) => (s.dayStreak || 0) >= 3 || (s.maxDayStreak || 0) >= 3 },
    { id: 'daily_streak_7', name: 'Haftalık Şampiyon', icon: '🌟', desc: '7 gün aralıksız kelime çalış', type: 'gold', category: 'streak', check: (s) => (s.dayStreak || 0) >= 7 || (s.maxDayStreak || 0) >= 7 },
    { id: 'daily_streak_14', name: '2 Haftalık Azim', icon: '👑', desc: '14 gün aralıksız kelime çalış', type: 'diamond', category: 'streak', check: (s) => (s.dayStreak || 0) >= 14 || (s.maxDayStreak || 0) >= 14 },
    { id: 'daily_streak_30', name: 'Aylık Efsane', icon: '🏆', desc: '30 gün aralıksız kelime çalış', type: 'legend', category: 'streak', check: (s) => (s.dayStreak || 0) >= 30 || (s.maxDayStreak || 0) >= 30 },
    { id: 'pure_mind', name: 'Saf Zihin', icon: '🧘', desc: 'Hiç ipucu kullanmadan 10 arena oyunu kazan', type: 'diamond', category: 'streak', check: (s) => (s.cleanWins || 0) >= 10 },
    { id: 'vocab_monster', name: 'Kelime Canavarı', icon: '📚', desc: 'Arenada 20 kelimeyi başarıyla çöz', type: 'gold', category: 'streak', check: (s) => s.arenaWordsSolved >= 20 },
    { id: 'arena_gladiator', name: 'Arena Gladyatörü', icon: '⚔️', desc: 'Arenada 100 kelimeyi başarıyla çöz', type: 'titanium', category: 'streak', check: (s) => s.arenaWordsSolved >= 100 },

    // --- 5. DİL & MÜFREDAT KURLARI (A1, A2, B1, B1+ SEVİYELERİ: ACEMİ, ÇIRAK, KALFA, USTA, ÜSTAT) ---
    // İngilizce (EN-TR) Kurları
    { id: 'badge_en_a2_acemi', name: 'İngilizce A2 Acemi', icon: '🌱', desc: 'İngilizce A2 kurunda 25 kelime öğren', type: 'bronze', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'A2') >= 25 },
    { id: 'badge_en_a2_cirak', name: 'İngilizce A2 Çırak', icon: '📖', desc: 'İngilizce A2 kurunda 75 kelime öğren', type: 'silver', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'A2') >= 75 },
    { id: 'badge_en_a2_kalfa', name: 'İngilizce A2 Kalfa', icon: '📚', desc: 'İngilizce A2 kurunda 175 kelime öğren', type: 'gold', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'A2') >= 175 },
    { id: 'badge_en_a2_usta', name: 'İngilizce A2 Usta', icon: '🏰', desc: 'İngilizce A2 kurunda 350 kelime öğren', type: 'diamond', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'A2') >= 350 },
    { id: 'badge_en_a2_ustat', name: 'İngilizce A2 Üstat', icon: '👑', desc: 'İngilizce A2 kurunda 600 kelime öğren', type: 'legend', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'A2') >= 600 },

    { id: 'badge_en_b1_acemi', name: 'İngilizce B1 Acemi', icon: '🌱', desc: 'İngilizce B1 kurunda 25 kelime öğren', type: 'bronze', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1') >= 25 },
    { id: 'badge_en_b1_cirak', name: 'İngilizce B1 Çırak', icon: '📖', desc: 'İngilizce B1 kurunda 75 kelime öğren', type: 'silver', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1') >= 75 },
    { id: 'badge_en_b1_kalfa', name: 'İngilizce B1 Kalfa', icon: '📚', desc: 'İngilizce B1 kurunda 175 kelime öğren', type: 'gold', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1') >= 175 },
    { id: 'badge_en_b1_usta', name: 'İngilizce B1 Usta', icon: '🏰', desc: 'İngilizce B1 kurunda 350 kelime öğren', type: 'diamond', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1') >= 350 },
    { id: 'badge_en_b1_ustat', name: 'İngilizce B1 Üstat', icon: '👑', desc: 'İngilizce B1 kurunda 550 kelime öğren', type: 'legend', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1') >= 550 },

    { id: 'badge_en_b1p_acemi', name: 'İngilizce B1+ Acemi', icon: '🌱', desc: 'İngilizce B1+ kurunda 25 kelime öğren', type: 'bronze', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1+') >= 25 },
    { id: 'badge_en_b1p_cirak', name: 'İngilizce B1+ Çırak', icon: '📖', desc: 'İngilizce B1+ kurunda 75 kelime öğren', type: 'silver', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1+') >= 75 },
    { id: 'badge_en_b1p_kalfa', name: 'İngilizce B1+ Kalfa', icon: '📚', desc: 'İngilizce B1+ kurunda 175 kelime öğren', type: 'gold', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1+') >= 175 },
    { id: 'badge_en_b1p_usta', name: 'İngilizce B1+ Usta', icon: '🏰', desc: 'İngilizce B1+ kurunda 350 kelime öğren', type: 'diamond', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1+') >= 350 },
    { id: 'badge_en_b1p_ustat', name: 'İngilizce B1+ Üstat', icon: '👑', desc: 'İngilizce B1+ kurunda 550 kelime öğren', type: 'legend', category: 'lang', check: (s) => getLearnedCountFor(s, 'EN-TR', 'B1+') >= 550 },

    // Almanca (DE-TR) Kurları
    { id: 'badge_de_a1_acemi', name: 'Almanca A1 Acemi', icon: '🌱', desc: 'Almanca A1 kurunda 25 kelime öğren', type: 'bronze', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A1') >= 25 },
    { id: 'badge_de_a1_cirak', name: 'Almanca A1 Çırak', icon: '📖', desc: 'Almanca A1 kurunda 75 kelime öğren', type: 'silver', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A1') >= 75 },
    { id: 'badge_de_a1_kalfa', name: 'Almanca A1 Kalfa', icon: '📚', desc: 'Almanca A1 kurunda 200 kelime öğren', type: 'gold', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A1') >= 200 },
    { id: 'badge_de_a1_usta', name: 'Almanca A1 Usta', icon: '🏰', desc: 'Almanca A1 kurunda 450 kelime öğren', type: 'diamond', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A1') >= 450 },
    { id: 'badge_de_a1_ustat', name: 'Almanca A1 Üstat', icon: '👑', desc: 'Almanca A1 kurunda 800 kelime öğren', type: 'legend', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A1') >= 800 },

    { id: 'badge_de_a2_acemi', name: 'Almanca A2 Acemi', icon: '🌱', desc: 'Almanca A2 kurunda 25 kelime öğren', type: 'bronze', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A2') >= 25 },
    { id: 'badge_de_a2_cirak', name: 'Almanca A2 Çırak', icon: '📖', desc: 'Almanca A2 kurunda 75 kelime öğren', type: 'silver', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A2') >= 75 },
    { id: 'badge_de_a2_kalfa', name: 'Almanca A2 Kalfa', icon: '📚', desc: 'Almanca A2 kurunda 200 kelime öğren', type: 'gold', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A2') >= 200 },
    { id: 'badge_de_a2_usta', name: 'Almanca A2 Usta', icon: '🏰', desc: 'Almanca A2 kurunda 450 kelime öğren', type: 'diamond', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A2') >= 450 },
    { id: 'badge_de_a2_ustat', name: 'Almanca A2 Üstat', icon: '👑', desc: 'Almanca A2 kurunda 800 kelime öğren', type: 'legend', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'A2') >= 800 },

    { id: 'badge_de_b1_acemi', name: 'Almanca B1 Acemi', icon: '🌱', desc: 'Almanca B1 kurunda 25 kelime öğren', type: 'bronze', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'B1') >= 25 },
    { id: 'badge_de_b1_cirak', name: 'Almanca B1 Çırak', icon: '📖', desc: 'Almanca B1 kurunda 75 kelime öğren', type: 'silver', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'B1') >= 75 },
    { id: 'badge_de_b1_kalfa', name: 'Almanca B1 Kalfa', icon: '📚', desc: 'Almanca B1 kurunda 200 kelime öğren', type: 'gold', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'B1') >= 200 },
    { id: 'badge_de_b1_usta', name: 'Almanca B1 Usta', icon: '🏰', desc: 'Almanca B1 kurunda 450 kelime öğren', type: 'diamond', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'B1') >= 450 },
    { id: 'badge_de_b1_ustat', name: 'Almanca B1 Üstat', icon: '👑', desc: 'Almanca B1 kurunda 800 kelime öğren', type: 'legend', category: 'lang', check: (s) => getLearnedCountFor(s, 'DE-TR', 'B1') >= 800 },

    // Fransızca (FR-TR) Kurları
    { id: 'badge_fr_a1_acemi', name: 'Fransızca A1 Acemi', icon: '🌱', desc: 'Fransızca A1 kurunda 25 kelime öğren', type: 'bronze', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A1') >= 25 },
    { id: 'badge_fr_a1_cirak', name: 'Fransızca A1 Çırak', icon: '📖', desc: 'Fransızca A1 kurunda 75 kelime öğren', type: 'silver', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A1') >= 75 },
    { id: 'badge_fr_a1_kalfa', name: 'Fransızca A1 Kalfa', icon: '📚', desc: 'Fransızca A1 kurunda 200 kelime öğren', type: 'gold', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A1') >= 200 },
    { id: 'badge_fr_a1_usta', name: 'Fransızca A1 Usta', icon: '🏰', desc: 'Fransızca A1 kurunda 450 kelime öğren', type: 'diamond', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A1') >= 450 },
    { id: 'badge_fr_a1_ustat', name: 'Fransızca A1 Üstat', icon: '👑', desc: 'Fransızca A1 kurunda 750 kelime öğren', type: 'legend', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A1') >= 750 },

    { id: 'badge_fr_a2_acemi', name: 'Fransızca A2 Acemi', icon: '🌱', desc: 'Fransızca A2 kurunda 25 kelime öğren', type: 'bronze', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A2') >= 25 },
    { id: 'badge_fr_a2_cirak', name: 'Fransızca A2 Çırak', icon: '📖', desc: 'Fransızca A2 kurunda 75 kelime öğren', type: 'silver', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A2') >= 75 },
    { id: 'badge_fr_a2_kalfa', name: 'Fransızca A2 Kalfa', icon: '📚', desc: 'Fransızca A2 kurunda 200 kelime öğren', type: 'gold', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A2') >= 200 },
    { id: 'badge_fr_a2_usta', name: 'Fransızca A2 Usta', icon: '🏰', desc: 'Fransızca A2 kurunda 450 kelime öğren', type: 'diamond', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A2') >= 450 },
    { id: 'badge_fr_a2_ustat', name: 'Fransızca A2 Üstat', icon: '👑', desc: 'Fransızca A2 kurunda 750 kelime öğren', type: 'legend', category: 'lang', check: (s) => getLearnedCountFor(s, 'FR-TR', 'A2') >= 750 },

    // Çok Dilli Gezgin Rozeti
    { id: 'lang_polyglot', name: 'Çok Dilli Gezgin', icon: '🌍', desc: 'En az iki farklı dilde 30\'ar kelime öğren', type: 'cosmic', category: 'lang', check: (s) => isMultiLingual(s, 30) }
  ];

  window.BADGES_CONFIG = BADGES_CONFIG;

  // Öğrencinin seçtiği dile göre ilgili rozetleri filtreleme (İngilizce öğrencisi sadece İngilizce dil/kur rozetlerini görür)
  function getVisibleBadgesConfigForUser(langCode) {
    const lang = langCode || state.activeLanguage || 'EN-TR';
    return BADGES_CONFIG.filter(badge => {
      if (badge.category !== 'lang') return true;
      if (badge.id === 'lang_polyglot') return true;
      if (lang === 'EN-TR') return badge.id.startsWith('badge_en_');
      if (lang === 'DE-TR') return badge.id.startsWith('badge_de_');
      if (lang === 'FR-TR') return badge.id.startsWith('badge_fr_');
      return true;
    });
  }

  // Dil Göstergeleri ve Bayrak Eşleşmesi
  const LANG_META = {
    'EN-TR': { label: 'EN-TR', name: 'İngilizce → Türkçe', flag: '🇬🇧', speechLang: 'en-US' },
    'FR-TR': { label: 'FR-TR', name: 'Fransızca → Türkçe', flag: '🇫🇷', speechLang: 'fr-FR' },
    'DE-TR': { label: 'DE-TR', name: 'Almanca → Türkçe', flag: '🇩🇪', speechLang: 'de-DE' }
  };

  // ==========================================
  // DOM ELEMENTLERİ
  // ==========================================
  const dom = {
    html: document.documentElement,
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    moonIcon: document.getElementById('moonIcon'),
    sunIcon: document.getElementById('sunIcon'),
    langSelectBtn: document.getElementById('langSelectBtn'),
    userProfileBtn: document.getElementById('userProfileBtn'),
    headerUnitSelectBtn: document.getElementById('headerUnitSelectBtn'),
    headerUnitLabel: document.getElementById('headerUnitLabel'),
    headerUserAvatar: document.getElementById('headerUserAvatar'),
    headerUserName: document.getElementById('headerUserName'),
    homeUserAvatar: document.getElementById('homeUserAvatar'),
    homeUserName: document.getElementById('homeUserName'),
    activeLangFlag: document.getElementById('activeLangFlag'),
    activeLangLabel: document.getElementById('activeLangLabel'),
    badgesBtn: document.getElementById('badgesBtn'),
    headerXpText: document.getElementById('headerXpText'),

    // Pencereler & Navigasyon
    brandHeaderHomeBtn: document.getElementById('brandHeaderHomeBtn'),
    homeView: document.getElementById('homeView'),
    flashcardsView: document.getElementById('flashcardsView'),
    arenaView: document.getElementById('arenaView'),
    bottomNav: document.getElementById('bottomNav'),
    floatingNavDock: document.getElementById('floatingNavDock'),
    floatingNavMenu: document.getElementById('floatingNavMenu'),
    floatingHomeBtn: document.getElementById('floatingHomeBtn'),
    floatingToggleBtn: document.getElementById('floatingToggleBtn'),
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    drawerCloseBtn: document.getElementById('drawerCloseBtn'),
    drawerCloseBar: document.getElementById('drawerCloseBar'),
    floatMenuHome: document.getElementById('floatMenuHome'),
    floatMenuCards: document.getElementById('floatMenuCards'),
    floatMenuArena: document.getElementById('floatMenuArena'),
    navItemHome: document.getElementById('navItemHome'),
    navItemCards: document.getElementById('navItemCards'),
    navItemArena: document.getElementById('navItemArena'),
    navItemSettings: document.getElementById('navItemSettings'),
    navArenaDot: document.getElementById('navArenaDot'),
    tabFlashcards: document.getElementById('tabFlashcards'),
    tabArena: document.getElementById('tabArena'),
    arenaAvailableDot: document.getElementById('arenaAvailableDot'),

    // Giriş Sayfası Elemanları
    homeUnitBadge: document.getElementById('homeUnitBadge'),
    homeUnitCount: document.getElementById('homeUnitCount'),
    homeHeroTitle: document.getElementById('homeHeroTitle'),
    homeHeroDesc: document.getElementById('homeHeroDesc'),
    homeProgressPercent: document.getElementById('homeProgressPercent'),
    homeProgressFill: document.getElementById('homeProgressFill'),
    homeTodayLearnedText: document.getElementById('homeTodayLearnedText'),
    homeDailyTargetText: document.getElementById('homeDailyTargetText'),
    dailyGoalSubtext: document.getElementById('dailyGoalSubtext'),
    homeRemainingText: document.getElementById('homeRemainingText'),
    homeStartBtn: document.getElementById('homeStartBtn'),
    homeStartBtnText: document.getElementById('homeStartBtnText'),
    homeStatStreak: document.getElementById('homeStatStreak'),
    homeStatLearned: document.getElementById('homeStatLearned'),
    homeStatXp: document.getElementById('homeStatXp'),
    homeArenaSubtext: document.getElementById('homeArenaSubtext'),
    homeArenaBannerCard: document.getElementById('homeArenaBannerCard'),
    homeViewAllArenaBtn: document.getElementById('homeViewAllArenaBtn'),
    homeMatchStatusBadge: document.getElementById('homeMatchStatusBadge'),
    homeQuizStatusBadge: document.getElementById('homeQuizStatusBadge'),
    homeClozeStatusBadge: document.getElementById('homeClozeStatusBadge'),
    homeTetrisStatusBadge: document.getElementById('homeTetrisStatusBadge'),
    homeGameMatch: document.getElementById('homeGameMatch'),
    homeGameQuiz: document.getElementById('homeGameQuiz'),
    homeGameCloze: document.getElementById('homeGameCloze'),
    homeGameTetris: document.getElementById('homeGameTetris'),

    // Odak Çalışma Üst Barı & Aksiyonları
    flashcardsBackBtn: document.getElementById('flashcardsBackBtn'),
    focusUnitTitle: document.getElementById('focusUnitTitle'),
    cardFullHomeBtn: document.getElementById('cardFullHomeBtn'),

    // Flashcard Elemanları
    unitSelectBtn: document.getElementById('unitSelectBtn'),
    activeUnitTitle: document.getElementById('activeUnitTitle'),
    activeUnitDates: document.getElementById('activeUnitDates'),
    dailyGoalSelect: document.getElementById('dailyGoalSelect'),
    progressCountLabel: document.getElementById('progressCountLabel'),
    learnedCountText: document.getElementById('learnedCountText'),
    totalCountText: document.getElementById('totalCountText'),
    progressPercentText: document.getElementById('progressPercentText'),
    progressFill: document.getElementById('progressFill'),
    cardTodayLearnedBar: document.getElementById('cardTodayLearnedBar'),
    cardTodayLearnedCount: document.getElementById('cardTodayLearnedCount'),
    cardTodayTargetCount: document.getElementById('cardTodayTargetCount'),
    cardTodayProgressFill: document.getElementById('cardTodayProgressFill'),
    cardFilterTabsContainer: document.querySelector('.card-filter-tabs-container'),
    cardTabPendingBtn: document.getElementById('cardTabPendingBtn'),
    cardTabLearnedBtn: document.getElementById('cardTabLearnedBtn'),
    pendingTabCount: document.getElementById('pendingTabCount'),
    learnedTabCount: document.getElementById('learnedTabCount'),
    tabContentPending: document.getElementById('tabContentPending'),
    tabContentLearned: document.getElementById('tabContentLearned'),
    inlineDailyGoalSelect: document.getElementById('inlineDailyGoalSelect'),
    filterTabs: document.querySelectorAll('.filter-tab, .card-tab-btn'),
    flashcardWrapper: document.getElementById('flashcardWrapper'),
    flashcard: document.getElementById('flashcard'),
    cardFrontFace: document.getElementById('cardFrontFace'),
    cardUnitBadge: document.getElementById('cardUnitBadge'),
    cardStatusBadge: document.getElementById('cardStatusBadge'),
    cardTargetWord: document.getElementById('cardTargetWord'),
    cardPhonetic: document.getElementById('cardPhonetic'),
    cardPos: document.getElementById('cardPos'),
    enAccentGroup: document.getElementById('enAccentGroup'),
    pronounceUsBtn: document.getElementById('pronounceUsBtn'),
    pronounceUkBtn: document.getElementById('pronounceUkBtn'),
    cardCategoryHint: document.getElementById('cardCategoryHint'),
    cardBackWordLabel: document.getElementById('cardBackWordLabel'),
    cardBackStatusBadge: document.getElementById('cardBackStatusBadge'),
    cardMeaningText: document.getElementById('cardMeaningText'),
    cardExampleSentence: document.getElementById('cardExampleSentence'),
    cardSentenceTranslation: document.getElementById('cardSentenceTranslation'),
    pronounceBtn: document.getElementById('pronounceBtn'),
    markRepeatBtn: document.getElementById('markRepeatBtn'),
    markLearnedBtn: document.getElementById('markLearnedBtn'),
    markLearnedBtnText: document.getElementById('markLearnedBtnText'),
    cardBottomControls: document.getElementById('cardBottomControls'),
    cardReviewGoArenaBtn: document.getElementById('cardReviewGoArenaBtn'),
    prevCardBtn: document.getElementById('prevCardBtn'),
    nextCardBtn: document.getElementById('nextCardBtn'),
    cardIndexCounter: document.getElementById('cardIndexCounter'),
    flashcardGoalCompletedView: document.getElementById('flashcardGoalCompletedView'),
    cardCompletedFullDesc: document.getElementById('cardCompletedFullDesc'),
    cardFullArenaBtn: document.getElementById('cardFullArenaBtn'),
    cardFullLearnMoreBtn: document.getElementById('cardFullLearnMoreBtn'),
    cardFullLearnMoreText: document.getElementById('cardFullLearnMoreText'),
    cardFullReviewLearnedBtn: document.getElementById('cardFullReviewLearnedBtn'),
    cardNavBar: document.getElementById('cardNavBar'),
    actionPanel: document.getElementById('actionPanel'),

    // Arena Elemanları
    arenaHeroBanner: document.getElementById('arenaHeroBanner'),
    arenaStreakText: document.getElementById('arenaStreakText'),
    arenaMultiplierText: document.getElementById('arenaMultiplierText'),
    arenaXpText: document.getElementById('arenaXpText'),
    arenaEmptyState: document.getElementById('arenaEmptyState'),
    arenaReadyCount: document.getElementById('arenaReadyCount'),
    arenaReadyFill: document.getElementById('arenaReadyFill'),
    arenaGoToCardsBtn: document.getElementById('arenaGoToCardsBtn'),

    // Oyun Menüsü & Aktif Alan
    arenaGamesMenu: document.getElementById('arenaGamesMenu'),
    gamesHubGrid: document.getElementById('gamesHubGrid'),
    gameHubCards: document.querySelectorAll('.game-hub-card'),
    arenaPoolCountText: document.getElementById('arenaPoolCountText'),
    arenaActiveGameArea: document.getElementById('arenaActiveGameArea'),
    backToGamesMenuBtn: document.getElementById('backToGamesMenuBtn'),
    activeGameLiveXpBadge: document.getElementById('activeGameLiveXpBadge'),
    activeGameLiveXpVal: document.getElementById('activeGameLiveXpVal'),
    activeGameEndBtn: document.getElementById('activeGameEndBtn'),
    closeActiveGameBtn: document.getElementById('closeActiveGameBtn'),
    activeGameNameBadge: document.getElementById('activeGameNameBadge'),
    gameHowToPlayBtn: document.getElementById('gameHowToPlayBtn'),
    gameHowToPlayOverlay: document.getElementById('gameHowToPlayOverlay'),
    howToPlayIcon: document.getElementById('howToPlayIcon'),
    howToPlayTitle: document.getElementById('howToPlayTitle'),
    howToPlayTag: document.getElementById('howToPlayTag'),
    howToPlayContent: document.getElementById('howToPlayContent'),
    howToPlayBtnText: document.getElementById('howToPlayBtnText'),
    gameStartPlayBtn: document.getElementById('gameStartPlayBtn'),
    howToPlayDontShowCheck: document.getElementById('howToPlayDontShowCheck'),
    dailyGoalCompleteModal: document.getElementById('dailyGoalCompleteModal'),
    goalCompleteTitle: document.getElementById('goalCompleteTitle'),
    goalCompleteDesc: document.getElementById('goalCompleteDesc'),
    goToActivitiesBtn: document.getElementById('goToActivitiesBtn'),
    learnMoreWordsBtn: document.getElementById('learnMoreWordsBtn'),
    learnMoreBtnText: document.getElementById('learnMoreBtnText'),
    closeGoalCompleteModalBtn: document.getElementById('closeGoalCompleteModalBtn'),

    // 1. Kart Eşleştirme (Match)
    gameMatchView: document.getElementById('gameMatchView'),
    matchHintBtn: document.getElementById('matchHintBtn'),
    matchFoundCount: document.getElementById('matchFoundCount'),
    matchGrid: document.getElementById('matchGrid'),

    // 2. Doğru mu Yanlış mı? (True / False)
    gameTrueFalseView: document.getElementById('gameTrueFalseView'),
    tfHintBtn: document.getElementById('tfHintBtn'),
    tfHintDetail: document.getElementById('tfHintDetail'),
    tfAudioBtn: document.getElementById('tfAudioBtn'),
    tfTimer: document.getElementById('tfTimer'),
    tfTargetWord: document.getElementById('tfTargetWord'),
    tfDisplayedMeaning: document.getElementById('tfDisplayedMeaning'),
    tfFalseBtn: document.getElementById('tfFalseBtn'),
    tfTrueBtn: document.getElementById('tfTrueBtn'),

    // 3. Harf Tetrisi (Tetris)
    gameTetrisView: document.getElementById('gameTetrisView'),
    tetrisHintBtn: document.getElementById('tetrisHintBtn'),
    tetrisAudioBtn: document.getElementById('tetrisAudioBtn'),
    tetrisTimer: document.getElementById('tetrisTimer'),
    tetrisFullscreenBtn: document.getElementById('tetrisFullscreenBtn'),
    tetrisExitBtn: document.getElementById('tetrisExitBtn'),
    tetrisFsIconExpand: document.getElementById('tetrisFsIconExpand'),
    tetrisFsIconCompress: document.getElementById('tetrisFsIconCompress'),
    tetrisMeaningText: document.getElementById('tetrisMeaningText'),
    tetrisHintText: document.getElementById('tetrisHintText'),
    tetrisStage: document.getElementById('tetrisStage'),
    tetrisSlots: document.getElementById('tetrisSlots'),

    // 4. Anagram
    gameAnagramView: document.getElementById('gameAnagramView'),
    anagramHintBtn: document.getElementById('anagramHintBtn'),
    anagramAudioBtn: document.getElementById('anagramAudioBtn'),
    anagramMeaningText: document.getElementById('anagramMeaningText'),
    anagramHintText: document.getElementById('anagramHintText'),
    anagramSlots: document.getElementById('anagramSlots'),
    anagramBank: document.getElementById('anagramBank'),
    anagramBackspaceBtn: document.getElementById('anagramBackspaceBtn'),
    anagramResetBtn: document.getElementById('anagramResetBtn'),

    // 5. Dinle ve Yaz (Listen & Spell)
    gameListenView: document.getElementById('gameListenView'),
    listenHintBtn: document.getElementById('listenHintBtn'),
    listenPlayAudioBtn: document.getElementById('listenPlayAudioBtn'),
    listenHintText: document.getElementById('listenHintText'),
    listenSlots: document.getElementById('listenSlots'),
    listenBank: document.getElementById('listenBank'),
    listenBackspaceBtn: document.getElementById('listenBackspaceBtn'),
    listenResetBtn: document.getElementById('listenResetBtn'),

    // 6. 4 Şıklı Test (Quiz)
    gameQuizView: document.getElementById('gameQuizView'),
    quizHintBtn: document.getElementById('quizHintBtn'),
    quizAudioBtn: document.getElementById('quizAudioBtn'),
    quizTargetWord: document.getElementById('quizTargetWord'),
    quizOptionsGrid: document.getElementById('quizOptionsGrid'),

    // 7. Cümle Kurma (Sentence Scramble)
    gameScrambleView: document.getElementById('gameScrambleView'),
    scrambleHintBtn: document.getElementById('scrambleHintBtn'),
    scrambleAudioBtn: document.getElementById('scrambleAudioBtn'),
    scrambleTranslationText: document.getElementById('scrambleTranslationText'),
    scrambleSlots: document.getElementById('scrambleSlots'),
    scrambleBank: document.getElementById('scrambleBank'),
    scrambleBackspaceBtn: document.getElementById('scrambleBackspaceBtn'),
    scrambleResetBtn: document.getElementById('scrambleResetBtn'),

    // 8. Boşluk Doldurma (Cloze)
    gameClozeView: document.getElementById('gameClozeView'),
    clozeHintBtn: document.getElementById('clozeHintBtn'),
    clozeSentenceText: document.getElementById('clozeSentenceText'),
    clozeTranslationText: document.getElementById('clozeTranslationText'),
    clozeToggleTranslationBtn: document.getElementById('clozeToggleTranslationBtn'),
    settingClozeAutoTranslate: document.getElementById('settingClozeAutoTranslate'),
    clozeOptionsGrid: document.getElementById('clozeOptionsGrid'),

    // Modallar
    langModal: document.getElementById('langModal'),
    unitModal: document.getElementById('unitModal'),
    unitModalTitle: document.getElementById('unitModalTitle'),
    unitModalSubtitle: document.getElementById('unitModalSubtitle'),
    closeUnitModalBtn: document.getElementById('closeUnitModalBtn'),
    unitOptionsList: document.getElementById('unitOptionsList'),
    badgesModal: document.getElementById('badgesModal'),
    closeBadgesModalBtn: document.getElementById('closeBadgesModalBtn'),
    modalTotalXpText: document.getElementById('modalTotalXpText'),
    modalBadgesCountText: document.getElementById('modalBadgesCountText'),
    badgesCategoryTabs: document.getElementById('badgesCategoryTabs'),
    badgesGrid: document.getElementById('badgesGrid'),
    badgeCelebrationModal: document.getElementById('badgeCelebrationModal'),
    celebrationBadgeIcon: document.getElementById('celebrationBadgeIcon'),
    celebrationBadgeTitle: document.getElementById('celebrationBadgeTitle'),
    celebrationBadgeDesc: document.getElementById('celebrationBadgeDesc'),
    closeCelebrationBtn: document.getElementById('closeCelebrationBtn'),
    toast: document.getElementById('toast'),
    // Öğrenci Profili Modalı
    studentProfileModal: document.getElementById('studentProfileModal'),
    closeStudentProfileModalBtn: document.getElementById('closeStudentProfileModalBtn'),

    // Ayarlar & Kart Rengi Modalı
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
    settingsTabBtns: document.querySelectorAll('.settings-tab-btn'),
    settingsTabPanels: document.querySelectorAll('.settings-tab-panel'),
    colorPaletteBtns: document.querySelectorAll('.color-palette-btn'),
    fontSizeBtns: document.querySelectorAll('#fontSizeSegmentGroup .setting-segment-btn'),
    settingFontFamilySelect: document.getElementById('settingFontFamilySelect'),
    flipSpeedBtns: document.querySelectorAll('#cardFlipSpeedSegmentGroup .setting-segment-btn'),
    settingLinedPaper: document.getElementById('settingLinedPaper'),
    settingReverseMode: document.getElementById('settingReverseMode'),
    settingCardFilter: document.getElementById('settingCardFilter'),
    settingAutoplayAudio: document.getElementById('settingAutoplayAudio'),
    speechSpeedBtns: document.querySelectorAll('#speechSpeedSegmentGroup .setting-segment-btn'),
    settingShuffle: document.getElementById('settingShuffle'),
    settingAutoSlideshow: document.getElementById('settingAutoSlideshow'),
    settingSrsPriority: document.getElementById('settingSrsPriority'),
    settingReadExampleAudio: document.getElementById('settingReadExampleAudio'),
    settingStudyReminder: document.getElementById('settingStudyReminder'),
    studyReminderDetailsPanel: document.getElementById('studyReminderDetailsPanel'),
    reminderDisabledNotice: document.getElementById('reminderDisabledNotice'),
    reminderSelectAllDaysBtn: document.getElementById('reminderSelectAllDaysBtn'),
    reminderDayChips: document.querySelectorAll('.reminder-day-chip'),
    reminderTimesList: document.getElementById('reminderTimesList'),
    reminderNewTimeInput: document.getElementById('reminderNewTimeInput'),
    reminderAddTimeBtn: document.getElementById('reminderAddTimeBtn'),
    reminderNextAlarmText: document.getElementById('reminderNextAlarmText'),
    reminderTestNotificationBtn: document.getElementById('reminderTestNotificationBtn'),
    clearCacheBtn: document.getElementById('clearCacheBtn'),
    backupDataBtn: document.getElementById('backupDataBtn'),
    restoreDataBtn: document.getElementById('restoreDataBtn'),
    restoreFileInput: document.getElementById('restoreFileInput'),
    resetProgressBtn: document.getElementById('resetProgressBtn'),

    // Rehber & Tanıtım Turu (Speech Bubbles)
    lexiqTourOverlay: document.getElementById('lexiqTourOverlay'),
    tourBackdrop: document.getElementById('tourBackdrop'),
    tourBubble: document.getElementById('tourBubble'),
    tourArrow: document.getElementById('tourArrow'),
    tourStepBadge: document.getElementById('tourStepBadge'),
    tourTitle: document.getElementById('tourTitle'),
    tourDesc: document.getElementById('tourDesc'),
    tourCloseBtn: document.getElementById('tourCloseBtn'),
    tourSkipBtn: document.getElementById('tourSkipBtn'),
    tourPrevBtn: document.getElementById('tourPrevBtn'),
    tourNextBtn: document.getElementById('tourNextBtn'),
    restartTourBtn: document.getElementById('restartTourBtn'),

    // Günlük Pratik Tamamlandı Modalı
    dailyPracticeCompletedModal: document.getElementById('dailyPracticeCompletedModal'),
    dailyPracticedCountText: document.getElementById('dailyPracticedCountText'),
    dailyPracticedContinueAllBtn: document.getElementById('dailyPracticedContinueAllBtn'),
    dailyPracticedExitArenaBtn: document.getElementById('dailyPracticedExitArenaBtn'),

    // Onboarding Sihirbazı
    onboardingModal: document.getElementById('onboardingModal'),
    obSteps: document.querySelectorAll('.onboarding-step-view'),
    obStepDots: document.querySelectorAll('.ob-step-dot'),
    obNameInput: document.getElementById('obNameInput'),
    obAvatarChips: document.querySelectorAll('#obAvatarGrid .avatar-chip'),
    obStep1NextBtn: document.getElementById('obStep1NextBtn'),
    obStep1BackBtn: document.getElementById('obStep1BackBtn'),
    obStep2BackBtn: document.getElementById('obStep2BackBtn'),
    obStep2NextBtn: document.getElementById('obStep2NextBtn'),
    obLangOptions: document.querySelectorAll('#obLangOptions .ob-option-card'),
    obTrackOptions: document.querySelectorAll('#obTrackOptions .ob-option-card'),
    obLevelGrid: document.getElementById('obLevelGrid'),
    obStep3BackBtn: document.getElementById('obStep3BackBtn'),
    obStep3NextBtn: document.getElementById('obStep3NextBtn'),
    obTrackInfoBox: document.getElementById('obTrackInfoBox'),
    obUnitSelect: document.getElementById('obUnitSelect'),
    obGoalChips: document.querySelectorAll('#obGoalGrid .goal-chip'),
    obStep4BackBtn: document.getElementById('obStep4BackBtn'),
    obCompleteBtn: document.getElementById('obCompleteBtn'),

    // Ayarlar Profil Paneli
    settingUserNameInput: document.getElementById('settingUserNameInput'),
    settingAvatarBtns: document.querySelectorAll('#settingAvatarGrid .setting-avatar-btn'),
    settingLangSelect: document.getElementById('settingLangSelect'),
    settingTrackSelect: document.getElementById('settingTrackSelect'),
    settingLevelSelect: document.getElementById('settingLevelSelect'),
    settingUnitSelect: document.getElementById('settingUnitSelect'),
    settingDailyGoalSelect: document.getElementById('settingDailyGoalSelect'),
    saveProfileSettingsBtn: document.getElementById('saveProfileSettingsBtn')
  };

  // ==========================================
  // BAŞLATMA & KURULUM
  // ==========================================
  function init() {
    checkDailyStreakHealth();
    applyTheme(state.activeTheme);
    applyCardTheme(state.cardTheme);
    applyCardFont(state.cardFont);
    applyGameFont(state.gameFont);
    applyFontFamily(state.fontFamily);
    applyFlipSpeed(state.flipSpeed);
    applyStudyReminder(state.studyReminder);
    applyLinedPaper(state.linedPaper);
    setupEventListeners();
    updateArenaHeaderAndStats();
    updateArenaBadgeDot();
    updateUserProfileUI();
    updateHeaderUnitDisplay();

    // Firebase oturum verisi önceden geldiyse veya oturum açıksa hemen senkronize et
    if (window.cachedFbUserData && typeof applyUserData === 'function') {
      applyUserData(window.cachedFbUserData);
    } else if (window.fbUser && typeof window.syncUserData === 'function') {
      window.syncUserData(window.fbUser);
    }

    // Tarayıcı / Mobil Web Speech API ses motorunu ilk kullanıcı etkileşiminde uyandır
    const wakeUpSpeechAudio = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        loadSystemVoices();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    };
    document.addEventListener('click', wakeUpSpeechAudio, { once: true });
    document.addEventListener('touchstart', wakeUpSpeechAudio, { once: true });

    // Service Worker ve Cache temizleme (Tüm eski önbellekleri kaldır)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    }

    // İlk kullanım kurulum sihirbazı (Onboarding) kontrolü
    if (!state.isOnboarded) {
      startOnboardingFlow();
    } else {
      localStorage.setItem('lexiq_user_onboarded', 'true');
      if (dom.onboardingModal) {
        dom.onboardingModal.classList.remove('active');
        dom.onboardingModal.style.display = 'none';
      }
      if (!state.activeLanguage || !LANG_META[state.activeLanguage]) {
        state.activeLanguage = 'EN-TR';
      }
      
      // Kullanıcının seçtiği dil (state.activeLanguage) geçerliliğini korur.
      // Eğer o dilde henüz veri tabanı/ünite eklenmemişse, ekranlar boş kalır veya uyarı verir 
      // ama sistem otomatik dil değiştirmez (kullanıcı ayarı esastır).

      setLanguage(state.activeLanguage, false);
      switchAppMode(state.activeMode || 'home');
      if (!localStorage.getItem('lexiq_tour_completed')) {
        setTimeout(() => {
          if (typeof startFeatureTour === 'function') startFeatureTour(false);
        }, 700);
      }
    }

    // Uygulama Sürüm Güncelleme Bildirimi Kontrolü
    function checkAndNotifyAppUpdate() {
      const lastSeenVersion = localStorage.getItem('lexiq_last_seen_version');
      if (lastSeenVersion && lastSeenVersion !== APP_VERSION) {
        setTimeout(() => {
          const updateModalEl = document.getElementById('appUpdateModal');
          const versionText = document.getElementById('appUpdateVersionText');
          if (versionText) versionText.textContent = APP_VERSION;
          if (updateModalEl) {
            updateModalEl.style.display = 'flex';
            playSoundEffect('celebration');
          } else {
            showToast(`🎉 LexiQ ${APP_VERSION} sürümüne güncellendi! Yenilikler hazır.`, 'correct');
          }
        }, 1100);
      }
      localStorage.setItem('lexiq_last_seen_version', APP_VERSION);
    }
    checkAndNotifyAppUpdate();
    checkDailyStreakFirstLaunch();
    updateStreakPledgeSettingsUI();
  }

  // ==========================================
  // TEMA (DARK / LIGHT MODE)
  // ==========================================
  function applyTheme(theme) {
    state.activeTheme = theme;
    dom.html.setAttribute('data-theme', theme);
    localStorage.setItem('kelime_theme', theme);

    if (theme === 'dark') {
      dom.moonIcon.style.display = 'block';
      dom.sunIcon.style.display = 'none';
    } else {
      dom.moonIcon.style.display = 'none';
      dom.sunIcon.style.display = 'block';
    }
  }

  function toggleTheme() {
    const nextTheme = state.activeTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(nextTheme === 'dark' ? 'Karanlık mod devrede' : 'Aydınlık mod devrede');
  }

  // ==========================================
  // KART KAĞIT RENGİ & GELİŞMİŞ AYARLAR
  // ==========================================
  function applyCardTheme(theme) {
    state.cardTheme = theme || 'white';
    dom.html.setAttribute('data-card-theme', state.cardTheme);
    localStorage.setItem('kelime_card_theme', state.cardTheme);

    if (dom.colorPaletteBtns) {
      dom.colorPaletteBtns.forEach(btn => {
        if (btn.getAttribute('data-color') === state.cardTheme) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }

  function applyCardFont(size) {
    state.cardFont = size || 'normal';
    dom.html.setAttribute('data-card-font', state.cardFont);
    localStorage.setItem('kelime_card_font', state.cardFont);
    if (dom.fontSizeBtns) {
      dom.fontSizeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-size') === state.cardFont);
      });
    }
  }

  function applyGameFont(size) {
    state.gameFont = size || 'normal';
    dom.html.setAttribute('data-game-font', state.gameFont);
    localStorage.setItem('kelime_game_font', state.gameFont);
    const gameFontBtns = document.querySelectorAll('#gameFontSizeSegmentGroup .setting-segment-btn');
    if (gameFontBtns) {
      gameFontBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-size') === state.gameFont);
      });
    }
  }

  function applyFontFamily(font) {
    state.fontFamily = font || 'system';
    dom.html.setAttribute('data-font-family', state.fontFamily);
    localStorage.setItem('kelime_font_family', state.fontFamily);
    if (dom.settingFontFamilySelect) {
      dom.settingFontFamilySelect.value = state.fontFamily;
    }
  }

  function applyFlipSpeed(speed) {
    state.flipSpeed = speed || 'normal';
    dom.html.setAttribute('data-flip-speed', state.flipSpeed);
    localStorage.setItem('kelime_flip_speed', state.flipSpeed);
    if (dom.flipSpeedBtns) {
      dom.flipSpeedBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-speed') === state.flipSpeed);
      });
    }
  }

  function applyStudyReminder(enabled) {
    state.studyReminder = !!enabled;
    localStorage.setItem('kelime_study_reminder', state.studyReminder ? 'true' : 'false');
    if (dom.settingStudyReminder) dom.settingStudyReminder.checked = state.studyReminder;
    
    // Panel her zaman görünür, ancak izin verilmediyse pasif/kilitli modda tutulur
    if (dom.studyReminderDetailsPanel) {
      dom.studyReminderDetailsPanel.style.display = 'block';
      dom.studyReminderDetailsPanel.classList.toggle('panel-disabled', !state.studyReminder);
    }

    if (dom.reminderDisabledNotice) {
      dom.reminderDisabledNotice.style.display = state.studyReminder ? 'none' : 'flex';
    }

    if (dom.reminderNewTimeInput) {
      dom.reminderNewTimeInput.disabled = !state.studyReminder;
    }
    if (dom.reminderAddTimeBtn) {
      dom.reminderAddTimeBtn.disabled = !state.studyReminder;
    }
    if (dom.reminderSelectAllDaysBtn) {
      dom.reminderSelectAllDaysBtn.disabled = !state.studyReminder;
    }
    if (dom.reminderTestNotificationBtn) {
      dom.reminderTestNotificationBtn.disabled = !state.studyReminder;
    }

    renderReminderDaysUI();
    renderReminderTimesUI();
    syncNativeStudyAlarms();
  }

  function renderReminderDaysUI() {
    if (!dom.reminderDayChips) return;
    const activeDays = new Set(state.studyReminderDays || []);
    dom.reminderDayChips.forEach(chip => {
      const day = parseInt(chip.getAttribute('data-day'), 10);
      chip.classList.toggle('active', activeDays.has(day));
    });
  }

  function renderReminderTimesUI() {
    if (!dom.reminderTimesList) return;
    dom.reminderTimesList.innerHTML = '';
    const times = (state.studyReminderTimes && state.studyReminderTimes.length) ? state.studyReminderTimes : ['20:00'];

    times.sort().forEach(timeStr => {
      const pill = document.createElement('div');
      pill.className = 'reminder-time-pill';
      pill.innerHTML = `
        <span>⏰ ${timeStr}</span>
        <button type="button" class="reminder-time-remove-btn" data-time="${timeStr}" title="Bu saati kaldır">×</button>
      `;

      const removeBtn = pill.querySelector('.reminder-time-remove-btn');
      if (!state.studyReminder) {
        removeBtn.disabled = true;
        removeBtn.style.opacity = '0.5';
        removeBtn.style.cursor = 'not-allowed';
      } else {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeReminderTime(timeStr);
        });
      }

      dom.reminderTimesList.appendChild(pill);
    });
  }

  function addReminderTime(timeStr) {
    if (!timeStr) return;
    if (!state.studyReminderTimes) state.studyReminderTimes = [];
    if (!state.studyReminderTimes.includes(timeStr)) {
      state.studyReminderTimes.push(timeStr);
      state.studyReminderTimes.sort();
      localStorage.setItem('kelime_study_reminder_times', JSON.stringify(state.studyReminderTimes));
      renderReminderTimesUI();
      syncNativeStudyAlarms();
      showToast(`⏰ Hatırlatma saati eklendi: ${timeStr}`);
    } else {
      showToast(`⚠️ ${timeStr} saati zaten listede mevcut.`);
    }
  }

  function removeReminderTime(timeStr) {
    if (!state.studyReminderTimes) return;
    if (state.studyReminderTimes.length <= 1) {
      showToast('⚠️ En az bir hatırlatma saati kalmalıdır.');
      return;
    }
    state.studyReminderTimes = state.studyReminderTimes.filter(t => t !== timeStr);
    localStorage.setItem('kelime_study_reminder_times', JSON.stringify(state.studyReminderTimes));
    renderReminderTimesUI();
    syncNativeStudyAlarms();
    showToast(`🗑️ ${timeStr} saati kaldırıldı.`);
  }

  function toggleReminderDay(day) {
    if (!state.studyReminderDays) state.studyReminderDays = [1, 2, 3, 4, 5, 6, 0];
    const idx = state.studyReminderDays.indexOf(day);
    if (idx > -1) {
      if (state.studyReminderDays.length <= 1) {
        showToast('⚠️ En az bir hatırlatma günü seçili olmalıdır.');
        return;
      }
      state.studyReminderDays.splice(idx, 1);
    } else {
      state.studyReminderDays.push(day);
    }
    localStorage.setItem('kelime_study_reminder_days', JSON.stringify(state.studyReminderDays));
    renderReminderDaysUI();
    syncNativeStudyAlarms();
  }

  function selectAllReminderDays() {
    state.studyReminderDays = [1, 2, 3, 4, 5, 6, 0];
    localStorage.setItem('kelime_study_reminder_days', JSON.stringify(state.studyReminderDays));
    renderReminderDaysUI();
    syncNativeStudyAlarms();
    showToast('📅 Bildirimler her gün için ayarlandı.');
  }

  function updateNextAlarmCountdown() {
    if (!dom.reminderNextAlarmText) return;
    if (!state.studyReminder) {
      dom.reminderNextAlarmText.textContent = 'Hatırlatıcı kapalı (Kurulmadı)';
      dom.reminderNextAlarmText.style.color = 'var(--text-muted)';
      return;
    }

    const days = state.studyReminderDays || [1, 2, 3, 4, 5, 6, 0];
    const times = state.studyReminderTimes || ['20:00'];
    if (days.length === 0 || times.length === 0) {
      dom.reminderNextAlarmText.textContent = 'Gün veya saat seçilmedi';
      dom.reminderNextAlarmText.style.color = '#ef4444';
      return;
    }

    const now = new Date();
    let minDiffMs = Infinity;
    let nextDate = null;
    let nextTimeStr = '';

    times.forEach(tStr => {
      const [h, m] = tStr.split(':').map(Number);
      days.forEach(targetDay => {
        const candidate = new Date(now.getTime());
        candidate.setHours(h, m, 0, 0);

        const currentDay = candidate.getDay(); // 0=Paz, 1=Pzt...
        let dayDiff = (targetDay - currentDay + 7) % 7;
        if (dayDiff === 0 && candidate.getTime() <= now.getTime()) {
          dayDiff = 7;
        }
        candidate.setDate(candidate.getDate() + dayDiff);

        const diff = candidate.getTime() - now.getTime();
        if (diff > 0 && diff < minDiffMs) {
          minDiffMs = diff;
          nextDate = candidate;
          nextTimeStr = tStr;
        }
      });
    });

    if (nextDate) {
      const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const isToday = nextDate.toDateString() === now.toDateString();
      const tomorrow = new Date(now.getTime() + 86400000);
      const isTomorrow = nextDate.toDateString() === tomorrow.toDateString();

      let dayLabel = dayNames[nextDate.getDay()];
      if (isToday) dayLabel = 'Bugün';
      else if (isTomorrow) dayLabel = 'Yarın';

      const diffMinutes = Math.round(minDiffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      let remainingText = '';
      if (diffHours > 0) {
        remainingText = `${diffHours} sa ${remainingMinutes} dk sonra`;
      } else {
        remainingText = `${diffMinutes} dk sonra`;
      }

      dom.reminderNextAlarmText.textContent = `${dayLabel} saat ${nextTimeStr} (${remainingText})`;
      dom.reminderNextAlarmText.style.color = '#10b981';
    } else {
      dom.reminderNextAlarmText.textContent = 'Planlanmış saat bulunamadı';
      dom.reminderNextAlarmText.style.color = 'var(--text-muted)';
    }
  }

  function triggerTestNotification() {
    showToast('🔔 Test bildirimi gönderiliyor...');
    try {
      if (typeof AndroidTTS !== 'undefined' && typeof AndroidTTS.sendImmediateNotification === 'function') {
        AndroidTTS.sendImmediateNotification();
      } else if (typeof AndroidTTS !== 'undefined' && typeof AndroidTTS.scheduleReminder === 'function') {
        const now = new Date(Date.now() + 3000); // 3 sn sonra
        AndroidTTS.scheduleReminder(now.getHours(), now.getMinutes());
      } else if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('🎯 LexiQ Test Bildirimi!', {
            body: 'Harika! Günlük çalışma hatırlatıcınız sorunsuz çalışıyor. Başarılar dileriz! 🚀',
            icon: 'school_logo.jpg'
          });
        } else {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              new Notification('🎯 LexiQ Test Bildirimi!', {
                body: 'Harika! Günlük çalışma hatırlatıcınız sorunsuz çalışıyor. Başarılar dileriz! 🚀'
              });
            }
          });
        }
      }
      playSoundEffect('correct');
      showToast('✅ Test bildirimi başarıyla tetiklendi!');
    } catch (e) {
      console.warn('Test bildirim hatasi:', e);
    }
  }

  /**
   * Android Native köprüsüne (veya Web Notification API'ye) gün ve saatleri senkronize eder.
   * Uygulama kapalıyken bile AlarmManager üzerinden bildirim tetiklenmesini sağlar.
   */
  function syncNativeStudyAlarms() {
    updateNextAlarmCountdown();
    try {
      if (typeof AndroidTTS !== 'undefined' && typeof AndroidTTS.syncReminders === 'function') {
        const enabled = !!state.studyReminder;
        const daysJson = JSON.stringify(state.studyReminderDays || [1, 2, 3, 4, 5, 6, 0]);
        const timesJson = JSON.stringify(state.studyReminderTimes || ['20:00']);
        AndroidTTS.syncReminders(enabled, daysJson, timesJson);
      } else if (typeof AndroidTTS !== 'undefined' && typeof AndroidTTS.scheduleReminder === 'function') {
        // Fallback: tek saat köprüsü
        if (state.studyReminder && state.studyReminderTimes && state.studyReminderTimes.length) {
          const firstTime = state.studyReminderTimes[0];
          const parts = firstTime.split(':');
          AndroidTTS.scheduleReminder(parseInt(parts[0], 10), parseInt(parts[1], 10));
        } else if (typeof AndroidTTS.cancelReminder === 'function') {
          AndroidTTS.cancelReminder();
        }
      }
    } catch (e) {
      console.warn('Native alarm sync warning:', e);
    }
  }

  function clearTemporaryCache() {
    let clearedCount = 0;
    const preservedKeys = new Set([
      'kelime_active_lang',
      'kelime_theme',
      'kelime_card_theme',
      'kelime_card_font',
      'kelime_font_family',
      'kelime_flip_speed',
      'kelime_lined_paper',
      'kelime_reverse_mode',
      'kelime_autoplay_audio',
      'kelime_speech_speed',
      'kelime_shuffle',
      'kelime_study_reminder',
      'kelime_study_reminder_time',
      'kelime_daily_goal',
      'kelime_learned_map',
      'kelime_xp',
      'kelime_max_streak',
      'kelime_arena_solved',
      'kelime_unlocked_badges',
      'kelime_clean_wins',
      'kelime_game_stats',
      'lexiq_user_name',
      'lexiq_user_avatar',
      'lexiq_user_email',
      'lexiq_user_track',
      'lexiq_user_level',
      'lexiq_user_onboarded',
      'lexiq_user_registered',
      'lexiq_guest_mode',
      'lexiq_unlocked_units'
    ]);

    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !preservedKeys.has(key) && !key.startsWith('firebase:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        localStorage.removeItem(k);
        clearedCount++;
      });
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
    return clearedCount;
  }

  function applyLinedPaper(enabled) {
    state.linedPaper = !!enabled;
    dom.html.setAttribute('data-lined-paper', state.linedPaper ? 'true' : 'false');
    localStorage.setItem('kelime_lined_paper', state.linedPaper ? 'true' : 'false');
    if (dom.settingLinedPaper) dom.settingLinedPaper.checked = state.linedPaper;
  }

  function applyReverseMode(enabled) {
    state.reverseMode = !!enabled;
    localStorage.setItem('kelime_reverse_mode', state.reverseMode ? 'true' : 'false');
    if (dom.settingReverseMode) dom.settingReverseMode.checked = state.reverseMode;
    renderCard();
  }

  function applyAutoplayAudio(enabled) {
    state.autoplayAudio = !!enabled;
    localStorage.setItem('kelime_autoplay_audio', state.autoplayAudio ? 'true' : 'false');
    if (dom.settingAutoplayAudio) dom.settingAutoplayAudio.checked = state.autoplayAudio;
  }

  function applySpeechSpeed(speed) {
    state.speechSpeed = parseFloat(speed) || 1.0;
    localStorage.setItem('kelime_speech_speed', state.speechSpeed);
    if (dom.speechSpeedBtns) {
      dom.speechSpeedBtns.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.getAttribute('data-speed')) === state.speechSpeed);
      });
    }
  }

  function applyShuffle(enabled) {
    state.isShuffled = !!enabled;
    localStorage.setItem('kelime_shuffle', state.isShuffled ? 'true' : 'false');
    if (dom.settingShuffle) dom.settingShuffle.checked = state.isShuffled;
    state.currentIndex = 0;
    refreshWordsList();
  }

  function toggleAutoSlideshow(enable) {
    if (state.slideshowTimer) {
      clearInterval(state.slideshowTimer);
      state.slideshowTimer = null;
    }
    state.slideshowActive = enable;

    if (enable) {
      showToast('Otomatik slayt başlatıldı (4 sn döngü)');
      let phase = 0;
      state.slideshowTimer = setInterval(() => {
        if (state.words.length === 0 || state.activeMode !== 'flashcards') {
          toggleAutoSlideshow(false);
          return;
        }
        if (phase === 0) {
          toggleFlip();
          phase = 1;
        } else {
          if (state.currentIndex < state.words.length - 1) {
            nextCard();
          } else {
            state.currentIndex = 0;
            setFlipped(false);
            renderCard();
          }
          phase = 0;
        }
      }, 2500);
    } else {
      if (dom.settingAutoSlideshow) dom.settingAutoSlideshow.checked = false;
      showToast('Otomatik slayt durduruldu');
    }
  }

  function exportUserData() {
    const backupData = {
      app: 'KelimeOgrenme',
      version: '1.0',
      exportDate: new Date().toISOString(),
      activeLanguage: state.activeLanguage,
      activeTheme: state.activeTheme,
      cardTheme: state.cardTheme,
      cardFont: state.cardFont,
      linedPaper: state.linedPaper,
      reverseMode: state.reverseMode,
      autoplayAudio: state.autoplayAudio,
      speechSpeed: state.speechSpeed,
      isShuffled: state.isShuffled,
      dailyGoal: state.dailyGoal,
      userName: state.userName,
      userAvatar: state.userAvatar,
      userTrack: state.userTrack,
      userLevel: state.userLevel,
      isOnboarded: state.isOnboarded,
      xp: state.xp,
      streak: state.streak,
      maxStreak: state.maxStreak,
      arenaWordsSolved: state.arenaWordsSolved,
      unlockedBadges: state.unlockedBadges,
      learnedMap: state.learnedMap
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    const dateStr = new Date().toISOString().slice(0, 10);
    dlAnchor.setAttribute('download', `kelime_ogrenme_yedek_${dateStr}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('İlerlemeniz JSON olarak indirildi');
  }

  function restoreUserData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported || typeof imported !== 'object') {
          showToast('Geçersiz yedek dosyası!');
          return;
        }

        if (imported.userName) {
          state.userName = imported.userName;
          localStorage.setItem('lexiq_user_name', state.userName);
        }
        if (imported.userAvatar) {
          state.userAvatar = imported.userAvatar;
          localStorage.setItem('lexiq_user_avatar', state.userAvatar);
        }
        if (imported.userTrack) {
          state.userTrack = imported.userTrack;
          localStorage.setItem('lexiq_user_track', state.userTrack);
        }
        if (imported.userLevel) {
          state.userLevel = imported.userLevel;
          localStorage.setItem('lexiq_user_level', state.userLevel);
        }
        if (typeof imported.isOnboarded === 'boolean') {
          state.isOnboarded = imported.isOnboarded;
          localStorage.setItem('lexiq_user_onboarded', imported.isOnboarded ? 'true' : 'false');
        }
        updateUserProfileUI();

        if (imported.learnedMap && typeof imported.learnedMap === 'object') {
          state.learnedMap = imported.learnedMap;
          localStorage.setItem('kelime_learned_map', JSON.stringify(state.learnedMap));
        }
        if (typeof imported.xp === 'number') {
          state.xp = imported.xp;
          localStorage.setItem('kelime_xp', state.xp);
        }
        if (typeof imported.streak === 'number') {
          state.streak = imported.streak;
        }
        if (typeof imported.maxStreak === 'number') {
          state.maxStreak = imported.maxStreak;
          localStorage.setItem('kelime_max_streak', state.maxStreak);
        }
        if (typeof imported.arenaWordsSolved === 'number') {
          state.arenaWordsSolved = imported.arenaWordsSolved;
          localStorage.setItem('kelime_arena_solved', state.arenaWordsSolved);
        }
        if (Array.isArray(imported.unlockedBadges)) {
          state.unlockedBadges = imported.unlockedBadges;
          localStorage.setItem('kelime_unlocked_badges', JSON.stringify(state.unlockedBadges));
        }
        if (imported.cardTheme) {
          applyCardTheme(imported.cardTheme);
        }
        if (imported.cardFont) {
          applyCardFont(imported.cardFont);
        }
        if (typeof imported.linedPaper === 'boolean') {
          applyLinedPaper(imported.linedPaper);
        }
        if (typeof imported.reverseMode === 'boolean') {
          applyReverseMode(imported.reverseMode);
        }
        if (typeof imported.autoplayAudio === 'boolean') {
          applyAutoplayAudio(imported.autoplayAudio);
        }
        if (imported.speechSpeed) {
          applySpeechSpeed(imported.speechSpeed);
        }

        updateArenaHeaderAndStats();
        updateArenaBadgeDot();
        refreshWordsList();
        showToast('Yedek başarıyla yüklendi!');
        closeSettingsModal();
      } catch (err) {
        console.error(err);
        showToast('Yedek dosyası okunurken hata oluştu!');
      }
    };
    reader.readAsText(file);
  }

  // Uygulama İçi Özel Şık Onay Penceresi (Native system dialog yerine)
  function showAppConfirm({ title = 'Emin misiniz?', message = '', icon = '⚠️', okText = 'Onayla', cancelText = 'Vazgeç', isDanger = true }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('customConfirmModal');
      const iconEl = document.getElementById('confirmModalIcon');
      const titleEl = document.getElementById('confirmModalTitle');
      const msgEl = document.getElementById('confirmModalMessage');
      const okBtn = document.getElementById('confirmModalOkBtn');
      const cancelBtn = document.getElementById('confirmModalCancelBtn');

      if (!modal || !okBtn || !cancelBtn) {
        // Fallback
        const res = window.confirm(`${title}\n\n${message}`);
        resolve(res);
        return;
      }

      if (iconEl) iconEl.textContent = icon;
      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (okBtn) {
        okBtn.textContent = okText;
        okBtn.className = isDanger ? 'pill-btn confirm-ok-btn danger-action' : 'pill-btn confirm-ok-btn';
      }
      if (cancelBtn) cancelBtn.textContent = cancelText;

      modal.style.display = 'flex';
      modal.classList.add('active');

      const cleanup = (val) => {
        modal.classList.remove('active');
        modal.style.display = 'none';
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        modal.onclick = null;
        resolve(val);
      };

      okBtn.onclick = () => cleanup(true);
      cancelBtn.onclick = () => cleanup(false);
      modal.onclick = (e) => {
        if (e.target === modal) cleanup(false);
      };
    });
  }

  async function resetProgressOnly() {
    const confirmed = await showAppConfirm({
      title: 'İlerlemeyi Sıfırla',
      message: 'Öğrenilen tüm kelimeler, günlük çalışma kotaları, seri ve XP puanlarınız sıfırlanacaktır.\n\nProfil adınız ve genel ayarlarınız korunur. Devam etmek istiyor musunuz?',
      icon: '🔄',
      okText: 'Evet, Sıfırla',
      cancelText: 'Vazgeç',
      isDanger: true
    });
    if (!confirmed) return;

    state.learnedMap = {};
    state.xp = 0;
    state.streak = 0;
    state.maxStreak = 0;
    state.unlockedBadges = [];
    state.gameStats = {};
    state.cleanWins = 0;
    state.dailyGoalExtra = 0;
    if (state.sessionLearnedIds) state.sessionLearnedIds.clear();

    localStorage.removeItem('kelime_learned_map');
    localStorage.removeItem('kelime_xp');
    localStorage.removeItem('kelime_streak');
    localStorage.removeItem('kelime_max_streak');
    localStorage.removeItem('kelime_unlocked_badges');
    localStorage.removeItem('kelime_game_stats');
    localStorage.removeItem('kelime_clean_wins');
    localStorage.removeItem('kelime_daily_goal_extra');

    if (typeof window.syncProgressToFirebase === 'function') {
      window.syncProgressToFirebase();
    }

    refreshWordsList();
    updateUserProfileUI();
    closeSettingsModal();
    playSoundEffect('correct');
    showToast('Öğrenme ilerlemesi ve puanlar başarıyla sıfırlandı! 🔄');
  }

  async function resetAllProgress() {
    const confirmed = await showAppConfirm({
      title: 'Fabrika Ayarlarına Dön',
      message: 'DİKKAT: Tüm öğrenilmiş kelimeler, profil seçimleriniz, XP puanlarınız ve başarı rozetleriniz tamamen silinecektir.\n\nUygulama ilk kurulum haline dönecektir. Emin misiniz?',
      icon: '🚨',
      okText: 'Tamamen Sıfırla',
      cancelText: 'Vazgeç',
      isDanger: true
    });
    if (!confirmed) return;

    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('lexiq_reset_done_v30', 'true');

    try {
      if (typeof window.logoutUser === 'function') {
        window.logoutUser();
      } else if (window.firebase && window.firebase.auth) {
        window.firebase.auth().signOut();
      }
    } catch (e) {
      console.warn('Logout error on reset:', e);
    }

    window.location.reload();
  }

  async function handleUserLogout(isGuestExplicit = false) {
    const isFbLoggedIn = typeof fbUser !== 'undefined' && fbUser !== null;

    if (!isFbLoggedIn || isGuestExplicit) {
      // Misafir Çıkışı
      const confirmed = await showAppConfirm({
        title: 'Oturumu Kapat',
        message: 'Misafir modundan çıkış yaptığınızda bu cihazdaki kelime ilerlemeniz sıfırlanır ve başlangıç ekranına dönülür.\n\nÇıkış yapmak istediğinize emin misiniz?',
        icon: '👋',
        okText: 'Çıkış Yap',
        cancelText: 'Vazgeç',
        isDanger: true
      });
      if (!confirmed) return;

      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('lexiq_reset_done_v30', 'true');

      try {
        if (typeof window.logoutUser === 'function') {
          window.logoutUser();
        } else if (window.firebase && window.firebase.auth) {
          window.firebase.auth().signOut();
        }
      } catch (e) {
        console.warn('Logout error on guest reset:', e);
      }

      window.location.reload();
      return;
    }

    // Kayıtlı Hesap Çıkışı
    const confirmed = await showAppConfirm({
      title: 'Hesaptan Çıkış Yap',
      message: 'LexiQ hesabınızdan güvenle çıkış yapılacak.\n\nTüm XP puanlarınız, serileriniz ve rozetleriniz bulut hesabınızda güvenle saklanmaktadır.',
      icon: '👋',
      okText: 'Çıkış Yap',
      cancelText: 'Vazgeç',
      isDanger: false
    });
    if (!confirmed) return;

    try {
      if (typeof window.logoutUser === 'function') {
        window.logoutUser();
      } else if (window.firebase && window.firebase.auth) {
        window.firebase.auth().signOut();
      }
    } catch (e) {
      console.warn('Logout error:', e);
    }
    if (typeof window.onUserLogout === 'function') {
      window.onUserLogout();
    }
    showToast('Başarıyla çıkış yapıldı.');
  }

  function switchSettingsTab(tabName) {
    const isCurrentlyOnProfile = dom.settingsTabPanels && Array.from(dom.settingsTabPanels).some(p => p.id === 'tabPanelProfile' && p.classList.contains('active'));
    if (isCurrentlyOnProfile && tabName !== 'profile' && typeof hasUnsavedProfileSettings === 'function' && hasUnsavedProfileSettings()) {
      const confirmed = confirmDiscardProfileChanges();
      if (!confirmed) return;
      if (typeof populateProfileSettingsTab === 'function') {
        populateProfileSettingsTab();
      }
    }

    if (dom.settingsTabBtns) {
      dom.settingsTabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
      });
    }
    const panelMap = {
      profile: 'tabPanelProfile',
      cards: 'tabPanelCards',
      arena: 'tabPanelArena',
      reminder: 'tabPanelReminder',
      data: 'tabPanelData',
      audio: 'tabPanelCards', // geriye dönük uyumluluk
      study: 'tabPanelCards', // geriye dönük uyumluluk
      flow: 'tabPanelCards'   // geriye dönük uyumluluk
    };
    const targetPanelId = panelMap[tabName] || 'tabPanelCards';
    if (dom.settingsTabPanels) {
      dom.settingsTabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === targetPanelId);
      });
    }
    if (tabName === 'reminder') {
      updateNextAlarmCountdown();
    }
    const activeTabBtn = document.querySelector(`.settings-tab-btn[data-tab="${tabName}"]`);
    if (activeTabBtn && typeof activeTabBtn.scrollIntoView === 'function') {
      activeTabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  
  // ==========================================
  // ÖĞRENCİ BİLGİLERİ VE PROFİL MODALI
  // ==========================================
  function openStudentProfileModal() {
    const modal = document.getElementById('studentProfileModal');
    if (!modal) {
      openSettingsModal('profile');
      return;
    }

    // Bilgileri Doldur
    const heroAvatar = document.getElementById('profHeroAvatar');
    const heroName = document.getElementById('profHeroName');
    const trackBadge = document.getElementById('profHeroTrackBadge');
    const langBadge = document.getElementById('profHeroLangBadge');
    const accountStatus = document.getElementById('profAccountStatusText');
    const loginOutBtn = document.getElementById('profLoginOrOutBtn');

    if (heroAvatar) heroAvatar.textContent = state.userAvatar;
    if (heroName) heroName.textContent = state.userName;
    if (trackBadge) trackBadge.textContent = state.userTrack === '4B' ? '4B (B1 İleri)' : '4A (A2 Temel)';
    if (langBadge) {
      const meta = LANG_META[state.activeLanguage] || { flag: '🇬🇧', name: 'İngilizce' };
      langBadge.textContent = `${meta.flag} ${meta.name.split('→')[0].trim()}`;
    }

    const isFbLoggedIn = typeof fbUser !== 'undefined' && fbUser !== null;
    const statusDot = document.querySelector('.status-indicator-dot');
    if (statusDot) {
      statusDot.style.background = isFbLoggedIn ? '#10b981' : '#f59e0b';
      statusDot.style.boxShadow = isFbLoggedIn ? '0 0 8px rgba(16, 185, 129, 0.5)' : '0 0 8px rgba(245, 158, 11, 0.5)';
    }

    if (accountStatus) {
      accountStatus.textContent = isFbLoggedIn ? `Kayıtlı: ${fbUser.email || state.userEmail}` : 'Misafir Kullanıcı (Bulut kapalı)';
    }
    const profGuestLogoutBtn = document.getElementById('profGuestLogoutBtn');
    if (loginOutBtn) {
      if (isFbLoggedIn) {
        loginOutBtn.textContent = 'Çıkış Yap';
        loginOutBtn.classList.add('is-logout');
        if (profGuestLogoutBtn) profGuestLogoutBtn.style.display = 'none';
        loginOutBtn.onclick = () => {
          closeStudentProfileModal();
          handleUserLogout(false);
        };
      } else {
        loginOutBtn.textContent = 'Giriş / Kayıt';
        loginOutBtn.classList.remove('is-logout');
        if (profGuestLogoutBtn) {
          profGuestLogoutBtn.style.display = 'inline-block';
          profGuestLogoutBtn.onclick = () => {
            closeStudentProfileModal();
            handleUserLogout(true);
          };
        }
        loginOutBtn.onclick = () => {
          closeStudentProfileModal();
          if (typeof window.openAuthModal === "function") {
            window.openAuthModal();
          } else {
            const am = document.getElementById("authModal");
            if (am) am.classList.add("active");
          }
        };
      }
    }

    const visibleBadges = getVisibleBadgesConfigForUser(state.activeLanguage);
    const visibleUnlockedCount = visibleBadges.filter(b => state.unlockedBadges.includes(b.id)).length;

    // İstatistik Sayaçları
    const statLearned = document.getElementById('profStatLearned');
    const statXp = document.getElementById('profStatXp');
    const statStreak = document.getElementById('profStatStreak');
    const statBadges = document.getElementById('profStatBadges');

    if (statLearned) statLearned.textContent = getLearnedCount(state);
    if (statXp) statXp.textContent = state.xp;
    if (statStreak) statStreak.textContent = `${state.dayStreak || 1} Gün`;
    if (statBadges) statBadges.textContent = `${visibleUnlockedCount} / ${visibleBadges.length}`;

    // İsim Input
    const nameInput = document.getElementById('profNameInput');
    if (nameInput) {
      nameInput.value = state.userName;
      nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const saveBtn = document.getElementById('profSaveBtn');
          if (saveBtn) saveBtn.click();
        }
      };
    }

    // Avatar Tıklama: Üstteki avatara tıklandığında kategorili avatar seçim penceresini aç
    const heroAvatarBtn = document.getElementById('profHeroAvatarBtn');
    if (heroAvatarBtn) {
      heroAvatarBtn.onclick = () => {
        openAvatarPickerModal();
      };
    }

    // Detaylı Etkinlik ve Zaman İstatistiklerini Doldur
    renderStudentActivityStatsUI();

    // İstatistik Yenileme Butonu
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
      refreshStatsBtn.onclick = async () => {
        showToast('İstatistikler güncelleniyor... ⏳');
        if (typeof window.syncUserData === 'function' && window.fbUser) {
          try {
            await window.syncUserData(window.fbUser);
          } catch (e) {
            console.warn('Sync refresh error:', e);
          }
        }
        renderStudentActivityStatsUI();
        const visB = getVisibleBadgesConfigForUser(state.activeLanguage);
        const visU = visB.filter(b => state.unlockedBadges.includes(b.id)).length;
        if (statLearned) statLearned.textContent = getLearnedCount(state);
        if (statXp) statXp.textContent = state.xp;
        if (statStreak) statStreak.textContent = state.maxStreak;
        if (statBadges) statBadges.textContent = `${visU} / ${visB.length}`;
        showToast('Bulut verileri ve istatistikler güncellendi! ☁️');
      };
    }

    // Kaydedilmemiş değişiklikleri izleme
    let originalNameValue = (nameInput && nameInput.value.trim()) || '';
    modal._hasUnsavedChanges = function() {
      const curName = (nameInput && nameInput.value.trim()) || '';
      return curName !== originalNameValue;
    };

    // Rehber Butonu
    const guideBtn = document.getElementById('profOpenBadgesGuideBtn');
    if (guideBtn) {
      guideBtn.onclick = () => {
        closeStudentProfileModal();
        openBadgesModal();
      };
    }

    // Kaydet Butonu
    const saveBtn = document.getElementById('profSaveBtn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        if (nameInput && nameInput.value.trim()) {
          state.userName = nameInput.value.trim();
          localStorage.setItem('lexiq_user_name', state.userName);
          originalNameValue = state.userName;
          if (heroName) heroName.textContent = state.userName;
        }
        localStorage.setItem('lexiq_user_avatar', state.userAvatar);
        if (typeof updateUserProfileUI === "function") { updateUserProfileUI(); } else if (typeof window.updateUserProfileUI === "function") { window.updateUserProfileUI(); }
        showToast('Profil başarıyla kaydedildi! ✓');
      };
    }

    modal.classList.add('active');
  }

  // ==========================================
  // ETKİNLİK & ZAMAN İSTATİSTİKLERİ MOTORU
  // ==========================================
  function formatSecondsToHuman(seconds) {
    if (!seconds || seconds < 60) {
      return seconds > 0 ? `${seconds} sn` : '0 dk';
    }
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return remMins > 0 ? `${hours} sa ${remMins} dk` : `${hours} sa`;
    }
    return `${mins} dk`;
  }

  function formatDateToHuman(timestamp) {
    if (!timestamp) return '-';
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return '-';
    }
  }

  function renderStudentActivityStatsUI() {
    const profTimeCards = document.getElementById('profTimeCards');
    const profTimeGames = document.getElementById('profTimeGames');
    const profStartDate = document.getElementById('profStartDate');
    const profRegDate = document.getElementById('profRegDate');
    const unitListEl = document.getElementById('profUnitDurationsList');

    if (profTimeCards) profTimeCards.textContent = formatSecondsToHuman(state.timeTracking.cardSeconds);
    if (profTimeGames) profTimeGames.textContent = formatSecondsToHuman(state.timeTracking.gameSeconds);
    if (profStartDate) profStartDate.textContent = formatDateToHuman(state.timeTracking.firstStartedAt);

    if (profRegDate) {
      const isFbLoggedIn = typeof fbUser !== 'undefined' && fbUser !== null;
      if (isFbLoggedIn) {
        const regTime = state.timeTracking.registeredAt || (fbUser.metadata && fbUser.metadata.creationTime ? new Date(fbUser.metadata.creationTime).getTime() : Date.now());
        profRegDate.textContent = formatDateToHuman(regTime);
      } else if (state.timeTracking.registeredAt) {
        profRegDate.textContent = formatDateToHuman(state.timeTracking.registeredAt);
      } else {
        profRegDate.textContent = 'Misafir Kullanıcı';
      }
    }

    if (unitListEl) {
      const unitEntries = Object.entries(state.timeTracking.unitDurations || {});
      if (unitEntries.length === 0) {
        unitListEl.innerHTML = '<div class="unit-duration-empty">Henüz tamamlanan ünite bulunmuyor.</div>';
      } else {
        unitListEl.innerHTML = '';
        unitEntries.forEach(([key, info]) => {
          const row = document.createElement('div');
          row.className = 'unit-duration-row';
          const nameSpan = document.createElement('span');
          nameSpan.className = 'unit-duration-name';
          nameSpan.innerHTML = `<span>📘 ${info.unitTitle || key}</span> <span class="unit-duration-badge">${info.lang || ''} ${info.level || ''}</span>`;
          const timeSpan = document.createElement('span');
          timeSpan.className = 'unit-duration-time';
          timeSpan.textContent = `⏱️ ${formatSecondsToHuman(info.durationSeconds || 0)}`;
          row.appendChild(nameSpan);
          row.appendChild(timeSpan);
          unitListEl.appendChild(row);
        });
      }
    }
  }

  // Ünitenin başlama ve bitiş sürelerini kaydetme
  function noteUnitStart(unit) {
    if (!unit) return;
    const key = `${unit.dil}_${unit.seviye || 'all'}_u${unit.unite_no}`;
    if (!state.timeTracking.unitStartTimes[key]) {
      state.timeTracking.unitStartTimes[key] = {
        startedAt: Date.now(),
        unitTitle: unit.baslik || `Ünite ${unit.unite_no}`,
        lang: unit.dil,
        level: unit.seviye
      };
      localStorage.setItem('lexiq_unit_start_times', JSON.stringify(state.timeTracking.unitStartTimes));
    }
  }

  function noteUnitCompleted(unit) {
    if (!unit) return;
    const key = `${unit.dil}_${unit.seviye || 'all'}_u${unit.unite_no}`;
    if (state.timeTracking.unitDurations[key]) return; // Zaten tamamlanmış kaydedilmiş

    const startInfo = state.timeTracking.unitStartTimes[key];
    const startedAt = startInfo && startInfo.startedAt ? startInfo.startedAt : Date.now();
    const finishedAt = Date.now();
    // En az 1 dakika olarak kaydet veya geçen süre
    const diffSeconds = Math.max(60, Math.round((finishedAt - startedAt) / 1000));

    state.timeTracking.unitDurations[key] = {
      unitTitle: unit.baslik || `Ünite ${unit.unite_no}`,
      lang: unit.dil,
      level: unit.seviye,
      startedAt,
      finishedAt,
      durationSeconds: diffSeconds
    };
    localStorage.setItem('lexiq_unit_durations', JSON.stringify(state.timeTracking.unitDurations));
    if (typeof window.syncProgressToFirebase === 'function') {
      window.syncProgressToFirebase(null, true);
    }
  }

  // Aktif Zaman Sayacı (Kullanıcı etkileşimde ve sekme odaktayken sayar)
  let lastUserActivityTime = Date.now();
  ['mousemove', 'keydown', 'touchstart', 'click'].forEach(evt => {
    window.addEventListener(evt, () => {
      lastUserActivityTime = Date.now();
    }, { passive: true });
  });

  let secondsBuffer = 0;
  let cloudSyncBuffer = 0;
  setInterval(() => {
    // Sekme arka planda değilse ve son 60 saniyede bir kullanıcı hareketi olduysa
    if (document.visibilityState === 'visible' && (Date.now() - lastUserActivityTime < 60000)) {
      if (state.activeMode === 'flashcards') {
        state.timeTracking.cardSeconds += 1;
        secondsBuffer += 1;
        cloudSyncBuffer += 1;
      } else if (state.activeMode === 'arena' && state.activeGame) {
        state.timeTracking.gameSeconds += 1;
        secondsBuffer += 1;
        cloudSyncBuffer += 1;
      }

      // Her 10 saniyede bir diske yaz (aşırı I/O yapmamak için)
      if (secondsBuffer >= 10) {
        localStorage.setItem('lexiq_time_cards', String(state.timeTracking.cardSeconds));
        localStorage.setItem('lexiq_time_games', String(state.timeTracking.gameSeconds));
        secondsBuffer = 0;
      }

      // Her 30 saniyede bir buluta senkronize et
      if (cloudSyncBuffer >= 30) {
        if (typeof window.syncProgressToFirebase === 'function') {
          window.syncProgressToFirebase();
        }
        cloudSyncBuffer = 0;
      }
    }
  }, 1000);

  // Uygulama arka plana geçtiğinde veya kapandığında birikmiş süreleri hemen buluta yaz
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      localStorage.setItem('lexiq_time_cards', String(state.timeTracking.cardSeconds));
      localStorage.setItem('lexiq_time_games', String(state.timeTracking.gameSeconds));
      if (typeof window.syncProgressToFirebase === 'function') {
        window.syncProgressToFirebase(null, true);
      }
    }
  });
  window.addEventListener('pagehide', () => {
    localStorage.setItem('lexiq_time_cards', String(state.timeTracking.cardSeconds));
    localStorage.setItem('lexiq_time_games', String(state.timeTracking.gameSeconds));
    if (typeof window.syncProgressToFirebase === 'function') {
      window.syncProgressToFirebase(null, true);
    }
  });

  function closeStudentProfileModal(force = false) {
    const modal = document.getElementById('studentProfileModal');
    if (!modal) return;
    if (!force && typeof modal._hasUnsavedChanges === 'function' && modal._hasUnsavedChanges()) {
      const confirmed = window.confirm(
        '⚠️ Kaydedilmemiş değişiklikleriniz var!\n\nYaptığınız değişiklikler "Kaydet" butonuna basmadığınız için kaybolacaktır. Yine de çıkmak istiyor musunuz?'
      );
      if (!confirmed) return;
    }
    modal.classList.remove('active');
  }

  // ==========================================
  // ZENGİN & KATEGORİLİ AVATAR SEÇİM SİSTEMİ
  // ==========================================
  const AVATAR_CATEGORIES = [
    {
      id: 'all',
      name: 'Tümü',
      icon: '✨'
    },
    {
      id: 'animals',
      name: 'Hayvanlar',
      icon: '🐾',
      avatars: ['🦊', '🦁', '🐺', '🐼', '🐨', '🐯', '🐱', '🐶', '🦉', '🦄', '🐲', '🐻', '🐰', '🐸', '🐵', '🦅', '🐧', '🐙', '🐬', '🦋']
    },
    {
      id: 'nature',
      name: 'Doğa & Evren',
      icon: '🌿',
      avatars: ['🌱', '🌲', '🌸', '🌻', '🍁', '🍄', '🌍', '🌙', '⭐', '☀️', '⚡', '🌊', '🌋', '🌈', '🪐', '☄️', '🔥', '❄️']
    },
    {
      id: 'sci_fi',
      name: 'Bilim & Kurgu',
      icon: '🚀',
      avatars: ['🚀', '🛸', '👽', '🤖', '👾', '🧬', '🔬', '🔭', '🛰️', '⚡', '💡', '🔮', '🕹️', '🧪']
    },
    {
      id: 'abstract',
      name: 'Soyut & Sembol',
      icon: '💎',
      avatars: ['💎', '👑', '🎯', '🔥', '✨', '⚡', '🎖️', '🏆', '🎨', '🎭', '🧩', '🧿', '🌀', '🛡️', '⚔️', '🗝️', '🔔', '🧭']
    },
    {
      id: 'fun',
      name: 'Eğlenceli & Karakter',
      icon: '😎',
      avatars: ['😎', '🤠', '🥳', '🧐', '🦸', '🥷', '🧙', '🧑‍🚀', '🧑‍🎓', '🧝', '🧛', '👑', '👻', '🎩', '🍕', '☕']
    }
  ];

  let activeAvatarCategory = 'all';

  function openAvatarPickerModal() {
    const modal = document.getElementById('avatarPickerModal');
    if (!modal) return;

    renderAvatarCategoryTabs();
    renderAvatarPickerGrid();

    modal.classList.add('active');
  }

  function closeAvatarPickerModal() {
    const modal = document.getElementById('avatarPickerModal');
    if (modal) modal.classList.remove('active');
  }

  function renderAvatarCategoryTabs() {
    const tabsContainer = document.getElementById('avatarCategoryTabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';
    AVATAR_CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `avatar-cat-btn ${activeAvatarCategory === cat.id ? 'active' : ''}`;
      btn.innerHTML = `<span>${cat.icon}</span> <span>${cat.name}</span>`;
      btn.onclick = () => {
        activeAvatarCategory = cat.id;
        tabsContainer.querySelectorAll('.avatar-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAvatarPickerGrid();
      };
      tabsContainer.appendChild(btn);
    });
  }

  function renderAvatarPickerGrid() {
    const grid = document.getElementById('avatarPickerGrid');
    if (!grid) return;

    grid.innerHTML = '';

    let listToRender = [];
    if (activeAvatarCategory === 'all') {
      const set = new Set();
      AVATAR_CATEGORIES.forEach(cat => {
        if (cat.avatars) {
          cat.avatars.forEach(av => set.add(av));
        }
      });
      listToRender = Array.from(set);
    } else {
      const found = AVATAR_CATEGORIES.find(c => c.id === activeAvatarCategory);
      listToRender = found && found.avatars ? found.avatars : [];
    }

    listToRender.forEach(av => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `avatar-choice-btn ${state.userAvatar === av ? 'active' : ''}`;
      btn.textContent = av;
      btn.title = `Avatar: ${av}`;
      btn.onclick = () => {
        selectAvatar(av);
      };
      grid.appendChild(btn);
    });
  }

  function selectAvatar(avatar) {
    state.userAvatar = avatar;
    localStorage.setItem('lexiq_user_avatar', avatar);

    // Profil modalındaki avatarı güncelle
    const profHeroAvatar = document.getElementById('profHeroAvatar');
    if (profHeroAvatar) profHeroAvatar.textContent = avatar;

    // Genel UI güncelle (üst bar avatarı, vb.)
    if (typeof updateUserProfileUI === 'function') {
      updateUserProfileUI();
    } else if (typeof window.updateUserProfileUI === 'function') {
      window.updateUserProfileUI();
    }

    closeAvatarPickerModal();
    showToast(`Yeni avatar seçildi: ${avatar} 🎉`);
  }

  function openSettingsModal(defaultTab = 'cards') {
    if (dom.settingsModal) {
      switchSettingsTab(defaultTab);
      populateProfileSettingsTab();
      applyCardTheme(state.cardTheme);
      applyCardFont(state.cardFont);
      applyGameFont(state.gameFont);
      applyFontFamily(state.fontFamily);
      applyFlipSpeed(state.flipSpeed);
      applyStudyReminder(state.studyReminder);
      applyLinedPaper(state.linedPaper);
      if (dom.settingReverseMode) dom.settingReverseMode.checked = state.reverseMode;
      if (dom.settingAutoplayAudio) dom.settingAutoplayAudio.checked = state.autoplayAudio;
      if (dom.settingShuffle) dom.settingShuffle.checked = state.isShuffled;
      if (dom.settingAutoSlideshow) dom.settingAutoSlideshow.checked = state.slideshowActive;
      if (dom.settingSrsPriority) dom.settingSrsPriority.checked = state.srsPriority;
      if (dom.settingReadExampleAudio) dom.settingReadExampleAudio.checked = state.readExampleAudio;
      if (dom.settingCardFilter) dom.settingCardFilter.value = state.activeFilter;
      const settingCardHaptic = document.getElementById('settingCardHaptic');
      if (settingCardHaptic) settingCardHaptic.checked = state.cardHaptic;
      const settingGameHaptic = document.getElementById('settingGameHaptic');
      if (settingGameHaptic) settingGameHaptic.checked = state.gameHaptic;
      const settingHaptic = document.getElementById('settingHapticFeedback');
      if (settingHaptic) settingHaptic.checked = hapticEnabled;
      const settingSoundFx = document.getElementById('settingSoundFx');
      if (settingSoundFx) settingSoundFx.checked = soundFxEnabled;
      applySpeechSpeed(state.speechSpeed);

      dom.settingsModal.classList.add('active');
    }
  }

  function closeSettingsModal(force = false) {
    if (dom.settingsModal) {
      if (!force && typeof hasUnsavedProfileSettings === 'function' && hasUnsavedProfileSettings()) {
        const confirmed = confirmDiscardProfileChanges();
        if (!confirmed) return;
        // Kullanıcı vazgeçtiyse değişiklikleri orijinaline geri al
        if (typeof populateProfileSettingsTab === 'function') {
          populateProfileSettingsTab();
        }
      }
      dom.settingsModal.classList.remove('active');
    }
  }

  // ==========================================
  // DİL & MÜFREDAT TARİH HESAPLAMA (KURAL 1 & KURAL 4)
  // ==========================================
  function setLanguage(langCode, isUserSelection) {
    if (!LANG_META[langCode]) return;

    state.activeLanguage = langCode;
    localStorage.setItem('kelime_active_lang', langCode);

    // Üst bar bayrak ve etiket güncellemesi
    const meta = LANG_META[langCode];
    if (dom.activeLangFlag) dom.activeLangFlag.textContent = meta.flag;
    if (dom.activeLangLabel) dom.activeLangLabel.textContent = meta.label;

    // Tarihe göre aktif üniteyi dinamik hesapla (Kural 4) eğer mevcut ünite geçerli değilse
    const targetLevel = state.userLevel || getLevelForTrack(langCode, state.userTrack);
    const unitsForLang = getUnitsData().filter(u => u.dil === langCode);
    const unitBelongsToLangAndLevel = unitsForLang.some(u => u.unite_no === state.activeUnitNo && (!targetLevel || u.seviye === targetLevel));
    const isUnlocked = isUnitUnlocked(state.activeUnitNo, langCode, targetLevel);
    if (!state.activeUnitNo || !unitBelongsToLangAndLevel || !isUnlocked) {
      state.activeUnitNo = calculateCurrentUnitByDate(langCode, targetLevel);
    }

    // Kelime listesini hazırla ve kartı güncelle
    refreshWordsList();

    if (isUserSelection) {
      closeLanguageModal();
      showToast(`${meta.name} seçildi`);
    }
  }

  // ==========================================
  // GÜVENLİ VERİ ERİŞİMİ (SCOPE YALITIMI)
  // ==========================================
  function getUnitsData() {
    if (typeof window !== 'undefined' && window.UNITS_DATA && window.UNITS_DATA.length) return window.UNITS_DATA;
    if (typeof UNITS_DATA !== 'undefined' && UNITS_DATA.length) return UNITS_DATA;
    return [];
  }

  function getWordsData() {
    if (typeof window !== 'undefined' && window.WORDS_DATA && window.WORDS_DATA.length) return window.WORDS_DATA;
    if (typeof WORDS_DATA !== 'undefined' && WORDS_DATA.length) return WORDS_DATA;
    return [];
  }

  /**
   * Aktif öğrenilen dile (ve seçili kura/seviyeye) ait kelimeleri filtreleyerek
   * diller arası karışmayı (örn: İngilizce seçiliyken Almanca kelime çıkması) kesin olarak önler.
   */
  function getWordsDataForActiveLanguage(lang = state.activeLanguage, level = state.userLevel) {
    const all = getWordsData();
    const targetLang = lang || state.activeLanguage || 'EN-TR';
    const targetLevel = level || state.userLevel || getLevelForTrack(targetLang, state.userTrack);
    return all.filter(w => w && w.dil === targetLang && (!targetLevel || w.seviye === targetLevel));
  }

  function getWordMeaning(w) {
    if (!w) return '';
    return (w.anlamı || w.anlami || w.anlam || w.meaning || w.ceviri || w.turkce || '').trim();
  }

  function getWordSentence(w) {
    if (!w) return '';
    return (w.ornek_cumle || w.örnek_cumle || w.ornek || '').trim();
  }

  function getWordSentenceTranslation(w) {
    if (!w) return '';
    return (w.cumle_ceviri || w.ornek_anlam || '').trim();
  }

  /**
   * Müfredat / Kur (Track: 4A vs 4B) ve seçili dile göre CEFR seviyesini eşler.
   */
  function getLevelForTrack(langCode, track) {
    const trk = track || '4A';
    if (langCode === 'EN-TR') return trk === '4B' ? 'B1' : 'A2';
    if (langCode === 'FR-TR') return trk === '4B' ? 'A2' : 'A1';
    if (langCode === 'DE-TR') return trk === '4B' ? 'A2' : 'A1';
    return trk === '4B' ? 'B1' : 'A2';
  }

  /**
   * Kitap ve seviye bazlı ünite numarasını hesaplar (B1 üniteleri 12 yerine 1'den başlar).
   */
  function getDisplayUnitNumber(u, idx = null) {
    if (!u) return 1;
    if (u.dil === 'EN-TR' && u.seviye === 'B1') {
      return u.unite_no - 11;
    }
    if (u.dil === 'EN-TR' && u.seviye === 'B1+') {
      return u.unite_no - 21;
    }
    if (idx !== null && idx !== undefined) {
      return idx + 1;
    }
    return u.unite_no;
  }

  /**
   * Kural 4: Kullanıcı yalnızca kilidi açılmış ünitelerde bulunabilir.
   * Başlangıçta daima 1. ünite (Starter / Unit 1) açıktır.
   * Bir sonraki üniteye geçmek için önceki ünitenin en az %75'i tamamlanmalıdır.
   */
  function calculateCurrentUnitByDate(langCode, level = null) {
    const targetLevel = level || state.userLevel || getLevelForTrack(langCode, state.userTrack);
    const highest = getHighestUnlockedUnit(langCode, targetLevel);
    return highest.unite_no;
  }

  // ==========================================
  // PROFİL & ONBOARDING & DİNAMİK SEVİYE YÖNETİMİ
  // ==========================================
  function getLevelsForLanguage(langCode) {
    const units = getUnitsData().filter(u => u.dil === langCode);
    const levels = [];
    units.forEach(u => {
      if (u.seviye && !levels.includes(u.seviye)) {
        levels.push(u.seviye);
      }
    });
    return levels.length ? levels : ['A1', 'A2', 'B1'];
  }

  function getUnitsForLanguageAndLevel(langCode, level) {
    const units = getUnitsData().filter(u => u.dil === langCode);
    if (!level) return units;
    return units.filter(u => u.seviye === level);
  }

  function syncLearnedMapFromStorage() {
    try {
      const stored = localStorage.getItem('kelime_learned_map');
      if (stored) {
        state.learnedMap = JSON.parse(stored);
      }
    } catch(e) {}
  }

  /**
   * Bir ünitenin öğrenilme oranını (%0 - %100) ve öğrenilen kelime sayısını hesaplar.
   */
  function getUnitProgress(unit, langCode = state.activeLanguage) {
    if (!unit) return { total: 0, learned: 0, percent: 0, ratio: 0, isPassed75: false };
    syncLearnedMapFromStorage();
    const allWords = getWordsData();
    const unitWords = allWords.filter(w => w.dil === unit.dil && (!unit.seviye || w.seviye === unit.seviye) && w.unite_no === unit.unite_no);
    const total = unitWords.length;
    const learned = unitWords.filter(w => state.learnedMap[w.id] && state.learnedMap[w.id].learned === true).length;
    const ratio = total > 0 ? (learned / total) : 1;
    const percent = total > 0 ? Math.round(ratio * 100) : 100;
    const isPassed75 = ratio >= 0.75;
    return { total, learned, percent, ratio, isPassed75 };
  }

  /**
   * Müfredat / Kur bazında tüm ünitelerin kilit durumlarını hesaplar.
   * Kural 4: 1. ünite daima açıktır. Sonraki ünite (i), bir önceki ünite (i-1) en az %75 tamamlandığında açılır.
   * Kullanıcı kilidi açılmış tüm geçmiş ünitelere serbestçe geri dönebilir.
   */
  function getUnitLockStatusMap(langCode = state.activeLanguage, level = null) {
    const targetLevel = level || state.userLevel || getLevelForTrack(langCode, state.userTrack);
    const units = getUnitsData().filter(u => u.dil === langCode && (!targetLevel || u.seviye === targetLevel));
    
    const lockMap = {};
    
    units.forEach((u, idx) => {
      const progress = getUnitProgress(u, langCode);
      if (idx === 0) {
        // İlk ünite (Starter / Unit 1 / Kapitel 1) daima açıktır
        lockMap[u.unite_no] = {
          isUnlocked: true,
          progress,
          prevUnit: null
        };
      } else {
        const prevUnit = units[idx - 1];
        const prevStatus = lockMap[prevUnit.unite_no];
        // Önceki ünite açık ve en az %75 tamamlanmışsa bu ünite açılır
        const isUnlocked = Boolean(prevStatus && prevStatus.isUnlocked && prevStatus.progress.isPassed75);
        lockMap[u.unite_no] = {
          isUnlocked,
          progress,
          prevUnit
        };
      }
    });

    return lockMap;
  }

  function isUnitUnlocked(unitNo, langCode = state.activeLanguage, level = null) {
    const lockMap = getUnitLockStatusMap(langCode, level);
    return lockMap[unitNo] ? lockMap[unitNo].isUnlocked : false;
  }

  function getHighestUnlockedUnit(langCode = state.activeLanguage, level = null) {
    const targetLevel = level || state.userLevel || getLevelForTrack(langCode, state.userTrack);
    const units = getUnitsData().filter(u => u.dil === langCode && (!targetLevel || u.seviye === targetLevel));
    if (!units.length) return { unite_no: 1, baslik: 'Ünite 1' };

    const lockMap = getUnitLockStatusMap(langCode, targetLevel);
    let highest = units[0];
    for (const u of units) {
      if (lockMap[u.unite_no] && lockMap[u.unite_no].isUnlocked) {
        highest = u;
      } else {
        break;
      }
    }
    return highest;
  }

  function updateSettingAccountStatusUI() {
    const isAuth = !!(window.fbUser && window.fbUser.uid);
    const titleEl = document.getElementById('settingAccountStatusTitle');
    const emailEl = document.getElementById('settingAccountEmailText');
    const iconEl = document.getElementById('settingAccountIcon');
    const actionBtn = document.getElementById('settingAccountActionBtn');
    const logoutBtn = dom.logoutBtn || document.getElementById('logoutBtn');

    if (titleEl) {
      titleEl.textContent = isAuth 
        ? `${state.userName || 'Kullanıcı'} (Oturum Açıldı)` 
        : 'Misafir Kullanıcı';
    }
    if (emailEl) {
      const email = (window.fbUser && window.fbUser.email) || state.userEmail;
      emailEl.textContent = isAuth 
        ? (email ? `Bulut hesabı: ${email}` : 'Bulut senkronizasyonu aktif ✅') 
        : 'Puanlarınızı ve ilerlemenizi kaydetmek için giriş yapın';
    }
    if (iconEl) {
      iconEl.textContent = isAuth ? '✅' : '👤';
    }
    if (actionBtn) {
      actionBtn.style.display = isAuth ? 'none' : 'inline-block';
      actionBtn.textContent = 'Giriş / Kayıt';
    }
    if (logoutBtn) {
      logoutBtn.style.display = 'inline-flex';
      const logoutBtnText = document.getElementById('logoutBtnText');
      if (logoutBtnText) {
        logoutBtnText.textContent = isAuth ? 'Hesaptan Çıkış Yap' : 'Misafir Oturumunu Kapat (Sıfırla)';
      }
    }
    const leaderboardAuthStatus = document.getElementById('leaderboardAuthStatus');
    if (leaderboardAuthStatus) {
      leaderboardAuthStatus.style.display = isAuth ? 'none' : 'flex';
    }
  }

  function updateUserProfileUI() {
    if (dom.headerUserAvatar) dom.headerUserAvatar.textContent = state.userAvatar;
    if (dom.headerUserName) dom.headerUserName.textContent = state.userName;
    if (dom.homeUserAvatar) dom.homeUserAvatar.textContent = state.userAvatar;
    if (dom.homeUserName) dom.homeUserName.textContent = state.userName;
    if (dom.settingUserNameInput && document.activeElement !== dom.settingUserNameInput) {
      dom.settingUserNameInput.value = state.userName;
    }
    updateSettingAccountStatusUI();
  }

  function applyUserData(userData, options = {}) {
    if (!userData) return;
    if (userData.displayName && userData.displayName !== 'İsimsiz Kahraman') {
      state.userName = userData.displayName;
      localStorage.setItem('lexiq_user_name', userData.displayName);
    }
    if (userData.avatar) {
      state.userAvatar = userData.avatar;
      localStorage.setItem('lexiq_user_avatar', userData.avatar);
    }
    if (userData.email) {
      state.userEmail = userData.email;
      localStorage.setItem('lexiq_user_email', userData.email);
    }
    if (userData.track) {
      state.userTrack = userData.track;
      localStorage.setItem('lexiq_user_track', userData.track);
    }
    if (userData.level) {
      state.userLevel = userData.level;
      localStorage.setItem('lexiq_user_level', userData.level);
    }
    if (userData.lang && LANG_META[userData.lang]) {
      state.activeLanguage = userData.lang;
      localStorage.setItem('kelime_active_lang', userData.lang);
    }
    if (typeof userData.xp === 'number') {
      state.xp = userData.xp;
      localStorage.setItem('kelime_xp', userData.xp.toString());
    }
    if (userData.learnedMap && typeof userData.learnedMap === 'object') {
      state.learnedMap = userData.learnedMap;
      localStorage.setItem('kelime_learned_map', JSON.stringify(userData.learnedMap));
    }
    if (Array.isArray(userData.unlockedBadges)) {
      state.unlockedBadges = userData.unlockedBadges;
      localStorage.setItem('kelime_unlocked_badges', JSON.stringify(userData.unlockedBadges));
    }
    if (typeof userData.maxStreak === 'number') {
      state.maxStreak = userData.maxStreak;
      localStorage.setItem('kelime_max_streak', userData.maxStreak.toString());
    }
    if (typeof userData.arenaWordsSolved === 'number') {
      state.arenaWordsSolved = userData.arenaWordsSolved;
      localStorage.setItem('kelime_arena_solved', userData.arenaWordsSolved.toString());
    }
    if (userData.gameStats && typeof userData.gameStats === 'object') {
      state.gameStats = userData.gameStats;
      localStorage.setItem('kelime_game_stats', JSON.stringify(userData.gameStats));
    }
    if (typeof userData.cleanWins === 'number') {
      state.cleanWins = userData.cleanWins;
      localStorage.setItem('kelime_clean_wins', userData.cleanWins.toString());
    }
    if (userData.timeTracking && typeof userData.timeTracking === 'object') {
      state.timeTracking = state.timeTracking || {};
      if (typeof userData.timeTracking.cardSeconds === 'number') {
        state.timeTracking.cardSeconds = userData.timeTracking.cardSeconds;
        localStorage.setItem('lexiq_time_cards', String(userData.timeTracking.cardSeconds));
      }
      if (typeof userData.timeTracking.gameSeconds === 'number') {
        state.timeTracking.gameSeconds = userData.timeTracking.gameSeconds;
        localStorage.setItem('lexiq_time_games', String(userData.timeTracking.gameSeconds));
      }
      if (userData.timeTracking.firstStartedAt) {
        state.timeTracking.firstStartedAt = userData.timeTracking.firstStartedAt;
        localStorage.setItem('lexiq_first_started_at', String(userData.timeTracking.firstStartedAt));
      }
      if (userData.timeTracking.registeredAt) {
        state.timeTracking.registeredAt = userData.timeTracking.registeredAt;
        localStorage.setItem('lexiq_registered_at', String(userData.timeTracking.registeredAt));
      }
      if (userData.timeTracking.unitDurations && typeof userData.timeTracking.unitDurations === 'object') {
        state.timeTracking.unitDurations = Object.assign({}, state.timeTracking.unitDurations || {}, userData.timeTracking.unitDurations);
        localStorage.setItem('lexiq_unit_durations', JSON.stringify(state.timeTracking.unitDurations));
      }
    }

    const isRegistration = (options && options.isRegistration) || window.isOnboardingAuthFlow;
    const obModal = document.getElementById('onboardingModal');
    const isObActive = obModal && (obModal.classList.contains('active') || (obModal.style.display && obModal.style.display !== 'none'));

    // Sadece kayıt olunmuyorsa ve aktif onboarding sürecinde olunmadığında onboarded kabul et
    if (!isRegistration && !isObActive && (localStorage.getItem('lexiq_user_onboarded') === 'true' || (userData.track && userData.lang))) {
      state.isOnboarded = true;
      localStorage.setItem('lexiq_user_onboarded', 'true');
      if (obModal) {
        obModal.classList.remove('active');
        obModal.style.display = 'none';
      }
    }

    updateUserProfileUI();
    updateArenaHeaderAndStats();
    populateProfileSettingsTab();
    updateSettingsTrackAndUnitDropdowns();
    updateHeaderUnitDisplay();
    if (typeof renderBadgesView === 'function') renderBadgesView();
    refreshWordsList();
    if (typeof renderStudentActivityStatsUI === 'function') renderStudentActivityStatsUI();

    // Modalları kapat (kayıt akışında authModal submit handler tarafından kapatılır)
    if (!isRegistration) {
      const authModal = document.getElementById('authModal');
      if (authModal) authModal.classList.remove('active');
    }
  }

  window.applyUserData = applyUserData;
  window.updateUserProfileUI = updateUserProfileUI;
  window.updateSettingAccountStatusUI = updateSettingAccountStatusUI;

  function populateProfileSettingsTab() {
    if (!dom.settingUserNameInput) return;
    dom.settingUserNameInput.value = state.userName || 'Öğrenci';

    if (dom.settingAvatarBtns) {
      dom.settingAvatarBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-avatar') === state.userAvatar);
      });
    }

    if (dom.settingLangSelect) {
      dom.settingLangSelect.value = state.activeLanguage || 'EN-TR';
    }

    updateSettingsTrackAndUnitDropdowns();

    if (dom.settingDailyGoalSelect) {
      dom.settingDailyGoalSelect.value = String(state.dailyGoal || 15);
    }

    captureProfileSettingsSnapshot();
  }

  // Öğrenci profili ayarları değişiklik takibi
  let profileSettingsSnapshot = null;

  function captureProfileSettingsSnapshot() {
    const activeAvatarBtn = document.querySelector('#settingAvatarGrid .setting-avatar-btn.active');
    profileSettingsSnapshot = {
      name: (dom.settingUserNameInput && dom.settingUserNameInput.value.trim()) || '',
      avatar: activeAvatarBtn ? activeAvatarBtn.getAttribute('data-avatar') : (state.userAvatar || ''),
      lang: dom.settingLangSelect ? dom.settingLangSelect.value : (state.activeLanguage || ''),
      track: dom.settingTrackSelect ? dom.settingTrackSelect.value : (state.userTrack || ''),
      unitNo: dom.settingUnitSelect ? dom.settingUnitSelect.value : String(state.activeUnitNo || ''),
      goal: dom.settingDailyGoalSelect ? dom.settingDailyGoalSelect.value : String(state.dailyGoal || '')
    };
  }

  function hasUnsavedProfileSettings() {
    if (!profileSettingsSnapshot) return false;
    const activeAvatarBtn = document.querySelector('#settingAvatarGrid .setting-avatar-btn.active');
    const currentName = (dom.settingUserNameInput && dom.settingUserNameInput.value.trim()) || '';
    const currentAvatar = activeAvatarBtn ? activeAvatarBtn.getAttribute('data-avatar') : (state.userAvatar || '');
    const currentLang = dom.settingLangSelect ? dom.settingLangSelect.value : (state.activeLanguage || '');
    const currentTrack = dom.settingTrackSelect ? dom.settingTrackSelect.value : (state.userTrack || '');
    const currentUnitNo = dom.settingUnitSelect ? dom.settingUnitSelect.value : String(state.activeUnitNo || '');
    const currentGoal = dom.settingDailyGoalSelect ? dom.settingDailyGoalSelect.value : String(state.dailyGoal || '');

    return (
      currentName !== profileSettingsSnapshot.name ||
      currentAvatar !== profileSettingsSnapshot.avatar ||
      currentLang !== profileSettingsSnapshot.lang ||
      currentTrack !== profileSettingsSnapshot.track ||
      currentUnitNo !== profileSettingsSnapshot.unitNo ||
      currentGoal !== profileSettingsSnapshot.goal
    );
  }

  function confirmDiscardProfileChanges() {
    return window.confirm(
      '⚠️ Kaydedilmemiş değişiklikleriniz var!\n\nYaptığınız değişiklikler "Değişiklikleri Kaydet"e basmadığınız için kaybolacaktır. Yine de çıkmak istiyor musunuz?'
    );
  }

  function updateSettingsTrackAndUnitDropdowns() {
    const selectedLang = dom.settingLangSelect ? dom.settingLangSelect.value : state.activeLanguage;
    const selectedTrack = state.userTrack || '4A';

    if (dom.settingTrackSelect) {
      const opt4A = dom.settingTrackSelect.querySelector('option[value="4A"]');
      const opt4B = dom.settingTrackSelect.querySelector('option[value="4B"]');
      if (opt4A) opt4A.textContent = `Alt Kur (4A - ${getLevelForTrack(selectedLang, '4A')} Seviyesi)`;
      if (opt4B) opt4B.textContent = `Üst Kur (4B - ${getLevelForTrack(selectedLang, '4B')} Seviyesi)`;
      dom.settingTrackSelect.value = selectedTrack;
    }

    updateSettingsUnitDropdown();
  }

  function updateSettingsUnitDropdown() {
    if (!dom.settingUnitSelect) return;
    const selectedLang = dom.settingLangSelect ? dom.settingLangSelect.value : state.activeLanguage;
    const selectedTrack = dom.settingTrackSelect ? dom.settingTrackSelect.value : (state.userTrack || '4A');
    const targetLevel = getLevelForTrack(selectedLang, selectedTrack);
    const units = getUnitsForLanguageAndLevel(selectedLang, targetLevel);

    const lockMap = getUnitLockStatusMap(selectedLang, targetLevel);

    dom.settingUnitSelect.innerHTML = '';
    units.forEach((u, idx) => {
      const opt = document.createElement('option');
      opt.value = u.unite_no;
      const displayNo = getDisplayUnitNumber(u, idx);
      const isUnlocked = lockMap[u.unite_no] ? lockMap[u.unite_no].isUnlocked : (idx === 0);
      let title = u.baslik || (u.unite_adi ? `${u.seviye || ''} • ${u.unite_adi}` : `Ünite ${displayNo}`);
      if (!isUnlocked) {
        opt.disabled = true;
        opt.textContent = `${title} 🔒 (%75 Gerekli)`;
      } else {
        opt.disabled = false;
        opt.textContent = title;
      }
      dom.settingUnitSelect.appendChild(opt);
    });

    const isCurrentUnlocked = lockMap[state.activeUnitNo] && lockMap[state.activeUnitNo].isUnlocked;
    if (isCurrentUnlocked) {
      dom.settingUnitSelect.value = state.activeUnitNo;
    } else {
      const highest = getHighestUnlockedUnit(selectedLang, targetLevel);
      dom.settingUnitSelect.value = highest.unite_no;
    }
  }

  function saveProfileSettings() {
    const newName = (dom.settingUserNameInput && dom.settingUserNameInput.value.trim()) || 'Öğrenci';
    let newAvatar = state.userAvatar;
    const activeAvatarBtn = document.querySelector('#settingAvatarGrid .setting-avatar-btn.active');
    if (activeAvatarBtn) {
      newAvatar = activeAvatarBtn.getAttribute('data-avatar');
    }

    const newLang = dom.settingLangSelect ? dom.settingLangSelect.value : state.activeLanguage;
    const newTrack = dom.settingTrackSelect ? dom.settingTrackSelect.value : (state.userTrack || '4A');
    const newLevel = getLevelForTrack(newLang, newTrack);
    let newUnitNo = dom.settingUnitSelect ? parseInt(dom.settingUnitSelect.value, 10) : state.activeUnitNo;
    if (!isUnitUnlocked(newUnitNo, newLang, newLevel)) {
      newUnitNo = getHighestUnlockedUnit(newLang, newLevel).unite_no;
    }
    const newGoal = dom.settingDailyGoalSelect ? parseInt(dom.settingDailyGoalSelect.value, 10) : state.dailyGoal;

    state.userName = newName;
    state.userAvatar = newAvatar;
    state.userTrack = newTrack;
    state.userLevel = newLevel;
    state.dailyGoal = newGoal;
    state.dailyGoalExtra = 0;

    localStorage.setItem('lexiq_user_name', state.userName);
    localStorage.setItem('lexiq_user_avatar', state.userAvatar);
    localStorage.setItem('lexiq_user_track', state.userTrack);
    localStorage.setItem('lexiq_user_level', state.userLevel);
    localStorage.setItem('kelime_daily_goal', state.dailyGoal);

    if (newLang !== state.activeLanguage) {
      setLanguage(newLang, false);
    }
    state.activeUnitNo = newUnitNo;
    state.currentIndex = 0;

    if (dom.dailyGoalSelect) {
      dom.dailyGoalSelect.value = String(state.dailyGoal);
    }
    if (dom.inlineDailyGoalSelect) {
      dom.inlineDailyGoalSelect.value = String(state.dailyGoal);
    }

    updateUserProfileUI();
    refreshWordsList();
    captureProfileSettingsSnapshot();
    closeSettingsModal();
    if (typeof window.updateFirebaseProfile === 'function') {
      window.updateFirebaseProfile(state.userName, state.userAvatar, state.userTrack, state.userLevel, state.activeLanguage);
    }
    showToast('Profil ve müfredat tercihlerin kaydedildi! ✅');
  }

  // ==========================================
  // İLK KULLANIM KURULUM SİHİRBAZI (ONBOARDING)
  // ==========================================
  const obState = {
    step: 1,
    name: 'Öğrenci',
    avatar: '🦊',
    lang: 'EN-TR',
    track: '4A',
    level: 'A2',
    unitNo: 1,
    dailyGoal: 15,
    streakPledgeDays: 5
  };

  function startOnboardingFlow() {
    window.startOnboardingFlow = startOnboardingFlow;
    obState.step = 0;
    obState.name = (state.userName && state.userName !== 'Öğrenci') ? state.userName : '';
    obState.avatar = state.userAvatar || '🦊';
    obState.lang = state.activeLanguage || 'EN-TR';
    obState.track = state.userTrack || '4A';
    obState.level = state.userLevel || getLevelForTrack(obState.lang, obState.track);
    obState.unitNo = calculateCurrentUnitByDate(obState.lang, obState.level);
    const activeGoalChip = document.querySelector('#obGoalGrid .goal-chip.active');
    if (activeGoalChip) {
      obState.dailyGoal = parseInt(activeGoalChip.getAttribute('data-goal'), 10) || 15;
    } else {
      obState.dailyGoal = (state.dailyGoal && state.dailyGoal > 0) ? state.dailyGoal : 15;
    }

    if (dom.obNameInput) dom.obNameInput.value = obState.name;

    if (dom.obAvatarChips) {
      dom.obAvatarChips.forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-avatar') === obState.avatar);
      });
    }

    if (dom.obLangOptions) {
      dom.obLangOptions.forEach(card => {
        card.classList.toggle('active', card.getAttribute('data-lang') === obState.lang);
      });
    }

    if (dom.homeView) dom.homeView.style.display = 'none';
    if (dom.flashcardsView) dom.flashcardsView.style.display = 'none';
    if (dom.arenaView) dom.arenaView.style.display = 'none';
    if (dom.floatingNavDock) dom.floatingNavDock.style.display = 'none';

    goToOnboardingStep(0);
    if (dom.onboardingModal) {
      dom.onboardingModal.style.display = 'flex';
      dom.onboardingModal.classList.add('active');
    }
  }

  function goToOnboardingStep(stepNum) {
    obState.step = stepNum;

    // İçerikleri görünür yapmadan ÖNCE hazırla (Böylece ekranda çift boyama / blink olmaz)
    if (stepNum === 3) {
      renderOnboardingTracks();
    }
    if (stepNum === 4) {
      renderOnboardingUnits();
    }

    const stepIndicator = document.querySelector('.onboarding-steps-indicator');
    if (stepIndicator) {
      stepIndicator.style.display = (stepNum >= 1 && stepNum <= 4) ? 'flex' : 'none';
    }

    const allSteps = (dom.obSteps && dom.obSteps.length) ? dom.obSteps : document.querySelectorAll('.onboarding-step-view');
    allSteps.forEach(stepEl => {
      const isCurrent = stepEl.id === `obStep${stepNum}`;
      if (isCurrent) {
        stepEl.style.setProperty('display', 'flex', 'important');
        stepEl.classList.add('active');
      } else {
        stepEl.style.setProperty('display', 'none', 'important');
        stepEl.classList.remove('active');
      }
    });

    if (dom.obStepDots) {
      dom.obStepDots.forEach(dot => {
        const dotStep = parseInt(dot.getAttribute('data-step'), 10);
        dot.classList.toggle('active', dotStep === stepNum);
        dot.classList.toggle('completed', dotStep < stepNum);
      });
    }
  }

  const LEVEL_TITLES = {
    'A1': 'Başlangıç',
    'A2': 'Temel',
    'B1': 'Orta',
    'B1+': 'Orta-İleri',
    'B2': 'İleri'
  };

  function renderOnboardingTracks() {
    if (!obState.track) obState.track = '4A';
    obState.level = getLevelForTrack(obState.lang, obState.track);
    obState.unitNo = calculateCurrentUnitByDate(obState.lang, obState.level);

    if (dom.obTrackOptions) {
      dom.obTrackOptions.forEach(card => {
        const trackVal = card.getAttribute('data-track');
        const isActive = trackVal === obState.track;
        card.classList.toggle('active', isActive);

        const lvl = getLevelForTrack(obState.lang, trackVal);
        const titleEl = card.querySelector('.ob-opt-title');
        const descEl = card.querySelector('.ob-opt-desc');
        if (titleEl) {
          if (trackVal === '4B') {
            titleEl.textContent = `Üst Kur (4B - ${lvl} Seviyesi)`;
          } else {
            titleEl.textContent = `Alt Kur (4A - ${lvl} Seviyesi)`;
          }
        }
        if (descEl) {
          if (trackVal === '4B') {
            descEl.textContent = `${lvl} İleri Müfredat: İlgili dönem ve üniteler`;
          } else {
            descEl.textContent = `${lvl} Temel Müfredat: Başlangıç ve temel üniteler`;
          }
        }
      });
    }
  }

  function renderOnboardingUnits() {
    obState.level = getLevelForTrack(obState.lang, obState.track || '4A');
    const lockMap = getUnitLockStatusMap(obState.lang, obState.level);
    const highest = getHighestUnlockedUnit(obState.lang, obState.level);

    if (!obState.unitNo || !lockMap[obState.unitNo]?.isUnlocked) {
      obState.unitNo = highest.unite_no;
    }

    if (dom.obUnitSelect) {
      dom.obUnitSelect.innerHTML = '';
      const units = getUnitsForLanguageAndLevel(obState.lang, obState.level);

      units.forEach((u, idx) => {
        const opt = document.createElement('option');
        opt.value = u.unite_no;
        const displayNo = getDisplayUnitNumber(u, idx);
        const isUnlocked = lockMap[u.unite_no] ? lockMap[u.unite_no].isUnlocked : (idx === 0);
        let title = u.baslik || (u.unite_adi ? `${u.seviye || ''} • ${u.unite_adi}` : `Ünite ${displayNo}`);
        if (!isUnlocked) {
          opt.disabled = true;
          opt.textContent = `${title} 🔒 (%75 Gerekli)`;
        } else {
          opt.disabled = false;
          opt.textContent = title;
        }
        dom.obUnitSelect.appendChild(opt);
      });

      dom.obUnitSelect.value = obState.unitNo;
    }

    const trackInfoBox = dom.obTrackInfoBox || document.getElementById('obTrackInfoBox');
    if (trackInfoBox) {
      const meta = LANG_META[obState.lang] || { name: 'İngilizce → Türkçe', flag: '🇬🇧' };
      const trackName = obState.track === '4B' ? `Üst Kur (4B - ${obState.level} Seviyesi)` : `Alt Kur (4A - ${obState.level} Seviyesi)`;
      const currentUnitObj = getUnitsData().find(u => u.dil === obState.lang && u.unite_no === obState.unitNo);
      const unitLabel = currentUnitObj 
        ? (currentUnitObj.baslik || (currentUnitObj.unite_adi ? `${currentUnitObj.seviye || ''} • ${currentUnitObj.unite_adi}` : `Ünite ${currentUnitObj.unite_no}`))
        : `Ünite ${obState.unitNo}`;

      trackInfoBox.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
          <span>${meta.flag || '🌍'}</span> <span>${meta.name}</span>
        </div>
        <div style="font-size: 0.88rem; opacity: 0.95; margin-bottom: 4px;">📚 Müfredat: <strong>${trackName}</strong></div>
        <div style="font-size: 0.88rem; opacity: 0.95; margin-bottom: 4px;">📖 Başlangıç Ünitesi: <strong>${unitLabel}</strong></div>
        <div style="font-size: 0.82rem; opacity: 0.8; line-height: 1.4;">Kademeli öğrenme sistemi: Sonraki üniteye geçmek için mevcut ünitenin en az %75'ini tamamlamalısınız.</div>
      `;
    }

    if (dom.obGoalChips) {
      const currentGoal = obState.dailyGoal || 15;
      dom.obGoalChips.forEach(chip => {
        const goalVal = parseInt(chip.getAttribute('data-goal'), 10);
        chip.classList.toggle('active', goalVal === currentGoal);
      });
    }
  }

  function completeOnboarding() {
    state.userName = obState.name || 'Öğrenci';
    state.userAvatar = obState.avatar || '🦊';
    state.activeLanguage = obState.lang || 'EN-TR';
    state.userTrack = obState.track || '4A';
    state.userLevel = obState.level || getLevelForTrack(state.activeLanguage, state.userTrack);
    const chosenUnitNo = (dom.obUnitSelect && parseInt(dom.obUnitSelect.value, 10)) || obState.unitNo || calculateCurrentUnitByDate(state.activeLanguage, state.userLevel);
    state.activeUnitNo = chosenUnitNo;
    state.dailyGoal = obState.dailyGoal || 15;
    state.dailyGoalExtra = 0;
    state.isOnboarded = true;

    localStorage.setItem('lexiq_user_name', state.userName);
    localStorage.setItem('lexiq_user_avatar', state.userAvatar);
    localStorage.setItem('lexiq_user_track', state.userTrack);
    localStorage.setItem('lexiq_user_level', state.userLevel);
    localStorage.setItem('lexiq_user_onboarded', 'true');
    localStorage.setItem('kelime_active_lang', state.activeLanguage);
    localStorage.setItem('kelime_daily_goal', state.dailyGoal);

    updateUserProfileUI();
    if (typeof window.updateFirebaseProfile === 'function') {
      window.updateFirebaseProfile(state.userName, state.userAvatar, state.userTrack, state.userLevel, state.activeLanguage);
    }
    setLanguage(state.activeLanguage, false);
    state.activeUnitNo = chosenUnitNo;
    state.currentIndex = 0;

    if (dom.dailyGoalSelect) {
      dom.dailyGoalSelect.value = String(state.dailyGoal);
    }
    if (dom.inlineDailyGoalSelect) {
      dom.inlineDailyGoalSelect.value = String(state.dailyGoal);
    }
    if (dom.settingDailyGoalSelect) {
      dom.settingDailyGoalSelect.value = String(state.dailyGoal);
    }

    refreshWordsList();

    if (dom.onboardingModal) {
      dom.onboardingModal.classList.remove('active');
      dom.onboardingModal.style.display = 'none';
    }
    switchAppMode('home');
    if (obState.streakPledgeDays) {
      setTimeout(() => {
        startStreakPledge(obState.streakPledgeDays);
      }, 600);
    }
    showToast(`Hoş geldin, ${state.userName}! ${state.userAvatar} Öğrenme yolculuğun başlıyor.`);
    if (!localStorage.getItem('lexiq_tour_completed')) {
      setTimeout(() => {
        if (typeof startFeatureTour === 'function') startFeatureTour(false);
      }, 800);
    }
  }

  // ==========================================
  // VERİ YÖNETİMİ & FİLTRELEME
  // ==========================================
  function refreshWordsList() {
    const targetLevel = state.userLevel || getLevelForTrack(state.activeLanguage, state.userTrack);
    const allWords = getWordsData().filter(w => w.dil === state.activeLanguage && (!targetLevel || w.seviye === targetLevel));

    // Ünite bilgisi
    const units = getUnitsData().filter(u => u.dil === state.activeLanguage && (!targetLevel || u.seviye === targetLevel));
    let unitObj = units.find(u => u.unite_no === state.activeUnitNo);
    if (unitObj && !isUnitUnlocked(unitObj.unite_no, state.activeLanguage, targetLevel)) {
      unitObj = getHighestUnlockedUnit(state.activeLanguage, targetLevel);
      state.activeUnitNo = unitObj.unite_no;
    }
    if (!unitObj && units.length > 0) {
      unitObj = getHighestUnlockedUnit(state.activeLanguage, targetLevel);
      state.activeUnitNo = unitObj.unite_no;
    }

    if (unitObj) {
      const displayNo = getDisplayUnitNumber(unitObj);
      const unitLabel = unitObj.baslik || (unitObj.unite_adi 
        ? `${unitObj.seviye || ''} • ${unitObj.unite_adi}` 
        : `Ünite ${displayNo}`);
      if (dom.activeUnitTitle) dom.activeUnitTitle.textContent = unitLabel;
      if (dom.activeUnitDates) dom.activeUnitDates.textContent = `${formatDate(unitObj.baslangic_tarihi)} - ${formatDate(unitObj.bitis_tarihi)}`;
    }
    updateHeaderUnitDisplay();

    // İlgili ünitedeki kelimeleri al
    let unitWords = allWords.filter(w => w.unite_no === state.activeUnitNo && (!targetLevel || w.seviye === targetLevel));

    // Eğer ilgili ünitede kelime yoksa veya az ise genel listeyi sun
    if (unitWords.length === 0) {
      unitWords = allWords;
    }

    // Durumları localStorage'dan senkronize et (Kural 6)
    unitWords = unitWords.map(w => {
      const isLearned = state.learnedMap[w.id] && state.learnedMap[w.id].learned === true;
      return {
        ...w,
        ogrenilme_durumu: isLearned ? 1 : 0
      };
    });

    // Öğrenilmemiş ve öğrenilmiş kelimeleri ayır
    const unlearnedWords = unitWords.filter(w => w.ogrenilme_durumu === 0);
    const learnedWords = unitWords.filter(w => w.ogrenilme_durumu === 1);

    // Bugün öğrenilen kelimelerin sayısı (mevcut ünite için)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.getTime();

    const todayLearnedInUnit = unitWords.filter(w => {
      const rec = state.learnedMap[w.id];
      if (!rec || !rec.learned) return false;
      if (state.sessionLearnedIds && state.sessionLearnedIds.has(w.id)) return true;
      if (!rec.learnedAt) return true;
      return (rec.learnedAt >= startTimestamp) || (Date.now() - rec.learnedAt < 24 * 60 * 60 * 1000);
    }).length;

    const baseGoal = (state.dailyGoal && state.dailyGoal > 0) ? state.dailyGoal : 15;
    const isFullUnitMode = baseGoal === 999;
    const effectiveGoal = isFullUnitMode ? unitWords.length : (baseGoal + (state.dailyGoalExtra || 0));

    // Filtreleme: Kullanıcı kart çalışırken öğrenilen kelimeler TEKRAR önüne gelmez
    let filtered;
    if (state.activeFilter === 'learned') {
      filtered = [...learnedWords];
    } else {
      if (isFullUnitMode) {
        filtered = [...unlearnedWords];
      } else {
        const remainingForGoal = Math.max(0, effectiveGoal - todayLearnedInUnit);
        if (remainingForGoal === 0) {
          filtered = []; // Günlük kota tamamlandı! Yeni kelimeler akmaz, kullanıcı aktivitelere teşvik edilir
        } else {
          filtered = unlearnedWords.slice(0, remainingForGoal);
        }
      }
    }

    // SRS / Akıllı Tekrar: Zor veya tekrar edilmesi gereken kelimeleri öne al
    if (state.srsPriority && state.activeFilter === 'pending') {
      filtered.sort((a, b) => {
        const aRecord = state.learnedMap[a.id];
        const bRecord = state.learnedMap[b.id];
        // Daha önce öğrenilip tekrara düşenler veya ipucu kullanılanlar en başa
        const aScore = aRecord ? (aRecord.learnedAt ? 1 : 2) : 0;
        const bScore = bRecord ? (bRecord.learnedAt ? 1 : 2) : 0;
        return bScore - aScore;
      });
    }

    if (state.isShuffled) {
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
    }
    state.words = filtered;

    // İlerleme Raporu: Günlük kota ve ünite toplamını doğru orantıda gösterir
    updateProgressUI({
      unitTotal: unitWords.length,
      unitLearned: learnedWords.length,
      unlearnedCount: unlearnedWords.length,
      todayLearned: todayLearnedInUnit,
      effectiveGoal: effectiveGoal,
      isFullUnitMode: isFullUnitMode
    });
    updateArenaBadgeDot();
    updateHomeScreenUI();

    // Kart dizinini ayarla
    if (state.currentIndex >= state.words.length) {
      state.currentIndex = Math.max(0, state.words.length - 1);
    }

    renderCard(unlearnedWords.length, baseGoal);
  }

  function updateProgressUI(data) {
    let learnedCount = 0;
    let targetCount = 0;
    let percent = 0;

    if (data.isFullUnitMode) {
      const total = data.unitTotal;
      const learned = data.unitLearned;
      percent = total > 0 ? Math.round((learned / total) * 100) : 0;
      learnedCount = learned;
      targetCount = total;

      if (dom.progressCountLabel) {
        dom.progressCountLabel.innerHTML = `Ünite İlerlemesi: <span id="learnedCountText">${learned}</span> / <span id="totalCountText">${total}</span>`;
      } else {
        if (dom.learnedCountText) dom.learnedCountText.textContent = learned;
        if (dom.totalCountText) dom.totalCountText.textContent = total;
      }
      if (dom.progressPercentText) dom.progressPercentText.textContent = `${percent}%`;
      if (dom.progressFill) dom.progressFill.style.width = `${percent}%`;
    } else {
      // Günlük Limit Modu (Örn: 15 Kelime)
      targetCount = Math.min(data.effectiveGoal, data.todayLearned + data.unlearnedCount);
      learnedCount = Math.min(data.todayLearned, targetCount);
      percent = targetCount > 0 ? Math.min(100, Math.round((learnedCount / targetCount) * 100)) : 100;

      if (dom.progressCountLabel) {
        dom.progressCountLabel.innerHTML = `Günlük Hedef: <span id="learnedCountText">${learnedCount}</span> / <span id="totalCountText">${targetCount}</span> <span class="unit-total-pill">Ünite: ${data.unitLearned}/${data.unitTotal}</span>`;
      } else {
        if (dom.learnedCountText) dom.learnedCountText.textContent = learnedCount;
        if (dom.totalCountText) dom.totalCountText.textContent = targetCount;
      }
      if (dom.progressPercentText) dom.progressPercentText.textContent = `${percent}%`;
      if (dom.progressFill) dom.progressFill.style.width = `${percent}%`;
    }

    // Kartlar sayfasındaki tek satırlık "Bugün Öğrenilen Kelimeler" çubuğunu güncelle
    if (dom.cardTodayLearnedCount) dom.cardTodayLearnedCount.textContent = learnedCount;
    if (dom.cardTodayTargetCount) dom.cardTodayTargetCount.textContent = targetCount;
    if (dom.cardTodayProgressFill) dom.cardTodayProgressFill.style.width = `${percent}%`;

    // Sekmelerdeki hedef ve öğrenilen kelime sayıları
    const pendingWordsCount = data.isFullUnitMode ? data.unlearnedCount : Math.max(0, targetCount - learnedCount);
    if (dom.pendingTabCount) {
      dom.pendingTabCount.textContent = `(${pendingWordsCount})`;
    }
    if (dom.learnedTabCount) {
      dom.learnedTabCount.textContent = `(${data.unitLearned})`;
    }

    // Inline hedef kutusu değerini senkronize et
    if (dom.inlineDailyGoalSelect) {
      dom.inlineDailyGoalSelect.value = String(state.dailyGoal || 15);
    }

    updateCardTabsUI();
  }

  function updateCardTabsUI() {
    if (!dom.cardTabPendingBtn || !dom.cardTabLearnedBtn) return;
    const isLearned = state.activeFilter === 'learned';

    dom.cardTabPendingBtn.classList.toggle('active', !isLearned);
    dom.cardTabLearnedBtn.classList.toggle('active', isLearned);

    if (dom.tabContentPending) {
      dom.tabContentPending.classList.toggle('active', !isLearned);
      dom.tabContentPending.style.display = !isLearned ? 'block' : 'none';
    }
    if (dom.tabContentLearned) {
      dom.tabContentLearned.classList.toggle('active', isLearned);
      dom.tabContentLearned.style.display = isLearned ? 'block' : 'none';
    }

    if (dom.cardFilterTabsContainer) {
      dom.cardFilterTabsContainer.classList.toggle('theme-pending', !isLearned);
      dom.cardFilterTabsContainer.classList.toggle('theme-learned', isLearned);
    }
  }

  // ==========================================
  // KELİME KARTI GÖSTERİMİ & DÖNDÜRME
  // ==========================================
  function renderCard(unlearnedCount = 0, baseGoal = 5) {
    // Kartı ön yüze çevir
    setFlipped(false);

    if (state.words.length === 0) {
      if (state.activeFilter === 'learned') {
        if (dom.flashcardWrapper) dom.flashcardWrapper.style.display = 'block';
        if (dom.cardNavBar) dom.cardNavBar.style.display = 'flex';
        if (dom.actionPanel) dom.actionPanel.style.display = 'block';
        if (dom.flashcardGoalCompletedView) dom.flashcardGoalCompletedView.style.display = 'none';

        dom.cardTargetWord.textContent = 'Öğrenilen Kelime Yok';
        dom.cardMeaningText.textContent = 'Henüz bu ünitede öğrenilmiş kelime bulunmuyor.';
        dom.cardExampleSentence.textContent = 'Öğrenilecekler sekmesine geçerek yeni kelimeler öğrenebilirsiniz.';
        dom.cardStatusBadge.textContent = 'Boş';
      } else {
        // 'pending' filtresinde ve kelimeler bitti -> KUTLAMA VE YÖNLENDİRME KARTI GÖRÜNÜR
        if (dom.flashcardWrapper) dom.flashcardWrapper.style.display = 'none';
        if (dom.cardNavBar) dom.cardNavBar.style.display = 'none';
        if (dom.actionPanel) dom.actionPanel.style.display = 'none';

        if (dom.flashcardGoalCompletedView) {
          dom.flashcardGoalCompletedView.style.display = 'flex';
          const isUnitFinished = unlearnedCount === 0;
          if (dom.cardCompletedFullDesc) {
            if (isUnitFinished) {
              dom.cardCompletedFullDesc.innerHTML = `Tebrikler! Bu ünitedeki <strong>tüm kelimeleri</strong> başarıyla öğrendin. Şimdi öğrendiğin kelimeleri kalıcı hafızana almak ve refleks haline getirmek için <strong>Kelime Arenası'nda eğlenceli etkinliklerle</strong> pratik yapma zamanı!`;
            } else {
              dom.cardCompletedFullDesc.innerHTML = `Tebrikler! Belirlediğin <strong>${baseGoal} kelimelik</strong> öğrenme hedefini başarıyla tamamladın. Öğrendiğin bu kelimeleri kalıcı hafızana almak ve refleks haline getirmek için şimdi <strong>Kelime Arenası'nda eğlenceli etkinliklerle</strong> pratik yapma zamanı!`;
            }
          }
          if (dom.cardFullLearnMoreText) {
            dom.cardFullLearnMoreText.textContent = isUnitFinished ? 'Ünite Tamamlandı 🏆' : '+5 Kelime Daha Öğren';
          }
        }
      }
      dom.cardSentenceTranslation.textContent = '';
      dom.cardIndexCounter.textContent = '0 / 0';
      dom.cardStatusBadge.className = 'card-status-badge status-learned';
      if (dom.cardPhonetic) dom.cardPhonetic.style.display = 'none';
      if (dom.cardPos) dom.cardPos.style.display = 'none';
      if (dom.enAccentGroup) dom.enAccentGroup.style.display = 'none';
      if (dom.pronounceBtn) dom.pronounceBtn.style.display = 'none';

      // Butonları ayarla: Hedef tamamlandığında (pending ve words bittiğinde) alttaki gereksiz 3'lü buton çubuğu gizlenerek kutunun tam oturması sağlanır
      if (dom.cardBottomControls) {
        dom.cardBottomControls.style.display = (state.activeFilter === 'learned') ? 'flex' : 'none';
      }
      if (dom.cardReviewGoArenaBtn) dom.cardReviewGoArenaBtn.style.display = 'none';
      if (dom.prevCardBtn) dom.prevCardBtn.disabled = true;
      if (dom.nextCardBtn) dom.nextCardBtn.disabled = true;
      if (dom.markLearnedBtn) {
        dom.markLearnedBtn.disabled = true;
        if (dom.markLearnedBtnText) {
          dom.markLearnedBtnText.textContent = 'Hedef Tamamlandı';
        }
      }
      if (dom.markRepeatBtn) dom.markRepeatBtn.disabled = true;
      return;
    }

    // Kelimeler varken kart ve kontroller normal gösterilir
    if (dom.flashcardWrapper) dom.flashcardWrapper.style.display = 'block';
    if (dom.cardNavBar) dom.cardNavBar.style.display = 'flex';
    if (dom.actionPanel) dom.actionPanel.style.display = 'block';
    if (dom.flashcardGoalCompletedView) dom.flashcardGoalCompletedView.style.display = 'none';

    if (dom.cardBottomControls) dom.cardBottomControls.style.display = 'flex';
    if (dom.prevCardBtn) dom.prevCardBtn.disabled = (state.currentIndex <= 0);
    if (dom.nextCardBtn) dom.nextCardBtn.disabled = (state.currentIndex >= state.words.length - 1);
    if (dom.markRepeatBtn) dom.markRepeatBtn.disabled = false;

    const currentWord = state.words[state.currentIndex];
    const isLearned = currentWord.ogrenilme_durumu === 1 || Boolean(state.learnedMap[currentWord.id] && state.learnedMap[currentWord.id].learned);

    if (isLearned) {
      if (dom.cardReviewGoArenaBtn) dom.cardReviewGoArenaBtn.style.display = 'inline-flex';
      if (dom.markLearnedBtn) {
        dom.markLearnedBtn.disabled = true;
        dom.markLearnedBtn.classList.add('is-already-learned');
        if (dom.markLearnedBtnText) {
          dom.markLearnedBtnText.textContent = 'Öğrenildi';
        }
      }
      if (dom.cardStatusBadge) {
        dom.cardStatusBadge.textContent = '✓ Öğrenildi';
        dom.cardStatusBadge.className = 'card-status-badge status-learned';
      }
    } else {
      if (dom.cardReviewGoArenaBtn) dom.cardReviewGoArenaBtn.style.display = 'none';
      if (dom.markLearnedBtn) {
        dom.markLearnedBtn.disabled = false;
        dom.markLearnedBtn.classList.remove('is-already-learned');
        if (dom.markLearnedBtnText) {
          dom.markLearnedBtnText.textContent = 'Öğrendim';
        }
      }
      if (dom.cardStatusBadge) {
        dom.cardStatusBadge.textContent = 'Bekliyor';
        dom.cardStatusBadge.className = 'card-status-badge status-pending';
      }
    }

    // Dil belirtecini ayarla (İngilizce CSS text-transform'un noktalı İ yapmasını önler)
    const targetHtmlLang = currentWord.dil === 'EN-TR' ? 'en' : (currentWord.dil === 'DE-TR' ? 'de' : 'fr');
    dom.cardTargetWord.setAttribute('lang', targetHtmlLang);
    dom.cardUnitBadge.setAttribute('lang', targetHtmlLang);
    if (dom.cardPos) dom.cardPos.setAttribute('lang', targetHtmlLang);

    if (state.reverseMode) {
      // TERS MOD: Ön yüzde Türkçe Anlam, Arka yüzde Yabancı Kelime
      dom.cardUnitBadge.textContent = '🔄 TERS MOD • ANLAM';
      dom.cardTargetWord.textContent = getWordMeaning(currentWord);
      dom.cardCategoryHint.textContent = 'Türkçe';
      dom.cardPhonetic.style.display = 'none';
      if (currentWord.tur) {
        dom.cardPos.textContent = currentWord.tur.toUpperCase();
        dom.cardPos.style.display = 'inline-block';
      } else {
        dom.cardPos.style.display = 'none';
      }
      dom.enAccentGroup.style.display = 'none';
      dom.pronounceBtn.style.display = 'none';

      // Kart Arka Yüzü
      dom.cardBackWordLabel.textContent = 'Yabancı Kelime';
      dom.cardMeaningText.textContent = currentWord.kelime;
      dom.cardSentenceTranslation.textContent = getWordSentenceTranslation(currentWord);
      const exampleSentence = getWordSentence(currentWord);
      dom.cardExampleSentence.innerHTML = highlightWordInSentence(exampleSentence, currentWord.kelime);
    } else {
      // STANDART MOD: Ön yüzde Yabancı Kelime, Arka yüzde Türkçe Anlam
      const currentUnitObj = getUnitsData().find(u => u.dil === currentWord.dil && u.unite_no === currentWord.unite_no);
      let unitLabel = currentUnitObj?.baslik || (currentWord.unite_adi 
        ? `${currentWord.seviye || ''} • ${currentWord.unite_adi}` 
        : (currentWord.dil === 'EN-TR' ? `Unit ${currentWord.unite_no}` : `Ünite ${currentWord.unite_no}`));
      if (currentWord.dil === 'EN-TR') {
        unitLabel = toEnglishUpper(unitLabel);
      }
      dom.cardUnitBadge.textContent = unitLabel;
      dom.cardTargetWord.textContent = currentWord.kelime;
      dom.cardCategoryHint.textContent = LANG_META[currentWord.dil]?.name.split('→')[0].trim() || 'Kelime';

      // Fonetik (IPA) ve Sözcük Türü
      if (currentWord.telaffuz) {
        dom.cardPhonetic.textContent = currentWord.telaffuz;
        dom.cardPhonetic.style.display = 'inline-block';
      } else {
        dom.cardPhonetic.style.display = 'none';
      }

      if (currentWord.tur) {
        dom.cardPos.textContent = currentWord.dil === 'EN-TR' ? toEnglishUpper(currentWord.tur) : currentWord.tur.toUpperCase();
        dom.cardPos.style.display = 'inline-block';
      } else {
        dom.cardPos.style.display = 'none';
      }

      // Telaffuz Kontrolleri
      if (currentWord.dil === 'EN-TR') {
        dom.enAccentGroup.style.display = 'inline-flex';
        dom.pronounceBtn.style.display = 'none';
        if (state.activeEnAccent === 'UK') {
          dom.pronounceUkBtn.classList.add('active');
          dom.pronounceUsBtn.classList.remove('active');
        } else {
          dom.pronounceUsBtn.classList.add('active');
          dom.pronounceUkBtn.classList.remove('active');
        }
      } else {
        dom.enAccentGroup.style.display = 'none';
        dom.pronounceBtn.style.display = 'inline-flex';
      }

      // Kart Arka Yüzü
      dom.cardBackWordLabel.textContent = currentWord.kelime;
      dom.cardMeaningText.textContent = getWordMeaning(currentWord);
      dom.cardSentenceTranslation.textContent = getWordSentenceTranslation(currentWord);
      const exampleSentence = getWordSentence(currentWord);
      dom.cardExampleSentence.innerHTML = highlightWordInSentence(exampleSentence, currentWord.kelime);
    }

    // Durum Rozeti
    if (isLearned) {
      dom.cardStatusBadge.textContent = 'Öğrenildi ✓';
      dom.cardStatusBadge.className = 'card-status-badge status-learned';
    } else {
      dom.cardStatusBadge.textContent = 'Bekliyor';
      dom.cardStatusBadge.className = 'card-status-badge status-pending';
    }

    // Gezinme Durumu
    dom.cardIndexCounter.textContent = `${state.currentIndex + 1} / ${state.words.length}`;
    dom.prevCardBtn.disabled = state.currentIndex === 0;
    dom.nextCardBtn.disabled = state.currentIndex === state.words.length - 1;
  }

  function setFlipped(flipped) {
    if (state.isFlipped !== flipped) {
      triggerHapticFeedback('medium');
    }
    state.isFlipped = flipped;
    if (flipped) {
      dom.flashcard.classList.add('is-flipped');
      if (state.readExampleAudio && state.words && state.words[state.currentIndex]) {
        const curWord = state.words[state.currentIndex];
        const sentence = getWordSentence(curWord);
        if (sentence) {
          setTimeout(() => {
            speakWord(sentence, curWord.dil || state.activeLanguage);
          }, 320);
        }
      }
    } else {
      dom.flashcard.classList.remove('is-flipped');
    }
  }

  function toggleFlip() {
    setFlipped(!state.isFlipped);
  }

  // Örnek cümlede hedef kelimeyi regex ile güvenle vurgulama
  function highlightWordInSentence(sentence, word) {
    if (!sentence || !word) return sentence;
    const cleanWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${cleanWord})`, 'gi');
    return sentence.replace(regex, '<mark>$1</mark>');
  }

  /**
   * İngilizce metinleri kesinlikle noktalı 'İ' harfi içermeyecek şekilde
   * doğru İngilizce büyük harf (I) standartına dönüştürür.
   */
  function toEnglishUpper(str) {
    if (!str) return '';
    return String(str)
      .replace(/i/g, 'I')
      .replace(/İ/g, 'I')
      .replace(/ı/g, 'I')
      .toLocaleUpperCase('en-US');
  }

  // ==========================================
  // ÖĞRENME AKSİYONLARI (KURAL 6: LOCALSTORAGE)
  // ==========================================
  function markWordStatus(status) {
    if (state.words.length === 0) return;

    const currentWord = state.words[state.currentIndex];
    const wordId = currentWord.id;

    if (status === 1) {
      triggerHapticFeedback('success');
      // Öğrenildi olarak kaydet (Aralıklı Tekrar için zaman damgasıyla)
      state.learnedMap[wordId] = {
        learned: true,
        learnedAt: Date.now(),
        nextReviewDate: Date.now() + 3 * 24 * 60 * 60 * 1000 // Örn: 3 gün sonra
      };
      if (!state.sessionLearnedIds) state.sessionLearnedIds = new Set();
      state.sessionLearnedIds.add(wordId);
      updateDailyStudyStreak();
      const wasLearned = !!(state.learnedMap[wordId] && state.learnedMap[wordId].learned);
      if (!wasLearned) {
        addXp(10);
        showToast('Tebrikler! Kelime öğrenildi ✓ (+10 XP)');
      } else {
        showToast('Tebrikler! Kelime öğrenildi ✓');
      }
    } else {
      triggerHapticFeedback('warning');
      // Tekrar öğrenilecekler havuzuna al
      delete state.learnedMap[wordId];
      if (state.sessionLearnedIds) state.sessionLearnedIds.delete(wordId);
      showToast('Kelime tekrar havuzuna alındı');
    }

    // LocalStorage'a kaydet (Kural 6)
    localStorage.setItem('kelime_learned_map', JSON.stringify(state.learnedMap));
    if (typeof window.syncProgressToFirebase === 'function') {
      window.syncProgressToFirebase();
    }

    // Kart geçiş efekti tetikle
    triggerCardAnimation('next');

    // Listeyi yenile: Öğrenilen kelime aktif listeden derhal çıkarılır ve bir daha kullanıcının karşısına gelmez!
    refreshWordsList();

    // Günlük hedeflenen kelimelerin hepsi öğrenildi olarak tamamlandı mı?
    // Kart alanında kutlama ve yönlendirme kartı doğrudan ve kalıcı olarak görünür.
    if (status === 1 && state.activeFilter === 'pending' && state.words.length === 0) {
      showToast('🎉 Tebrikler! Günlük hedef tamamlandı');
    }

    // Kural 4: Ünitenin %75'i yeni tamamlandıysa bir sonraki ünitenin açıldığını bildir ve tamamlama istatistiğini kaydet
    if (status === 1) {
      const targetLevel = state.userLevel || getLevelForTrack(state.activeLanguage, state.userTrack);
      const curUnit = getUnitsData().find(u => u.dil === state.activeLanguage && u.unite_no === state.activeUnitNo && (!targetLevel || u.seviye === targetLevel));
      if (curUnit) {
        noteUnitStart(curUnit);
        const prog = getUnitProgress(curUnit, state.activeLanguage);
        if (prog.isPassed75 && (!state.hasToastPassed75ForUnit || !state.hasToastPassed75ForUnit[curUnit.unite_no])) {
          if (!state.hasToastPassed75ForUnit) state.hasToastPassed75ForUnit = {};
          state.hasToastPassed75ForUnit[curUnit.unite_no] = true;
          showToast('🔓 Harika! Bu ünitenin %75\'ini öğrendin ve sonraki ünite açıldı!');
        }
        if (prog.total > 0 && prog.learned >= prog.total) {
          noteUnitCompleted(curUnit);
        }
      }
    }

    if (state.autoplayAudio && !state.reverseMode && state.words.length > 0) {
      setTimeout(() => speakCurrentWord(), 280);
    }
  }

  function showDailyGoalCompleteModal() {
    if (dom.dailyGoalCompleteModal) {
      const baseGoal = (state.dailyGoal && state.dailyGoal > 0) ? state.dailyGoal : 15;
      if (dom.goalCompleteTitle) {
        dom.goalCompleteTitle.textContent = '🎯 Günlük Hedef Tamamlandı!';
      }
      if (dom.goalCompleteDesc) {
        dom.goalCompleteDesc.innerHTML = `Tebrikler! Belirlediğin <strong>${baseGoal} kelimelik</strong> öğrenme hedefini başarıyla tamamladın. Öğrendiğin bu kelimeleri kalıcı hafızana almak ve refleks haline getirmek için şimdi <strong>Kelime Arenası'nda eğlenceli etkinliklerle</strong> pratik yapma zamanı!`;
      }
      if (dom.learnMoreBtnText) {
        dom.learnMoreBtnText.textContent = '+5 Kelime Daha Öğren';
      }
      dom.dailyGoalCompleteModal.style.display = 'flex';
    }
  }

  function hideDailyGoalCompleteModal() {
    if (dom.dailyGoalCompleteModal) {
      dom.dailyGoalCompleteModal.style.display = 'none';
    }
  }

  // ==========================================
  // GEZİNME (ÖNCEKİ / SONRAKİ KART)
  // ==========================================
  function triggerCardAnimation(dir) {
    if (!dom.flashcardWrapper) return;
    dom.flashcardWrapper.classList.remove('anim-deal-next', 'anim-deal-prev');
    void dom.flashcardWrapper.offsetWidth; // DOM Reflow tetikleyici
    dom.flashcardWrapper.classList.add(dir === 'next' ? 'anim-deal-next' : 'anim-deal-prev');
    setTimeout(() => {
      if (dom.flashcardWrapper) {
        dom.flashcardWrapper.classList.remove('anim-deal-next', 'anim-deal-prev');
      }
    }, 320);
  }

  function prevCard() {
    if (state.currentIndex > 0) {
      triggerHapticFeedback('light');
      setFlipped(false);
      state.currentIndex--;
      triggerCardAnimation('prev');
      renderCard();
      if (state.autoplayAudio && !state.reverseMode) {
        setTimeout(() => speakCurrentWord(), 280);
      }
    }
  }

  function nextCard() {
    if (state.currentIndex < state.words.length - 1) {
      triggerHapticFeedback('light');
      setFlipped(false);
      state.currentIndex++;
      triggerCardAnimation('next');
      renderCard();
      if (state.autoplayAudio && !state.reverseMode) {
        setTimeout(() => speakCurrentWord(), 280);
      }
    }
  }

  // ==========================================
  // SESLENDİRME & DOĞAL SES SEÇİMİ (WEB SPEECH & NATIVE AUDIO)
  // ==========================================
  let systemVoices = [];
  let fallbackAudioPlayer = null;

  function loadSystemVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      systemVoices = window.speechSynthesis.getVoices() || [];
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    loadSystemVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      loadSystemVoices();
    };
  }

  /**
   * Hedef dile özgü yerel ana dil sesini bulur.
   * İngilizce için US (Amerikan) ve UK (İngiliz) aksan filtrelemesi uygular.
   */
  function findNativeVoice(targetLangCode, accentPreference) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

    let voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) {
      voices = systemVoices;
    } else {
      systemVoices = voices;
    }

    if (!voices || !voices.length) return null;

    const targetPrefix = targetLangCode.split('-')[0].toLowerCase(); // 'en', 'fr', 'de'

    // Yabancı dil seslerini filtrele (Türkçe sesleri ele)
    let candidates = voices.filter(v => {
      const vLang = (v.lang || '').replace('_', '-').toLowerCase();
      if (vLang.startsWith('tr')) return false;
      return vLang.startsWith(targetPrefix);
    });

    if (candidates.length === 0) {
      candidates = voices.filter(v => {
        const vLang = (v.lang || '').replace('_', '-').toLowerCase();
        return !vLang.startsWith('tr');
      });
    }

    if (candidates.length === 0) {
      return voices[0] || null;
    }

    // İngilizce için US ve UK ayrımı
    if (targetPrefix === 'en') {
      const isUk = accentPreference === 'UK';
      const exactCode = isUk ? 'en-gb' : 'en-us';
      const keywords = isUk
        ? ['great britain', 'united kingdom', 'uk', 'british', 'george', 'hazel', 'susan', 'oliver', 'stephanie']
        : ['united states', 'us', 'american', 'zira', 'david', 'mark', 'samantha'];

      // 1. Dil kodu tam eşleşen (örn: en-gb veya en-us)
      const exact = candidates.find(v => (v.lang || '').replace('_', '-').toLowerCase() === exactCode);
      if (exact) return exact;

      // 2. İsimde anahtar kelime eşleşmesi
      const byName = candidates.find(v => {
        const n = (v.name || '').toLowerCase();
        return keywords.some(k => n.includes(k));
      });
      if (byName) return byName;

      // 3. Eğer UK istenmiş ama sistemde sadece US ses varsa veya tam tersi
      const anyEn = candidates.find(v => (v.lang || '').replace('_', '-').toLowerCase().startsWith('en'));
      if (anyEn) return anyEn;
    }

    // Fransızca / Almanca veya genel eşleşme
    const highQualityVoice = candidates.find(v => {
      const name = (v.name || '').toLowerCase();
      return name.includes('natural') ||
             name.includes('google') ||
             name.includes('siri') ||
             name.includes('premium') ||
             name.includes('online');
    });

    return highQualityVoice || candidates[0];
  }

  let activeUtterance = null; // Chromium Garbage Collection (GC) önleyici

  /**
   * Kelimeyi veya cümleyi seçilen dilde veya aksanda (US / UK) Web Speech API ile net seslendirir.
   */
  function speakWord(text, dil, buttonEl = null, forcedAccent = null) {
    if (!text) return;
    let targetLangCode;
    let targetButton = buttonEl;

    if (dil === 'EN-TR') {
      const accent = forcedAccent || state.activeEnAccent || 'US';
      if (accent === 'UK') {
        targetLangCode = 'en-GB';
        if (!targetButton) targetButton = dom.pronounceUkBtn;
      } else {
        targetLangCode = 'en-US';
        if (!targetButton) targetButton = dom.pronounceUsBtn;
      }
    } else {
      const meta = LANG_META[dil];
      targetLangCode = meta ? meta.speechLang : 'en-US';
      if (!targetButton) targetButton = dom.pronounceBtn;
    }

    const setBtnPlaying = (playing) => {
      if (!targetButton) return;
      if (playing) {
        targetButton.classList.add('playing');
      } else {
        targetButton.classList.remove('playing');
      }
    };

    setBtnPlaying(true);

    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        activeUtterance = null;
        setBtnPlaying(false);
      }
    };

    // 1. Android Native TextToSpeech Köprüsü (APK içinde native ses motoru)
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try {
        const rate = (state.speechSpeed || 1.0);
        window.AndroidTTS.speak(text, targetLangCode, rate);
        const estDuration = Math.max(800, Math.min(3000, text.length * 110));
        setTimeout(finish, estDuration);
        return;
      } catch (err) {
        console.warn('AndroidTTS köprüsü çağrı hatası, Web Speech API deneniyor:', err);
      }
    }

    // 2. Tarayıcı / Web Speech API (Masaüstü ve Web Görünümü için)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        activeUtterance = utterance; // GC tarafından silinmesini önle

        const accentPref = dil === 'EN-TR' ? (forcedAccent || state.activeEnAccent) : null;
        const nativeVoice = findNativeVoice(targetLangCode, accentPref);

        if (nativeVoice) {
          utterance.voice = nativeVoice;
          utterance.lang = nativeVoice.lang || targetLangCode;
        } else {
          utterance.lang = targetLangCode;
        }

        // UK aksanı için sistemde UK sesi yoksa tonlamayı hafif yükselterek İngiliz fonetiğini hissettir
        if (dil === 'EN-TR' && accentPref === 'UK') {
          if (!nativeVoice || !(nativeVoice.lang || '').toLowerCase().includes('gb')) {
            utterance.pitch = 1.08;
            utterance.rate = (state.speechSpeed || 1.0) * 0.95;
          } else {
            utterance.pitch = 1.0;
            utterance.rate = state.speechSpeed || 1.0;
          }
        } else {
          utterance.rate = state.speechSpeed || 1.0;
          utterance.pitch = 1.0;
        }

        utterance.onend = finish;
        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis hata:', e);
          finish();
        };

        // Zaman aşımı emniyeti
        const timeoutMs = Math.max(3000, text.length * 150);
        setTimeout(() => {
          if (activeUtterance === utterance) {
            finish();
          }
        }, timeoutMs);

        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn('SpeechSynthesis hatası:', err);
        finish();
      }
    } else {
      finish();
    }
  }

  function speakCurrentWord(forcedAccent = null) {
    if (state.words.length === 0) return;
    const currentWord = state.words[state.currentIndex];
    if (!currentWord) return;

    if (currentWord.dil === 'EN-TR') {
      const accent = forcedAccent || state.activeEnAccent || 'US';
      state.activeEnAccent = accent;
      localStorage.setItem('kelime_en_accent', accent);

      if (accent === 'UK') {
        dom.pronounceUkBtn.classList.add('active');
        dom.pronounceUsBtn.classList.remove('active');
      } else {
        dom.pronounceUsBtn.classList.add('active');
        dom.pronounceUkBtn.classList.remove('active');
      }
    }

    speakWord(currentWord.kelime, currentWord.dil, null, forcedAccent);
  }

  // ==========================================
  // MODAL YÖNETİMİ
  // ==========================================
  function openLanguageModal(mandatory = false) {
    dom.langModal.classList.add('active');
    // Eğer zorunluysa dışa tıklamayla kapanmaz
    dom.langModal.dataset.mandatory = mandatory ? 'true' : 'false';
  }

  function closeLanguageModal() {
    dom.langModal.classList.remove('active');
  }

  function updateHeaderUnitDisplay() {
    if (!dom.headerUnitLabel) return;
    const targetLevel = state.userLevel || getLevelForTrack(state.activeLanguage, state.userTrack);
    const units = getUnitsData().filter(u => u.dil === state.activeLanguage && (!targetLevel || u.seviye === targetLevel));
    const unitObj = units.find(u => u.unite_no === state.activeUnitNo) || units[0];
    if (unitObj) {
      let cleanTitle = unitObj.unite_adi || unitObj.baslik || `Ünite ${unitObj.unite_no}`;
      if (cleanTitle.includes('•')) {
        cleanTitle = cleanTitle.split('•')[1].trim();
      }
      dom.headerUnitLabel.textContent = cleanTitle;
    }
  }

  function openUnitModal() {
    console.log("openUnitModal tetiklendi!");
    syncLearnedMapFromStorage();
    // Seçilen kura ve seviyeye göre üniteleri kesin filtrele (4A ve 4B tam yalıtımı)
    const targetLevel = state.userLevel || getLevelForTrack(state.activeLanguage, state.userTrack);
    const allUnits = getUnitsData().filter(u => u.dil === state.activeLanguage);
    const units = targetLevel ? allUnits.filter(u => u.seviye === targetLevel) : allUnits;

    let bookName = 'Müfredat';
    if (state.activeLanguage === 'EN-TR') {
      bookName = `Gateway to the World ${targetLevel || 'A2'}`;
    } else if (state.activeLanguage === 'DE-TR') {
      bookName = `Netzwerk neu ${targetLevel || 'A1'}`;
    } else if (state.activeLanguage === 'FR-TR') {
      bookName = `Français ${targetLevel || 'A1'}`;
    }

    if (dom.unitModalTitle) {
      dom.unitModalTitle.textContent = `📚 ${bookName} Üniteleri`;
    }
    if (dom.unitModalSubtitle) {
      dom.unitModalSubtitle.textContent = 'Çalışmak istediğiniz üniteyi seçin. Sonraki üniteyi açabilmek için mevcut ünitenin en az %75\'ini tamamlamalısınız.';
    }

    const allWords = getWordsData();
    const lockMap = getUnitLockStatusMap(state.activeLanguage, targetLevel);
    dom.unitOptionsList.innerHTML = '';

    units.forEach((u, idx) => {
      const card = document.createElement('div');
      const isEnglish = u.dil === 'EN-TR';
      const isActive = u.unite_no === state.activeUnitNo;
      const statusInfo = lockMap[u.unite_no] || { isUnlocked: idx === 0, progress: { percent: 0, isPassed75: false } };
      const isUnlocked = statusInfo.isUnlocked;

      card.className = `unit-option-card ${isActive ? 'active-unit' : ''} ${!isUnlocked ? 'unit-card-locked' : ''}`;
      if (isEnglish) card.setAttribute('lang', 'en');

      // Üniteye ait kelimeleri ve öğrenme istatistiklerini hesapla
      const unitWords = allWords.filter(w => w.dil === u.dil && (!u.seviye || w.seviye === u.seviye) && w.unite_no === u.unite_no);
      const totalTarget = unitWords.length;
      const learnedCount = unitWords.filter(w => state.learnedMap[w.id] && state.learnedMap[w.id].learned === true).length;
      const pendingCount = Math.max(0, totalTarget - learnedCount);
      const percent = totalTarget > 0 ? Math.round((learnedCount / totalTarget) * 100) : 0;
      const isCompleted = totalTarget > 0 && learnedCount === totalTarget;

      const displayNo = getDisplayUnitNumber(u, idx);
      let cleanTitle = u.baslik || `Ünite ${displayNo}`;
      if (cleanTitle.includes('•')) {
        cleanTitle = cleanTitle.split('•')[1].trim();
      }

      let statBadgeHtml = '';
      if (!isUnlocked) {
        statBadgeHtml = `<span class="unit-stat-badge locked">🔒 Kilitli (%75 Gerekli)</span>`;
      } else if (isCompleted) {
        statBadgeHtml = `<span class="unit-stat-badge completed">✓ Tamamlandı (%100)</span>`;
      } else if (percent >= 75) {
        statBadgeHtml = `<span class="unit-stat-badge completed">✓ Açıldı (%${percent})</span>`;
      } else {
        statBadgeHtml = `<span class="unit-stat-badge">${learnedCount} / ${totalTarget} (%${percent})</span>`;
      }

      card.innerHTML = `
        <div class="unit-option-header">
          <div class="unit-option-title-wrap">
            <span class="unit-num-badge">Ünite ${displayNo}</span>
            <strong class="unit-option-title" ${isEnglish ? 'lang="en"' : ''}>${cleanTitle}</strong>
            ${isActive ? '<span class="unit-active-pill">Mevcut Ünite</span>' : ''}
          </div>
          ${statBadgeHtml}
        </div>
        <div class="unit-stat-row">
          <div class="unit-stat-pills">
            <span class="unit-pill total">Toplam: ${totalTarget} Kelime</span>
            <span class="unit-pill learned">Öğrendin: ${learnedCount}</span>
            <span class="unit-pill pending">Kalan: ${pendingCount} Kelime</span>
            ${!isUnlocked ? '<span class="unit-pill locked-info">🔒 Önceki üniteden en az %75 öğrenilmelidir</span>' : ''}
          </div>
          <div class="unit-progress-bar">
            <div class="unit-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        if (!isUnlocked) {
          showToast('🔒 Bu ünite henüz kilitli! Açabilmek için önceki ünitedeki kelimelerin en az %75\'ini öğrenmelisiniz.');
          return;
        }
        state.activeUnitNo = u.unite_no;
        noteUnitStart(u);
        state.dailyGoalExtra = 0;
        state.currentIndex = 0;
        refreshWordsList();
        updateHeaderUnitDisplay();
        closeUnitModal();
        showToast(`📚 ${cleanTitle} seçildi`);
      });

      dom.unitOptionsList.appendChild(card);
    });

    dom.unitModal.classList.add('active');
  }

  function closeUnitModal() {
    dom.unitModal.classList.remove('active');
  }

  // ==========================================
  // SES EFEKTLERİ VE WEB AUDIO JENERATÖRÜ
  // ==========================================
  let soundFxEnabled = localStorage.getItem('kelime_sound_fx') !== 'false';
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSoundEffect(type) {
    if (!soundFxEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      if (type === 'xp' || type === 'win') {
        // Melodik zafer / XP arpeji (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0.01, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.35);
        });
      } else if (type === 'bonus') {
        // Saf Zihin / Süper Başarı parlak zili
        const notes = [659.25, 830.61, 987.77, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);

          gain.gain.setValueAtTime(0.01, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.09 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.45);
        });
      } else if (type === 'correct') {
        // Kısa tatlı ding sesi
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'wrong' || type === 'error') {
        // Hatalı cevap sesi (pes ve kısa uyarı)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(196, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }

      // Haptik eşleşmesi
      const hapticCategory = (state.activeMode === 'arena') ? 'game' : 'card';
      if (type === 'xp' || type === 'win' || type === 'bonus') {
        triggerHapticFeedback('success', hapticCategory);
      } else if (type === 'correct') {
        triggerHapticFeedback('light', hapticCategory);
      } else if (type === 'wrong' || type === 'error') {
        triggerHapticFeedback('warning', hapticCategory);
      }
    } catch(e) {}
  }

  // ==========================================
  // HAPTİK / TİTREŞİMLİ GERİ BİLDİRİM SİSTEMİ
  // ==========================================
  let hapticEnabled = localStorage.getItem('kelime_haptic_feedback') !== 'false';

  function triggerHapticFeedback(pattern = 'light', category = 'card') {
    if (!hapticEnabled) return;
    if (category === 'card' && state.cardHaptic === false) return;
    if (category === 'game' && state.gameHaptic === false) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (pattern === 'light') {
          navigator.vibrate(12); // Kısa & zarif dokunuş
        } else if (pattern === 'medium') {
          navigator.vibrate(25); // Kart çevirme
        } else if (pattern === 'success') {
          navigator.vibrate([15, 40, 25]); // Çift onay titreşimi
        } else if (pattern === 'warning' || pattern === 'error') {
          navigator.vibrate([30, 50, 40]); // Hata uyarısı
        } else {
          navigator.vibrate(20);
        }
      } catch (e) {
        // Haptic desteklenmeyen cihazlarda sessizce devam et
      }
    }
  }

  function setHapticFeedbackEnabled(val) {
    hapticEnabled = !!val;
    localStorage.setItem('kelime_haptic_feedback', hapticEnabled ? 'true' : 'false');
    const toggle = document.getElementById('settingHapticFeedback');
    if (toggle) toggle.checked = hapticEnabled;
    if (hapticEnabled) {
      triggerHapticFeedback('success');
    }
  }

  function setSoundFxEnabled(val) {
    soundFxEnabled = !!val;
    localStorage.setItem('kelime_sound_fx', soundFxEnabled);
    updateSoundFxUI();
  }

  function updateSoundFxUI() {
    const gameIcon = document.getElementById('gameSoundFxIcon');
    const gameToggleBtn = document.getElementById('gameSoundFxToggleBtn');
    const settingSwitch = document.getElementById('settingSoundFx');
    if (gameIcon) gameIcon.textContent = soundFxEnabled ? '🔊' : '🔇';
    if (gameToggleBtn) {
      gameToggleBtn.title = soundFxEnabled ? 'Oyun Ses Efektlerini Kapat' : 'Oyun Ses Efektlerini Aç';
      gameToggleBtn.style.opacity = soundFxEnabled ? '1' : '0.55';
    }
    if (settingSwitch) settingSwitch.checked = soundFxEnabled;
  }

  // ==========================================
  // DİNAMİK KONFETİ & PARILTI EFEKTİ
  // ==========================================
  function triggerConfettiFx() {
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#eab308'];
    const count = 35;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.style.position = 'fixed';
      piece.style.top = '10%';
      piece.style.left = `${Math.random() * 80 + 10}%`;
      piece.style.width = `${Math.random() * 8 + 6}px`;
      piece.style.height = `${Math.random() * 8 + 6}px`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
      piece.style.zIndex = '100001';
      piece.style.pointerEvents = 'none';
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      piece.style.transition = 'all 1.2s cubic-bezier(0.25, 1, 0.5, 1)';
      document.body.appendChild(piece);

      const destX = (Math.random() - 0.5) * 220;
      const destY = Math.random() * 260 + 60;
      requestAnimationFrame(() => {
        piece.style.transform = `translate(${destX}px, ${destY}px) rotate(${Math.random() * 720}deg) scale(0)`;
        piece.style.opacity = '0';
      });

      setTimeout(() => {
        if (piece.parentNode) piece.parentNode.removeChild(piece);
      }, 1250);
    }
  }

  // ==========================================
  // BÜYÜK KUTLAMA BANNERI & BİLDİRİM (TOAST)
  // ==========================================
  let celebrationTimer = null;
  function showCelebrationBanner(title, subtitle, xpText, icon = '🎉') {
    const banner = document.getElementById('celebrationBanner');
    const iconEl = document.getElementById('celebrationIcon');
    const titleEl = document.getElementById('celebrationTitle');
    const subEl = document.getElementById('celebrationSubtitle');
    const xpPill = document.getElementById('celebrationXpPill');

    if (banner && titleEl && subEl && xpPill) {
      banner.classList.remove('is-wrong');
      if (iconEl) iconEl.textContent = icon;
      titleEl.textContent = title;
      if (subtitle) {
        subEl.textContent = subtitle;
        subEl.style.display = 'block';
      } else {
        subEl.textContent = '';
        subEl.style.display = 'none';
      }
      xpPill.textContent = xpText;
      banner.classList.add('show');

      playSoundEffect('win');
      triggerConfettiFx();

      clearTimeout(celebrationTimer);
      celebrationTimer = setTimeout(() => {
        banner.classList.remove('show');
      }, 2600);
    } else {
      showToast(`${title} • ${subtitle}`, 'correct');
    }
  }

  function showEncouragementBanner(title, subtitle, tagText = 'Tekrar dene... 1 XP gitti', icon = '💪') {
    const banner = document.getElementById('celebrationBanner');
    const iconEl = document.getElementById('celebrationIcon');
    const titleEl = document.getElementById('celebrationTitle');
    const subEl = document.getElementById('celebrationSubtitle');
    const xpPill = document.getElementById('celebrationXpPill');

    if (banner && titleEl && subEl && xpPill) {
      banner.classList.add('is-wrong');
      if (iconEl) iconEl.textContent = icon;
      titleEl.textContent = title;
      if (subtitle) {
        subEl.textContent = subtitle;
        subEl.style.display = 'block';
      } else {
        subEl.textContent = '';
        subEl.style.display = 'none';
      }
      xpPill.textContent = tagText;
      banner.classList.add('show');

      playSoundEffect('wrong');

      clearTimeout(celebrationTimer);
      celebrationTimer = setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => banner.classList.remove('is-wrong'), 300);
      }, 2600);
    } else {
      showToast(`${title} • ${subtitle}`, 'wrong');
    }
  }

  let toastTimer = null;
  function showToast(msg, type = '') {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.className = 'toast';
    if (type === 'correct') {
      dom.toast.classList.add('toast-correct');
    } else if (type === 'wrong') {
      dom.toast.classList.add('toast-wrong');
    }
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('show');
    }, 2200);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  }

  // ==========================================
  // OYUNLAŞTIRMA & ARENA ORTAK FONKSİYONLARI
  // ==========================================
  function getTodayDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function checkDailyStreakHealth() {
    const today = getTodayDateKey();
    const lastDate = state.lastStudyDate || localStorage.getItem('lexiq_last_study_date') || '';
    if (!lastDate) {
      if (!state.dayStreak) state.dayStreak = 1;
      evaluateStreakPledge();
      return;
    }

    try {
      const lastD = new Date(lastDate + 'T00:00:00');
      const todayD = new Date(today + 'T00:00:00');
      const diffDays = Math.round((todayD.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        state.dayStreak = 0;
        localStorage.setItem('lexiq_day_streak', '0');
      }
    } catch (e) {}

    evaluateStreakPledge();
  }

  // ==========================================
  // DUOLINGO BENZERİ GÜNLÜK SERİ SÖZÜ (STREAK PLEDGE) SİSTEMİ
  // ==========================================
  function getPledgeDayDateKey(startDateStr, dayOffset) {
    const d = new Date(startDateStr + 'T00:00:00');
    d.setDate(d.getDate() + dayOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function startStreakPledge(targetDays) {
    targetDays = parseInt(targetDays, 10);
    if (![3, 5, 7].includes(targetDays)) targetDays = 5;
    const today = getTodayDateKey();
    const lastDate = state.lastStudyDate || localStorage.getItem('lexiq_last_study_date') || '';
    const initialHistory = {};
    if (lastDate === today) {
      initialHistory[today] = true;
    }

    state.streakPledge = {
      active: true,
      targetDays: targetDays,
      startDate: today,
      history: initialHistory,
      completed: false,
      success: null,
      rewardClaimed: false
    };

    localStorage.setItem('lexiq_streak_pledge', JSON.stringify(state.streakPledge));
    updateStreakPledgeSettingsUI();
    showToast(`🔥 ${targetDays} Günlük Seri Sözün Başladı! Her gün çalışarak serini koru.`, 'correct');
    playSoundEffect('celebration');
    openStreakPledgeModal();
  }

  function evaluateStreakPledge() {
    if (!state.streakPledge || !state.streakPledge.active) return;
    const pledge = state.streakPledge;
    const today = getTodayDateKey();
    if (!pledge.history) pledge.history = {};

    const lastDate = state.lastStudyDate || localStorage.getItem('lexiq_last_study_date') || '';
    if (lastDate === today) {
      pledge.history[today] = true;
    }

    // Gece 12'den 12'ye 24 saat üzerinden gün sonu hesabı
    const lastPledgeDate = getPledgeDayDateKey(pledge.startDate, pledge.targetDays - 1);
    if (today > lastPledgeDate) {
      // Tüm taahhüt süresi doldu
      let allPassed = true;
      for (let i = 0; i < pledge.targetDays; i++) {
        const dKey = getPledgeDayDateKey(pledge.startDate, i);
        if (pledge.history[dKey] !== true) {
          allPassed = false;
        }
      }
      pledge.active = false;
      pledge.completed = true;
      pledge.success = allPassed;

      if (allPassed && !pledge.rewardClaimed) {
        pledge.rewardClaimed = true;
        const rewardXp = pledge.targetDays * 20;
        addXp(rewardXp);
        showToast(`🏆 Tebrikler! ${pledge.targetDays} Günlük Seri Sözünü Eksiksiz Tamamladın! (+${rewardXp} XP)`, 'correct');
        playSoundEffect('celebration');
      }
    }

    localStorage.setItem('lexiq_streak_pledge', JSON.stringify(pledge));
    updateStreakPledgeSettingsUI();
  }

  function renderStreakPledgeDays(containerEl, isCompact = false) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    if (!state.streakPledge) return;

    const pledge = state.streakPledge;
    const targetDays = pledge.targetDays || 5;
    const today = getTodayDateKey();
    const history = pledge.history || {};

    for (let i = 0; i < targetDays; i++) {
      const dayDate = getPledgeDayDateKey(pledge.startDate, i);
      const dayNo = i + 1;
      let status = 'future'; // 'completed' | 'missed' | 'current' | 'future'
      let icon = '🔒';
      let tagText = 'Bekliyor';

      if (dayDate < today) {
        if (history[dayDate] === true) {
          status = 'completed';
          icon = '✓';
          tagText = 'Tamam';
        } else {
          status = 'missed';
          icon = '✕';
          tagText = 'Kaçtı';
        }
      } else if (dayDate === today) {
        if (history[dayDate] === true) {
          status = 'completed';
          icon = '✓';
          tagText = 'Tamam';
        } else {
          status = 'current';
          icon = '🔥';
          tagText = 'Bugün';
        }
      } else {
        status = 'future';
        icon = '🔒';
        tagText = 'Bekliyor';
      }

      const badge = document.createElement('div');
      badge.className = `streak-day-badge sdb-${status}`;
      if (isCompact) {
        badge.style.padding = '6px 4px';
        badge.style.minWidth = '42px';
      }

      badge.innerHTML = `
        <span class="sdb-day-label">${dayNo}. Gün</span>
        <div class="sdb-icon-circle">${icon}</div>
        <span class="sdb-status-tag">${tagText}</span>
      `;
      containerEl.appendChild(badge);
    }
  }

  function openStreakPledgeModal() {
    evaluateStreakPledge();
    const modalEl = document.getElementById('streakPledgeModal');
    if (!modalEl) return;

    if (!state.streakPledge) {
      openSettingsModal('reminder');
      showToast('🔥 Önce bir Seri Çalışma Sözü başlatmalısın.');
      return;
    }

    const pledge = state.streakPledge;
    const today = getTodayDateKey();
    const titleEl = document.getElementById('streakModalTitle');
    const subtitleEl = document.getElementById('streakModalSubtitle');
    const daysTrackEl = document.getElementById('streakModalDaysTrack');
    const statusIconEl = document.getElementById('streakModalStatusIcon');
    const statusTextEl = document.getElementById('streakModalStatusText');

    if (titleEl) {
      titleEl.textContent = `🔥 ${pledge.targetDays} Günlük Seri Sözün`;
    }

    let currentDayIndex = 1;
    for (let i = 0; i < pledge.targetDays; i++) {
      if (getPledgeDayDateKey(pledge.startDate, i) === today) {
        currentDayIndex = i + 1;
        break;
      }
    }

    const todayDone = (pledge.history && pledge.history[today] === true);

    if (subtitleEl) {
      if (!pledge.active && pledge.completed) {
        subtitleEl.textContent = pledge.success 
          ? '🎉 Tüm seriyi başarıyla tamamladın! Tebrikler!' 
          : '⚠️ Bu seri süresi doldu. Yeni bir seri sözü başlatabilirsin!';
      } else {
        subtitleEl.textContent = `Bugün serinin ${currentDayIndex}. günündesin! Her gün çalışarak serini koru.`;
      }
    }

    if (daysTrackEl) {
      renderStreakPledgeDays(daysTrackEl, false);
    }

    if (statusIconEl && statusTextEl) {
      if (todayDone) {
        statusIconEl.textContent = '🎉';
        statusTextEl.innerHTML = `<strong>Harikasın!</strong> Bugünkü çalışma hedefini tamamladın. Serin güvende ve yeşil yandı! 🔥`;
      } else {
        statusIconEl.textContent = '⚡';
        statusTextEl.innerHTML = `<strong>Hedef Bekliyor:</strong> Serini korumak için bugün kartlarda çalış veya arenada bir oyuna katıl!`;
      }
    }

    modalEl.style.display = 'flex';
  }

  function closeStreakPledgeModal() {
    const modalEl = document.getElementById('streakPledgeModal');
    if (modalEl) modalEl.style.display = 'none';
  }

  function updateStreakPledgeSettingsUI() {
    const activeBox = document.getElementById('settingStreakPledgeActiveBox');
    const selectBox = document.getElementById('settingStreakPledgeSelectBox');
    const statusTitle = document.getElementById('settingStreakPledgeStatusTitle');
    const daysTrack = document.getElementById('settingStreakPledgeDaysTrack');

    if (!activeBox || !selectBox) return;

    if (state.streakPledge && state.streakPledge.active) {
      activeBox.style.display = 'block';
      selectBox.style.display = 'none';

      if (statusTitle) {
        statusTitle.textContent = `🎯 ${state.streakPledge.targetDays} Günlük Seri Sözü Devam Ediyor`;
      }
      if (daysTrack) {
        renderStreakPledgeDays(daysTrack, true);
      }
    } else {
      activeBox.style.display = 'none';
      selectBox.style.display = 'block';
    }
  }

  function checkDailyStreakFirstLaunch() {
    const todayKey = getTodayDateKey();
    const lastModalDate = localStorage.getItem('lexiq_last_streak_modal_date');

    if (lastModalDate !== todayKey) {
      localStorage.setItem('lexiq_last_streak_modal_date', todayKey);
      if (state.streakPledge && state.streakPledge.active) {
        setTimeout(() => {
          openStreakPledgeModal();
        }, 1200);
      }
    }
  }

  function updateDailyStudyStreak() {
    const today = getTodayDateKey();
    if (state.streakPledge && state.streakPledge.active) {
      if (!state.streakPledge.history) state.streakPledge.history = {};
      state.streakPledge.history[today] = true;
      localStorage.setItem('lexiq_streak_pledge', JSON.stringify(state.streakPledge));
      updateStreakPledgeSettingsUI();
    }
    const lastDate = state.lastStudyDate || localStorage.getItem('lexiq_last_study_date') || '';

    if (!lastDate) {
      state.dayStreak = 1;
      state.maxDayStreak = Math.max(state.maxDayStreak || 1, 1);
      state.lastStudyDate = today;
      localStorage.setItem('lexiq_day_streak', String(state.dayStreak));
      localStorage.setItem('lexiq_max_day_streak', String(state.maxDayStreak));
      localStorage.setItem('lexiq_last_study_date', today);
      checkBadgeUnlocks();
      if (dom.homeStatStreak) dom.homeStatStreak.textContent = `🔥 ${state.dayStreak} Gün Seri`;
      if (typeof window.syncProgressToFirebase === 'function') window.syncProgressToFirebase();
      return;
    }

    if (lastDate === today) {
      return;
    }

    try {
      const lastD = new Date(lastDate + 'T00:00:00');
      const todayD = new Date(today + 'T00:00:00');
      const diffDays = Math.round((todayD.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        state.dayStreak = (state.dayStreak || 0) + 1;
        if (state.dayStreak > (state.maxDayStreak || 0)) {
          state.maxDayStreak = state.dayStreak;
        }
        showToast(`🔥 Tebrikler! Günlük çalışma serin ${state.dayStreak} güne çıktı!`, 'correct');
      } else if (diffDays > 1) {
        state.dayStreak = 1;
        showToast('🔥 Yeni günlük çalışma serisi başladı! (1. Gün)', 'correct');
      }
    } catch (e) {
      state.dayStreak = 1;
    }

    state.lastStudyDate = today;
    localStorage.setItem('lexiq_day_streak', String(state.dayStreak));
    localStorage.setItem('lexiq_max_day_streak', String(state.maxDayStreak));
    localStorage.setItem('lexiq_last_study_date', today);
    checkBadgeUnlocks();
    if (dom.homeStatStreak) dom.homeStatStreak.textContent = `🔥 ${state.dayStreak} Gün Seri`;
    updateUserProfileUI();
    if (typeof window.syncProgressToFirebase === 'function') window.syncProgressToFirebase();
  }

  function getTodayLearnedWordsList() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.getTime();

    const targetLevel = state.userLevel || getLevelForTrack(state.activeLanguage, state.userTrack);
    const allWords = getWordsData().filter(w => w.dil === state.activeLanguage && (!targetLevel || w.seviye === targetLevel));

    return allWords.filter(w => {
      const rec = state.learnedMap[w.id];
      if (!rec || !rec.learned) return false;
      if (state.sessionLearnedIds && state.sessionLearnedIds.has(w.id)) return true;
      if (!rec.learnedAt) return false;
      return (rec.learnedAt >= startTimestamp) || (Date.now() - rec.learnedAt < 24 * 60 * 60 * 1000);
    });
  }

  function getTodayPracticedWordIds() {
    const key = `lexiq_arena_practiced_${getTodayDateKey()}`;
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(Array.isArray(data) ? data : []);
    } catch (e) {
      return new Set();
    }
  }

  function getTodaySolvedCorrectWordIds() {
    const key = `lexiq_arena_solved_correct_${getTodayDateKey()}`;
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(Array.isArray(data) ? data : []);
    } catch (e) {
      return new Set();
    }
  }

  function markWordPracticedInGame(wordId) {
    if (!wordId) return;
    const key = `lexiq_arena_practiced_${getTodayDateKey()}`;
    const set = getTodayPracticedWordIds();
    set.add(wordId);
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch (e) {}
  }

  function onWordSolvedCorrectlyInGame(wordId) {
    if (!wordId) return;
    markWordPracticedInGame(wordId);
    updateDailyStudyStreak();

    const key = `lexiq_arena_solved_correct_${getTodayDateKey()}`;
    const set = getTodaySolvedCorrectWordIds();
    set.add(wordId);
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch (e) {}

    checkDailyPracticeMilestones();
  }

  function showDailyPracticeMilestoneModal(type, currentCount, targetCount) {
    if (!dom.dailyPracticeCompletedModal) return;

    const iconEl = document.getElementById('dailyPracticeModalIcon');
    const titleEl = document.getElementById('dailyPracticeModalTitle');
    const msgEl = document.getElementById('dailyPracticeModalMessage');
    const continueBtn = document.getElementById('dailyPracticedContinueAllBtn');
    const goLearnBtn = document.getElementById('dailyPracticedGoLearnBtn');

    if (type === 'half') {
      if (iconEl) iconEl.textContent = '⚡';
      if (titleEl) {
        titleEl.textContent = 'Harika İlerleme! (%50 Pekiştirildi)';
        titleEl.style.color = '#38bdf8';
      }
      if (msgEl) {
        msgEl.innerHTML = `Bugün öğrendiğin <strong>${targetCount}</strong> kelimenin <strong>${currentCount}</strong> tanesini oyunlarda başarıyla doğru yanıtladın! 🎯<br><br>Kalan <strong>${targetCount - currentCount}</strong> kelimeyi de pekiştirmek için oynamaya devam etmek ister misin?`;
      }
      if (continueBtn) {
        continueBtn.innerHTML = '🎮 Oyuna Devam Et';
        continueBtn.dataset.milestoneType = 'half';
      }
      if (goLearnBtn) {
        goLearnBtn.innerHTML = '📚 Yeni Kelimeler Öğren (Kartlara Git)';
      }
    } else {
      // type === 'full'
      if (iconEl) iconEl.textContent = '🏆';
      if (titleEl) {
        titleEl.textContent = 'Tebrikler! Günlük Pekiştirme Tamamlandı! 🎉';
        titleEl.style.color = '#fbbf24';
      }
      if (msgEl) {
        msgEl.innerHTML = `Bugün öğrendiğin <strong>${targetCount}</strong> kelimenin <strong>HEPSİNİ</strong> oyunlarda doğru yaparak başarıyla pekiştirdin! 🌟<br><br>Sürekli aynı kelimeleri oynamak yerine ilerlemen için şimdi ne yapmak istersin?`;
      }
      if (continueBtn) {
        continueBtn.innerHTML = '🚀 Tüm Öğrenilen Kelimelerle Oyna';
        continueBtn.dataset.milestoneType = 'full';
      }
      if (goLearnBtn) {
        goLearnBtn.innerHTML = '📚 Yeni Kelimeler Öğren (Kartlara Git)';
      }
    }

    playSoundEffect('correct');
    dom.dailyPracticeCompletedModal.style.display = 'flex';
  }

  function checkDailyPracticeMilestones() {
    const todayLearned = getTodayLearnedWordsList();
    if (!todayLearned || todayLearned.length < 3) return;

    const solvedSet = getTodaySolvedCorrectWordIds();
    const todaySolvedCount = todayLearned.filter(w => solvedSet.has(w.id)).length;
    const targetCount = todayLearned.length;

    const halfTarget = Math.ceil(targetCount / 2);
    const dateKey = getTodayDateKey();
    const halfKey = `lexiq_arena_half_shown_${dateKey}`;
    const fullKey = `lexiq_arena_full_shown_${dateKey}`;

    // %100 Kilometre Taşı (Öğrenilen tüm kelimeler doğru yapıldı)
    if (todaySolvedCount >= targetCount && localStorage.getItem(fullKey) !== 'true') {
      localStorage.setItem(fullKey, 'true');
      setTimeout(() => {
        showDailyPracticeMilestoneModal('full', todaySolvedCount, targetCount);
      }, 700);
      return;
    }

    // %50 Kilometre Taşı (Yarısı doğru yapıldı)
    if (todaySolvedCount >= halfTarget && todaySolvedCount < targetCount && localStorage.getItem(halfKey) !== 'true') {
      localStorage.setItem(halfKey, 'true');
      setTimeout(() => {
        showDailyPracticeMilestoneModal('half', todaySolvedCount, targetCount);
      }, 700);
      return;
    }
  }

  function getLearnedWordsPool() {
    const targetLevel = state.userLevel || getLevelForTrack(state.activeLanguage, state.userTrack);
    const allWords = getWordsData().filter(w => w.dil === state.activeLanguage && (!targetLevel || w.seviye === targetLevel));
    const allLearned = allWords.filter(w => state.learnedMap[w.id] && state.learnedMap[w.id].learned === true);

    if (state.arenaUseAllLearnedWordsPool || allLearned.length <= 3) {
      return allLearned;
    }

    const todayLearned = getTodayLearnedWordsList();
    if (todayLearned.length >= 3) {
      const practicedSet = getTodayPracticedWordIds();
      const unpracticedToday = todayLearned.filter(w => !practicedSet.has(w.id));

      if (unpracticedToday.length >= 3) {
        // Bugün öğrenilip henüz oyunda karşısına çıkmamış kelimeleri önceliklendir
        const rest = allLearned.filter(w => !unpracticedToday.some(u => u.id === w.id));
        return [...unpracticedToday, ...rest];
      }
    }

    return allLearned;
  }

  function updateArenaBadgeDot() {
    const pool = getLearnedWordsPool();
    const hasEnough = pool.length >= 3;
    if (dom.arenaAvailableDot) {
      dom.arenaAvailableDot.style.display = hasEnough ? 'inline-block' : 'none';
    }
    if (dom.navArenaDot) {
      dom.navArenaDot.style.display = hasEnough ? 'block' : 'none';
    }
  }

  function updateHomeScreenUI() {
    if (!dom.homeView) return;

    const targetLevel = state.userLevel || getLevelForTrack(state.activeLanguage, state.userTrack);
    const units = getUnitsData().filter(u => u.dil === state.activeLanguage && (!targetLevel || u.seviye === targetLevel));
    const currentUnit = units.find(u => u.unite_no === state.activeUnitNo) || units[0] || { unite_no: 1, baslik: 'Ünite 1' };
    if (currentUnit && state.activeUnitNo !== currentUnit.unite_no) {
      state.activeUnitNo = currentUnit.unite_no;
    }
    const allWords = getWordsData().filter(w => w.dil === state.activeLanguage && (!targetLevel || w.seviye === targetLevel));
    const unitWords = allWords.filter(w => w.unite_no === currentUnit.unite_no && (!targetLevel || w.seviye === targetLevel));

    // Aktif dil ve müfredat bilgisi
    const langMeta = LANG_META[state.activeLanguage] || { name: 'İngilizce', flag: '🇬🇧' };
    const unitTitle = currentUnit.baslik || (currentUnit.unite_adi ? `${currentUnit.seviye || ''} • ${currentUnit.unite_adi}` : `Ünite ${currentUnit.unite_no}`);

    if (dom.homeUnitBadge) {
      const levelText = currentUnit.seviye || state.userLevel || 'A2';
      dom.homeUnitBadge.innerHTML = `<span class="hub-lang-row">${langMeta.flag} ${langMeta.name}</span><span class="hub-level-tag">${levelText}</span>`;
    }
    if (dom.homeHeroTitle) {
      dom.homeHeroTitle.textContent = unitTitle;
    }
    if (dom.homeHeroDesc) {
      let desc = currentUnit.aciklama || 'Kelimeleri kartlarla keşfet ve kalıcı hafızana aktar.';
      if (desc.endsWith('kelimeleri')) {
        desc = desc.replace(/kelimeleri$/, 'kelimelerini öğren');
      }
      dom.homeHeroDesc.textContent = desc;
    }
    if (dom.homeUnitCount) {
      dom.homeUnitCount.textContent = `${unitWords.length} Kelime`;
    }
    if (dom.focusUnitTitle) {
      dom.focusUnitTitle.textContent = `${unitTitle} • Kartlar`;
    }

    // Günlük İlerleme & Hedef Hesabı
    const baseGoal = state.dailyGoal || 15;
    const isFullUnitMode = baseGoal >= 999;
    const effectiveGoal = isFullUnitMode ? unitWords.length : (baseGoal + (state.dailyGoalExtra || 0));

    // Bugün öğrenilen kelimelerin hesabı (tarih filtresi veya oturum)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.getTime();

    let todayLearnedCount = 0;
    unitWords.forEach(w => {
      const rec = state.learnedMap[w.id];
      if (rec && rec.learned) {
        if (!rec.learnedAt || (state.sessionLearnedIds && state.sessionLearnedIds.has(w.id)) || (rec.learnedAt >= startTimestamp) || (Date.now() - rec.learnedAt < 24 * 60 * 60 * 1000)) {
          todayLearnedCount++;
        }
      }
    });

    const targetCount = isFullUnitMode ? unitWords.length : Math.min(effectiveGoal, unitWords.length);
    const learnedCount = Math.min(todayLearnedCount, targetCount);
    const remainingCount = Math.max(0, targetCount - learnedCount);
    const percent = targetCount > 0 ? Math.min(100, Math.round((learnedCount / targetCount) * 100)) : 0;

    // Günlük Öğrenilen Kelime Bilgileri
    if (dom.homeTodayLearnedText) {
      dom.homeTodayLearnedText.textContent = learnedCount;
    }
    if (dom.homeDailyTargetText) {
      dom.homeDailyTargetText.textContent = `/ ${targetCount}`;
    }
    if (dom.dailyGoalSubtext) {
      dom.dailyGoalSubtext.textContent = isFullUnitMode ? 'Hedef: Tüm Ünite' : `Günlük Hedef: ${targetCount} Kelime`;
    }
    if (dom.homeRemainingText) {
      dom.homeRemainingText.textContent = remainingCount === 0 ? '✨ Hedef Tamamlandı!' : `⏳ ${remainingCount} Kalan`;
    }

    if (dom.homeProgressPercent) {
      dom.homeProgressPercent.textContent = `%${percent}`;
    }
    if (dom.homeProgressFill) {
      dom.homeProgressFill.style.width = `${percent}%`;
    }

    if (dom.homeStartBtnText) {
      if (percent >= 100 && targetCount > 0) {
        dom.homeStartBtnText.textContent = 'Hedef Tamamlandı • Kartları İncele';
      } else {
        dom.homeStartBtnText.textContent = 'Kelime Öğren';
      }
    }

    // Seri Bilgisi (Günlük Çalışma Serisi)
    if (dom.homeStatStreak) {
      const dStreak = (typeof state.dayStreak === 'number' && state.dayStreak > 0) ? state.dayStreak : 1;
      dom.homeStatStreak.textContent = `🔥 ${dStreak} Gün Seri`;
    }

    // Toplam Öğrenilen Kelime Bilgisi
    const totalLearnedAll = Object.values(state.learnedMap).filter(item => item && item.learned).length;
    if (dom.homeStatLearned) {
      dom.homeStatLearned.textContent = totalLearnedAll;
    }
    if (dom.homeArenaSubtext) {
      dom.homeArenaSubtext.textContent = totalLearnedAll > 0 
        ? `Öğrendiğin ${totalLearnedAll} kelimeyle meydan oku ve yarış!` 
        : 'Öğrendiğin kelimelerle meydan oku ve yarış!';
    }

    // Arena Oyunları Kilit Durumları
    const pool = getLearnedWordsPool();
    const poolCount = pool.length;

    function updateGameBadge(badgeEl, minWords) {
      if (!badgeEl) return;
      if (poolCount >= minWords) {
        badgeEl.textContent = 'Açık ✓';
        badgeEl.className = 'home-game-status-badge status-unlocked';
      } else {
        badgeEl.textContent = `🔒 En az ${minWords} kelime`;
        badgeEl.className = 'home-game-status-badge status-locked';
      }
    }

    updateGameBadge(dom.homeMatchStatusBadge, 8);
    updateGameBadge(dom.homeQuizStatusBadge, 6);
    updateGameBadge(dom.homeClozeStatusBadge, 4);
    updateGameBadge(dom.homeTetrisStatusBadge, 3);
  }

  function updateFloatingNavItems() {
    const currentMode = state.activeMode;
    if (dom.floatMenuHome) {
      dom.floatMenuHome.style.display = (currentMode === 'home') ? 'none' : 'flex';
    }
    if (dom.floatMenuCards) {
      dom.floatMenuCards.style.display = (currentMode === 'flashcards') ? 'none' : 'flex';
    }
    if (dom.floatMenuArena) {
      dom.floatMenuArena.style.display = (currentMode === 'arena') ? 'none' : 'flex';
    }
  }

  function toggleFloatingNavMenu() {
    if (!dom.floatingNavMenu) return;
    const isVisible = dom.floatingNavMenu.style.display !== 'none';
    if (isVisible) {
      closeFloatingNavMenu();
    } else {
      openFloatingNavMenu();
    }
  }

  function openFloatingNavMenu() {
    updateFloatingNavItems();
    if (dom.floatingNavMenu) dom.floatingNavMenu.style.display = 'flex';
    if (dom.drawerBackdrop) dom.drawerBackdrop.style.display = 'block';
    if (dom.floatingToggleBtn) dom.floatingToggleBtn.classList.add('open');
  }

  function closeFloatingNavMenu() {
    if (dom.floatingNavMenu) dom.floatingNavMenu.style.display = 'none';
    if (dom.drawerBackdrop) dom.drawerBackdrop.style.display = 'none';
    if (dom.floatingToggleBtn) dom.floatingToggleBtn.classList.remove('open');
  }

  function switchAppMode(mode) {
    state.activeMode = mode;

    // Alt navigasyon ve yüzen menü aktif durumunu güncelle
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === mode);
    });

    document.querySelectorAll('.floating-menu-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === mode);
    });

    closeFloatingNavMenu();
    updateFloatingNavItems();
    const appHeader = document.querySelector('.app-header');
    if (appHeader) appHeader.style.display = 'flex';

    if (mode === 'home') {
      if (dom.tabFlashcards) dom.tabFlashcards.classList.remove('active');
      if (dom.tabArena) dom.tabArena.classList.remove('active');
      if (dom.homeView) dom.homeView.style.display = 'flex';
      if (dom.flashcardsView) dom.flashcardsView.style.display = 'none';
      if (dom.arenaView) dom.arenaView.style.display = 'none';
      if (dom.floatingNavDock) dom.floatingNavDock.style.display = 'none';
      stopAllGames();
      state.activeGame = null;
      updateHomeScreenUI();
    } else if (mode === 'flashcards') {
      if (dom.tabFlashcards) dom.tabFlashcards.classList.add('active');
      if (dom.tabArena) dom.tabArena.classList.remove('active');
      if (dom.homeView) dom.homeView.style.display = 'none';
      if (dom.flashcardsView) dom.flashcardsView.style.display = 'flex';
      if (dom.arenaView) dom.arenaView.style.display = 'none';
      if (dom.floatingNavDock) dom.floatingNavDock.style.display = 'flex';
      stopAllGames();
      state.activeGame = null;
      refreshWordsList();
    } else if (mode === 'arena') {
      if (dom.tabArena) dom.tabArena.classList.add('active');
      if (dom.tabFlashcards) dom.tabFlashcards.classList.remove('active');
      if (dom.homeView) dom.homeView.style.display = 'none';
      if (dom.flashcardsView) dom.flashcardsView.style.display = 'none';
      if (dom.arenaView) dom.arenaView.style.display = 'flex';
      if (dom.floatingNavDock) dom.floatingNavDock.style.display = 'flex';
      state.activeGame = null;
      updateArenaHeaderAndStats();
      checkArenaEligibility();
    }
  }

  const GAME_CONFIG = {
    match: {
      name: 'Kart Eşleştirme',
      icon: '🃏',
      minWords: 8,
      tag: 'Eşleştirme',
      desc: 'Yabancı kelimeler ile Türkçe karşılıklarını eşleştirerek hafızanı sına.',
      reward: '+10 XP / Çift',
      steps: [
        'Ekranda 4 yabancı kelime ve 4 Türkçe anlam kartı yer alır.',
        'Bir karta ve ardından onun doğru eşi olan diğer karta tıkla.',
        'Tüm kartları en az hamleyle eşleştirerek turu tamamla!'
      ]
    },
    quiz: {
      name: '4 Şıklı Test',
      icon: '🎯',
      minWords: 6,
      tag: 'Hızlı Test',
      desc: 'Hedef yabancı kelimenin 4 şık arasındaki doğru Türkçe anlamını hızla bul.',
      reward: '+10 XP',
      steps: [
        'Üstte hedef yabancı kelime gösterilir ve otomatik seslendirilir.',
        'Aşağıdaki 4 seçenek arasından doğru Türkçe anlamı seç.',
        'Zorlanırsan 50:50 jokeriyle iki yanlış şıkkı eleyebilirsin!'
      ]
    },
    cloze: {
      name: 'Boşluk Doldurma',
      icon: '⚡',
      minWords: 5,
      tag: 'Cümle İçi',
      desc: 'Cümledeki boşluğa gelecek en uygun kelimeyi seçenekler arasından tamamla.',
      reward: '+10 XP',
      steps: [
        'Örnek cümle ve Türkçe çevirisi ekrana gelir. Hedef kelime boş bırakılmıştır.',
        'Cümlenin bağlamına en uygun olan kelime seçeneğine tıkla.',
        'Cevap verdikten sonra doğru kelime cümlenin içine yerleşir ve incelemen için ekranda kalır.'
      ]
    },
    truefalse: {
      name: 'Doğru mu Yanlış mı?',
      icon: '⚡',
      minWords: 4,
      tag: 'Refleks',
      desc: 'Ekranda beliren kelime ve anlam çiftinin doğruluğuna hızlıca karar ver.',
      reward: '+10 XP',
      steps: [
        'Kelime ve karşısında bir anlam görüntülenir.',
        'Eşleşme doğruysa yeşil DOĞRU butonuna, yanlışsa kırmızı YANLIŞ butonuna bas.',
        'Geri sayım sayacı bitmeden yanıt vermeye çalış!'
      ]
    },
    listen: {
      name: 'Dinle ve Yaz',
      icon: '🎧',
      minWords: 4,
      tag: 'İşitsel',
      desc: 'Dinlediğin kelimenin telaffuzunu çözümle ve harfleri doğru sırayla diz.',
      reward: '+15 XP',
      steps: [
        'Hoparlör simgesine basarak kelimenin telaffuzunu dikkatle dinle.',
        'Alttaki harf bankasından harflere tıklayarak kelimeyi eksiksiz oluştur.',
        'Zorlanırsan ipucu butonuna basarak bir sonraki doğru harfi alabilirsin.'
      ]
    },
    scramble: {
      name: 'Cümle Kurma',
      icon: '📝',
      minWords: 4,
      tag: 'Sözdizimi',
      desc: 'Karışık verilen kelimeleri doğru gramer sırasına dizerek anlamlı cümle kur.',
      reward: '+20 XP',
      steps: [
        'Üstte cümlenin Türkçe çevirisi rehber olarak sunulur.',
        'Alttaki kelime bloklarına sırasıyla tıklayarak cümleyi oluştur.',
        'Doğru cümleyi kurduğunda sesli telaffuz dinlenir ve incelenebilir.'
      ]
    },
    tetris: {
      name: 'Harf Tetrisi',
      icon: '🕹️',
      minWords: 3,
      tag: 'Arcade',
      desc: 'Yukarıdan düşen harfler arasından hedef kelimeye ait olanları yakala.',
      reward: '+15 XP',
      steps: [
        'Hedef kelimenin Türkçe anlamı ve harf yuvaları ekranda görünür.',
        'Yukarıdan aşağıya süzülen harf blokları arasından sadece kelimene ait olanlara dokun.',
        'Gereksiz harflere tıklama! Yanlış harfler süreni azaltır.'
      ]
    },
    anagram: {
      name: 'Harf Karıştırma',
      icon: '🧩',
      minWords: 3,
      tag: 'Bulmaca',
      desc: 'Dağınık verilen harfleri Türkçe ipucuna göre doğru sırada birleştir.',
      reward: '+10 XP',
      steps: [
        'Türkçe anlamı verilen kelimenin harfleri karışık olarak sunulur.',
        'Harflere tıklayarak boş yuvalara doğru sırada yerleştir.',
        'Hatalı koyduğun harfin üzerine tıklayarak geri alabilirsin.'
      ]
    }
  };

  const GAME_NAMES = {
    match: '🃏 Kart Eşleştirme',
    truefalse: '⚡ Doğru mu Yanlış mı?',
    tetris: '🕹️ Harf Tetrisi',
    anagram: '🧩 Harf Karıştırma',
    listen: '🎧 Dinle ve Yaz',
    quiz: '🎯 4 Şıklı Test',
    scramble: '📝 Cümle Kurma',
    cloze: '⚡ Boşluk Doldurma'
  };

  let howToPlayCurrentGame = null;

  function showGameHowToPlay(gameKey, isManualOpen = false) {
    const cfg = GAME_CONFIG[gameKey];
    if (!cfg) return;

    howToPlayCurrentGame = gameKey;

    if (dom.howToPlayIcon) dom.howToPlayIcon.textContent = cfg.icon;
    if (dom.howToPlayTitle) dom.howToPlayTitle.textContent = cfg.name;
    if (dom.howToPlayTag) dom.howToPlayTag.textContent = cfg.tag;

    if (dom.howToPlayContent) {
      let html = `<p class="how-to-desc">${cfg.desc}</p>`;
      html += `<div class="how-to-steps">`;
      cfg.steps.forEach((step, idx) => {
        html += `
          <div class="how-to-step">
            <span class="step-num">${idx + 1}</span>
            <div class="step-text">${step}</div>
          </div>
        `;
      });
      html += `</div>`;
      html += `<div class="how-to-reward">🏆 Ödül: <strong>${cfg.reward}</strong></div>`;
      dom.howToPlayContent.innerHTML = html;
    }

    if (dom.howToPlayBtnText) {
      dom.howToPlayBtnText.textContent = isManualOpen ? 'Oyuna Dön' : 'Anladım, Başla!';
    }

    if (dom.howToPlayDontShowCheck) {
      dom.howToPlayDontShowCheck.checked = false;
    }

    if (dom.arenaActiveGameArea) {
      dom.arenaActiveGameArea.style.display = 'flex';
    }
    if (dom.gameHowToPlayOverlay) {
      dom.gameHowToPlayOverlay.style.display = 'flex';
    }
  }

  function hideGameHowToPlay() {
    if (dom.howToPlayDontShowCheck && dom.howToPlayDontShowCheck.checked && howToPlayCurrentGame) {
      localStorage.setItem('kelime_skip_rules_' + howToPlayCurrentGame, 'true');
    }
    if (dom.gameHowToPlayOverlay) {
      dom.gameHowToPlayOverlay.style.display = 'none';
    }
    if (howToPlayCurrentGame && state.activeGame !== howToPlayCurrentGame) {
      startGameRound(howToPlayCurrentGame);
    }
  }

  function updateGamesHubLocks() {
    const pool = getLearnedWordsPool();
    const count = pool.length;

    if (dom.arenaPoolCountText) {
      dom.arenaPoolCountText.textContent = count;
    }

    Object.keys(GAME_CONFIG).forEach(gameKey => {
      const cfg = GAME_CONFIG[gameKey];
      const isUnlocked = count >= cfg.minWords;
      const card = document.querySelector(`.game-hub-card[data-game="${gameKey}"]`);
      const reqBadge = document.getElementById(`reqBadge_${gameKey}`);
      const playBtn = document.getElementById(`playBtn_${gameKey}`);

      if (card) {
        if (isUnlocked) {
          card.classList.remove('locked');
        } else {
          card.classList.add('locked');
        }
      }

      if (reqBadge) {
        if (isUnlocked) {
          reqBadge.className = 'game-req-badge unlocked';
          reqBadge.textContent = `Açık ✓ (${cfg.minWords}+)`;
        } else {
          reqBadge.className = 'game-req-badge locked';
          reqBadge.textContent = `🔒 En az ${cfg.minWords} kelime`;
        }
      }

      if (playBtn) {
        if (isUnlocked) {
          playBtn.className = 'game-hub-play-btn';
          playBtn.textContent = 'Oyna ▶';
        } else {
          playBtn.className = 'game-hub-play-btn locked';
          playBtn.textContent = `🔒 ${cfg.minWords - count} kaldı`;
        }
      }
    });
  }

  function openFullscreenIfSupported() {
    try {
      const el = document.documentElement;
      const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (rfs && !document.fullscreenElement && !document.webkitFullscreenElement) {
        const p = rfs.call(el);
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {}
  }

  function exitFullscreenIfSupported() {
    try {
      const efs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if (efs && (document.fullscreenElement || document.webkitFullscreenElement)) {
        const p = efs.call(document);
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {}
  }

  let scrambleNextTimeout = null;

  function stopAllGames() {
    stopTetrisGame();
    stopTrueFalseGame();
    if (scrambleNextTimeout) {
      clearTimeout(scrambleNextTimeout);
      scrambleNextTimeout = null;
    }
    exitFullscreenIfSupported();
  }

  function checkArenaEligibility() {
    const pool = getLearnedWordsPool();
    const count = pool.length;
    dom.arenaReadyCount.textContent = count;
    dom.arenaReadyFill.style.width = Math.min(100, Math.round((count / 3) * 100)) + '%';
    updateArenaBadgeDot();

    if (count < 3) {
      if (dom.arenaHeroBanner) dom.arenaHeroBanner.style.display = 'block';
      dom.arenaEmptyState.style.display = 'flex';
      if (dom.arenaGamesMenu) dom.arenaGamesMenu.style.display = 'none';
      if (dom.arenaActiveGameArea) dom.arenaActiveGameArea.style.display = 'none';
      document.body.classList.remove('arena-game-active');
      if (dom.floatingNavDock && state.activeMode === 'arena') {
        dom.floatingNavDock.style.display = 'flex';
      }
      stopAllGames();
    } else {
      if (dom.arenaHeroBanner) dom.arenaHeroBanner.style.display = 'block';
      dom.arenaEmptyState.style.display = 'none';
      showGamesMenu();
    }
  }

  function showGamesMenu() {
    stopAllGames();
    state.activeGame = null;
    howToPlayCurrentGame = null;
    if (dom.gameHowToPlayOverlay) dom.gameHowToPlayOverlay.style.display = 'none';
    exitFullscreenIfSupported();
    if (dom.arenaActiveGameArea) dom.arenaActiveGameArea.style.display = 'none';
    if (dom.arenaHeroBanner) dom.arenaHeroBanner.style.display = 'block';
    if (dom.arenaGamesMenu) dom.arenaGamesMenu.style.display = 'block';
    document.body.classList.remove('arena-game-active');
    const appHeader = document.querySelector('.app-header');
    if (appHeader) appHeader.style.display = 'flex';
    if (dom.floatingNavDock && (state.activeMode === 'arena' || state.activeMode === 'flashcards')) {
      dom.floatingNavDock.style.display = 'flex';
    }
    updateArenaHeaderAndStats();
    updateGamesHubLocks();
  }

  function launchGame(gameName) {
    const cfg = GAME_CONFIG[gameName];
    if (!cfg) return;

    const pool = getLearnedWordsPool();
    if (pool.length < cfg.minWords) {
      const remaining = cfg.minWords - pool.length;
      showToast(`🔒 ${cfg.name} için en az ${cfg.minWords} kelime öğrenmelisin. (${remaining} kelime daha gerekiyor)`);
      return;
    }

    startGameRound(gameName);
  }

  function startGameRound(gameName) {
    stopAllGames();
    state.activeGame = gameName;
    openFullscreenIfSupported();

    // Oyun ekranında alttaki drawer menüyü ve ana ekranın üst menüsünü (tema, xp, ayarlar vb.) tamamen gizle
    closeFloatingNavMenu();
    document.body.classList.add('arena-game-active');
    if (dom.floatingNavDock) dom.floatingNavDock.style.display = 'none';
    const appHeader = document.querySelector('.app-header');
    if (appHeader) appHeader.style.display = 'none';

    if (dom.arenaHeroBanner) dom.arenaHeroBanner.style.display = 'none';
    if (dom.arenaGamesMenu) dom.arenaGamesMenu.style.display = 'none';
    if (dom.arenaActiveGameArea) dom.arenaActiveGameArea.style.display = 'flex';
    if (dom.activeGameNameBadge) {
      const cfg = GAME_CONFIG[gameName];
      dom.activeGameNameBadge.textContent = cfg ? `${cfg.icon} ${cfg.name}` : (GAME_NAMES[gameName] || 'Arena');
    }
    updateLiveXpDisplays(false);

    // Tüm oyun alanlarını önce gizle
    if (dom.gameMatchView) dom.gameMatchView.style.display = 'none';
    if (dom.gameTrueFalseView) dom.gameTrueFalseView.style.display = 'none';
    if (dom.gameTetrisView) dom.gameTetrisView.style.display = 'none';
    if (dom.gameAnagramView) dom.gameAnagramView.style.display = 'none';
    if (dom.gameListenView) dom.gameListenView.style.display = 'none';
    if (dom.gameQuizView) dom.gameQuizView.style.display = 'none';
    if (dom.gameScrambleView) dom.gameScrambleView.style.display = 'none';
    if (dom.gameClozeView) dom.gameClozeView.style.display = 'none';

    // Seçilen oyunu başlat
    if (gameName === 'match') {
      if (dom.gameMatchView) dom.gameMatchView.style.display = 'flex';
      startMatchRound();
    } else if (gameName === 'truefalse') {
      if (dom.gameTrueFalseView) dom.gameTrueFalseView.style.display = 'flex';
      startTrueFalseRound();
    } else if (gameName === 'tetris') {
      if (dom.gameTetrisView) dom.gameTetrisView.style.display = 'flex';
      startTetrisRound();
    } else if (gameName === 'anagram') {
      if (dom.gameAnagramView) dom.gameAnagramView.style.display = 'flex';
      startAnagramRound();
    } else if (gameName === 'listen') {
      if (dom.gameListenView) dom.gameListenView.style.display = 'flex';
      startListenRound();
    } else if (gameName === 'quiz') {
      if (dom.gameQuizView) dom.gameQuizView.style.display = 'flex';
      startQuizRound();
    } else if (gameName === 'scramble') {
      if (dom.gameScrambleView) dom.gameScrambleView.style.display = 'flex';
      startScrambleRound();
    } else if (gameName === 'cloze') {
      if (dom.gameClozeView) dom.gameClozeView.style.display = 'flex';
      startClozeRound();
    }
  }

  function getMultiplier() {
    if (state.streak >= 10) return 2.5;
    if (state.streak >= 5) return 2.0;
    if (state.streak >= 3) return 1.5;
    return 1.0;
  }

  function updateArenaHeaderAndStats() {
    const mult = getMultiplier();
    dom.headerXpText.textContent = state.xp;
    dom.arenaXpText.textContent = state.xp;
    dom.arenaStreakText.textContent = state.streak;
    dom.arenaMultiplierText.textContent = 'x' + mult.toFixed(1);
    updateLiveXpDisplays(false);
    updateGamesHubLocks();
  }

  function addXp(basePoints) {
    const mult = getMultiplier();
    const earned = Math.round(basePoints * mult);
    state.xp += earned;
    state.streak++;
    if (state.streak > state.maxStreak) {
      state.maxStreak = state.streak;
      localStorage.setItem('kelime_max_streak', state.maxStreak);
    }
    state.arenaWordsSolved++;
    localStorage.setItem('kelime_xp', state.xp);
    localStorage.setItem('kelime_arena_solved', state.arenaWordsSolved);

    updateArenaHeaderAndStats();
    checkBadgeUnlocks();
    if (typeof window.syncProgressToFirebase === 'function') {
      window.syncProgressToFirebase();
    }
    return earned;
  }

  function resetStreak() {
    state.streak = 0;
    updateArenaHeaderAndStats();
  }

  function checkBadgeUnlocks() {
    for (const badge of BADGES_CONFIG) {
      if (!state.unlockedBadges.includes(badge.id) && badge.check(state)) {
        state.unlockedBadges.push(badge.id);
        localStorage.setItem('kelime_unlocked_badges', JSON.stringify(state.unlockedBadges));
        if (typeof window.syncProgressToFirebase === 'function') {
          window.syncProgressToFirebase();
        }
        showBadgeCelebration(badge);
        break;
      }
    }
  }

  function showBadgeCelebration(badge) {
    dom.celebrationBadgeIcon.textContent = badge.icon;
    dom.celebrationBadgeTitle.textContent = badge.name;
    dom.celebrationBadgeDesc.textContent = badge.desc;
    dom.badgeCelebrationModal.classList.add('active');
  }

  function closeBadgeCelebration() {
    dom.badgeCelebrationModal.classList.remove('active');
  }

  let activeBadgeCategory = 'all';

  function getBadgeProgress(badge, s) {
    let current = 0;
    let target = 1;
    let unit = '';

    if (badge.category === 'xp') {
      current = s.xp || 0;
      const match = badge.desc.match(/([0-9.]+)\s*XP/);
      if (match) target = parseInt(match[1].replace(/\./g, ''), 10);
      unit = 'XP';
    } else if (badge.category === 'vocab') {
      current = getLearnedCount(s);
      const match = badge.desc.match(/([0-9.]+)\s*kelime/);
      if (match) target = parseInt(match[1].replace(/\./g, ''), 10);
      unit = 'kelime';
    } else if (badge.category === 'game') {
      const gMatch = badge.id.match(/^game_([a-z]+)_master/);
      const gKey = gMatch ? gMatch[1] : null;
      current = (s.gameStats && gKey && s.gameStats[gKey]) ? s.gameStats[gKey] : 0;
      const match = badge.desc.match(/([0-9]+)\s*(?:kez|Şıklı)/);
      if (match) target = parseInt(match[1], 10);
      unit = 'tur';
    } else if (badge.category === 'streak') {
      if (badge.id === 'pure_mind') {
        current = s.cleanWins || 0;
        target = 10;
        unit = 'zafer';
      } else if (badge.id === 'vocab_monster') {
        current = s.arenaWordsSolved || 0;
        target = 20;
        unit = 'kelime';
      } else if (badge.id === 'arena_gladiator') {
        current = s.arenaWordsSolved || 0;
        target = 100;
        unit = 'kelime';
      } else if (badge.id.startsWith('daily_streak_')) {
        current = Math.max(s.dayStreak || 0, s.maxDayStreak || 0);
        const match = badge.desc.match(/([0-9]+)\s*gün/i);
        if (match) target = parseInt(match[1], 10);
        unit = 'gün';
      } else {
        current = Math.max(s.streak || 0, s.maxStreak || 0);
        const match = badge.desc.match(/([0-9]+)\s*doğru/);
        if (match) target = parseInt(match[1], 10);
        unit = 'seri';
      }
    } else if (badge.category === 'lang') {
      if (badge.id === 'lang_polyglot') {
        const cEn = Math.min(30, getLearnedCountFor(s, 'EN-TR'));
        const cDe = Math.min(30, getLearnedCountFor(s, 'DE-TR'));
        const cFr = Math.min(30, getLearnedCountFor(s, 'FR-TR'));
        const langsMet = (cEn >= 30 ? 1 : 0) + (cDe >= 30 ? 1 : 0) + (cFr >= 30 ? 1 : 0);
        current = langsMet;
        target = 2;
        unit = 'dil';
      } else {
        // Dinamik kur eşleme: badge_en_a2_acemi, badge_de_b1_kalfa vb.
        const parts = badge.id.split('_');
        if (parts.length >= 4) {
          const langCode = parts[1] === 'en' ? 'EN-TR' : (parts[1] === 'de' ? 'DE-TR' : 'FR-TR');
          const levelCode = parts[2] === 'b1p' ? 'B1+' : parts[2].toUpperCase();
          current = getLearnedCountFor(s, langCode, levelCode);
          const match = badge.desc.match(/([0-9.]+)\s*kelime/);
          if (match) target = parseInt(match[1].replace(/\./g, ''), 10);
          unit = 'kelime';
        } else {
          current = 0;
          target = 100;
          unit = 'kelime';
        }
      }
    }

    const pct = Math.min(100, Math.round((current / (target || 1)) * 100));
    return { current, target, unit, pct };
  }

  function renderBadgesView(selectedCategory = 'all') {
    if (!dom.badgesGrid) return;
    dom.badgesGrid.innerHTML = '';

    const categories = [
      { id: 'xp', title: '🎖️ XP Seviye Ligleri' },
      { id: 'vocab', title: '📚 Kelime Dağarcığı Rozetleri' },
      { id: 'game', title: '🎮 Arena Oyun Uzmanlığı Rozetleri' },
      { id: 'streak', title: '🔥 Seri & Odaklanma Rozetleri' },
      { id: 'lang', title: '🌐 Dil & Müfredat Rozetleri' }
    ];

    const visibleBadges = getVisibleBadgesConfigForUser(state.activeLanguage);

    const activeCategories = selectedCategory === 'all' 
      ? categories 
      : categories.filter(c => c.id === selectedCategory);

    activeCategories.forEach(cat => {
      const catBadges = visibleBadges.filter(b => b.category === cat.id);
      if (!catBadges.length) return;

      const titleEl = document.createElement('div');
      titleEl.className = 'badge-category-title';
      titleEl.textContent = cat.title;
      dom.badgesGrid.appendChild(titleEl);

      catBadges.forEach(badge => {
        const isUnlocked = state.unlockedBadges.includes(badge.id);
        const prog = getBadgeProgress(badge, state);
        const card = document.createElement('div');
        card.className = `badge-card-item badge-${badge.type} ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
          <div class="badge-card-icon-wrapper">
            <span class="badge-card-icon">${badge.icon}</span>
          </div>
          <div class="badge-card-info">
            <div class="badge-card-header">
              <span class="badge-card-name" title="${badge.name}">${badge.name}</span>
              <span class="badge-status-pill ${isUnlocked ? 'unlocked' : 'locked'}">
                ${isUnlocked ? '✓ Açıldı' : '🔒 Kilitli'}
              </span>
            </div>
            <div class="badge-card-desc">${badge.desc}</div>
            <div class="badge-progress-box">
              <div class="badge-progress-header">
                <span>${isUnlocked ? 'Tamamlandı' : 'İlerleme'}</span>
                <span>${isUnlocked ? '100%' : `${Math.min(prog.current, prog.target)} / ${prog.target} ${prog.unit}`}</span>
              </div>
              <div class="badge-progress-bar">
                <div class="badge-progress-fill" style="width: ${isUnlocked ? 100 : prog.pct}%"></div>
              </div>
            </div>
          </div>
        `;
        dom.badgesGrid.appendChild(card);
      });
    });
  }

  function openBadgesModal() {
    if (!dom.badgesModal) return;
    const visibleBadges = getVisibleBadgesConfigForUser(state.activeLanguage);
    const visibleUnlockedCount = visibleBadges.filter(b => state.unlockedBadges.includes(b.id)).length;

    if (dom.modalTotalXpText) dom.modalTotalXpText.textContent = `${(state.xp || 0).toLocaleString('tr-TR')} XP`;
    if (dom.modalBadgesCountText) {
      dom.modalBadgesCountText.textContent = `${visibleUnlockedCount} / ${visibleBadges.length}`;
    }

    const badgeTabAll = document.getElementById('badgeTabAll');
    if (badgeTabAll) badgeTabAll.textContent = `Tümü (${visibleBadges.length})`;

    renderBadgesView(activeBadgeCategory);

    // Kategori Sekmeleri Event Listener
    if (dom.badgesCategoryTabs) {
      const tabBtns = dom.badgesCategoryTabs.querySelectorAll('.badge-tab-btn');
      tabBtns.forEach(btn => {
        btn.onclick = () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeBadgeCategory = btn.dataset.category || 'all';
          renderBadgesView(activeBadgeCategory);
        };
      });
    }

    // Guide toggle listener
    const guideToggleBtn = document.getElementById('guideToggleBtn');
    const guideBody = document.getElementById('guideContentBody');
    const guideArrow = document.getElementById('guideToggleArrow');
    if (guideToggleBtn && guideBody) {
      guideToggleBtn.onclick = () => {
        const isHidden = guideBody.style.display === 'none';
        guideBody.style.display = isHidden ? 'block' : 'none';
        if (guideArrow) guideArrow.textContent = isHidden ? '▼' : '▶';
      };
    }

    dom.badgesModal.classList.add('active');
  }

  function closeBadgesModal() {
    dom.badgesModal.classList.remove('active');
  }

  // ==========================================
  // OYUN 1: HARF KARIŞTIRMA (ANAGRAM RUSH)
  // ==========================================
  let anagramState = {
    targetWord: null,
    solutionLetters: [],
    bankItems: [],
    userSlots: []
  };

  function startAnagramRound() {
    state.roundUsedHint = false;
    const pool = getLearnedWordsPool();
    if (pool.length < 3) return;

    let candidate = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && state.currentAnagramWord && candidate.id === state.currentAnagramWord.id) {
      candidate = pool.find(w => w.id !== state.currentAnagramWord.id) || candidate;
    }
    state.currentAnagramWord = candidate;
    anagramState.targetWord = candidate;
    markWordPracticedInGame(candidate.id);

    const cleanForAnagram = candidate.kelime.replace(/\(.*?\)/g, '').trim();
    const rawWord = cleanForAnagram.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜàâäéèêëîïôöùûüÿçÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇ]/g, '');
    const letters = rawWord.split('').map(c => candidate.dil === 'EN-TR' ? toEnglishUpper(c) : c.toUpperCase());

    anagramState.targetWord = candidate;
    anagramState.solutionLetters = [...letters];
    anagramState.userSlots = new Array(letters.length).fill(null);

    // Harfleri karıştır
    const shuffled = letters.map((char, idx) => ({ id: idx, letter: char, used: false }))
                            .sort(() => Math.random() - 0.5);
    if (shuffled.map(s => s.letter).join('') === letters.join('') && letters.length > 2) {
      shuffled.reverse();
    }
    anagramState.bankItems = shuffled;

    dom.anagramMeaningText.textContent = getWordMeaning(candidate);
    const wordType = candidate.kelime_turu ? candidate.kelime_turu.toLowerCase() : '';
    dom.anagramHintText.textContent = `${letters.length} harf ${wordType ? '• ' + wordType : ''}`;

    renderAnagramUI();
  }

  function renderAnagramUI() {
    // Yuvaları oluştur
    dom.anagramSlots.innerHTML = '';
    anagramState.userSlots.forEach((slot, idx) => {
      const div = document.createElement('div');
      div.className = `letter-slot ${slot ? 'filled' : ''}`;
      div.textContent = slot ? slot.letter : '';
      div.addEventListener('click', () => handleAnagramSlotClick(idx));
      dom.anagramSlots.appendChild(div);
    });

    // Harf bankasını oluştur
    dom.anagramBank.innerHTML = '';
    anagramState.bankItems.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `letter-tile ${item.used ? 'used' : ''}`;
      btn.textContent = item.letter;
      btn.disabled = item.used;
      btn.addEventListener('click', () => handleAnagramTileClick(item.id));
      dom.anagramBank.appendChild(btn);
    });
  }

  function handleAnagramTileClick(tileId) {
    const item = anagramState.bankItems.find(i => i.id === tileId);
    if (!item || item.used) return;

    const emptyIdx = anagramState.userSlots.indexOf(null);
    if (emptyIdx === -1) return;

    item.used = true;
    anagramState.userSlots[emptyIdx] = item;
    renderAnagramUI();

    if (!anagramState.userSlots.includes(null)) {
      checkAnagramAnswer();
    }
  }

  function handleAnagramSlotClick(slotIdx) {
    const slot = anagramState.userSlots[slotIdx];
    if (!slot) return;

    slot.used = false;
    anagramState.userSlots[slotIdx] = null;

    // Kalanları sola yasla
    const remaining = anagramState.userSlots.filter(s => s !== null);
    anagramState.userSlots = new Array(anagramState.solutionLetters.length).fill(null);
    remaining.forEach((r, i) => anagramState.userSlots[i] = r);

    renderAnagramUI();
  }

  function anagramBackspace() {
    for (let i = anagramState.userSlots.length - 1; i >= 0; i--) {
      if (anagramState.userSlots[i] !== null) {
        handleAnagramSlotClick(i);
        break;
      }
    }
  }

  function anagramReset() {
    anagramState.bankItems.forEach(i => i.used = false);
    anagramState.userSlots.fill(null);
    renderAnagramUI();
  }

  function checkAnagramAnswer() {
    const userWord = anagramState.userSlots.map(s => s.letter).join('');
    const target = anagramState.solutionLetters.join('');
    const slots = dom.anagramSlots.querySelectorAll('.letter-slot');

    if (userWord === target) {
      slots.forEach(s => s.classList.add('correct'));
      speakWord(anagramState.targetWord.kelime, anagramState.targetWord.dil, dom.anagramAudioBtn);
      const earned = recordGameWin('anagram', 10);
      onWordSolvedCorrectlyInGame(anagramState.targetWord.id);

      setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'anagram') {
          startAnagramRound();
        }
      }, 2400);
    } else {
      slots.forEach(s => s.classList.add('shake'));
      resetStreak();
      deductWrongAnswerPenalty(1);
      const encMsg = getRandomEncouragementMessage();
      const wordHint = (anagramState.targetWord.kelime || '').replace(/\(.*?\)/g, '').trim();
      showEncouragementBanner(encMsg, `Hedef: "${wordHint}"`, 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());

      setTimeout(() => {
        slots.forEach(s => s.classList.remove('shake'));
        anagramReset();
      }, 600);
    }
  }

  function giveAnagramHint() {
    useHintWithPenalty(5);
    const nextEmptyIdx = anagramState.userSlots.indexOf(null);
    if (nextEmptyIdx === -1) return;
    const neededChar = anagramState.solutionLetters[nextEmptyIdx];
    const bankItem = anagramState.bankItems.find(i => !i.used && i.letter === neededChar);
    if (!bankItem) return;
    bankItem.used = true;
    anagramState.userSlots[nextEmptyIdx] = bankItem;
    renderAnagramUI();
    showToast(`💡 İpucu: '${neededChar}' harfi yerleştirildi!`);
    if (!anagramState.userSlots.includes(null)) {
      checkAnagramAnswer();
    }
  }

  // ==========================================
  // OYUN 2: HARF TETRİSİ (WORD DROP / ARCADE TETRIS)
  // ==========================================
  let tetrisState = {
    targetWord: null,
    targetLetters: [],
    filledSlots: [],
    timeLeft: 30,
    timerInterval: null,
    spawnInterval: null,
    active: false,
    isFullscreen: false,
    lastLane: -1,
    fallingBlocks: []
  };

  function setTetrisFullscreen(enable) {
    tetrisState.isFullscreen = !!enable;
    if (dom.gameTetrisView) {
      dom.gameTetrisView.classList.toggle('tetris-fullscreen', tetrisState.isFullscreen);
    }
    if (dom.tetrisFsIconExpand && dom.tetrisFsIconCompress) {
      dom.tetrisFsIconExpand.style.display = tetrisState.isFullscreen ? 'none' : 'block';
      dom.tetrisFsIconCompress.style.display = tetrisState.isFullscreen ? 'block' : 'none';
    }
    if (dom.tetrisExitBtn) {
      dom.tetrisExitBtn.style.display = tetrisState.isFullscreen ? 'inline-flex' : 'none';
    }
  }

  function stopTetrisGame() {
    tetrisState.active = false;
    if (tetrisState.timerInterval) {
      clearInterval(tetrisState.timerInterval);
      tetrisState.timerInterval = null;
    }
    if (tetrisState.spawnInterval) {
      clearInterval(tetrisState.spawnInterval);
      tetrisState.spawnInterval = null;
    }
    tetrisState.fallingBlocks.forEach(b => {
      if (b && b.parentNode) b.remove();
    });
    tetrisState.fallingBlocks = [];
    if (dom.tetrisStage) {
      const existing = dom.tetrisStage.querySelectorAll('.falling-letter-block');
      existing.forEach(el => el.remove());
    }
  }

  function startTetrisRound() {
    state.roundUsedHint = false;
    stopTetrisGame();
    const pool = getLearnedWordsPool();
    if (pool.length < 3) return;

    // Tek kelimelik ve harf uzunluğu en az 3 olan kelimeleri öncelikle seç
    const singleWords = pool.filter(w => !w.kelime.includes(' ') && w.kelime.length >= 3);
    const candidates = singleWords.length > 0 ? singleWords : pool;

    let candidate = candidates[Math.floor(Math.random() * candidates.length)];
    if (candidates.length > 1 && tetrisState.targetWord && candidate.id === tetrisState.targetWord.id) {
      candidate = candidates.find(w => w.id !== tetrisState.targetWord.id) || candidate;
    }
    tetrisState.targetWord = candidate;
    markWordPracticedInGame(candidate.id);

    // Unicode harf desteği (Fransızca, Almanca, Türkçe vs. tam korumalı)
    const rawWord = candidate.kelime.replace(/[^\p{L}]/gu, '');
    const letters = rawWord.split('').map(c => candidate.dil === 'EN-TR' ? toEnglishUpper(c) : c.toUpperCase());

    tetrisState.targetLetters = letters;
    tetrisState.filledSlots = new Array(letters.length).fill(false);
    
    // Süre kelime uzunluğuna göre verilir: 15 sn + harf başına 3 sn; 10 harften fazlaysa ek 10 sn
    const letterCount = letters.length;
    let roundDuration = 15 + letterCount * 3;
    if (letterCount > 10) {
      roundDuration += 10;
    }
    tetrisState.timeLeft = roundDuration;
    tetrisState.active = true;

    dom.tetrisMeaningText.textContent = getWordMeaning(candidate);
    if (dom.tetrisHintText) {
      const wordType = candidate.kelime_turu ? candidate.kelime_turu.toLowerCase() : (candidate.tur ? candidate.tur.toLowerCase() : '');
      dom.tetrisHintText.textContent = `${letters.length} harf ${wordType ? '• ' + wordType : ''} • Doğru harfleri yakala!`;
    }
    dom.tetrisTimer.textContent = tetrisState.timeLeft;
    if (dom.tetrisHintBtn) dom.tetrisHintBtn.disabled = false;

    renderTetrisSlots();

    // Geri sayım sayacı
    tetrisState.timerInterval = setInterval(() => {
      if (!tetrisState.active) return;
      tetrisState.timeLeft--;
      dom.tetrisTimer.textContent = tetrisState.timeLeft;

      if (tetrisState.timeLeft <= 0) {
        stopTetrisGame();
        resetStreak();
        deductWrongAnswerPenalty(1);
        const encMsg = getRandomEncouragementMessage();
        showEncouragementBanner(encMsg, `Süre doldu! Kelime: "${tetrisState.targetWord.kelime}"`, 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());
        setTimeout(() => {
          if (state.activeMode === 'arena' && state.activeGame === 'tetris') {
            startTetrisRound();
          }
        }, 1600);
      }
    }, 1000);

    // İlk harfi hemen düşür, ardından 1.6 saniyede bir sakin ritimle yeni harf üret
    spawnTetrisBlock();
    tetrisState.spawnInterval = setInterval(() => {
      if (tetrisState.active) spawnTetrisBlock();
    }, 1600);
  }

  function renderTetrisSlots() {
    dom.tetrisSlots.innerHTML = '';
    tetrisState.targetLetters.forEach((letter, idx) => {
      const isFilled = tetrisState.filledSlots[idx];
      const slot = document.createElement('div');
      slot.className = `tetris-mini-slot ${isFilled ? 'hit' : ''}`;
      if (isFilled) {
        slot.textContent = letter;
      } else {
        // Hedef harfi soluk hayalet harf olarak göster
        slot.innerHTML = `<span class="slot-ghost">${letter}</span>`;
      }
      dom.tetrisSlots.appendChild(slot);
    });
  }

  function spawnTetrisBlock() {
    if (!tetrisState.active || !dom.tetrisStage) return;

    // Halen doldurulması gereken harfleri tespit et
    const neededLetters = [];
    tetrisState.targetLetters.forEach((letter, idx) => {
      if (!tetrisState.filledSlots[idx]) {
        neededLetters.push(letter);
      }
    });

    if (neededLetters.length === 0) return;

    // %70 ihtimalle kelimede eksik olan harflerden biri, %30 çeldirici harf
    let chosenLetter;
    if (Math.random() < 0.70) {
      chosenLetter = neededLetters[Math.floor(Math.random() * neededLetters.length)];
    } else {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      chosenLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    const block = document.createElement('div');
    block.className = 'falling-letter-block';
    block.textContent = chosenLetter;

    // Şerit (lane) hesaplaması: Harflerin asla üst üste düşmemesini sağlar
    const stageWidth = (dom.tetrisStage && dom.tetrisStage.clientWidth > 0) ? dom.tetrisStage.clientWidth : 320;
    const numLanes = Math.max(3, Math.min(5, Math.floor(stageWidth / 56)));
    let lane = Math.floor(Math.random() * numLanes);
    if (lane === tetrisState.lastLane && numLanes > 1) {
      lane = (lane + 1 + Math.floor(Math.random() * (numLanes - 1))) % numLanes;
    }
    tetrisState.lastLane = lane;
    const laneWidth = stageWidth / numLanes;
    const leftPos = Math.round(lane * laneWidth + (laneWidth - 44) / 2);
    block.style.left = `${Math.max(6, Math.min(stageWidth - 50, leftPos))}px`;

    dom.tetrisStage.appendChild(block);
    tetrisState.fallingBlocks.push(block);

    // Dokunmatik / Tıklama işleyicisi (Pointer Events ile gecikmesiz tepki)
    function onBlockHit(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!tetrisState.active) return;

      // Aynı bloğa tekrar basılmasını önle
      block.style.pointerEvents = 'none';

      // Eksik olan ilk eşleşen yuvayı bul
      const matchIdx = tetrisState.targetLetters.findIndex((letter, idx) => {
        return letter === chosenLetter && !tetrisState.filledSlots[idx];
      });

      if (matchIdx !== -1) {
        // DOĞRU HARF YAKALANDI
        tetrisState.filledSlots[matchIdx] = true;
        block.classList.add('popped');
        setTimeout(() => { if (block.parentNode) block.remove(); }, 200);

        renderTetrisSlots();

        // Tüm harfler doldu mu kontrol et
        const allDone = tetrisState.filledSlots.every(f => f === true);
        if (allDone) {
          stopTetrisGame();
          speakWord(tetrisState.targetWord.kelime, tetrisState.targetWord.dil);
          const earned = recordGameWin('tetris', 20);
          onWordSolvedCorrectlyInGame(tetrisState.targetWord.id);
          setTimeout(() => {
            if (state.activeMode === 'arena' && state.activeGame === 'tetris') {
              startTetrisRound();
            }
          }, 1200);
        }
      } else {
        // YANLIŞ / FAZLA HARF
        block.classList.add('wrong');
        tetrisState.timeLeft = Math.max(1, tetrisState.timeLeft - 2);
        dom.tetrisTimer.textContent = tetrisState.timeLeft;
        resetStreak();
        deductWrongAnswerPenalty(1);
        const encMsg = getRandomEncouragementMessage();
        showEncouragementBanner(encMsg, `"${chosenLetter}" harfi gerekmiyor! (-2 sn)`, 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());
        setTimeout(() => { if (block.parentNode) block.remove(); }, 250);
      }
    }

    block.addEventListener('pointerdown', onBlockHit);

    // Harf en dibe (tehlike çizgisine) indiğinde kendini temizler
    block.addEventListener('animationend', () => {
      if (block.parentNode) block.remove();
      tetrisState.fallingBlocks = tetrisState.fallingBlocks.filter(b => b !== block);
    });
  }

  function giveTetrisHint() {
    useHintWithPenalty(5);
    if (!tetrisState.active) return;
    const nextUnfilled = tetrisState.targetLetters.findIndex((_, idx) => !tetrisState.filledSlots[idx]);
    if (nextUnfilled === -1) return;
    const letter = tetrisState.targetLetters[nextUnfilled];
    tetrisState.filledSlots[nextUnfilled] = true;
    renderTetrisSlots();
    showToast(`💡 İpucu: '${letter}' harfi dolduruldu!`);

    const allDone = tetrisState.filledSlots.every(f => f === true);
    if (allDone) {
      stopTetrisGame();
      speakWord(tetrisState.targetWord.kelime, tetrisState.targetWord.dil);
      const earned = recordGameWin('tetris', 20);
      setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'tetris') {
          startTetrisRound();
        }
      }, 1200);
    }
  }

  // ==========================================
  // OYUN 3: CÜMLE İÇİ BOŞLUK DOLDURMA (CLOZE)
  // ==========================================
  let clozeState = {
    targetWord: null,
    options: []
  };

  function isValidForeignWord(w, lang) {
    if (!w || !w.kelime) return false;
    const k = (w.kelime || '').trim();
    const a = (w.anlam || w.anlami || w['anlamı'] || '').trim();
    if (!k || k.length < 2) return false;
    if (k.endsWith('?') || k.endsWith('!)') || /^[-,.:;!?()"]/.test(k)) return false;

    if (lang === 'DE-TR' || w.dil === 'DE-TR') {
      // Must not contain unique Turkish characters
      if (/[ışğİŞĞçÇ]/.test(k)) return false;
      // Meaning must not be German article + noun or German verb forms
      if (/^(der|die|das|den|dem|des|ein|eine|einen|einem|eines)\s+[A-ZÄÖÜ]/i.test(a)) return false;
      if (/,\s*[-"][a-zäöü]*\s*$/i.test(a)) return false;
      if (a.includes('|')) return false;
      if (/^(die|der|das)\s+/i.test(a)) return false;
    }
    return true;
  }

  function startClozeRound() {
    state.roundUsedHint = false;
    const rawPool = getLearnedWordsPool();
    const currentLang = state.activeLanguage || 'EN-TR';
    const pool = rawPool.filter(w => isValidForeignWord(w, currentLang));
    if (pool.length < 3) return;

    const poolWithSentence = pool.filter(w => getWordSentence(w) && getWordSentence(w).length > 5);
    const chosenPool = poolWithSentence.length > 0 ? poolWithSentence : pool;
    const target = chosenPool[Math.floor(Math.random() * chosenPool.length)];

    clozeState.targetWord = target;
    markWordPracticedInGame(target.id);

    // Clean word for matching and options (e.g. separable verbs "zu|ordnen" -> "zuordnen")
    const cleanWordForDisplay = target.kelime.replace(/\|/g, '').trim();

    // Cümleyi akıllı ve hatasız biçimde hazırla (Boşluksuz kalma riskini %0'a indir)
    let sentence = getWordSentence(target) || '';
    const BLANK_HTML = '<span class="cloze-blank" id="clozeBlank">_______</span>';
    let blankCreated = false;

    if (sentence && sentence.length > 5) {
      function escapeReg(str) {
        return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      // 1. Doğrudan kelime eşleşmesi (büyük/küçük harf duyarsız tam kelime)
      const regexClean = new RegExp(`\\b${escapeReg(cleanWordForDisplay)}\\b`, 'i');
      const regexRaw = new RegExp(`\\b${escapeReg(target.kelime)}\\b`, 'i');
      if (regexClean.test(sentence)) {
        sentence = sentence.replace(regexClean, BLANK_HTML);
        blankCreated = true;
      } else if (regexRaw.test(sentence)) {
        sentence = sentence.replace(regexRaw, BLANK_HTML);
        blankCreated = true;
      }

      // 2. İsimlerde artikelleri ve çoğul eklerini temizleyerek kök eşleme (örn: "die Autobahn, -en" -> "Autobahn", "das Land (Sg.)" -> "Land")
      if (!blankCreated) {
        const strippedNoun = cleanWordForDisplay
          .replace(/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|le|la|les|un|une|des|the|a|an)\s+/i, '')
          .replace(/,\s*[-'"\wöüäßÖÜÄ]+.*/i, '')
          .replace(/\s*\([^)]*\)/g, '')
          .trim();

        if (strippedNoun && strippedNoun.length >= 3) {
          const regNoun = new RegExp(`\\b${escapeReg(strippedNoun)}\\b`, 'i');
          if (regNoun.test(sentence)) {
            sentence = sentence.replace(regNoun, BLANK_HTML);
            blankCreated = true;
          } else {
            // OCR kaynaklı kelime içi hatalı boşlukları tolere eden desen ("Bu tterbrot" -> "Butterbrot")
            try {
              const chars = strippedNoun.split('');
              const spacedPattern = chars.map(c => escapeReg(c)).join('\\s*');
              const regSpaced = new RegExp(`\\b${spacedPattern}\\b`, 'i');
              if (regSpaced.test(sentence)) {
                sentence = sentence.replace(regSpaced, BLANK_HTML);
                blankCreated = true;
              }
            } catch (e) {}
          }
        }

        // 3. Fiil çekimleri eşleşmesi (örn: "bedeuten" -> "bedeutet" / "bedeutete", "gehen" -> "geht")
        if (!blankCreated) {
          const verbCandidate = strippedNoun || cleanWordForDisplay;
          const verbStem = verbCandidate.replace(/(en|eln|ern|er|ir)$/i, '').trim();
          if (verbStem.length >= 3) {
            try {
              const regVerb = new RegExp(`\\b${escapeReg(verbStem)}[a-zöüäßÖÜÄ]*\\b`, 'i');
              if (regVerb.test(sentence)) {
                sentence = sentence.replace(regVerb, BLANK_HTML);
                blankCreated = true;
              } else {
                const chars = verbStem.split('');
                const spacedStem = chars.map(c => escapeReg(c)).join('\\s*');
                const regSpacedVerb = new RegExp(`\\b${spacedStem}[a-zöüäßÖÜÄ]*\\b`, 'i');
                if (regSpacedVerb.test(sentence)) {
                  sentence = sentence.replace(regSpacedVerb, BLANK_HTML);
                  blankCreated = true;
                }
              }
            } catch (e) {}
          }
        }

        // 4. Parça metin kontrolü (substring fallback)
        if (!blankCreated && strippedNoun.length >= 3 && sentence.toLowerCase().includes(strippedNoun.toLowerCase())) {
          sentence = sentence.replace(new RegExp(escapeReg(strippedNoun), 'i'), BLANK_HTML);
          blankCreated = true;
        } else if (!blankCreated && cleanWordForDisplay.length >= 3 && sentence.toLowerCase().includes(cleanWordForDisplay.toLowerCase())) {
          sentence = sentence.replace(new RegExp(escapeReg(cleanWordForDisplay), 'i'), BLANK_HTML);
          blankCreated = true;
        }
      }
    }

    // 5. Cümle yoksa veya cümlede hedef kelime bulunamadıysa KESİNLİKLE boşluklu şablon oluştur
    if (!blankCreated) {
      const meaningStr = getWordMeaning(target) || '';
      if (target.dil === 'DE-TR') {
        sentence = `"${meaningStr}" kelimesinin Almanca karşılığı: ${BLANK_HTML}`;
      } else if (target.dil === 'FR-TR') {
        sentence = `"${meaningStr}" kelimesinin Fransızca karşılığı: ${BLANK_HTML}`;
      } else {
        sentence = `The correct word for "${meaningStr}" is ${BLANK_HTML}.`;
      }
    }

    dom.clozeSentenceText.innerHTML = sentence;
    dom.clozeTranslationText.textContent = getWordSentenceTranslation(target) || getWordMeaning(target) || '';

    // Çeviri görünürlüğü: Ayarlardan açıksa göster, varsayılan olarak kapalı
    const autoShowClozeTr = !!state.clozeAutoTranslate;
    if (dom.clozeTranslationText) {
      dom.clozeTranslationText.style.display = autoShowClozeTr ? 'block' : 'none';
    }
    if (dom.clozeToggleTranslationBtn) {
      dom.clozeToggleTranslationBtn.classList.toggle('active', autoShowClozeTr);
    }

    // Seçenekleri hazırla: 1 Doğru + 3 Yanlış (Aynı dilden ve kesinlikle hedef dilde geçerli yabancı kelimeler)
    const allLangWords = getWordsData().filter(w => 
      w.dil === target.dil && 
      w.kelime.toLowerCase() !== target.kelime.toLowerCase() &&
      isValidForeignWord(w, target.dil)
    );
    const shuffledDistractors = allLangWords
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.kelime.replace(/\|/g, '').trim());

    const options = [cleanWordForDisplay, ...shuffledDistractors].sort(() => Math.random() - 0.5);
    clozeState.options = options;

    dom.clozeOptionsGrid.innerHTML = '';
    if (dom.clozeHintBtn) dom.clozeHintBtn.disabled = false;
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'cloze-opt-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleClozeAnswer(btn, opt, target));
      dom.clozeOptionsGrid.appendChild(btn);
    });
  }

  function giveClozeHint() {
    useHintWithPenalty(5);
    if (!clozeState.targetWord) return;
    const correctWord = (clozeState.targetWord.kelime || '').replace(/\|/g, '').trim().toLowerCase();
    const btns = Array.from(dom.clozeOptionsGrid.querySelectorAll('.cloze-opt-btn'));
    const wrongBtns = btns.filter(b => b.textContent.trim().toLowerCase() !== correctWord && b.style.opacity !== '0.2');
    if (wrongBtns.length <= 1) return;
    const shuffled = wrongBtns.sort(() => Math.random() - 0.5);
    shuffled.slice(0, 2).forEach(b => {
      b.style.opacity = '0.2';
      b.style.pointerEvents = 'none';
      b.disabled = true;
    });
    showToast('💡 50:50 Joker: 2 yanlış seçenek elendi!');
    if (dom.clozeHintBtn) dom.clozeHintBtn.disabled = true;
  }

  function handleClozeAnswer(buttonEl, selectedWord, targetWord) {
    const allBtns = dom.clozeOptionsGrid.querySelectorAll('.cloze-opt-btn');
    allBtns.forEach(b => b.disabled = true);

    const cleanTarget = (targetWord.kelime || '').replace(/\|/g, '').trim().toLowerCase();
    const isCorrect = selectedWord.trim().toLowerCase() === cleanTarget;
    const blank = document.getElementById('clozeBlank');

    if (isCorrect) {
      buttonEl.classList.add('correct');
      if (blank) {
        blank.textContent = (targetWord.kelime || '').replace(/\|/g, '').trim();
        blank.className = 'cloze-blank blank-correct';
      }
      speakWord(targetWord.kelime, targetWord.dil);
      const earned = recordGameWin('cloze', 15);
      onWordSolvedCorrectlyInGame(targetWord.id);

      setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'cloze') {
          startClozeRound();
        }
      }, 2800);
    } else {
      buttonEl.classList.add('wrong');
      allBtns.forEach(b => {
        if (b.textContent.trim().toLowerCase() === cleanTarget) {
          b.classList.add('correct');
        }
      });
      const displayWord = (targetWord.kelime || '').replace(/\|/g, '').trim();
      if (blank) {
        blank.textContent = displayWord;
        blank.className = 'cloze-blank blank-revealed';
      }
      resetStreak();
      deductWrongAnswerPenalty(1);
      const encMsg = getRandomEncouragementMessage();
      showEncouragementBanner(encMsg, `Doğru: "${displayWord}"`, 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());

      setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'cloze') {
          startClozeRound();
        }
      }, 3400);
    }
  }

  // ==========================================
  // OYUN: KART EŞLEŞTİRME (MEMORY MATCH)
  // ==========================================
  let matchState = {
    cards: [],
    selectedCards: [],
    matchedPairs: 0,
    totalPairs: 4,
    isLocked: false
  };

  function startMatchRound() {
    state.roundUsedHint = false;
    const rawPool = getLearnedWordsPool();
    // Havuzu hem yabancı kelimesi hem de Türkçe anlamı dolu olan kelimelerle güvenli filtrele (boş kart riskini tamamen önler)
    const pool = rawPool.filter(w => w && w.kelime && w.kelime.trim() && getWordMeaning(w).trim());
    if (pool.length < 3) return;

    matchState.selectedCards = [];
    matchState.matchedPairs = 0;
    matchState.isLocked = false;
    if (dom.matchFoundCount) dom.matchFoundCount.textContent = '0';
    if (dom.matchHintBtn) dom.matchHintBtn.disabled = false;

    const pairCount = Math.min(4, pool.length);
    matchState.totalPairs = pairCount;

    const selectedWords = [...pool].sort(() => Math.random() - 0.5).slice(0, pairCount);
    const deck = [];

    selectedWords.forEach(w => {
      markWordPracticedInGame(w.id);
      deck.push({
        id: w.id + '_word',
        pairId: w.id,
        type: 'word',
        text: w.kelime,
        lang: w.dil
      });
      deck.push({
        id: w.id + '_tr',
        pairId: w.id,
        type: 'meaning',
        text: getWordMeaning(w),
        lang: 'TR'
      });
    });

    deck.sort(() => Math.random() - 0.5);
    matchState.cards = deck;

    dom.matchGrid.innerHTML = '';
    deck.forEach((cardItem, idx) => {
      cardItem.deckIdx = idx;
      const cardEl = document.createElement('div');
      cardEl.className = 'match-tile';
      cardEl.textContent = cardItem.text;
      cardEl.dataset.pairId = cardItem.pairId;
      cardEl.dataset.idx = idx;
      cardEl.addEventListener('click', () => handleMatchCardClick(cardEl, cardItem));
      dom.matchGrid.appendChild(cardEl);
    });
  }

  function giveMatchHint() {
    useHintWithPenalty(5);
    if (matchState.isLocked) return;
    const remainingCards = matchState.cards.filter(c => {
      const el = dom.matchGrid.querySelector(`.match-tile[data-idx="${c.deckIdx}"]`);
      return el && !el.classList.contains('matched');
    });
    if (remainingCards.length === 0) return;
    const targetPairId = remainingCards[0].pairId;
    const pairElements = dom.matchGrid.querySelectorAll(`.match-tile[data-pair-id="${targetPairId}"]`);
    pairElements.forEach(el => el.classList.add('hint-highlight'));
    showToast('💡 İpucu: Eşleşen bir çift vurgulandı!');
    if (dom.matchHintBtn) dom.matchHintBtn.disabled = true;
    setTimeout(() => {
      pairElements.forEach(el => el.classList.remove('hint-highlight'));
      if (dom.matchHintBtn) dom.matchHintBtn.disabled = false;
    }, 1800);
  }

  function handleMatchCardClick(cardEl, cardItem) {
    if (matchState.isLocked) return;
    if (cardEl.classList.contains('matched') || cardEl.classList.contains('selected')) return;

    cardEl.classList.add('selected');
    if (cardItem.type === 'word') {
      speakWord(cardItem.text, cardItem.lang);
    }

    matchState.selectedCards.push({ el: cardEl, item: cardItem });

    if (matchState.selectedCards.length === 2) {
      matchState.isLocked = true;
      const [c1, c2] = matchState.selectedCards;

      if (c1.item.pairId === c2.item.pairId && c1.item.type !== c2.item.type) {
        setTimeout(() => {
          c1.el.classList.remove('selected');
          c2.el.classList.remove('selected');
          c1.el.classList.add('matched');
          c2.el.classList.add('matched');

          matchState.matchedPairs++;
          if (dom.matchFoundCount) dom.matchFoundCount.textContent = matchState.matchedPairs;
          matchState.selectedCards = [];
          matchState.isLocked = false;

          const earned = recordGameWin('match', 15);
          onWordSolvedCorrectlyInGame(c1.item.pairId);

          if (matchState.matchedPairs >= matchState.totalPairs) {
            setTimeout(() => {
              if (state.activeMode === 'arena' && state.activeGame === 'match') {
                startMatchRound();
              }
            }, 1000);
          }
        }, 300);
      } else {
        c1.el.classList.add('shake-wrong');
        c2.el.classList.add('shake-wrong');
        resetStreak();
        deductWrongAnswerPenalty(1);
        const encMsg = getRandomEncouragementMessage();
        showEncouragementBanner(encMsg, '', 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());

        setTimeout(() => {
          c1.el.classList.remove('selected', 'shake-wrong');
          c2.el.classList.remove('selected', 'shake-wrong');
          matchState.selectedCards = [];
          matchState.isLocked = false;
        }, 650);
      }
    }
  }

  // ==========================================
  // OYUN: DOĞRU MU YANLIŞ MI? (TRUE OR FALSE)
  // ==========================================
  let tfState = {
    targetWord: null,
    displayedMeaning: '',
    isCorrectMatch: true,
    timeLeft: 20,
    timerInterval: null,
    active: false,
    isAnswering: false
  };

  function stopTrueFalseGame() {
    tfState.active = false;
    if (tfState.timerInterval) {
      clearInterval(tfState.timerInterval);
      tfState.timerInterval = null;
    }
  }

  function startTrueFalseRound() {
    state.roundUsedHint = false;
    stopTrueFalseGame();
    const pool = getLearnedWordsPool();
    if (pool.length < 3) return;

    const target = pool[Math.floor(Math.random() * pool.length)];
    tfState.targetWord = target;
    markWordPracticedInGame(target.id);
    tfState.active = true;
    tfState.isAnswering = false;
    tfState.timeLeft = 20;

    if (dom.tfTimer) dom.tfTimer.textContent = tfState.timeLeft;
    if (dom.tfHintDetail) dom.tfHintDetail.style.display = 'none';
    if (dom.tfHintBtn) dom.tfHintBtn.disabled = false;

    const isCorrect = Math.random() < 0.5;
    tfState.isCorrectMatch = isCorrect;

    if (isCorrect) {
      tfState.displayedMeaning = getWordMeaning(target);
    } else {
      const targetLang = target.dil || state.activeLanguage;
      let others = pool.filter(w => w.id !== target.id && (w.dil === targetLang));
      if (others.length === 0) {
        others = getWordsDataForActiveLanguage(targetLang, target.seviye || state.userLevel).filter(w => w.id !== target.id);
      }
      const distractor = others[Math.floor(Math.random() * others.length)] || target;
      tfState.displayedMeaning = getWordMeaning(distractor) || getWordMeaning(target);
      if (tfState.displayedMeaning.trim().toLowerCase() === getWordMeaning(target).trim().toLowerCase()) {
        tfState.isCorrectMatch = true;
      }
    }

    if (dom.tfTargetWord) dom.tfTargetWord.textContent = target.kelime;
    if (dom.tfDisplayedMeaning) dom.tfDisplayedMeaning.textContent = tfState.displayedMeaning;

    tfState.timerInterval = setInterval(() => {
      if (!tfState.active) return;
      tfState.timeLeft--;
      if (dom.tfTimer) dom.tfTimer.textContent = tfState.timeLeft;

      if (tfState.timeLeft <= 0) {
        stopTrueFalseGame();
        resetStreak();
        deductWrongAnswerPenalty(1);
        const encMsg = getRandomEncouragementMessage();
        showEncouragementBanner(encMsg, `Süre doldu! Doğru cevap: ${tfState.isCorrectMatch ? 'DOĞRU' : 'YANLIŞ'}`, 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());
        setTimeout(() => {
          if (state.activeMode === 'arena' && state.activeGame === 'truefalse') {
            startTrueFalseRound();
          }
        }, 1200);
      }
    }, 1000);
  }

  function giveTrueFalseHint() {
    useHintWithPenalty(3);
    if (!tfState.targetWord) return;
    const w = tfState.targetWord;
    let hintText = `💡 `;
    const sentence = getWordSentence(w);
    if (sentence) {
      hintText += `Örnek Cümle: "${sentence}"`;
    } else {
      const type = w.kelime_turu ? `(${w.kelime_turu.toLowerCase()}) ` : '';
      hintText += `${type}İlk harfi '${w.kelime[0].toUpperCase()}' olan bir kelimedir.`;
    }
    if (dom.tfHintDetail) {
      dom.tfHintDetail.textContent = hintText;
      dom.tfHintDetail.style.display = 'block';
    }
    showToast(hintText);
    if (dom.tfHintBtn) dom.tfHintBtn.disabled = true;
  }

  function handleTrueFalseAnswer(userChoice) {
    if (!tfState.active || tfState.isAnswering) return;
    tfState.isAnswering = true;

    const isUserCorrect = (userChoice === tfState.isCorrectMatch);

    if (isUserCorrect) {
      speakWord(tfState.targetWord.kelime, tfState.targetWord.dil, dom.tfAudioBtn);
      const earned = recordGameWin('truefalse', 15);
      onWordSolvedCorrectlyInGame(tfState.targetWord.id);

      setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'truefalse') {
          startTrueFalseRound();
        }
      }, 2200);
    } else {
      resetStreak();
      deductWrongAnswerPenalty(1);
      const encMsg = getRandomEncouragementMessage();
      const trueMeaning = getWordMeaning(tfState.targetWord);
      showEncouragementBanner(encMsg, `Gerçek Anlam: "${trueMeaning}"`, 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());

      setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'truefalse') {
          startTrueFalseRound();
        }
      }, 2800);
    }
  }

  // ==========================================
  // OYUN: DİNLE VE YAZ (LISTEN & SPELL)
  // ==========================================
  let listenState = {
    targetWord: null,
    solutionLetters: [],
    bankItems: [],
    userSlots: []
  };

  function startListenRound() {
    state.roundUsedHint = false;
    const pool = getLearnedWordsPool();
    if (pool.length < 3) return;

    let candidate = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && listenState.targetWord && candidate.id === listenState.targetWord.id) {
      candidate = pool.find(w => w.id !== listenState.targetWord.id) || candidate;
    }
    listenState.targetWord = candidate;
    markWordPracticedInGame(candidate.id);

    const rawWord = candidate.kelime.replace(/[^\p{L}]/gu, '');
    const letters = rawWord.split('').map(c => candidate.dil === 'EN-TR' ? toEnglishUpper(c) : c.toUpperCase());

    listenState.solutionLetters = [...letters];
    listenState.userSlots = new Array(letters.length).fill(null);

    const shuffled = letters.map((char, idx) => ({ id: idx, letter: char, used: false }))
                            .sort(() => Math.random() - 0.5);
    if (shuffled.map(s => s.letter).join('') === letters.join('') && letters.length > 2) {
      shuffled.reverse();
    }
    listenState.bankItems = shuffled;

    if (dom.listenHintText) {
      dom.listenHintText.textContent = `İpucu: ${getWordMeaning(candidate)}`;
    }
    if (dom.listenHintBtn) dom.listenHintBtn.disabled = false;

    renderListenUI();

    setTimeout(() => {
      if (state.activeMode === 'arena' && state.activeGame === 'listen') {
        speakWord(candidate.kelime, candidate.dil, dom.listenPlayAudioBtn);
      }
    }, 350);
  }

  function renderListenUI() {
    dom.listenSlots.innerHTML = '';
    listenState.userSlots.forEach((slot, idx) => {
      const div = document.createElement('div');
      div.className = `letter-slot ${slot ? 'filled' : ''}`;
      div.textContent = slot ? slot.letter : '';
      div.addEventListener('click', () => handleListenSlotClick(idx));
      dom.listenSlots.appendChild(div);
    });

    dom.listenBank.innerHTML = '';
    listenState.bankItems.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `letter-tile ${item.used ? 'used' : ''}`;
      btn.textContent = item.letter;
      btn.disabled = item.used;
      btn.addEventListener('click', () => handleListenTileClick(item.id));
      dom.listenBank.appendChild(btn);
    });
  }

  function handleListenTileClick(tileId) {
    const item = listenState.bankItems.find(i => i.id === tileId);
    if (!item || item.used) return;

    const emptyIdx = listenState.userSlots.indexOf(null);
    if (emptyIdx === -1) return;

    item.used = true;
    listenState.userSlots[emptyIdx] = item;
    renderListenUI();

    if (!listenState.userSlots.includes(null)) {
      checkListenAnswer();
    }
  }

  function handleListenSlotClick(slotIdx) {
    const slot = listenState.userSlots[slotIdx];
    if (!slot) return;

    slot.used = false;
    listenState.userSlots[slotIdx] = null;

    const remaining = listenState.userSlots.filter(s => s !== null);
    listenState.userSlots = new Array(listenState.solutionLetters.length).fill(null);
    remaining.forEach((r, i) => listenState.userSlots[i] = r);

    renderListenUI();
  }

  function listenBackspace() {
    for (let i = listenState.userSlots.length - 1; i >= 0; i--) {
      if (listenState.userSlots[i] !== null) {
        handleListenSlotClick(i);
        break;
      }
    }
  }

  function listenReset() {
    listenState.bankItems.forEach(i => i.used = false);
    listenState.userSlots.fill(null);
    renderListenUI();
  }

  function giveListenHint() {
    useHintWithPenalty(5);
    if (!listenState.targetWord) return;
    const emptyIdx = listenState.userSlots.indexOf(null);
    if (emptyIdx === -1) return;

    const neededChar = listenState.solutionLetters[emptyIdx];
    const availableItem = listenState.bankItems.find(i => !i.used && i.letter === neededChar);
    if (!availableItem) return;

    availableItem.used = true;
    listenState.userSlots[emptyIdx] = availableItem;
    renderListenUI();
    showToast(`💡 İpucu: '${neededChar}' harfi yerleştirildi!`);

    if (!listenState.userSlots.includes(null)) {
      checkListenAnswer();
    }
  }

  function checkListenAnswer() {
    const userWord = listenState.userSlots.map(s => s.letter).join('');
    const target = listenState.solutionLetters.join('');
    const slots = dom.listenSlots.querySelectorAll('.letter-slot');

    if (userWord === target) {
      slots.forEach(s => s.classList.add('correct'));
      speakWord(listenState.targetWord.kelime, listenState.targetWord.dil, dom.listenPlayAudioBtn);
      const earned = recordGameWin('listen', 15);
      onWordSolvedCorrectlyInGame(listenState.targetWord.id);

      setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'listen') {
          startListenRound();
        }
      }, 2600);
    } else {
      slots.forEach(s => s.classList.add('shake'));
      resetStreak();
      deductWrongAnswerPenalty(1);
      const encMsg = getRandomEncouragementMessage();
      const targetWordClean = listenState.targetWord.kelime;
      const targetWordMeaning = getWordMeaning(listenState.targetWord);
      showEncouragementBanner(encMsg, `Kelime: "${targetWordClean}" (${targetWordMeaning})`, 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());

      setTimeout(() => {
        slots.forEach(s => s.classList.remove('shake'));
        listenReset();
      }, 600);
    }
  }

  // ==========================================
  // OYUN: 4 ŞIKLI TEST (SPEED QUIZ)
  // ==========================================
  let quizState = {
    targetWord: null,
    options: [],
    isAnswering: false
  };

  function startQuizRound() {
    state.roundUsedHint = false;
    const pool = getLearnedWordsPool();
    if (pool.length < 3) return;

    let candidate = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && quizState.targetWord && candidate.id === quizState.targetWord.id) {
      candidate = pool.find(w => w.id !== quizState.targetWord.id) || candidate;
    }
    quizState.targetWord = candidate;
    markWordPracticedInGame(candidate.id);
    quizState.isAnswering = false;

    if (dom.quizTargetWord) dom.quizTargetWord.textContent = candidate.kelime;

    const targetMeaning = getWordMeaning(candidate);
    const candidateLang = candidate.dil || state.activeLanguage;
    const sameLangWords = getWordsDataForActiveLanguage(candidateLang, candidate.seviye || state.userLevel);
    const otherMeanings = sameLangWords
      .map(w => getWordMeaning(w))
      .filter(m => m && m.trim().toLowerCase() !== targetMeaning.trim().toLowerCase());

    const uniqueDistractors = [...new Set(otherMeanings)].sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [targetMeaning, ...uniqueDistractors].sort(() => Math.random() - 0.5);
    quizState.options = options;

    dom.quizOptionsGrid.innerHTML = '';
    if (dom.quizHintBtn) dom.quizHintBtn.disabled = false;
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleQuizAnswer(btn, opt, targetMeaning));
      dom.quizOptionsGrid.appendChild(btn);
    });
  }

  function giveQuizHint() {
    useHintWithPenalty(5);
    if (!quizState.targetWord || quizState.isAnswering) return;
    const targetMeaning = getWordMeaning(quizState.targetWord);
    const btns = Array.from(dom.quizOptionsGrid.querySelectorAll('.quiz-opt-btn'));
    const wrongBtns = btns.filter(b => b.textContent.trim() !== targetMeaning.trim() && b.style.opacity !== '0.2');
    if (wrongBtns.length <= 1) return;
    const shuffled = wrongBtns.sort(() => Math.random() - 0.5);
    shuffled.slice(0, 2).forEach(b => {
      b.style.opacity = '0.2';
      b.style.pointerEvents = 'none';
      b.disabled = true;
    });
    showToast('💡 50:50 Joker: 2 yanlış şık elendi!');
    if (dom.quizHintBtn) dom.quizHintBtn.disabled = true;
  }

  function handleQuizAnswer(buttonEl, selectedMeaning, correctMeaning) {
    if (quizState.isAnswering) return;
    quizState.isAnswering = true;

    const allBtns = dom.quizOptionsGrid.querySelectorAll('.quiz-opt-btn');
    allBtns.forEach(b => b.disabled = true);

    if (selectedMeaning === correctMeaning) {
      buttonEl.classList.add('correct');
      speakWord(quizState.targetWord.kelime, quizState.targetWord.dil, dom.quizAudioBtn);
      const earned = recordGameWin('quiz', 15);
      onWordSolvedCorrectlyInGame(quizState.targetWord.id);

      setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'quiz') {
          startQuizRound();
        }
      }, 2400);
    } else {
      buttonEl.classList.add('wrong');
      allBtns.forEach(b => {
        if (b.textContent === correctMeaning) b.classList.add('correct');
      });
      resetStreak();
      deductWrongAnswerPenalty(1);
      const encMsg = getRandomEncouragementMessage();
      showEncouragementBanner(encMsg, `Doğru Cevap: "${correctMeaning}"`, 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());

      setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'quiz') {
          startQuizRound();
        }
      }, 3200);
    }
  }

  // ==========================================
  // OYUN: CÜMLE KURMA (SENTENCE SCRAMBLE)
  // ==========================================
  let scrambleState = {
    targetWord: null,
    originalWords: [],
    userSlots: [],
    bankItems: []
  };

  function startScrambleRound() {
    state.roundUsedHint = false;
    const pool = getLearnedWordsPool();
    if (pool.length < 3) return;

    const poolWithSentence = pool.filter(w => getWordSentence(w) && getWordSentence(w).trim().split(/\s+/).length >= 3);
    const candidatePool = poolWithSentence.length > 0 ? poolWithSentence : pool;
    const target = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    scrambleState.targetWord = target;
    markWordPracticedInGame(target.id);

    const sentence = getWordSentence(target) || `This word means ${getWordMeaning(target) || 'it'}.`;
    const words = sentence.trim().split(/\s+/);
    scrambleState.originalWords = [...words];
    scrambleState.userSlots = new Array(words.length).fill(null);

    const shuffled = words.map((w, idx) => ({ id: idx, word: w, used: false }))
                          .sort(() => Math.random() - 0.5);
    if (shuffled.map(s => s.word).join(' ') === sentence && words.length > 2) {
      shuffled.reverse();
    }
    scrambleState.bankItems = shuffled;

    if (dom.scrambleTranslationText) {
      dom.scrambleTranslationText.textContent = getWordSentenceTranslation(target) || getWordMeaning(target) || 'Cümleyi doğru sırayla kurun';
    }
    if (dom.scrambleHintBtn) dom.scrambleHintBtn.disabled = false;

    renderScrambleUI();
  }

  function renderScrambleUI() {
    dom.scrambleSlots.innerHTML = '';
    scrambleState.userSlots.forEach((slot, idx) => {
      const div = document.createElement('div');
      div.className = `scramble-slot-item ${slot ? 'filled' : ''}`;
      div.textContent = slot ? slot.word : '___';
      div.addEventListener('click', () => handleScrambleSlotClick(idx));
      dom.scrambleSlots.appendChild(div);
    });

    dom.scrambleBank.innerHTML = '';
    scrambleState.bankItems.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `scramble-chip ${item.used ? 'used' : ''}`;
      btn.textContent = item.word;
      btn.disabled = item.used;
      btn.addEventListener('click', () => handleScrambleChipClick(item.id));
      dom.scrambleBank.appendChild(btn);
    });
  }

  function handleScrambleChipClick(chipId) {
    const item = scrambleState.bankItems.find(i => i.id === chipId);
    if (!item || item.used) return;

    const emptyIdx = scrambleState.userSlots.indexOf(null);
    if (emptyIdx === -1) return;

    item.used = true;
    scrambleState.userSlots[emptyIdx] = item;
    renderScrambleUI();

    if (!scrambleState.userSlots.includes(null)) {
      checkScrambleAnswer();
    }
  }

  function handleScrambleSlotClick(slotIdx) {
    const slot = scrambleState.userSlots[slotIdx];
    if (!slot) return;

    slot.used = false;
    scrambleState.userSlots[slotIdx] = null;

    const remaining = scrambleState.userSlots.filter(s => s !== null);
    scrambleState.userSlots = new Array(scrambleState.originalWords.length).fill(null);
    remaining.forEach((r, i) => scrambleState.userSlots[i] = r);

    renderScrambleUI();
  }

  function scrambleBackspace() {
    for (let i = scrambleState.userSlots.length - 1; i >= 0; i--) {
      if (scrambleState.userSlots[i] !== null) {
        handleScrambleSlotClick(i);
        break;
      }
    }
  }

  function scrambleReset() {
    scrambleState.bankItems.forEach(i => i.used = false);
    scrambleState.userSlots.fill(null);
    renderScrambleUI();
  }

  function giveScrambleHint() {
    useHintWithPenalty(5);
    if (!scrambleState.targetWord) return;
    const emptyIdx = scrambleState.userSlots.indexOf(null);
    if (emptyIdx === -1) return;

    const neededWord = scrambleState.originalWords[emptyIdx];
    const availableItem = scrambleState.bankItems.find(i => !i.used && i.word === neededWord);
    if (!availableItem) return;

    availableItem.used = true;
    scrambleState.userSlots[emptyIdx] = availableItem;
    renderScrambleUI();
    showToast(`💡 İpucu: "${neededWord}" kelimesi yerleştirildi!`);

    if (!scrambleState.userSlots.includes(null)) {
      checkScrambleAnswer();
    }
  }

  function checkScrambleAnswer() {
    const userSentence = scrambleState.userSlots.map(s => s.word).join(' ');
    const targetSentence = scrambleState.originalWords.join(' ');
    const slots = dom.scrambleSlots.querySelectorAll('.scramble-slot-item');

    if (userSentence.toLowerCase() === targetSentence.toLowerCase()) {
      slots.forEach(s => s.classList.add('correct'));
      speakWord(targetSentence, scrambleState.targetWord.dil, dom.scrambleAudioBtn);
      const earned = recordGameWin('scramble', 25);
      onWordSolvedCorrectlyInGame(scrambleState.targetWord.id);

      // Cümleyi ve Türkçe çevirisini incelemek için kelime uzunluğuna göre cömert bekleme süresi
      const wordCount = scrambleState.originalWords.length;
      const reviewDelay = Math.max(5500, 3200 + wordCount * 650);

      if (scrambleNextTimeout) clearTimeout(scrambleNextTimeout);
      scrambleNextTimeout = setTimeout(() => {
        if (state.activeMode === 'arena' && state.activeGame === 'scramble') {
          startScrambleRound();
        }
      }, reviewDelay);
    } else {
      slots.forEach(s => s.classList.add('shake'));
      resetStreak();
      deductWrongAnswerPenalty(1);
      const encMsg = getRandomEncouragementMessage();
      const correctSentence = scrambleState.originalWords.join(' ');
      showEncouragementBanner(encMsg, `Cümle: "${correctSentence}"`, 'Tekrar dene... 1 XP gitti', getRandomEncouragementIcon());

      setTimeout(() => {
        slots.forEach(s => s.classList.remove('shake'));
        scrambleReset();
      }, 600);
    }
  }

  // ==========================================
  // OLAY DİNLEYİCİLERİ (EVENT LISTENERS)
  // ==========================================
  function setupEventListeners() {
    // Tema Butonu
    dom.themeToggleBtn.addEventListener('click', toggleTheme);

    // Profil Butonu (Üst Bar)
    if (dom.userProfileBtn) {
      dom.userProfileBtn.addEventListener('click', openStudentProfileModal);
    }
    if (dom.closeStudentProfileModalBtn) {
      dom.closeStudentProfileModalBtn.addEventListener('click', closeStudentProfileModal);
    }
    if (dom.studentProfileModal) {
      dom.studentProfileModal.addEventListener('click', (e) => {
        if (e.target === dom.studentProfileModal) closeStudentProfileModal();
      });
    }

    // Avatar Seçim Modalı Kapatma
    const closeAvatarPickerModalBtn = document.getElementById('closeAvatarPickerModalBtn');
    if (closeAvatarPickerModalBtn) {
      closeAvatarPickerModalBtn.addEventListener('click', closeAvatarPickerModal);
    }
    const avatarPickerModal = document.getElementById('avatarPickerModal');
    if (avatarPickerModal) {
      avatarPickerModal.addEventListener('click', (e) => {
        if (e.target === avatarPickerModal) closeAvatarPickerModal();
      });
    }

    // Ayarlar & Kart Rengi Modalı
    if (dom.settingsBtn) {
      dom.settingsBtn.addEventListener('click', () => openSettingsModal('cards'));
    }
    if (dom.closeSettingsModalBtn) {
      dom.closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
    }
    if (dom.settingsModal) {
      dom.settingsModal.addEventListener('click', (e) => {
        if (e.target === dom.settingsModal) closeSettingsModal();
      });
    }
    // Ayarlar Sekme Geçişleri
    if (dom.settingsTabBtns) {
      dom.settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tabName = btn.getAttribute('data-tab');
          if (tabName) switchSettingsTab(tabName);
        });
      });
    }

    // Ayarlar Profil Paneli Olayları
    if (dom.settingAvatarBtns) {
      dom.settingAvatarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          dom.settingAvatarBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }

    if (dom.settingLangSelect) {
      dom.settingLangSelect.addEventListener('change', () => {
        updateSettingsTrackAndUnitDropdowns();
      });
    }

    if (dom.settingTrackSelect) {
      dom.settingTrackSelect.addEventListener('change', () => {
        updateSettingsUnitDropdown();
      });
    }

    if (dom.saveProfileSettingsBtn) {
      dom.saveProfileSettingsBtn.addEventListener('click', saveProfileSettings);
    }

    if (dom.colorPaletteBtns) {
      dom.colorPaletteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.getAttribute('data-color');
          if (color) {
            applyCardTheme(color);
            const paletteTitle = btn.querySelector('.palette-name, .swatch-title')?.textContent || color;
            showToast(`Kart rengi: ${paletteTitle}`);
          }
        });
      });
    }

    // Font Boyutu Butonları
    if (dom.fontSizeBtns) {
      dom.fontSizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const size = btn.getAttribute('data-size');
          if (size) {
            applyCardFont(size);
            showToast(`Yazı boyutu: ${btn.textContent}`);
          }
        });
      });
    }

    // Çizgili Kağıt Dokusu
    if (dom.settingLinedPaper) {
      dom.settingLinedPaper.addEventListener('change', (e) => {
        applyLinedPaper(e.target.checked);
        showToast(e.target.checked ? 'Çizgili not kartı dokusu devrede' : 'Düz kağıt devrede');
      });
    }

    // Ters Kart Modu
    if (dom.settingReverseMode) {
      dom.settingReverseMode.addEventListener('change', (e) => {
        applyReverseMode(e.target.checked);
        showToast(e.target.checked ? 'Ters kart modu devrede (Anlam → Kelime)' : 'Standart kart modu devrede (Kelime → Anlam)');
      });
    }

    // Gösterilecek Kartlar Filtresi
    if (dom.settingCardFilter) {
      dom.settingCardFilter.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'learned' || val === 'pending') {
          state.activeFilter = val;
          localStorage.setItem('kelime_active_filter', val);
          state.currentIndex = 0;
          updateCardTabsUI();
          refreshWordsList();
          showToast(val === 'learned' ? 'Öğrenilen kelimeler listeleniyor' : 'Öğrenilecek kelimeler listeleniyor');
        }
      });
    }

    // Otomatik Seslendirme
    if (dom.settingAutoplayAudio) {
      dom.settingAutoplayAudio.addEventListener('change', (e) => {
        applyAutoplayAudio(e.target.checked);
        showToast(e.target.checked ? 'Otomatik seslendirme açık' : 'Otomatik seslendirme kapalı');
      });
    }

    // Telaffuz Hızı Butonları
    if (dom.speechSpeedBtns) {
      dom.speechSpeedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const speed = btn.getAttribute('data-speed');
          if (speed) {
            applySpeechSpeed(speed);
            showToast(`Telaffuz hızı: ${btn.textContent}`);
          }
        });
      });
    }

    // Kartları Karıştır (Rastgele)
    if (dom.settingShuffle) {
      dom.settingShuffle.addEventListener('change', (e) => {
        applyShuffle(e.target.checked);
        showToast(e.target.checked ? 'Kartlar rastgele karıştırıldı' : 'Müfredat sıralamasına dönüldü');
      });
    }

    // SRS Akıllı Tekrar (Zor Kelimelere Öncelik)
    if (dom.settingSrsPriority) {
      dom.settingSrsPriority.addEventListener('change', (e) => {
        state.srsPriority = e.target.checked;
        localStorage.setItem('kelime_srs_priority', state.srsPriority ? 'true' : 'false');
        state.currentIndex = 0;
        refreshWordsList();
        showToast(state.srsPriority ? '🧠 Akıllı tekrar devrede: Zor kelimeler öne alındı' : 'Standart sıralamaya dönüldü');
      });
    }

    // Örnek Cümleyi Seslendir
    if (dom.settingReadExampleAudio) {
      dom.settingReadExampleAudio.addEventListener('change', (e) => {
        state.readExampleAudio = e.target.checked;
        localStorage.setItem('kelime_read_example_audio', state.readExampleAudio ? 'true' : 'false');
        showToast(state.readExampleAudio ? '🗣️ Kart çevrildiğinde örnek cümle seslendirilecek' : 'Örnek cümle seslendirmesi kapatıldı');
      });
    }

    // Yazı Tipi (Font Stili) Seçimi
    if (dom.settingFontFamilySelect) {
      dom.settingFontFamilySelect.addEventListener('change', (e) => {
        applyFontFamily(e.target.value);
        showToast('Yazı tipi güncellendi');
      });
    }

    // Kart Çevirme Hızı Butonları
    if (dom.flipSpeedBtns) {
      dom.flipSpeedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const speed = btn.getAttribute('data-speed');
          if (speed) {
            applyFlipSpeed(speed);
            showToast(`Kart çevirme hızı: ${btn.textContent}`);
          }
        });
      });
    }

    // Günlük Çalışma Hatırlatıcısı
    if (dom.settingStudyReminder) {
      dom.settingStudyReminder.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        applyStudyReminder(isChecked);
        if (isChecked) {
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
          showToast('⏰ Akıllı çalışma hatırlatıcısı açıldı');
        } else {
          showToast('🔕 Çalışma hatırlatıcısı kapatıldı');
        }
      });
    }

    if (dom.reminderSelectAllDaysBtn) {
      dom.reminderSelectAllDaysBtn.addEventListener('click', () => {
        if (!state.studyReminder) {
          showToast('⚠️ Günleri değiştirmek için önce hatırlatıcıyı açınız.');
          return;
        }
        selectAllReminderDays();
      });
    }

    if (dom.reminderDayChips) {
      dom.reminderDayChips.forEach(chip => {
        chip.addEventListener('click', () => {
          if (!state.studyReminder) {
            showToast('⚠️ Günleri değiştirmek için önce hatırlatıcıyı açınız.');
            return;
          }
          const day = parseInt(chip.getAttribute('data-day'), 10);
          toggleReminderDay(day);
        });
      });
    }

    if (dom.reminderAddTimeBtn && dom.reminderNewTimeInput) {
      dom.reminderAddTimeBtn.addEventListener('click', () => {
        if (!state.studyReminder) {
          showToast('⚠️ Saat eklemek için önce hatırlatıcıyı açınız.');
          return;
        }
        const val = dom.reminderNewTimeInput.value;
        if (val) {
          addReminderTime(val);
        }
      });
    }

    if (dom.reminderTestNotificationBtn) {
      dom.reminderTestNotificationBtn.addEventListener('click', () => {
        if (!state.studyReminder) {
          showToast('⚠️ Test bildirimi için önce hatırlatıcıyı açınız.');
          return;
        }
        triggerTestNotification();
      });
    }

    // Önbellek ve Geçici Verileri Temizle (Önce Onay Uyarısı Verir)
    if (dom.clearCacheBtn) {
      dom.clearCacheBtn.addEventListener('click', async () => {
        const confirmed = await showAppConfirm({
          title: 'Önbellek Temizleme',
          message: 'Önbellek ve geçici verileri temizlemek istediğinize emin misiniz?\n\nNot: Öğrenilen kelimeleriniz ve puanlarınız silinmez; sadece geçici sistem önbelleği temizlenir.',
          icon: '🧹',
          okText: 'Temizle',
          cancelText: 'Vazgeç',
          isDanger: false
        });
        if (!confirmed) return;

        if ('caches' in window) {
          caches.keys().then(keys => {
            keys.forEach(k => caches.delete(k));
          });
        }
        const cleared = clearTemporaryCache();
        playSoundEffect('correct');
        showToast(`🧹 Önbellek ve geçici veriler temizlendi (${cleared} öğe).`);
      });
    }

    // Veri Yedekleme & Geri Yükleme & Sıfırlama
    if (dom.backupDataBtn) {
      dom.backupDataBtn.addEventListener('click', exportUserData);
    }
    if (dom.restoreDataBtn && dom.restoreFileInput) {
      dom.restoreDataBtn.addEventListener('click', () => {
        dom.restoreFileInput.value = '';
        dom.restoreFileInput.click();
      });
      dom.restoreFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          restoreUserData(e.target.files[0]);
        }
      });
    }
    if (dom.resetProgressBtn) {
      dom.resetProgressBtn.addEventListener('click', resetProgressOnly);
    }
    const nuclearResetBtn = document.getElementById('nuclearResetBtn');
    if (nuclearResetBtn) {
      nuclearResetBtn.addEventListener('click', resetAllProgress);
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        closeSettingsModal(true);
        handleUserLogout();
      });
    }

    // ==========================================
    // İLK KURULUM SİHİRBAZI (ONBOARDING) OLAY DİNLEYİCİLERİ
    // ==========================================
    // 1. Adım Avatar Seçimi & İleri
    if (dom.obAvatarChips) {
      dom.obAvatarChips.forEach(chip => {
        chip.addEventListener('click', () => {
          dom.obAvatarChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          obState.avatar = chip.getAttribute('data-avatar');
        });
      });
    }

    if (dom.obStep1NextBtn) {
      dom.obStep1NextBtn.addEventListener('click', () => {
        const val = dom.obNameInput ? dom.obNameInput.value.trim() : '';
        obState.name = val || 'Öğrenci';
        goToOnboardingStep(2);
      });
    }

    if (dom.obStep1BackBtn) {
      dom.obStep1BackBtn.addEventListener('click', () => {
        goToOnboardingStep(0);
      });
    }

    if (dom.obNameInput) {
      dom.obNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = dom.obNameInput.value.trim();
          obState.name = val || 'Öğrenci';
          goToOnboardingStep(2);
        }
      });
    }

    // 2. Adım Dil Seçimi, Geri & İleri
    if (dom.obLangOptions) {
      dom.obLangOptions.forEach(card => {
        card.addEventListener('click', () => {
          if (card.classList.contains('active')) return;
          dom.obLangOptions.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          obState.lang = card.getAttribute('data-lang');
          obState.level = null; // dili değiştirince seviye sıfırlansın
        });
      });
    }

    if (dom.obStep2BackBtn) {
      dom.obStep2BackBtn.addEventListener('click', () => goToOnboardingStep(1));
    }
    if (dom.obStep2NextBtn) {
      dom.obStep2NextBtn.addEventListener('click', () => goToOnboardingStep(3));
    }

    // 3. Adım Kur / Seviye Seçimi Geri & İleri
    if (dom.obTrackOptions) {
      dom.obTrackOptions.forEach(card => {
        card.addEventListener('click', () => {
          if (card.classList.contains('active')) return;
          dom.obTrackOptions.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          obState.track = card.getAttribute('data-track') || '4A';
          obState.level = getLevelForTrack(obState.lang, obState.track);
          obState.unitNo = calculateCurrentUnitByDate(obState.lang, obState.level);
        });
      });
    }

    if (dom.obStep3BackBtn) {
      dom.obStep3BackBtn.addEventListener('click', () => goToOnboardingStep(2));
    }
    if (dom.obStep3NextBtn) {
      dom.obStep3NextBtn.addEventListener('click', () => {
        const activeTrackCard = document.querySelector('#obTrackOptions .ob-option-card.active');
        if (activeTrackCard) {
          obState.track = activeTrackCard.getAttribute('data-track') || '4A';
        }
        obState.level = getLevelForTrack(obState.lang, obState.track);
        obState.unitNo = calculateCurrentUnitByDate(obState.lang, obState.level);
        goToOnboardingStep(4);
      });
    }

    // 4. Adım Ünite ve Günlük Hedef Seçimi, Geri & Tamamla
    if (dom.obUnitSelect) {
      dom.obUnitSelect.addEventListener('change', (e) => {
        obState.unitNo = parseInt(e.target.value, 10);
      });
    }

    if (dom.obGoalChips) {
      dom.obGoalChips.forEach(chip => {
        chip.addEventListener('click', () => {
          if (chip.classList.contains('active')) return;
          dom.obGoalChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          obState.dailyGoal = parseInt(chip.getAttribute('data-goal'), 10) || 15;
        });
      });
    }

    if (dom.obStep4BackBtn) {
      dom.obStep4BackBtn.addEventListener('click', () => goToOnboardingStep(3));
    }
    if (dom.obCompleteBtn) {
      dom.obCompleteBtn.addEventListener('click', completeOnboarding);
    }

    // Dil Butonu & Seçimi (Geriye Dönük Uyumluluk)
    if (dom.langSelectBtn) {
      dom.langSelectBtn.addEventListener('click', () => openLanguageModal(false));
    }

    document.querySelectorAll('.lang-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const selectedLang = card.getAttribute('data-lang');
        setLanguage(selectedLang, true);
      });
    });

    // Dış tıklamada dil modalını kapat (zorunlu değilse)
    if (dom.langModal) {
      dom.langModal.addEventListener('click', (e) => {
        if (e.target === dom.langModal && dom.langModal.dataset.mandatory !== 'true') {
          closeLanguageModal();
        }
      });
    }

    // Ünite Butonları & Modalı (Açılış dokunma sızıntısını engelleyen koruma ile)
    let unitModalOpenedAt = 0;

    function handleUnitBtnClick(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      unitModalOpenedAt = Date.now();
      openUnitModal();
    }

    if (dom.headerUnitSelectBtn) {
      dom.headerUnitSelectBtn.addEventListener('click', handleUnitBtnClick);
    }
    if (dom.unitSelectBtn) {
      dom.unitSelectBtn.addEventListener('click', handleUnitBtnClick);
    }

    // Delegasyon güvencesi (herhangi bir alt elemana tıklanırsa)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#headerUnitSelectBtn') || e.target.closest('#unitSelectBtn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        unitModalOpenedAt = Date.now();
        openUnitModal();
      }
    });

    if (dom.closeUnitModalBtn) {
      dom.closeUnitModalBtn.addEventListener('click', (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        closeUnitModal();
      });
    }

    if (dom.unitModal) {
      dom.unitModal.addEventListener('click', (e) => {
        if (e.target === dom.unitModal) {
          // Dokunmatik ekranda açılış tıklamasının arkadaki overlay'e sızarak modalı anında kapatmasını engelle
          if (Date.now() - unitModalOpenedAt < 350) return;
          closeUnitModal();
        }
      });
    }

    // Günlük Hedef Değişimi
    dom.dailyGoalSelect.value = state.dailyGoal;
    dom.dailyGoalSelect.addEventListener('change', (e) => {
      state.dailyGoal = parseInt(e.target.value, 10);
      state.dailyGoalExtra = 0;
      localStorage.setItem('kelime_daily_goal', state.dailyGoal);
      state.currentIndex = 0;
      refreshWordsList();
      showToast(`Günlük hedef ${state.dailyGoal === 999 ? 'Tüm Ünite' : state.dailyGoal + ' kelime'} olarak ayarlandı`);
    });

    // Kart Filtre Sekmeleri (Öğrenilecekler / Öğrenilenler)
    if (dom.cardTabPendingBtn) {
      dom.cardTabPendingBtn.addEventListener('click', () => {
        if (state.activeFilter === 'pending') return;
        state.activeFilter = 'pending';
        localStorage.setItem('kelime_active_filter', 'pending');
        state.currentIndex = 0;
        updateCardTabsUI();
        refreshWordsList();
      });
    }

    if (dom.cardTabLearnedBtn) {
      dom.cardTabLearnedBtn.addEventListener('click', () => {
        if (state.activeFilter === 'learned') return;
        state.activeFilter = 'learned';
        localStorage.setItem('kelime_active_filter', 'learned');
        state.currentIndex = 0;
        updateCardTabsUI();
        refreshWordsList();
      });
    }

    // Kart Sayfası İçi Hızlı Günlük Hedef Seçimi (Inline)
    if (dom.inlineDailyGoalSelect) {
      dom.inlineDailyGoalSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '+5') {
          const remaining = getUnlearnedWordsCountInActiveUnit();
          if (remaining === 0) {
            showToast('⚠️ Bu ünitedeki tüm kelimeleri zaten öğrendiniz! Eklenecek başka yeni kelime kalmadı. 🏆', 4000);
            dom.inlineDailyGoalSelect.value = String(state.dailyGoal);
            return;
          }
          state.dailyGoalExtra = (state.dailyGoalExtra || 0) + 5;
          showToast(`Hedefe +5 kelime eklendi (Toplam Hedef: ${state.dailyGoal + state.dailyGoalExtra})`);
          dom.inlineDailyGoalSelect.value = String(state.dailyGoal);
        } else {
          state.dailyGoal = parseInt(val, 10);
          state.dailyGoalExtra = 0;
          localStorage.setItem('kelime_daily_goal', state.dailyGoal);
          if (dom.dailyGoalSelect) dom.dailyGoalSelect.value = String(state.dailyGoal);
          if (dom.settingDailyGoalSelect) dom.settingDailyGoalSelect.value = String(state.dailyGoal);
          showToast(`Günlük hedef ${state.dailyGoal === 999 ? 'Tüm Ünite' : state.dailyGoal + ' kelime'} olarak ayarlandı`);
        }
        state.currentIndex = 0;
        refreshWordsList();
      });
    }

    // Filtre Butonları
    dom.filterTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-filter') === state.activeFilter);
      tab.addEventListener('click', () => {
        dom.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeFilter = tab.getAttribute('data-filter');
        localStorage.setItem('kelime_active_filter', state.activeFilter);
        state.currentIndex = 0;
        updateCardTabsUI();
        refreshWordsList();
      });
    });

    // Kart Döndürme & Dokunmatik Swipe Değişimi
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isSwiping = false;

    dom.flashcardWrapper.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      touchStartTime = Date.now();
      isSwiping = false;
    }, { passive: true });

    dom.flashcardWrapper.addEventListener('touchmove', (e) => {
      const curX = e.changedTouches[0].screenX;
      const curY = e.changedTouches[0].screenY;
      if (Math.abs(curX - touchStartX) > 20 && Math.abs(curX - touchStartX) > Math.abs(curY - touchStartY)) {
        isSwiping = true;
      }
    }, { passive: true });

    dom.flashcardWrapper.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const deltaTime = Date.now() - touchStartTime;

      // Yatay kaydırma dikeyden belirginse ve en az 35px ise kart değiştir
      if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && deltaTime < 700) {
        if (deltaX < 0) {
          // Sola kaydırma -> Sonraki kelime
          nextCard();
        } else {
          // Sağa kaydırma -> Önceki kelime
          prevCard();
        }
      }
    }, { passive: true });

    dom.flashcardWrapper.addEventListener('click', (e) => {
      if (isSwiping) {
        isSwiping = false;
        return;
      }
      if (e.target.closest('#pronounceBtn, #pronounceUsBtn, #pronounceUkBtn, .accent-btn, .audio-btn, .accent-btn-group, .audio-controls-row, #prevCardBtn, #nextCardBtn, .card-edge-nav-btn, #markLearnedBtn, #markRepeatBtn, .card-inner-action-btn')) return;
      toggleFlip();
    });

    // Ses Telaffuz Butonları
    if (dom.pronounceUsBtn) {
      dom.pronounceUsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        speakCurrentWord('US');
      });
    }

    if (dom.pronounceUkBtn) {
      dom.pronounceUkBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        speakCurrentWord('UK');
      });
    }

    if (dom.pronounceBtn) {
      dom.pronounceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        speakCurrentWord();
      });
    }

    // Öğrenme Durum Butonları
    dom.markRepeatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markWordStatus(0);
    });
    dom.markLearnedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markWordStatus(1);
    });

    if (dom.cardReviewGoArenaBtn) {
      dom.cardReviewGoArenaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchAppMode('arena');
        showGamesMenu();
      });
    }

    // Gezinme Butonları
    dom.prevCardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      prevCard();
    });
    dom.nextCardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      nextCard();
    });

    // Klavye Kısayolları (Masaüstü/Geliştirici testi için)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        const avModal = document.getElementById('avatarPickerModal');
        if (avModal && avModal.classList.contains('active')) {
          closeAvatarPickerModal();
          return;
        }
        if (dom.studentProfileModal && dom.studentProfileModal.classList.contains('active')) {
          closeStudentProfileModal();
          return;
        }
        if (dom.arenaActiveGameArea && dom.arenaActiveGameArea.style.display !== 'none') {
          showGamesMenu();
          return;
        }
      }
      const avModal = document.getElementById('avatarPickerModal');
      if (dom.langModal.classList.contains('active') || dom.unitModal.classList.contains('active') || dom.badgesModal.classList.contains('active') || (dom.settingsModal && dom.settingsModal.classList.contains('active')) || (dom.studentProfileModal && dom.studentProfileModal.classList.contains('active')) || (avModal && avModal.classList.contains('active'))) return;
      if (state.activeMode === 'flashcards') {
        if (e.code === 'Space') {
          e.preventDefault();
          toggleFlip();
        } else if (e.code === 'ArrowRight') {
          nextCard();
        } else if (e.code === 'ArrowLeft') {
          prevCard();
        } else if (e.code === 'KeyL') {
          markWordStatus(1);
        } else if (e.code === 'KeyR') {
          markWordStatus(0);
        }
      }
    });

    // ==========================================
    // OYUNLAŞTIRMA & ARENA OLAY DİNLEYİCİLERİ
    // ==========================================
    // Mod Geçiş Sekmeleri (Geriye dönük uyumluluk)
    if (dom.tabFlashcards) dom.tabFlashcards.addEventListener('click', () => switchAppMode('flashcards'));
    if (dom.tabArena) dom.tabArena.addEventListener('click', () => switchAppMode('arena'));

    // Liderlik Tablosu (Leaderboard) Modalı
    const leaderboardBtn = document.getElementById('leaderboardBtn');
    const leaderboardModal = document.getElementById('leaderboardModal');
    const closeLeaderboardModalBtn = document.getElementById('closeLeaderboardModalBtn');

    async function openLeaderboardModal() {
      if (!leaderboardModal) return;
      leaderboardModal.classList.add('active');
      
      const listContainer = leaderboardModal.querySelector('.leaderboard-list');
      const authStatus = document.getElementById('leaderboardAuthStatus');
      
      if (listContainer) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-dim);">Yükleniyor...</div>';
      }
      if (authStatus) {
        authStatus.style.display = (window.fbUser) ? 'none' : 'flex';
      }
      
      if (typeof window.fetchLeaderboard === 'function') {
        try {
          const leaders = await window.fetchLeaderboard();
          if (listContainer) {
            listContainer.innerHTML = '';
            if (!leaders || leaders.length === 0) {
              listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-dim);">Henüz lider tablosunda kimse yok.</div>';
            } else {
              let currentRank = 1;
              let previousXP = null;

              leaders.forEach((user, index) => {
                if (previousXP !== null && user.xp < previousXP) {
                  currentRank = index + 1;
                }
                previousXP = user.xp;
                const rank = currentRank;

                let badge = 'Çırak';
                if (user.xp >= 1000) badge = 'Usta';
                if (user.xp >= 5000) badge = 'Efsane';
                if (user.xp >= 10000) badge = 'Şampiyon';
                
                const isMe = (window.fbUser && user.uid === window.fbUser.uid) ? 'background: rgba(37, 99, 235, 0.1); border-left: 4px solid var(--accent);' : '';
                
                listContainer.innerHTML += `
                  <div class="leaderboard-item rank-${rank}" style="${isMe}">
                    <div class="lb-rank">${rank}</div>
                    <div class="lb-avatar">${user.avatar || '👻'}</div>
                    <div class="lb-info">
                      <div style="display:flex; align-items:center; gap:4px;">
                        <div class="lb-name">${user.displayName || 'Öğrenci'}</div>
                        ${isMe ? '<span style="font-size:0.7rem; font-weight:800; color:var(--accent); flex-shrink:0;">(Sen)</span>' : ''}
                      </div>
                      <div class="lb-badge">${badge}</div>
                    </div>
                    <div class="lb-score">${(user.xp || 0).toLocaleString()} XP</div>
                  </div>
                `;
              });
            }
          }
        } catch(e) {
          console.warn('Leaderboard fetch error:', e);
        }
      }
    }

    function closeLeaderboardModal() {
      if (leaderboardModal) leaderboardModal.classList.remove('active');
    }
    if (leaderboardBtn) leaderboardBtn.addEventListener('click', openLeaderboardModal);
    if (closeLeaderboardModalBtn) closeLeaderboardModalBtn.addEventListener('click', closeLeaderboardModal);
    if (leaderboardModal) leaderboardModal.addEventListener('click', (e) => {
      if (e.target === leaderboardModal) closeLeaderboardModal();
    });

    // ==========================================
    // AUTH MODAL (GİRİŞ / KAYIT) VE HESAP YÖNETİMİ
    // ==========================================
    const authModal = document.getElementById('authModal');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    const authTabLogin = document.getElementById('authTabLogin');
    const authTabRegister = document.getElementById('authTabRegister');
    const authForm = document.getElementById('authForm');
    const authName = document.getElementById('authName');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authError = document.getElementById('authError');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const leaderboardLoginBtn = document.getElementById('leaderboardLoginBtn');
    let isLoginMode = true;

    window.openAuthModal = openAuthModal;
    function openAuthModal() {
      if (authModal) {
        authModal.classList.add('active');
        if (typeof closeLeaderboardModal === 'function') closeLeaderboardModal();
      }
    }

    function closeAuthModal() {
      if (authModal) authModal.classList.remove('active');
      if (authError) authError.style.display = 'none';
      if (authForm) authForm.reset();
      window.isOnboardingAuthFlow = false;
    }

    if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', closeAuthModal);
    if (leaderboardLoginBtn) leaderboardLoginBtn.addEventListener('click', openAuthModal);

    window.setAuthMode = setAuthMode;
    function setAuthMode(loginMode) {
      isLoginMode = loginMode;
      if (authError) authError.style.display = 'none';
      const authNameGroup = document.getElementById('authNameGroup');
      if (loginMode) {
        if (authTabLogin) authTabLogin.classList.add('active');
        if (authTabRegister) authTabRegister.classList.remove('active');
        if (authName) {
          authName.style.display = 'none';
          authName.required = false;
        }
        if (authNameGroup) authNameGroup.style.display = 'none';
        if (authSubmitBtn) authSubmitBtn.textContent = 'Giriş Yap';
        const title = document.getElementById('authModalTitle');
        const desc = document.getElementById('authModalDesc');
        if (title) title.textContent = 'Tekrar Hoş Geldiniz';
        if (desc) desc.textContent = 'Kaldığınız yerden devam etmek için giriş yapın.';
      } else {
        if (authTabRegister) authTabRegister.classList.add('active');
        if (authTabLogin) authTabLogin.classList.remove('active');
        if (authName) {
          authName.style.display = 'block';
          authName.required = true;
          if (!authName.value && state.userName && state.userName !== 'Öğrenci') {
            authName.value = state.userName;
          }
        }
        if (authNameGroup) authNameGroup.style.display = 'block';
        if (authSubmitBtn) authSubmitBtn.textContent = 'Kayıt Ol';
        const title = document.getElementById('authModalTitle');
        const desc = document.getElementById('authModalDesc');
        if (title) title.textContent = 'Hesap Oluştur';
        if (desc) desc.textContent = 'Puanlarınızı kaydedip liderlik tablosuna katılın.';
      }
    }

    if (authTabLogin) authTabLogin.addEventListener('click', () => setAuthMode(true));
    if (authTabRegister) authTabRegister.addEventListener('click', () => setAuthMode(false));

    const obQuickLoginBtn = document.getElementById('obQuickLoginBtn');
    if (obQuickLoginBtn) {
      obQuickLoginBtn.addEventListener('click', () => {
        setAuthMode(true);
        openAuthModal();
        const obModal = document.getElementById('onboardingModal');
        if (obModal) obModal.classList.remove('active');
      });
    }

    // Karşılama Ekranı (Welcome) butonları
    const obWelcomeRegisterBtn = document.getElementById('obWelcomeRegisterBtn');
    const obWelcomeLoginBtn = document.getElementById('obWelcomeLoginBtn');
    const obWelcomeGuestBtn = document.getElementById('obWelcomeGuestBtn');
    const obStepIndicator = document.querySelector('.onboarding-steps-indicator');

    if (obWelcomeRegisterBtn) {
      obWelcomeRegisterBtn.addEventListener('click', () => {
        window.isOnboardingAuthFlow = true;
        setAuthMode(false);
        openAuthModal();
      });
    }

    if (obWelcomeLoginBtn) {
      obWelcomeLoginBtn.addEventListener('click', () => {
        window.isOnboardingAuthFlow = false;
        setAuthMode(true);
        openAuthModal();
      });
    }

    if (obWelcomeGuestBtn) {
      obWelcomeGuestBtn.addEventListener('click', (e) => {
        e.preventDefault();
        state.userName = 'Öğrenci';
        state.userEmail = '';
        state.userAvatar = '🦊';
        state.xp = 0;
        state.streak = 0;
        state.maxStreak = 0;
        state.arenaWordsSolved = 0;
        state.cleanWins = 0;
        state.unlockedBadges = [];
        state.gameStats = {};
        state.learnedMap = {};
        if (state.sessionLearnedIds) state.sessionLearnedIds.clear();
        state.dailyGoalExtra = 0;

        localStorage.setItem('lexiq_user_name', 'Öğrenci');
        localStorage.setItem('lexiq_user_avatar', '🦊');
        localStorage.removeItem('lexiq_user_email');
        localStorage.setItem('kelime_xp', '0');
        localStorage.removeItem('kelime_learned_map');
        localStorage.removeItem('kelime_streak');
        localStorage.removeItem('kelime_max_streak');
        localStorage.removeItem('kelime_arena_solved');
        localStorage.removeItem('kelime_clean_wins');
        localStorage.removeItem('kelime_unlocked_badges');
        localStorage.removeItem('kelime_game_stats');

        state.isOnboarded = true;
        localStorage.setItem('lexiq_user_onboarded', 'true');

        updateUserProfileUI();
        updateArenaHeaderAndStats();
        if (dom.headerXpText) dom.headerXpText.textContent = '0';
        if (dom.arenaXpText) dom.arenaXpText.textContent = '0';
        if (dom.arenaStreakText) dom.arenaStreakText.textContent = '0';
        if (dom.modalTotalXpText) dom.modalTotalXpText.textContent = '🏆 0 XP';
        if (dom.arenaUserXp) dom.arenaUserXp.textContent = '🏆 0 XP';
        if (typeof renderBadgesView === 'function') renderBadgesView();
        refreshWordsList();

        if (obStepIndicator) obStepIndicator.style.display = 'flex';
        goToOnboardingStep(1);
      });
    }

    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (authSubmitBtn) {
          authSubmitBtn.disabled = true;
          authSubmitBtn.textContent = 'Bekleyin...';
        }
        if (authError) authError.style.display = 'none';

        const email = authEmail ? authEmail.value.trim() : '';
        const password = authPassword ? authPassword.value : '';
        const name = authName ? authName.value.trim() : '';

        if (!isLoginMode && !name) {
          if (authError) {
            authError.textContent = 'Lütfen adınızı ve soyadınızı giriniz.';
            authError.style.display = 'block';
          }
          if (authSubmitBtn) {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Kayıt Ol';
          }
          return;
        }

        let res;
        if (isLoginMode) {
          if (typeof window.loginWithEmail === 'function') {
            res = await window.loginWithEmail(email, password);
          } else {
            res = { success: false, error: 'Giriş servisi hazır değil.' };
          }
        } else {
          if (typeof window.registerWithEmail === 'function') {
            res = await window.registerWithEmail(email, password, name, state.userAvatar);
          } else {
            res = { success: false, error: 'Kayıt servisi hazır değil.' };
          }
        }

        if (authSubmitBtn) {
          authSubmitBtn.disabled = false;
          authSubmitBtn.textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
        }

        if (res && res.success) {
          closeAuthModal();
          const obModal = document.getElementById('onboardingModal') || (dom && dom.onboardingModal);
          
          if (!isLoginMode) {
            // --- YENİ KAYIT AKIŞI ---
            const now = Date.now();
            state.timeTracking.registeredAt = now;
            localStorage.setItem('lexiq_registered_at', String(now));

            // Yeni kayıt olan kullanıcı için onboarding henüz tamamlanmadı: Kesinlikle Dil ve Kur seçimine yönlendir
            state.isOnboarded = false;
            localStorage.removeItem('lexiq_user_onboarded');

            if (obModal) {
              obModal.style.display = 'flex';
              obModal.classList.add('active');
            }
            if (obStepIndicator) obStepIndicator.style.display = 'flex';
            if (dom && dom.obNameInput) {
              dom.obNameInput.value = name;
            } else if (document.getElementById('obNameInput')) {
              document.getElementById('obNameInput').value = name;
            }
            obState.name = name;
            if (state.userAvatar) obState.avatar = state.userAvatar;

            goToOnboardingStep(2);
            showToast(`Hesabın oluşturuldu, hoş geldin ${name}! 🎉 Şimdi öğrenmek istediğin dili seç.`);
          } else {
            // --- GİRİŞ YAPMA AKIŞI ---
            const hasCompletedOnboarding = localStorage.getItem('lexiq_user_onboarded') === 'true' && state.userTrack && state.activeLanguage;
            if (!hasCompletedOnboarding && (window.isOnboardingAuthFlow || (obModal && obModal.classList.contains('active')))) {
              state.isOnboarded = false;
              if (obModal) {
                obModal.style.display = 'flex';
                obModal.classList.add('active');
              }
              if (obStepIndicator) obStepIndicator.style.display = 'flex';
              goToOnboardingStep(2);
              showToast(`Hoş geldin, ${state.userName}! Lütfen dilini ve kurunu seç.`);
            } else {
              localStorage.setItem('lexiq_user_onboarded', 'true');
              state.isOnboarded = true;
              if (obModal) {
                obModal.classList.remove('active');
                obModal.style.display = 'none';
              }
              if (document.getElementById('leaderboardModal') && document.getElementById('leaderboardModal').classList.contains('active')) {
                openLeaderboardModal();
              } else {
                switchAppMode('home');
              }
              showToast(`Hoş geldin, ${state.userName}! 🎉`);
            }
          }
          window.isOnboardingAuthFlow = false;
        } else {
          if (authError) {
            authError.textContent = (res && res.error) ? res.error : 'Bilinmeyen bir hata oluştu.';
            authError.style.display = 'block';
          }
        }
      });
    }

    // Settings içerisindeki Giriş/Kayıt butonu
    const settingAccountActionBtn = document.getElementById('settingAccountActionBtn');
    if (settingAccountActionBtn) {
      settingAccountActionBtn.addEventListener('click', () => {
        closeSettingsModal();
        setAuthMode(true);
        openAuthModal();
      });
    }

    // Firebase Auth geri çağırma fonksiyonları
    window.onUserLogin = function(user) {
      if (user && user.displayName) {
        state.userName = user.displayName;
        localStorage.setItem('lexiq_user_name', user.displayName);
      }
      if (user && user.email) {
        state.userEmail = user.email;
        localStorage.setItem('lexiq_user_email', user.email);
      }
      updateUserProfileUI();
      const leaderboardAuthStatus = document.getElementById('leaderboardAuthStatus');
      if (leaderboardAuthStatus) {
        leaderboardAuthStatus.style.display = 'none';
      }
    };
    
    window.onUserLogout = function() {
      state.userName = 'Öğrenci';
      state.userEmail = '';
      state.userAvatar = '🦊';
      state.userTrack = '4A';
      state.userLevel = 'A2';
      state.isOnboarded = false;

      // Puanları, seriyi, rozetleri ve öğrenilen kelimeleri tamamen sıfırla
      state.xp = 0;
      state.streak = 0;
      state.maxStreak = 0;
      state.arenaWordsSolved = 0;
      state.cleanWins = 0;
      state.unlockedBadges = [];
      state.gameStats = {};
      state.learnedMap = {};
      if (state.sessionLearnedIds) state.sessionLearnedIds.clear();
      state.dailyGoalExtra = 0;

      // LocalStorage verilerini temizle
      localStorage.removeItem('lexiq_user_email');
      localStorage.setItem('lexiq_user_name', 'Öğrenci');
      localStorage.setItem('lexiq_user_avatar', '🦊');
      localStorage.setItem('lexiq_user_track', '4A');
      localStorage.setItem('lexiq_user_level', 'A2');
      localStorage.removeItem('lexiq_user_onboarded');
      localStorage.setItem('kelime_xp', '0');
      localStorage.removeItem('kelime_learned_map');
      localStorage.removeItem('kelime_streak');
      localStorage.removeItem('kelime_max_streak');
      localStorage.removeItem('kelime_arena_solved');
      localStorage.removeItem('kelime_clean_wins');
      localStorage.removeItem('kelime_unlocked_badges');
      localStorage.removeItem('kelime_game_stats');

      // Arayüz sayaçlarını ve ekranlarını sıfırla
      updateUserProfileUI();
      updateArenaHeaderAndStats();
      if (dom.headerXpText) dom.headerXpText.textContent = '0';
      if (dom.arenaXpText) dom.arenaXpText.textContent = '0';
      if (dom.arenaStreakText) dom.arenaStreakText.textContent = '0';
      if (dom.modalTotalXpText) dom.modalTotalXpText.textContent = '🏆 0 XP';
      if (dom.arenaUserXp) dom.arenaUserXp.textContent = '🏆 0 XP';
      if (typeof renderBadgesView === 'function') renderBadgesView();
      refreshWordsList();

      const leaderboardAuthStatus = document.getElementById('leaderboardAuthStatus');
      if (leaderboardAuthStatus) {
        leaderboardAuthStatus.style.display = 'flex';
      }

      // Tüm modalları kapat ve temiz bir şekilde Karşılama (Welcome) Ekranına dön
      const authModal = document.getElementById('authModal');
      if (authModal) authModal.classList.remove('active');
      const settingsModal = document.getElementById('settingsModal');
      if (settingsModal) settingsModal.classList.remove('active');
      const studentProfileModal = document.getElementById('studentProfileModal');
      if (studentProfileModal) studentProfileModal.classList.remove('active');

      if (typeof startOnboardingFlow === 'function') {
        startOnboardingFlow();
      }
    };

    // Header Brand Logosu (Hakkında Modalını Açar)
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutModalBtn = document.getElementById('closeAboutModalBtn');
    function updateAboutVersion() {
      const verEl = document.getElementById('aboutAppVersion') || (aboutModal ? aboutModal.querySelector('.about-version') : null);
      if (verEl) {
        let ver = APP_VERSION;
        if (window.AndroidTTS && typeof window.AndroidTTS.getAppVersion === 'function') {
          try {
            const nativeVer = window.AndroidTTS.getAppVersion();
            if (nativeVer) ver = nativeVer;
          } catch (e) {}
        }
        verEl.textContent = ver;
      }
      const welcomeVerEl = document.querySelector('.welcome-version-pill');
      if (welcomeVerEl) {
        let ver = APP_VERSION;
        if (window.AndroidTTS && typeof window.AndroidTTS.getAppVersion === 'function') {
          try {
            const nativeVer = window.AndroidTTS.getAppVersion();
            if (nativeVer) ver = nativeVer;
          } catch (e) {}
        }
        welcomeVerEl.textContent = ver.includes('Beta') ? ver : (ver + ' Beta');
      }
    }
    function openAboutModal() {
      updateAboutVersion();
      if (aboutModal) aboutModal.classList.add('active');
    }
    function closeAboutModal() {
      if (aboutModal) aboutModal.classList.remove('active');
    }
    updateAboutVersion();
    if (dom.brandHeaderHomeBtn) dom.brandHeaderHomeBtn.addEventListener('click', openAboutModal);
    if (closeAboutModalBtn) closeAboutModalBtn.addEventListener('click', closeAboutModal);
    if (aboutModal) aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) closeAboutModal();
    });

    // ==========================================
    // GERİ BİLDİRİM VE HATA BİLDİRİMİ SİSTEMİ
    // ==========================================
    const feedbackModal = document.getElementById('feedbackModal');
    const closeFeedbackModalBtn = document.getElementById('closeFeedbackModalBtn');
    const aboutOpenFeedbackBtn = document.getElementById('aboutOpenFeedbackBtn');
    const settingFeedbackBtn = document.getElementById('settingFeedbackBtn');
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackTypeChips = document.querySelectorAll('#feedbackTypeChips .feedback-chip');
    const feedbackNameInput = document.getElementById('feedbackNameInput');
    const feedbackEmailInput = document.getElementById('feedbackEmailInput');
    const feedbackMessageInput = document.getElementById('feedbackMessageInput');
    const feedbackSubmitBtn = document.getElementById('feedbackSubmitBtn');
    let selectedFeedbackType = 'bug';

    window.openFeedbackModal = openFeedbackModal;
    function openFeedbackModal() {
      if (!feedbackModal) return;
      if (feedbackNameInput && (!feedbackNameInput.value || feedbackNameInput.value === 'Öğrenci')) {
        feedbackNameInput.value = (state.userName && state.userName !== 'Öğrenci') ? state.userName : '';
      }
      if (feedbackEmailInput && !feedbackEmailInput.value) {
        feedbackEmailInput.value = state.userEmail || '';
      }
      feedbackModal.classList.add('active');
    }

    function closeFeedbackModal() {
      if (feedbackModal) feedbackModal.classList.remove('active');
    }

    if (closeFeedbackModalBtn) closeFeedbackModalBtn.addEventListener('click', closeFeedbackModal);
    if (aboutOpenFeedbackBtn) {
      aboutOpenFeedbackBtn.addEventListener('click', () => {
        closeAboutModal();
        openFeedbackModal();
      });
    }
    if (settingFeedbackBtn) {
      settingFeedbackBtn.addEventListener('click', () => {
        closeSettingsModal();
        openFeedbackModal();
      });
    }
    if (feedbackModal) {
      feedbackModal.addEventListener('click', (e) => {
        if (e.target === feedbackModal) closeFeedbackModal();
      });
    }

    const feedbackPlaceholders = {
      bug: 'Karşılaştığınız teknik hatayı veya çökme sorununu açıklayınız...',
      word_fix: 'Hatalı olduğunu düşündüğünüz kelimeyi, ünitesini ve doğru önerinizi yazınız...',
      suggestion: 'Uygulamada görmek istediğiniz yeni özelliği veya iyileştirme fikrinizi paylaşınız...',
      general: 'LexiQ hakkındaki düşüncelerinizi, deneyiminizi veya önerinizi paylaşınız...'
    };

    if (feedbackTypeChips) {
      feedbackTypeChips.forEach(chip => {
        chip.addEventListener('click', () => {
          feedbackTypeChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          selectedFeedbackType = chip.getAttribute('data-type') || 'bug';
          if (feedbackMessageInput && feedbackPlaceholders[selectedFeedbackType]) {
            feedbackMessageInput.placeholder = feedbackPlaceholders[selectedFeedbackType];
          }
        });
      });
    }

    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = feedbackMessageInput ? feedbackMessageInput.value.trim() : '';
        if (!msg) {
          showToast('Lütfen bildirim mesajınızı yazınız.');
          return;
        }

        if (feedbackSubmitBtn) {
          feedbackSubmitBtn.disabled = true;
          feedbackSubmitBtn.textContent = 'Gönderiliyor...';
        }

        const senderName = feedbackNameInput ? feedbackNameInput.value.trim() : (state.userName || 'İsimsiz');
        const senderEmail = feedbackEmailInput ? feedbackEmailInput.value.trim() : (state.userEmail || '');

        const feedbackData = {
          type: selectedFeedbackType,
          name: senderName,
          email: senderEmail,
          message: msg,
          appVersion: APP_VERSION,
          language: state.activeLanguage || 'EN-TR',
          track: state.userTrack || '4A',
          level: state.userLevel || 'A2',
          date: new Date().toISOString()
        };

        // Firestore bulut kaydı
        let cloudSaved = false;
        try {
          if (window.firebase && window.firebase.firestore) {
            const db = window.firebase.firestore();
            await db.collection('feedbacks').add({
              ...feedbackData,
              createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            cloudSaved = true;
          }
        } catch (fErr) {
          console.warn('Firestore feedback upload warning:', fErr);
        }

        // Yerel depolama yedeği
        try {
          const stored = JSON.parse(localStorage.getItem('lexiq_user_feedbacks') || '[]');
          stored.push(feedbackData);
          localStorage.setItem('lexiq_user_feedbacks', JSON.stringify(stored.slice(-20)));
        } catch(e) {}

        if (feedbackSubmitBtn) {
          feedbackSubmitBtn.disabled = false;
          feedbackSubmitBtn.innerHTML = '<span>🚀</span><span>Bildirimi Gönder</span>';
        }

        // E-posta istemcisini açma seçeneği (Kullanıcı doğrudan mail uygulamasından göndermek isterse)
        const typeLabels = { bug: 'Hata Bildirimi', word_fix: 'Kelime/Çeviri Hatası', suggestion: 'Yeni Fikir & Öneri', general: 'Genel Görüş' };
        const mailSubject = encodeURIComponent(`[LexiQ ${APP_VERSION}] ${typeLabels[selectedFeedbackType] || 'Geri Bildirim'}`);
        const mailBody = encodeURIComponent(`Gönderen: ${senderName} (${senderEmail || 'E-posta belirtilmedi'})\nDil / Kur: ${state.activeLanguage} • ${state.userLevel}\nSürüm: ${APP_VERSION}\n\nMesaj:\n${msg}`);
        const mailUrl = `mailto:ridvan.korkut@adu.edu.tr?subject=${mailSubject}&body=${mailBody}`;

        // Kullanıcıya hem bulut onayını hem de doğrudan mail gönderme kolaylığını sağla
        try {
          window.location.href = mailUrl;
        } catch (mErr) {}

        if (feedbackMessageInput) feedbackMessageInput.value = '';
        closeFeedbackModal();
        showToast('Geri bildiriminiz iletildi! Katkınız için teşekkür ederiz. 🙏');
      });
    }

    // ==========================================
    // GİZLİLİK POLİTİKASI MODALI (IN-APP NATIVE SUNUM)
    // ==========================================
    const privacyModal = document.getElementById('privacyModal');
    const closePrivacyModalBtn = document.getElementById('closePrivacyModalBtn');
    const privacyModalOkBtn = document.getElementById('privacyModalOkBtn');
    const aboutOpenPrivacyBtn = document.getElementById('aboutOpenPrivacyBtn');
    const settingPrivacyBtn = document.getElementById('settingPrivacyBtn');

    window.openPrivacyModal = openPrivacyModal;
    function openPrivacyModal() {
      if (privacyModal) privacyModal.classList.add('active');
    }

    function closePrivacyModal() {
      if (privacyModal) privacyModal.classList.remove('active');
    }

    if (closePrivacyModalBtn) closePrivacyModalBtn.addEventListener('click', closePrivacyModal);
    if (privacyModalOkBtn) privacyModalOkBtn.addEventListener('click', closePrivacyModal);

    if (aboutOpenPrivacyBtn) {
      aboutOpenPrivacyBtn.addEventListener('click', () => {
        closeAboutModal();
        openPrivacyModal();
      });
    }

    if (settingPrivacyBtn) {
      settingPrivacyBtn.addEventListener('click', () => {
        closeSettingsModal();
        openPrivacyModal();
      });
    }

    if (privacyModal) {
      privacyModal.addEventListener('click', (e) => {
        if (e.target === privacyModal) closePrivacyModal();
      });
    }

    // ==========================================
    // OYUN SES EFEKTLERİ AÇMA / KAPAMA ETKİLEŞİMİ
    // ==========================================
    const gameSoundFxToggleBtn = document.getElementById('gameSoundFxToggleBtn');
    const settingSoundFx = document.getElementById('settingSoundFx');

    updateSoundFxUI();

    if (gameSoundFxToggleBtn) {
      gameSoundFxToggleBtn.addEventListener('click', () => {
        setSoundFxEnabled(!soundFxEnabled);
        if (soundFxEnabled) {
          playSoundEffect('correct');
          showToast('🔊 Oyun ses efektleri açıldı');
        } else {
          showToast('🔇 Oyun ses efektleri kapatıldı');
        }
      });
    }

    if (settingSoundFx) {
      settingSoundFx.addEventListener('change', (e) => {
        setSoundFxEnabled(e.target.checked);
        if (soundFxEnabled) {
          playSoundEffect('correct');
          showToast('🔊 Oyun ses efektleri açıldı');
        } else {
          showToast('🔇 Oyun ses efektleri kapatıldı');
        }
      });
    }

    const settingHapticFeedback = document.getElementById('settingHapticFeedback');
    if (settingHapticFeedback) {
      settingHapticFeedback.checked = hapticEnabled;
      settingHapticFeedback.addEventListener('change', (e) => {
        setHapticFeedbackEnabled(e.target.checked);
        if (e.target.checked) {
          showToast('📳 Titreşimli geri bildirim açıldı');
        } else {
          showToast('🔕 Titreşimli geri bildirim kapatıldı');
        }
      });
    }

    // Kart Titreşimi Seçeneği
    const settingCardHaptic = document.getElementById('settingCardHaptic');
    if (settingCardHaptic) {
      settingCardHaptic.checked = state.cardHaptic;
      settingCardHaptic.addEventListener('change', (e) => {
        state.cardHaptic = e.target.checked;
        localStorage.setItem('kelime_card_haptic', state.cardHaptic);
        if (state.cardHaptic) {
          triggerHapticFeedback('light', 'card');
          showToast('📳 Kart titreşimi açıldı');
        } else {
          showToast('🔕 Kart titreşimi kapatıldı');
        }
      });
    }

    // Oyun Titreşimi Seçeneği
    const settingGameHaptic = document.getElementById('settingGameHaptic');
    if (settingGameHaptic) {
      settingGameHaptic.checked = state.gameHaptic;
      settingGameHaptic.addEventListener('change', (e) => {
        state.gameHaptic = e.target.checked;
        localStorage.setItem('kelime_game_haptic', state.gameHaptic);
        if (state.gameHaptic) {
          triggerHapticFeedback('light', 'game');
          showToast('📳 Oyun titreşimi açıldı');
        } else {
          showToast('🔕 Oyun titreşimi kapatıldı');
        }
      });
    }

    // Arena / Oyun Yazı Boyutu Seçimi
    const gameFontBtns = document.querySelectorAll('#gameFontSizeSegmentGroup .setting-segment-btn');
    if (gameFontBtns) {
      gameFontBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const size = btn.getAttribute('data-size');
          if (size) {
            applyGameFont(size);
            triggerHapticFeedback('light', 'game');
            showToast(`Arena yazı boyutu: ${btn.textContent}`);
          }
        });
      });
    }

    // Boşluk Doldurma Türkçe Çeviri Aç/Kapat Butonu
    if (dom.clozeToggleTranslationBtn) {
      dom.clozeToggleTranslationBtn.addEventListener('click', () => {
        if (!dom.clozeTranslationText) return;
        const isShown = dom.clozeTranslationText.style.display !== 'none';
        dom.clozeTranslationText.style.display = isShown ? 'none' : 'block';
        dom.clozeToggleTranslationBtn.classList.toggle('active', !isShown);
      });
    }

    // Arena Ayarları: Boşluk Doldurma Türkçe Çeviriyi Otomatik Göster
    const settingClozeAutoTranslate = document.getElementById('settingClozeAutoTranslate') || dom.settingClozeAutoTranslate;
    if (settingClozeAutoTranslate) {
      settingClozeAutoTranslate.checked = !!state.clozeAutoTranslate;
      settingClozeAutoTranslate.addEventListener('change', (e) => {
        state.clozeAutoTranslate = e.target.checked;
        localStorage.setItem('kelime_cloze_auto_translate', state.clozeAutoTranslate);
        showToast(state.clozeAutoTranslate ? 'Boşluk doldurma çevirisi her zaman açık' : 'Boşluk doldurma çevirisi varsayılan olarak gizlendi');
      });
    }

    // ==========================================
    // GÜNCELLEME KONTROL SİSTEMİ (UPDATE CHECK)
    // ==========================================
    const settingCheckUpdateBtn = document.getElementById('settingCheckUpdateBtn');
    const aboutCheckUpdateBtn = document.getElementById('aboutCheckUpdateBtn');
    const appUpdateModal = document.getElementById('appUpdateModal');
    const closeAppUpdateModalBtn = document.getElementById('closeAppUpdateModalBtn');

    if (closeAppUpdateModalBtn && appUpdateModal) {
      closeAppUpdateModalBtn.addEventListener('click', () => {
        appUpdateModal.style.display = 'none';
      });
      appUpdateModal.addEventListener('click', (e) => {
        if (e.target === appUpdateModal) {
          appUpdateModal.style.display = 'none';
        }
      });
    }

    async function checkAppUpdates(btnEl) {
      if (btnEl) {
        btnEl.disabled = true;
        const origHtml = btnEl.innerHTML;
        btnEl.innerHTML = '<span>⏳</span><span>Denetleniyor...</span>';
        setTimeout(() => {
          btnEl.disabled = false;
          btnEl.innerHTML = origHtml;
          const versionText = document.getElementById('appUpdateVersionText');
          if (versionText) versionText.textContent = APP_VERSION;
          if (appUpdateModal) {
            appUpdateModal.style.display = 'flex';
            playSoundEffect('correct');
          } else {
            showToast(`✅ Harika! En güncel sürümü (${APP_VERSION}) kullanıyorsunuz.`, 'correct');
            playSoundEffect('correct');
          }
        }, 700);
      } else {
        showToast(`✅ En güncel sürümü (${APP_VERSION}) kullanıyorsunuz.`, 'correct');
      }
    }

    if (settingCheckUpdateBtn) {
      settingCheckUpdateBtn.addEventListener('click', () => checkAppUpdates(settingCheckUpdateBtn));
    }
    if (aboutCheckUpdateBtn) {
      aboutCheckUpdateBtn.addEventListener('click', () => checkAppUpdates(aboutCheckUpdateBtn));
    }

    // Alt Sabit Navigasyon Çubuğu (Geriye dönük uyumluluk)
    if (dom.navItemHome) dom.navItemHome.addEventListener('click', () => switchAppMode('home'));
    if (dom.navItemCards) dom.navItemCards.addEventListener('click', () => switchAppMode('flashcards'));
    if (dom.navItemArena) dom.navItemArena.addEventListener('click', () => switchAppMode('arena'));
    if (dom.navItemSettings) dom.navItemSettings.addEventListener('click', () => openSettingsModal());

    // Alt Ortada Küçük Açılır / Ana Ekran Düğmesi (Floating Nav Dock)
    if (dom.floatingHomeBtn) {
      dom.floatingHomeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFloatingNavMenu();
      });
    }

    if (dom.floatingToggleBtn) {
      dom.floatingToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFloatingNavMenu();
      });
    }

    if (dom.floatMenuHome) {
      dom.floatMenuHome.addEventListener('click', (e) => {
        e.stopPropagation();
        closeFloatingNavMenu();
        switchAppMode('home');
      });
    }

    if (dom.floatMenuCards) {
      dom.floatMenuCards.addEventListener('click', (e) => {
        e.stopPropagation();
        closeFloatingNavMenu();
        switchAppMode('flashcards');
      });
    }

    if (dom.floatMenuArena) {
      dom.floatMenuArena.addEventListener('click', (e) => {
        e.stopPropagation();
        closeFloatingNavMenu();
        switchAppMode('arena');
      });
    }

    if (dom.drawerBackdrop) {
      dom.drawerBackdrop.addEventListener('click', (e) => {
        e.stopPropagation();
        closeFloatingNavMenu();
      });
    }

    if (dom.drawerCloseBtn) {
      dom.drawerCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeFloatingNavMenu();
      });
    }

    if (dom.drawerCloseBar) {
      dom.drawerCloseBar.addEventListener('click', (e) => {
        e.stopPropagation();
        closeFloatingNavMenu();
      });
    }

    // Dışarı tıklandığında yüzen açılır menüyü kapat
    document.addEventListener('click', (e) => {
      if (dom.floatingNavDock && !dom.floatingNavDock.contains(e.target)) {
        closeFloatingNavMenu();
      }
    });

    // Giriş Sayfası Aksiyon Butonları
    if (dom.homeStartBtn) {
      dom.homeStartBtn.addEventListener('click', () => {
        const allWords = getWordsData().filter(w => w.dil === state.activeLanguage);
        const unitWords = allWords.filter(w => w.unite_no === state.activeUnitNo);
        const baseGoal = state.dailyGoal || 15;
        const isFullUnitMode = baseGoal >= 999;
        const effectiveGoal = isFullUnitMode ? unitWords.length : (baseGoal + (state.dailyGoalExtra || 0));
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startTimestamp = startOfDay.getTime();
        const learnedToday = unitWords.filter(w => {
          const rec = state.learnedMap[w.id];
          return rec && rec.learned && (!rec.learnedAt || (state.sessionLearnedIds && state.sessionLearnedIds.has(w.id)) || rec.learnedAt >= startTimestamp || (Date.now() - rec.learnedAt < 24 * 60 * 60 * 1000));
        }).length;

        if (learnedToday >= effectiveGoal) {
          state.activeFilter = 'learned';
          localStorage.setItem('kelime_active_filter', 'learned');
          state.currentIndex = 0;
        } else {
          state.activeFilter = 'pending';
          localStorage.setItem('kelime_active_filter', 'pending');
        }
        switchAppMode('flashcards');
      });
    }
    if (dom.flashcardsBackBtn) dom.flashcardsBackBtn.addEventListener('click', () => switchAppMode('home'));
    if (dom.cardFullHomeBtn) dom.cardFullHomeBtn.addEventListener('click', () => switchAppMode('home'));
    if (dom.homeViewAllArenaBtn) dom.homeViewAllArenaBtn.addEventListener('click', () => switchAppMode('arena'));
    if (dom.homeArenaBannerCard) dom.homeArenaBannerCard.addEventListener('click', (e) => {
      if (e.target.closest('#homeViewAllArenaBtn')) return;
      switchAppMode('arena');
    });

    // Giriş Sayfasındaki Öne Çıkan Oyun Başlatıcıları
    function handleHomeGameClick(gameKey, minWords) {
      const pool = getLearnedWordsPool();
      if (pool.length < minWords) {
        showToast(`Bu oyun için en az ${minWords} kelime öğrenmelisiniz. (Şu an: ${pool.length})`);
        return;
      }
      switchAppMode('arena');
      launchGame(gameKey);
    }

    if (dom.homeGameMatch) dom.homeGameMatch.addEventListener('click', () => handleHomeGameClick('match', 8));
    if (dom.homeGameQuiz) dom.homeGameQuiz.addEventListener('click', () => handleHomeGameClick('quiz', 6));
    if (dom.homeGameCloze) dom.homeGameCloze.addEventListener('click', () => handleHomeGameClick('cloze', 4));
    if (dom.homeGameTetris) dom.homeGameTetris.addEventListener('click', () => handleHomeGameClick('tetris', 3));

    // Rozetler Butonu & Modalı
    dom.badgesBtn.addEventListener('click', openBadgesModal);
    dom.closeBadgesModalBtn.addEventListener('click', closeBadgesModal);
    dom.badgesModal.addEventListener('click', (e) => {
      if (e.target === dom.badgesModal) closeBadgesModal();
    });

    // Kutlama Modalı Kapatma
    dom.closeCelebrationBtn.addEventListener('click', closeBadgeCelebration);
    dom.badgeCelebrationModal.addEventListener('click', (e) => {
      if (e.target === dom.badgeCelebrationModal) closeBadgeCelebration();
    });

    // Arena Oyun Menüsü Seçimi (Games Hub)
    if (dom.gamesHubGrid) {
      dom.gamesHubGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.game-hub-card');
        if (!card) return;
        const game = card.getAttribute('data-game');
        if (game) launchGame(game);
      });
    }
    if (dom.gameHubCards) {
      dom.gameHubCards.forEach(card => {
        card.addEventListener('click', () => {
          const game = card.getAttribute('data-game');
          if (game) launchGame(game);
        });
      });
    }

    // Kelime Arenası Listesine Geri Dön (Geri Butonu, Bitir Butonu ve Kapat ✕ Butonu)
    if (dom.backToGamesMenuBtn) {
      dom.backToGamesMenuBtn.addEventListener('click', showGamesMenu);
    }
    if (dom.activeGameEndBtn) {
      dom.activeGameEndBtn.addEventListener('click', showGamesMenu);
    }
    if (dom.closeActiveGameBtn) {
      dom.closeActiveGameBtn.addEventListener('click', showGamesMenu);
    }

    // Oyun kartı içindeki inline Bitir butonları (delegated)
    if (dom.arenaActiveGameArea) {
      dom.arenaActiveGameArea.addEventListener('click', (e) => {
        const endBtn = e.target.closest('.game-card-header-actions .active-game-end-btn') ||
                        e.target.closest('.tetris-header-right .active-game-end-btn');
        if (endBtn) {
          showGamesMenu();
        }
      });
    }

    // Oyun Kuralları / Nasıl Oynanır Butonu ve Başla Butonu
    if (dom.gameHowToPlayBtn) {
      dom.gameHowToPlayBtn.addEventListener('click', () => {
        if (state.activeGame) {
          showGameHowToPlay(state.activeGame, true);
        }
      });
    }
    if (dom.gameStartPlayBtn) {
      dom.gameStartPlayBtn.addEventListener('click', hideGameHowToPlay);
    }
    if (dom.gameHowToPlayOverlay) {
      dom.gameHowToPlayOverlay.addEventListener('click', (e) => {
        if (e.target === dom.gameHowToPlayOverlay) hideGameHowToPlay();
      });
    }

    // Günlük Hedef Tamamlandı Modalı Butonları
    if (dom.goToActivitiesBtn) {
      dom.goToActivitiesBtn.addEventListener('click', () => {
        hideDailyGoalCompleteModal();
        switchAppMode('arena');
        showGamesMenu();
      });
    }
    if (dom.learnMoreWordsBtn) {
      dom.learnMoreWordsBtn.addEventListener('click', () => {
        hideDailyGoalCompleteModal();
        const remaining = getUnlearnedWordsCountInActiveUnit();
        if (remaining === 0) {
          showToast('⚠️ Bu ünitedeki tüm kelimeleri zaten öğrendiniz! Eklenecek başka yeni kelime kalmadı. 🏆', 4000);
          return;
        }
        const addCount = 5;
        state.activeFilter = 'pending';
        localStorage.setItem('kelime_active_filter', 'pending');
        state.currentIndex = 0;
        state.dailyGoalExtra = (state.dailyGoalExtra || 0) + addCount;
        refreshWordsList();
        showToast(`+${addCount} yeni kelime daha eklendi!`);
      });
    }
    if (dom.closeGoalCompleteModalBtn) {
      dom.closeGoalCompleteModalBtn.addEventListener('click', hideDailyGoalCompleteModal);
    }
    if (dom.dailyGoalCompleteModal) {
      dom.dailyGoalCompleteModal.addEventListener('click', (e) => {
        if (e.target === dom.dailyGoalCompleteModal) hideDailyGoalCompleteModal();
      });
    }

    // Günlük Pratik ve Pekiştirme Rehberlik Modalı Butonları
    if (dom.dailyPracticedContinueAllBtn) {
      dom.dailyPracticedContinueAllBtn.addEventListener('click', () => {
        const type = dom.dailyPracticedContinueAllBtn.dataset.milestoneType;
        if (dom.dailyPracticeCompletedModal) {
          dom.dailyPracticeCompletedModal.style.display = 'none';
        }
        playSoundEffect('correct');
        if (type === 'full') {
          state.arenaUseAllLearnedWordsPool = true;
          showCelebrationBanner('Tüm Kelimeler Devrede! 🚀', 'Artık öğrendiğin tüm kelimelerle yarışıyorsun', 'Hazır!', '🔥');
          showToast('Tüm öğrenilen kelimeler arenaya dahil edildi!', 'correct');
        } else {
          showToast('🚀 Harika, kelimeleri pekiştirmeye devam!', 'correct');
        }
      });
    }

    const dailyPracticedGoLearnBtn = document.getElementById('dailyPracticedGoLearnBtn');
    if (dailyPracticedGoLearnBtn) {
      dailyPracticedGoLearnBtn.addEventListener('click', () => {
        if (dom.dailyPracticeCompletedModal) {
          dom.dailyPracticeCompletedModal.style.display = 'none';
        }
        switchAppMode('flashcards');
        showToast('📚 Yeni kelimeler öğrenme ekranı açıldı.');
      });
    }

    if (dom.dailyPracticedExitArenaBtn) {
      dom.dailyPracticedExitArenaBtn.addEventListener('click', () => {
        if (dom.dailyPracticeCompletedModal) {
          dom.dailyPracticeCompletedModal.style.display = 'none';
        }
        switchAppMode('home');
      });
    }

    if (dom.dailyPracticeCompletedModal) {
      dom.dailyPracticeCompletedModal.addEventListener('click', (e) => {
        if (e.target === dom.dailyPracticeCompletedModal) {
          dom.dailyPracticeCompletedModal.style.display = 'none';
        }
      });
    }

    // Kart İçi Tam Ekran Bitiş Görünümü Butonları
    if (dom.cardFullArenaBtn) {
      dom.cardFullArenaBtn.addEventListener('click', () => {
        switchAppMode('arena');
        showGamesMenu();
      });
    }
    if (dom.cardFullLearnMoreBtn) {
      dom.cardFullLearnMoreBtn.addEventListener('click', () => {
        const remaining = getUnlearnedWordsCountInActiveUnit();
        if (remaining === 0) {
          showToast('⚠️ Bu ünitedeki tüm kelimeleri zaten öğrendiniz! Eklenecek başka yeni kelime kalmadı. 🏆', 4000);
          return;
        }
        const addCount = 5;
        state.activeFilter = 'pending';
        localStorage.setItem('kelime_active_filter', 'pending');
        state.currentIndex = 0;
        state.dailyGoalExtra = (state.dailyGoalExtra || 0) + addCount;
        refreshWordsList();
        showToast(`+${addCount} yeni kelime daha eklendi!`);
      });
    }
    if (dom.cardFullReviewLearnedBtn) {
      dom.cardFullReviewLearnedBtn.addEventListener('click', () => {
        dom.filterTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-filter') === 'learned'));
        state.activeFilter = 'learned';
        localStorage.setItem('kelime_active_filter', 'learned');
        state.currentIndex = 0;
        refreshWordsList();
      });
    }

    // 💡 İPUCU BUTONLARI (8 AKTİVİTE / OYUN İÇİN)
    if (dom.matchHintBtn) dom.matchHintBtn.addEventListener('click', giveMatchHint);
    if (dom.tfHintBtn) dom.tfHintBtn.addEventListener('click', giveTrueFalseHint);
    if (dom.tetrisHintBtn) dom.tetrisHintBtn.addEventListener('click', giveTetrisHint);
    if (dom.anagramHintBtn) dom.anagramHintBtn.addEventListener('click', giveAnagramHint);
    if (dom.listenHintBtn) dom.listenHintBtn.addEventListener('click', giveListenHint);
    if (dom.quizHintBtn) dom.quizHintBtn.addEventListener('click', giveQuizHint);
    if (dom.scrambleHintBtn) dom.scrambleHintBtn.addEventListener('click', giveScrambleHint);
    if (dom.clozeHintBtn) dom.clozeHintBtn.addEventListener('click', giveClozeHint);

    // Arena Yetersiz Kelime -> Kartlara Dön Butonu
    if (dom.arenaGoToCardsBtn) {
      dom.arenaGoToCardsBtn.addEventListener('click', () => switchAppMode('flashcards'));
    }

    // 1. Kart Eşleştirme (Match) kart tıklamaları dinamik olarak kart oluşturulurken bağlanır

    // 2. Doğru mu Yanlış mı? (True or False)
    if (dom.tfTrueBtn) {
      dom.tfTrueBtn.addEventListener('click', () => handleTrueFalseAnswer(true));
    }
    if (dom.tfFalseBtn) {
      dom.tfFalseBtn.addEventListener('click', () => handleTrueFalseAnswer(false));
    }
    if (dom.tfAudioBtn) {
      dom.tfAudioBtn.addEventListener('click', () => {
        if (tfState.targetWord) {
          speakWord(tfState.targetWord.kelime, tfState.targetWord.dil, dom.tfAudioBtn);
        }
      });
    }

    // 3. Tetris Kontrolleri
    if (dom.tetrisAudioBtn) {
      dom.tetrisAudioBtn.addEventListener('click', () => {
        if (tetrisState.targetWord) {
          speakWord(tetrisState.targetWord.kelime, tetrisState.targetWord.dil, dom.tetrisAudioBtn);
        }
      });
    }
    if (dom.tetrisFullscreenBtn) {
      dom.tetrisFullscreenBtn.addEventListener('click', () => {
        setTetrisFullscreen(!tetrisState.isFullscreen);
      });
    }
    if (dom.tetrisExitBtn) {
      dom.tetrisExitBtn.addEventListener('click', () => {
        setTetrisFullscreen(false);
      });
    }

    // 4. Anagram Kontrolleri
    if (dom.anagramAudioBtn) {
      dom.anagramAudioBtn.addEventListener('click', () => {
        if (anagramState.targetWord) {
          speakWord(anagramState.targetWord.kelime, anagramState.targetWord.dil, dom.anagramAudioBtn);
        }
      });
    }
    if (dom.anagramBackspaceBtn) {
      dom.anagramBackspaceBtn.addEventListener('click', anagramBackspace);
    }
    if (dom.anagramResetBtn) {
      dom.anagramResetBtn.addEventListener('click', anagramReset);
    }

    // 5. Dinle ve Yaz Kontrolleri
    const listenHeaderAudioBtn = document.getElementById('listenHeaderAudioBtn');
    if (listenHeaderAudioBtn) {
      listenHeaderAudioBtn.addEventListener('click', () => {
        if (listenState.targetWord) {
          speakWord(listenState.targetWord.kelime, listenState.targetWord.dil, listenHeaderAudioBtn);
        }
      });
    }
    if (dom.listenPlayAudioBtn) {
      dom.listenPlayAudioBtn.addEventListener('click', () => {
        if (listenState.targetWord) {
          speakWord(listenState.targetWord.kelime, listenState.targetWord.dil, dom.listenPlayAudioBtn);
        }
      });
    }
    if (dom.listenBackspaceBtn) {
      dom.listenBackspaceBtn.addEventListener('click', listenBackspace);
    }
    if (dom.listenResetBtn) {
      dom.listenResetBtn.addEventListener('click', listenReset);
    }

    // 6. 4 Şıklı Test Kontrolleri
    if (dom.quizAudioBtn) {
      dom.quizAudioBtn.addEventListener('click', () => {
        if (quizState.targetWord) {
          speakWord(quizState.targetWord.kelime, quizState.targetWord.dil, dom.quizAudioBtn);
        }
      });
    }

    // 7. Cümle Kurma Kontrolleri
    if (dom.scrambleAudioBtn) {
      dom.scrambleAudioBtn.addEventListener('click', () => {
        if (scrambleState.originalWords && scrambleState.originalWords.length > 0 && scrambleState.targetWord) {
          speakWord(scrambleState.originalWords.join(' '), scrambleState.targetWord.dil, dom.scrambleAudioBtn);
        }
      });
    }
    if (dom.scrambleBackspaceBtn) {
      dom.scrambleBackspaceBtn.addEventListener('click', scrambleBackspace);
    }
    if (dom.scrambleResetBtn) {
      dom.scrambleResetBtn.addEventListener('click', scrambleReset);
    }

    // ==========================================
    // REHBER VE ÖZELLİK TANITIM TURU (SPEECH BUBBLES)
    // ==========================================
    const TOUR_STEPS = [
      {
        targetSelector: '#brandHeaderHomeBtn',
        title: 'ℹ️ LexiQ Hakkında',
        desc: 'Uygulama logosuna dokunarak LexiQ hakkında bilgilere, sürüm detaylarına ve geliştirici notlarına ulaşabilirsin.'
      },
      {
        targetSelector: '#leaderboardBtn',
        title: '🏆 Sıralama Tablosu',
        desc: 'Sıralama butonuna tıklayarak okulundaki ve genel listedeki yerini, en çok çalışan öğrencileri inceleyebilirsin.'
      },
      {
        targetSelector: '#userProfileBtn',
        title: '👤 Profil ve Ayarlar',
        desc: 'İsmin, sınıfın ve avatarın burada yer alır. Tıklayarak profilini düzenleyebilir ve tüm ayarlara erişebilirsin.'
      },
      {
        targetSelector: '#badgesBtn',
        title: '⭐ XP ve Rozetler',
        desc: 'Kelime öğrendikçe ve oyunları tamamladıkça kazandığın toplam XP ve başarı rozetlerini buradan görebilirsin.'
      },
      {
        targetSelector: '#headerUnitSelectBtn',
        title: '📚 Çalışılan Ünite',
        desc: 'Buraya dokunarak seviyene ve müfredatına uygun farklı üniteler arasında hızlıca geçiş yapabilirsin.'
      },
      {
        targetSelector: '#homeStartBtn',
        title: '🃏 Kelime Öğren (Kartlar)',
        desc: 'Seçili ünitenin kelimelerini sesli telaffuzlar, Türkçe karşılıklar ve örnek cümlelerle çalışmak için kartları başlat.'
      },
      {
        targetSelector: '#homeArenaBannerCard',
        title: '🎮 Kelime Arenası',
        desc: 'Öğrendiğin kelimeleri test et! Eşleştirme, Dinle & Yaz, Hızlı Test gibi 8 eğlenceli oyun seni bekliyor.'
      },
      {
        targetSelector: '#userProfileBtn',
        title: '🎉 Tanıtım Tamamlandı!',
        desc: 'Tüm özellikleri öğrendin! İhtiyacın olduğunda bu rehber baloncuklarını Ayarlar > Sistem menüsünden tekrar başlatabilirsin.'
      }
    ];

    let currentTourIndex = 0;
    let currentHighlightedEl = null;

    function updateTourPosition(targetEl) {
      if (!dom.tourBubble || !dom.tourArrow) return;

      const bubble = dom.tourBubble;
      const arrow = dom.tourArrow;

      if (!targetEl) {
        bubble.style.top = '50%';
        bubble.style.left = '50%';
        bubble.style.transform = 'translate(-50%, -50%)';
        arrow.className = 'tour-arrow arrow-hidden';
        return;
      }

      bubble.style.transform = 'none';

      const rect = targetEl.getBoundingClientRect();
      const bubbleWidth = bubble.offsetWidth || 320;
      const bubbleHeight = bubble.offsetHeight || 150;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Yatay konumu hesapla (ekran dışına taşmaması için clamp)
      const targetCenterX = rect.left + rect.width / 2;
      let bubbleLeft = targetCenterX - bubbleWidth / 2;
      bubbleLeft = Math.max(16, Math.min(bubbleLeft, viewportWidth - bubbleWidth - 16));

      // Dikey konum: Hedefin altına mı üstüne mi yerleştirelim?
      const spaceBelow = viewportHeight - rect.bottom;
      let bubbleTop = 0;
      let isBelow = true;

      if (spaceBelow >= bubbleHeight + 20 || rect.top < 120) {
        bubbleTop = rect.bottom + 12;
        isBelow = true;
      } else {
        bubbleTop = Math.max(12, rect.top - bubbleHeight - 12);
        isBelow = false;
      }

      bubble.style.left = `${bubbleLeft}px`;
      bubble.style.top = `${bubbleTop}px`;

      // Konuşma balonu okunun yatay konumu (hedefin ortasını göstersin)
      let arrowLeft = targetCenterX - bubbleLeft - 7;
      arrowLeft = Math.max(18, Math.min(arrowLeft, bubbleWidth - 28));
      arrow.style.left = `${arrowLeft}px`;

      if (isBelow) {
        arrow.className = 'tour-arrow arrow-top';
      } else {
        arrow.className = 'tour-arrow arrow-bottom';
      }
    }

    function showTourStep(index) {
      if (index < 0 || index >= TOUR_STEPS.length) {
        endTour(true);
        return;
      }

      currentTourIndex = index;
      const step = TOUR_STEPS[index];

      if (currentHighlightedEl) {
        currentHighlightedEl.classList.remove('tour-highlight-target');
        currentHighlightedEl = null;
      }

      const targetEl = document.querySelector(step.targetSelector);
      if (targetEl) {
        targetEl.classList.add('tour-highlight-target');
        currentHighlightedEl = targetEl;
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      if (dom.tourStepBadge) dom.tourStepBadge.textContent = `${index + 1} / ${TOUR_STEPS.length}`;
      if (dom.tourTitle) dom.tourTitle.textContent = step.title;
      if (dom.tourDesc) dom.tourDesc.textContent = step.desc;

      if (dom.tourPrevBtn) {
        dom.tourPrevBtn.style.display = index === 0 ? 'none' : 'inline-block';
      }

      if (dom.tourNextBtn) {
        if (index === TOUR_STEPS.length - 1) {
          dom.tourNextBtn.textContent = 'Harika, Başla! 🚀';
        } else {
          dom.tourNextBtn.textContent = 'Sonraki ▶';
        }
      }

      if (dom.lexiqTourOverlay) {
        dom.lexiqTourOverlay.style.display = 'block';
      }

      setTimeout(() => {
        updateTourPosition(targetEl);
      }, 60);
    }

    function nextTourStep() {
      if (currentTourIndex < TOUR_STEPS.length - 1) {
        showTourStep(currentTourIndex + 1);
      } else {
        endTour(true);
        showToast('LexiQ özellikleri hazır! İyi çalışmalar 🎉');
      }
    }

    function prevTourStep() {
      if (currentTourIndex > 0) {
        showTourStep(currentTourIndex - 1);
      }
    }

    function endTour(completed = true) {
      if (currentHighlightedEl) {
        currentHighlightedEl.classList.remove('tour-highlight-target');
        currentHighlightedEl = null;
      }
      if (dom.lexiqTourOverlay) {
        dom.lexiqTourOverlay.style.display = 'none';
      }
      if (completed) {
        localStorage.setItem('lexiq_tour_completed', 'true');
      }
    }

    function startFeatureTour(force = false) {
      if (!force && localStorage.getItem('lexiq_tour_completed') === 'true') {
        return;
      }

      if (dom.onboardingModal && dom.onboardingModal.classList.contains('active')) {
        return;
      }

      if (typeof switchAppMode === 'function') {
        switchAppMode('home');
      }

      setTimeout(() => {
        showTourStep(0);
      }, 350);
    }

    window.startFeatureTour = startFeatureTour;

    if (dom.tourNextBtn) dom.tourNextBtn.addEventListener('click', nextTourStep);
    if (dom.tourPrevBtn) dom.tourPrevBtn.addEventListener('click', prevTourStep);
    if (dom.tourSkipBtn) dom.tourSkipBtn.addEventListener('click', () => endTour(true));
    if (dom.tourCloseBtn) dom.tourCloseBtn.addEventListener('click', () => endTour(true));
    if (dom.tourBackdrop) dom.tourBackdrop.addEventListener('click', () => endTour(true));

    if (dom.restartTourBtn) {
      dom.restartTourBtn.addEventListener('click', () => {
        closeSettingsModal(true);
        startFeatureTour(true);
      });
    }

    window.addEventListener('resize', () => {
      if (dom.lexiqTourOverlay && dom.lexiqTourOverlay.style.display !== 'none') {
        const step = TOUR_STEPS[currentTourIndex];
        const targetEl = step ? document.querySelector(step.targetSelector) : null;
        updateTourPosition(targetEl);
      }
    });

    // ==========================================
    // STREAK PLEDGE EVENT LISTENERS
    // ==========================================
    // 1. Onboarding Streak Seçim Çipleri
    const obStreakChips = document.querySelectorAll('.ob-streak-chip');
    const obSkipStreakPledgeBtn = document.getElementById('obSkipStreakPledgeBtn');
    if (obStreakChips) {
      obStreakChips.forEach(chip => {
        chip.addEventListener('click', () => {
          obStreakChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          obState.streakPledgeDays = parseInt(chip.getAttribute('data-streak-days'), 10) || 5;
        });
      });
    }
    if (obSkipStreakPledgeBtn) {
      obSkipStreakPledgeBtn.addEventListener('click', () => {
        obStreakChips.forEach(c => c.classList.remove('active'));
        obState.streakPledgeDays = null;
        showToast('Seri sözü atlandı. Dilediğin zaman ayarlardan başlatabilirsin.');
      });
    }

    // 2. Ayarlar Panelindeki Streak Taahhüt Butonları
    const settingStreakOptBtns = document.querySelectorAll('.setting-streak-opt-btn');
    let selectedSettingStreakDays = 5;
    if (settingStreakOptBtns) {
      settingStreakOptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          settingStreakOptBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedSettingStreakDays = parseInt(btn.getAttribute('data-days'), 10) || 5;
        });
      });
    }

    const settingStartStreakPledgeBtn = document.getElementById('settingStartStreakPledgeBtn');
    if (settingStartStreakPledgeBtn) {
      settingStartStreakPledgeBtn.addEventListener('click', () => {
        startStreakPledge(selectedSettingStreakDays);
      });
    }

    const settingViewStreakModalBtn = document.getElementById('settingViewStreakModalBtn');
    if (settingViewStreakModalBtn) {
      settingViewStreakModalBtn.addEventListener('click', () => {
        openStreakPledgeModal();
      });
    }

    // 3. Ana Sayfadaki Streak Rozeti Tıklaması
    if (dom.homeStatStreak) {
      dom.homeStatStreak.style.cursor = 'pointer';
      dom.homeStatStreak.addEventListener('click', () => {
        openStreakPledgeModal();
      });
    }

    // 4. Streak Pledge Modalı Butonları
    const closeStreakModalBtn = document.getElementById('closeStreakModalBtn');
    const streakModalActionBtn = document.getElementById('streakModalActionBtn');
    const streakPledgeModal = document.getElementById('streakPledgeModal');

    if (closeStreakModalBtn) {
      closeStreakModalBtn.addEventListener('click', closeStreakPledgeModal);
    }
    if (streakPledgeModal) {
      streakPledgeModal.addEventListener('click', (e) => {
        if (e.target === streakPledgeModal) closeStreakPledgeModal();
      });
    }
    if (streakModalActionBtn) {
      streakModalActionBtn.addEventListener('click', () => {
        closeStreakPledgeModal();
        const today = getTodayDateKey();
        const todayDone = state.streakPledge && state.streakPledge.history && state.streakPledge.history[today] === true;
        if (!todayDone) {
          switchAppMode('flashcards');
        }
      });
    }

    // ==========================================
    // ANDROID GERİ TUŞU / UYGULAMADAN ÇIKIŞ DİYALOĞU
    // ==========================================
    window.handleAppBackPress = function() {
      // Açık modal varsa kapat
      const openModals = Array.from(document.querySelectorAll('.modal-overlay')).filter(m => m.style.display !== 'none');
      if (openModals.length > 0) {
        openModals[openModals.length - 1].style.display = 'none';
        return true;
      }
      if (state.activeMode !== 'home') {
        switchAppMode('home');
        return true;
      }

      // Ana sayfadayken çekici çıkış onay ekranı göster
      showAppConfirm({
        title: "LexiQ'ten Çıkış",
        message: "Bugünkü kelime çalışmaların ve kazandığın puanlar güvende! 🎯\n\nUygulamadan çıkmak istediğine emin misin?",
        icon: "👋",
        okText: "Uygulamadan Çık",
        cancelText: "Kal ve Çalış",
        isDanger: false
      }).then(confirmed => {
        if (confirmed) {
          if (window.AndroidTTS && typeof window.AndroidTTS.exitApp === 'function') {
            window.AndroidTTS.exitApp();
          } else if (navigator.app && typeof navigator.app.exitApp === 'function') {
            navigator.app.exitApp();
          } else {
            window.close();
          }
        }
      });
      return true;
    };

    // Dışarıya ve test simülatörüne oyun başlatma köprüsü sağla
    window.startGameRound = startGameRound;
  }

  // Uygulamayı başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
