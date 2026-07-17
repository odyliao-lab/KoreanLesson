"use client";

import { useEffect, useMemo, useState } from "react";

type View = "home" | "map" | "journal" | "lesson";

type Lesson = {
  day: number;
  eyebrow: string;
  title: string;
  korean: string;
  description: string;
  minutes: string;
  guide: string;
  guideColor: string;
  teachingTitle: string;
  teachingCopy: string;
  sounds: { char: string; label: string; hint: string }[];
  question: string;
  options: string[];
  answer: string;
  listenText: string;
  mission: string[];
};

const lessons: Lesson[] = [
  {
    day: 1,
    eyebrow: "韓文字的第一顆星",
    title: "認識基本母音",
    korean: "첫 번째 별",
    description:
      "看懂韓文字如何組成，認識 ㅏ、ㅓ、ㅗ、ㅜ、ㅡ、ㅣ 六個基本母音。",
    minutes: "約 50 分鐘",
    guide: "루미 Lumi",
    guideColor: "cyan",
    teachingTitle: "母音像六條不同方向的星光",
    teachingCopy:
      "韓文字不是圖案，而是可以拆解的積木。先觀察短線指向哪裡，再把聲音和形狀連起來。",
    sounds: [
      { char: "ㅏ", label: "아", hint: "像中文的「啊」" },
      { char: "ㅓ", label: "어", hint: "嘴巴自然張開" },
      { char: "ㅗ", label: "오", hint: "嘴唇向前圓起" },
      { char: "ㅜ", label: "우", hint: "圓唇、聲音較低" },
      { char: "ㅡ", label: "으", hint: "嘴角向兩側拉" },
      { char: "ㅣ", label: "이", hint: "像微笑時的「衣」" },
    ],
    question: "哪一個母音的短線朝上？",
    options: ["ㅏ", "ㅗ", "ㅜ"],
    answer: "ㅗ",
    listenText: "아, 어, 오, 우, 으, 이",
    mission: [
      "依照形狀，把六個母音抄寫三次",
      "閉上眼睛聽兩輪，再指出聽到的字",
      "不看提示，說出至少四個母音",
    ],
  },
  {
    day: 2,
    eyebrow: "星光開始有了聲音",
    title: "認識基本子音",
    korean: "소리를 만나요",
    description: "學會 ㄱ、ㄴ、ㄷ、ㄹ、ㅁ，觀察發音位置和字形之間的關係。",
    minutes: "約 55 分鐘",
    guide: "하루 Haru",
    guideColor: "violet",
    teachingTitle: "子音的形狀藏著發音提示",
    teachingCopy:
      "ㄴ 像舌尖碰到上排牙齒後方，ㅁ 像嘴巴閉起來。用動作記憶，比死背更快。",
    sounds: [
      { char: "ㄱ", label: "가", hint: "舌根靠近上顎" },
      { char: "ㄴ", label: "나", hint: "舌尖碰上方" },
      { char: "ㄷ", label: "다", hint: "舌尖短暫阻擋" },
      { char: "ㄹ", label: "라", hint: "舌尖輕彈一下" },
      { char: "ㅁ", label: "마", hint: "雙唇閉合再打開" },
    ],
    question: "哪一個子音的形狀像閉起來的嘴巴？",
    options: ["ㄴ", "ㄹ", "ㅁ"],
    answer: "ㅁ",
    listenText: "가, 나, 다, 라, 마",
    mission: [
      "對著鏡子觀察 ㄴ 和 ㅁ 的發音位置",
      "把五個子音和 ㅏ 組合並念兩輪",
      "遮住答案，依序寫出 ㄱ 到 ㅁ",
    ],
  },
  {
    day: 3,
    eyebrow: "讓星星組成音節",
    title: "拼出第一批韓文字",
    korean: "글자를 만들어요",
    description: "把子音與母音放進音節方塊，讀出 가、너、도、루、미。",
    minutes: "約 60 分鐘",
    guide: "별 Byeol",
    guideColor: "pink",
    teachingTitle: "每個韓文字都是一個小方塊",
    teachingCopy:
      "先念左邊或上方的子音，再接母音。直立母音排在右邊，水平母音放在下方。",
    sounds: [
      { char: "가", label: "ㄱ + ㅏ", hint: "左右排列" },
      { char: "너", label: "ㄴ + ㅓ", hint: "左右排列" },
      { char: "도", label: "ㄷ + ㅗ", hint: "上下排列" },
      { char: "루", label: "ㄹ + ㅜ", hint: "上下排列" },
      { char: "미", label: "ㅁ + ㅣ", hint: "左右排列" },
    ],
    question: "ㄷ 和 ㅗ 合起來是哪一個音節？",
    options: ["다", "도", "두"],
    answer: "도",
    listenText: "가, 너, 도, 루, 미",
    mission: [
      "用字卡排出 가、너、도、루、미",
      "聽發音後，指出左右排列或上下排列",
      "設計三個自己的音節星球",
    ],
  },
];

const dayTitles = [
  "基本母音",
  "基本子音 I",
  "組合第一批字",
  "Y 系母音",
  "複合母音",
  "送氣音與緊音",
  "收尾音入門",
  "發音總複習",
  "第一次打招呼",
  "韓文自我介紹",
  "主題助詞",
  "這個、那個",
  "有與沒有",
  "數字與年齡",
  "動詞現在式",
  "地點與方向",
  "否定表達",
  "喜歡與想要",
  "購物與點餐",
  "星光成果舞台",
];

const stages = [
  { name: "星光暖身", time: "5 分鐘", icon: "✦" },
  { name: "今日教學", time: "12 分鐘", icon: "◐" },
  { name: "引導練習", time: "10 分鐘", icon: "✎" },
  { name: "聽力跟讀", time: "10 分鐘", icon: "♫" },
  { name: "自習任務", time: "15 分鐘", icon: "☄" },
  { name: "今日結算", time: "5 分鐘", icon: "★" },
];

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [activeDay, setActiveDay] = useState(1);
  const [activeStage, setActiveStage] = useState(0);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("starlight-korean-progress");
      const savedNotes = localStorage.getItem("starlight-korean-notes");
      if (saved) setCompletedDays(JSON.parse(saved));
      if (savedNotes) setNotes(JSON.parse(savedNotes));
    } catch {
      // The course remains usable when browser storage is unavailable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      "starlight-korean-progress",
      JSON.stringify(completedDays),
    );
    localStorage.setItem("starlight-korean-notes", JSON.stringify(notes));
  }, [completedDays, notes, hydrated]);

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const timer = window.setInterval(
      () => setTimerSeconds((value) => value - 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [timerRunning, timerSeconds]);

  const lesson = lessons[activeDay - 1] ?? lessons[0];
  const progress = Math.round((completedDays.length / 20) * 100);
  const timerLabel = `${String(Math.floor(timerSeconds / 60)).padStart(
    2,
    "0",
  )}:${String(timerSeconds % 60).padStart(2, "0")}`;

  const encouragement = useMemo(() => {
    if (completedDays.length === 0) return "第一顆星正等著你點亮";
    if (completedDays.length < 3) return "你的韓語星圖正在成形";
    return "Day 1–3 已完成，準備前往下一個星域";
  }, [completedDays.length]);

  function navigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openLesson(day: number) {
    if (day > 3) return;
    setActiveDay(day);
    setActiveStage(0);
    setSelectedAnswer("");
    setTimerSeconds(15 * 60);
    setTimerRunning(false);
    navigate("lesson");
  }

  function speak(text: string, slow = false) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = slow ? 0.62 : 0.88;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function completeLesson() {
    setCompletedDays((days) =>
      days.includes(activeDay) ? days : [...days, activeDay],
    );
    navigate("map");
  }

  return (
    <div className="site-shell">
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="aurora aurora-two" aria-hidden="true" />
      <div className="star-field" aria-hidden="true" />

      <header className="topbar">
        <button className="brand" onClick={() => navigate("home")}>
          <span className="brand-star">✦</span>
          <span>
            <strong>별빛韓語研究所</strong>
            <small>Starlight Korean Lab</small>
          </span>
        </button>
        <nav aria-label="主要導覽">
          <button
            className={view === "map" ? "nav-active" : ""}
            onClick={() => navigate("map")}
          >
            學習地圖
          </button>
          <button
            className={view === "lesson" ? "nav-active" : ""}
            onClick={() => openLesson(1)}
          >
            練習室
          </button>
          <button
            className={view === "journal" ? "nav-active" : ""}
            onClick={() => navigate("journal")}
          >
            我的手帳
          </button>
        </nav>
        <button className="progress-pill" onClick={() => navigate("journal")}>
          <span>✦</span> {progress}%
        </button>
      </header>

      <main>
        {view === "home" && (
          <div className="home-view">
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">BEGIN YOUR KOREAN CONSTELLATION · 01</p>
                <h1>
                  오늘, 첫 번째
                  <br />
                  <em>별을 밝혀요</em>
                </h1>
                <p className="hero-chinese">
                  每天 45–60 分鐘，
                  <br />
                  從零開始點亮你的韓語星圖。
                </p>
                <div className="hero-actions">
                  <button
                    className="primary-button"
                    onClick={() => openLesson(1)}
                  >
                    <span>開始 Day 1</span>
                    <b>→</b>
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => navigate("map")}
                  >
                    查看 20 天航線
                  </button>
                </div>
                <div className="hero-meta">
                  <span>免登入</span>
                  <span>iPad 優先</span>
                  <span>韓語語音</span>
                  <span>本機保存</span>
                </div>
              </div>

              <div className="hero-visual">
                <div className="orbit orbit-one" aria-hidden="true" />
                <div className="orbit orbit-two" aria-hidden="true" />
                <div className="art-frame">
                  <img
                    src="/og.png"
                    alt="五位原創星光學習隊角色在極光星空下展開韓語學習旅程"
                  />
                  <div className="art-overlay">
                    <span>ORIGINAL STUDY CREW</span>
                    <strong>星光學習隊</strong>
                    <p>五位原創嚮導，陪你完成每天的任務</p>
                  </div>
                </div>
                <div className="floating-label label-one">가 · 나 · 다</div>
                <div className="floating-label label-two">안녕하세요!</div>
              </div>
            </section>

            <section className="today-panel">
              <div className="today-heading">
                <div>
                  <p className="eyebrow">TODAY&apos;S MISSION</p>
                  <h2>Day 1 · 韓文字的第一顆星</h2>
                </div>
                <div className="duration">
                  <span>◷</span>
                  <strong>約 50 分鐘</strong>
                </div>
              </div>
              <div className="stage-strip">
                {stages.map((stage, index) => (
                  <button
                    key={stage.name}
                    onClick={() => {
                      openLesson(1);
                      setActiveStage(index);
                    }}
                  >
                    <i>{stage.icon}</i>
                    <span>{stage.name}</span>
                    <small>{stage.time}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="path-preview">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">YOUR LEARNING UNIVERSE</p>
                  <h2>三個階段，一條屬於你的星光航線</h2>
                </div>
                <button onClick={() => navigate("map")}>展開完整地圖 →</button>
              </div>
              <div className="level-grid">
                <article className="level-card level-active">
                  <span className="level-number">01</span>
                  <div className="level-planet planet-cyan">한</div>
                  <p>BEGINNER · 20 DAYS</p>
                  <h3>初級 · 韓文練習生</h3>
                  <span>字母、發音、生活對話與自我介紹</span>
                  <div className="mini-progress">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                  <b>{progress}% COMPLETE</b>
                </article>
                <article className="level-card">
                  <span className="level-number">02</span>
                  <div className="level-planet planet-violet">문</div>
                  <p>INTERMEDIATE</p>
                  <h3>中級 · 舞台準備中</h3>
                  <span>時態、敬語、連接句與情境任務</span>
                  <b>COMING NEXT</b>
                </article>
                <article className="level-card">
                  <span className="level-number">03</span>
                  <div className="level-planet planet-pink">별</div>
                  <p>ADVANCED</p>
                  <h3>高級 · 正式出道</h3>
                  <span>長文、自然表達、文化與媒體語感</span>
                  <b>LOCKED</b>
                </article>
              </div>
            </section>
          </div>
        )}

        {view === "map" && (
          <section className="map-view">
            <div className="page-intro">
              <p className="eyebrow">BEGINNER CONSTELLATION · 20 DAYS</p>
              <h1>你的韓語學習星圖</h1>
              <p>
                先完成前三顆星的試用航線。每一天都包含教學、練習、聽力、自習與結算。
              </p>
            </div>

            <div className="map-progress-card">
              <div>
                <span>目前進度</span>
                <strong>{progress}%</strong>
              </div>
              <div className="map-progress-track">
                <i style={{ width: `${progress}%` }} />
              </div>
              <p>{encouragement}</p>
            </div>

            <div className="constellation-map">
              <div className="map-line" aria-hidden="true" />
              {dayTitles.map((title, index) => {
                const day = index + 1;
                const available = day <= 3;
                const done = completedDays.includes(day);
                return (
                  <button
                    key={title}
                    className={`day-node ${available ? "available" : ""} ${
                      done ? "completed" : ""
                    }`}
                    onClick={() => openLesson(day)}
                    disabled={!available}
                    aria-label={`Day ${day} ${title}${
                      available ? "" : "，尚未開放"
                    }`}
                  >
                    <span className="node-star">{done ? "✓" : day}</span>
                    <small>DAY {String(day).padStart(2, "0")}</small>
                    <strong>{title}</strong>
                    <em>{available ? (done ? "已點亮" : "可學習") : "規劃中"}</em>
                  </button>
                );
              })}
            </div>

            <div className="future-levels">
              <article>
                <span>02</span>
                <div>
                  <p>INTERMEDIATE</p>
                  <h2>中級 · 舞台準備中</h2>
                </div>
                <b>即將開放</b>
              </article>
              <article>
                <span>03</span>
                <div>
                  <p>ADVANCED</p>
                  <h2>高級 · 正式出道</h2>
                </div>
                <b>即將開放</b>
              </article>
            </div>
          </section>
        )}

        {view === "journal" && (
          <section className="journal-view">
            <div className="page-intro">
              <p className="eyebrow">MY STARDUST JOURNAL</p>
              <h1>我的星光手帳</h1>
              <p>所有進度與筆記都只保存在這台裝置，不需要登入。</p>
            </div>
            <div className="journal-grid">
              <article className="journal-summary">
                <div className="big-progress">
                  <span>{progress}%</span>
                </div>
                <div>
                  <p>BEGINNER PROGRESS</p>
                  <h2>{encouragement}</h2>
                  <span>
                    已點亮 {completedDays.length} / 20 顆初級星星
                  </span>
                  <button onClick={() => navigate("map")}>繼續學習</button>
                </div>
              </article>
              <article className="badge-card">
                <p>已取得徽章</p>
                <div className={completedDays.length ? "badge earned" : "badge"}>
                  <span>✦</span>
                  <strong>第一道星光</strong>
                  <small>完成第一天後取得</small>
                </div>
              </article>
              <article className="notes-card">
                <p>最近的自習筆記</p>
                {[1, 2, 3].map((day) => (
                  <button key={day} onClick={() => openLesson(day)}>
                    <span>DAY {day}</span>
                    <strong>
                      {notes[day]?.trim() || "尚未留下筆記，點此開始"}
                    </strong>
                  </button>
                ))}
              </article>
            </div>
          </section>
        )}

        {view === "lesson" && (
          <section className="lesson-view">
            <aside className="lesson-sidebar">
              <button className="back-button" onClick={() => navigate("map")}>
                ← 返回星圖
              </button>
              <p>DAY {String(activeDay).padStart(2, "0")}</p>
              <h2>{lesson.title}</h2>
              <span>{lesson.minutes}</span>
              <div className="lesson-stage-list">
                {stages.map((stage, index) => (
                  <button
                    key={stage.name}
                    className={activeStage === index ? "stage-active" : ""}
                    onClick={() => setActiveStage(index)}
                  >
                    <i>{stage.icon}</i>
                    <span>
                      <strong>{stage.name}</strong>
                      <small>{stage.time}</small>
                    </span>
                    <b>{index + 1}</b>
                  </button>
                ))}
              </div>
            </aside>

            <div className="lesson-workspace">
              <div className="lesson-topline">
                <div>
                  <p className="eyebrow">{lesson.eyebrow}</p>
                  <h1>{stages[activeStage].name}</h1>
                </div>
                <div className={`guide-chip ${lesson.guideColor}`}>
                  <span>✦</span>
                  <div>
                    <small>今日嚮導</small>
                    <strong>{lesson.guide}</strong>
                  </div>
                </div>
              </div>

              {activeStage === 0 && (
                <div className="lesson-card warmup-card">
                  <div className="lesson-orb">{lesson.day}</div>
                  <p>{lesson.korean}</p>
                  <h2>{lesson.title}</h2>
                  <span>{lesson.description}</span>
                  <div className="warmup-check">
                    <strong>開始前，先做三件事</strong>
                    <label>
                      <input type="checkbox" /> 將 iPad 調成橫向並準備耳機
                    </label>
                    <label>
                      <input type="checkbox" /> 準備紙筆或 Apple Pencil
                    </label>
                    <label>
                      <input type="checkbox" /> 找一個可以安心開口跟讀的地方
                    </label>
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => setActiveStage(1)}
                  >
                    暖身完成，開始教學 →
                  </button>
                </div>
              )}

              {activeStage === 1 && (
                <div className="lesson-card teaching-card">
                  <p className="card-kicker">MINI LESSON</p>
                  <h2>{lesson.teachingTitle}</h2>
                  <p>{lesson.teachingCopy}</p>
                  <div className="sound-grid">
                    {lesson.sounds.map((sound) => (
                      <button
                        key={sound.char}
                        onClick={() => speak(sound.label)}
                        aria-label={`播放 ${sound.label} 發音`}
                      >
                        <strong>{sound.char}</strong>
                        <span>{sound.label}</span>
                        <small>{sound.hint}</small>
                        <i>♫</i>
                      </button>
                    ))}
                  </div>
                  <div className="lesson-actions">
                    <button onClick={() => speak(lesson.listenText, true)}>
                      慢速播放全部
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => setActiveStage(2)}
                    >
                      前往引導練習 →
                    </button>
                  </div>
                </div>
              )}

              {activeStage === 2 && (
                <div className="lesson-card practice-card">
                  <p className="card-kicker">GUIDED PRACTICE</p>
                  <h2>{lesson.question}</h2>
                  <div className="answer-grid">
                    {lesson.options.map((option) => (
                      <button
                        key={option}
                        className={
                          selectedAnswer === option ? "answer-selected" : ""
                        }
                        onClick={() => setSelectedAnswer(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {selectedAnswer && (
                    <div
                      className={`answer-feedback ${
                        selectedAnswer === lesson.answer ? "correct" : "retry"
                      }`}
                      role="status"
                    >
                      {selectedAnswer === lesson.answer
                        ? "정답이에요! 答對了，這顆星已經亮起來。"
                        : "再觀察一次字形方向，慢慢來就好。"}
                    </div>
                  )}
                  <button
                    className="primary-button"
                    disabled={selectedAnswer !== lesson.answer}
                    onClick={() => setActiveStage(3)}
                  >
                    練習完成，進入聽力 →
                  </button>
                </div>
              )}

              {activeStage === 3 && (
                <div className="lesson-card listening-card">
                  <p className="card-kicker">LISTEN & REPEAT</p>
                  <h2>先聽，再跟著星光念一遍</h2>
                  <div className="listening-planet">
                    <span>한</span>
                    <div className="sound-wave" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                  <p className="listening-text">{lesson.listenText}</p>
                  <div className="audio-actions">
                    <button onClick={() => speak(lesson.listenText)}>
                      ♫ 正常速度
                    </button>
                    <button onClick={() => speak(lesson.listenText, true)}>
                      ◌ 慢速跟讀
                    </button>
                  </div>
                  <p className="privacy-note">
                    提醒：語音由裝置的韓語語音播放，不會錄音或上傳資料。
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setActiveStage(4)}
                  >
                    我跟讀完成了 →
                  </button>
                </div>
              )}

              {activeStage === 4 && (
                <div className="lesson-card selfstudy-card">
                  <div className="selfstudy-head">
                    <div>
                      <p className="card-kicker">SELF STUDY</p>
                      <h2>15 分鐘自由自習任務</h2>
                    </div>
                    <div className="study-timer">
                      <strong>{timerLabel}</strong>
                      <button
                        onClick={() => {
                          if (timerSeconds === 0) setTimerSeconds(15 * 60);
                          setTimerRunning((running) => !running);
                        }}
                      >
                        {timerRunning ? "暫停" : timerSeconds ? "開始" : "重設"}
                      </button>
                    </div>
                  </div>
                  <div className="mission-list">
                    {lesson.mission.map((item) => (
                      <label key={item}>
                        <input type="checkbox" />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                  <label className="note-field">
                    <span>今天想記住的內容</span>
                    <textarea
                      value={notes[activeDay] || ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [activeDay]: event.target.value,
                        }))
                      }
                      placeholder="例如：ㅗ 的短線朝上、ㅜ 的短線朝下⋯⋯"
                    />
                    <small>筆記只會保存在這台裝置。</small>
                  </label>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setTimerRunning(false);
                      setActiveStage(5);
                    }}
                  >
                    完成自習，前往結算 →
                  </button>
                </div>
              )}

              {activeStage === 5 && (
                <div className="lesson-card finish-card">
                  <div className="celebration-stars" aria-hidden="true">
                    ✦　·　✧　·　★
                  </div>
                  <p className="card-kicker">MISSION COMPLETE</p>
                  <h2>오늘도 잘했어요!</h2>
                  <p>今天也做得很好。你已經完成 Day {activeDay} 的學習航線。</p>
                  <div className="reward-row">
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                  </div>
                  <div className="finish-summary">
                    <div>
                      <small>今日主題</small>
                      <strong>{lesson.title}</strong>
                    </div>
                    <div>
                      <small>建議時間</small>
                      <strong>{lesson.minutes}</strong>
                    </div>
                    <div>
                      <small>保存方式</small>
                      <strong>這台裝置</strong>
                    </div>
                  </div>
                  <button className="primary-button" onClick={completeLesson}>
                    點亮 Day {activeDay} 星星
                  </button>
                </div>
              )}

              <div className="lesson-footer-nav">
                <button
                  onClick={() =>
                    setActiveStage((stage) => Math.max(0, stage - 1))
                  }
                  disabled={activeStage === 0}
                >
                  ← 上一階段
                </button>
                <span>
                  {activeStage + 1} / {stages.length}
                </span>
                <button
                  onClick={() =>
                    setActiveStage((stage) =>
                      Math.min(stages.length - 1, stage + 1),
                    )
                  }
                  disabled={activeStage === stages.length - 1}
                >
                  下一階段 →
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <div>
          <strong>별빛韓語研究所</strong>
          <span>為零基礎學習者打造的韓語星光航線</span>
        </div>
        <p>
          原創學習角色與視覺世界觀，非任何藝人或娛樂公司的官方網站。
        </p>
      </footer>
    </div>
  );
}
