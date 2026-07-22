"use client";

/* eslint-disable @next/next/no-img-element -- Vinext serves these fixed local WebP portraits directly. */
/* eslint-disable react-hooks/set-state-in-effect -- Browser-only localStorage hydration must run after mount. */
/* eslint-disable react-hooks/exhaustive-deps -- Class refresh is intentionally keyed to the active view and authenticated user. */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  intermediateDayTitles,
  intermediateLessons,
} from "./intermediate-lessons";
import { advancedDayTitles, advancedLessons } from "./advanced-lessons";
import {
  answersMatch,
  buildCheckpointExercises,
  buildLessonExercises,
  type PracticeExercise,
} from "./learning-exercises";
import { getCardChineseSupport } from "./card-chinese-support";

type View = "home" | "map" | "journal" | "lesson" | "coach";
type Level = "beginner" | "intermediate" | "advanced";

type StudySession = {
  key: string;
  level: Level;
  day: number;
  completedAt: string;
  minutes: number;
};

type DetailedMistake = {
  key: string;
  level: Level;
  day: number;
  exerciseId: string;
  kicker: string;
  question: string;
  submittedAnswer: string;
  correctAnswer: string;
  attempts: number;
  hintLevel: number;
  errorType: string;
  resolved: boolean;
  updatedAt: string;
};

type QuestionReport = {
  key: string;
  level: Level;
  day: number;
  exerciseId: string;
  kicker: string;
  question: string;
  submittedAnswer: string;
  expectedAnswer: string;
  createdAt: string;
};

type TeacherQuestionReport = {
  id: number;
  classCode: string | null;
  reporterEmail: string;
  reporterName: string;
  level: Level;
  day: number;
  exerciseId: string;
  kicker: string;
  question: string;
  submittedAnswer: string;
  expectedAnswer: string;
  status: "open" | "reviewing" | "resolved";
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type SessionUser = {
  displayName: string;
  email: string;
};

type CloudClass = {
  code: string;
  name: string;
  ownerEmail: string;
  members?: {
    email: string;
    displayName: string;
    role: string;
    progress?: number;
    minutes?: number;
    mistakes?: number;
    lastActive?: string | null;
    completedKeys?: string[];
    recentMistakes?: Array<Partial<DetailedMistake>>;
  }[];
  assignments?: ClassAssignment[];
  parentLinks?: Array<{
    classCode: string;
    parentEmail: string;
    studentEmail: string;
  }>;
};

type AssignmentResult = {
  assignmentId: number;
  studentEmail: string;
  displayName?: string;
  score: number;
  bestScore: number;
  totalQuestions: number;
  attemptCount: number;
  redoCount: number;
  completedAt: string;
  updatedAt: string;
  late: boolean;
};

type ClassAssignment = {
  id: number;
  classCode: string;
  title: string;
  level: Level;
  day: number;
  dueDate: string;
  completedCount?: number;
  totalStudents?: number;
  averageScore?: number | null;
  lateCount?: number;
  overdueCount?: number;
  results?: AssignmentResult[];
  result?: AssignmentResult | null;
};

type LinkedStudent = {
  classCode: string;
  email: string;
  displayName: string;
  progress: number;
  minutes: number;
  mistakes: number;
  recentMistakes?: Array<Partial<DetailedMistake>>;
};

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
  sounds: readonly { char: string; label: string; hint: string }[];
  question: string;
  options: readonly string[];
  answer: string;
  listenText: string;
  mission: readonly string[];
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
  {
    day: 4,
    eyebrow: "把聲音送上新的軌道",
    title: "認識 Y 系母音",
    korean: "야, 여, 요, 유",
    description: "在基本母音前加上一個輕快的 y 音，讀出 ㅑ、ㅕ、ㅛ、ㅠ。",
    minutes: "約 50 分鐘",
    guide: "누리 Nuri",
    guideColor: "cyan",
    teachingTitle: "多一條短線，就多一個 y 音",
    teachingCopy:
      "ㅏ 變成 ㅑ、ㅓ 變成 ㅕ。先看短線數量，再用「呀、優」的口型感受差異。",
    sounds: [
      { char: "ㅑ", label: "야", hint: "ㅏ 前加 y 音" },
      { char: "ㅕ", label: "여", hint: "ㅓ 前加 y 音" },
      { char: "ㅛ", label: "요", hint: "ㅗ 前加 y 音" },
      { char: "ㅠ", label: "유", hint: "ㅜ 前加 y 音" },
    ],
    question: "哪一個字母讀作 요？",
    options: ["ㅕ", "ㅛ", "ㅠ"],
    answer: "ㅛ",
    listenText: "야, 여, 요, 유",
    mission: [
      "將 ㅏ／ㅑ、ㅓ／ㅕ 分成兩組朗讀",
      "聽四個音並畫出短線方向",
      "不看提示寫出 야、여、요、유",
    ],
  },
  {
    day: 5,
    eyebrow: "兩道星光合成新顏色",
    title: "認識複合母音",
    korean: "새로운 모음",
    description: "認識 ㅐ、ㅔ、ㅘ、ㅝ，練習看見兩個母音合併後的聲音。",
    minutes: "約 55 分鐘",
    guide: "온 On",
    guideColor: "violet",
    teachingTitle: "複合母音是兩個口型的快速連接",
    teachingCopy:
      "ㅘ 可以想成 ㅗ 與 ㅏ 快速連在一起；ㅝ 則是 ㅜ 與 ㅓ。先慢後快，聲音會自然融合。",
    sounds: [
      { char: "ㅐ", label: "애", hint: "嘴巴自然張開" },
      { char: "ㅔ", label: "에", hint: "現代韓語中很接近 ㅐ" },
      { char: "ㅘ", label: "와", hint: "ㅗ + ㅏ" },
      { char: "ㅝ", label: "워", hint: "ㅜ + ㅓ" },
      { char: "왜", label: "왜", hint: "ㅗ + ㅐ" },
    ],
    question: "ㅗ 和 ㅏ 合起來是哪一個母音？",
    options: ["ㅘ", "ㅝ", "ㅐ"],
    answer: "ㅘ",
    listenText: "애, 에, 와, 워, 왜",
    mission: [
      "慢慢念 ㅗ＋ㅏ，再加速變成 와",
      "製作 ㅘ 與 ㅝ 的組合字卡",
      "找出三個含有複合母音的韓文字",
    ],
  },
  {
    day: 6,
    eyebrow: "讓發音帶上不同能量",
    title: "送氣音與緊音",
    korean: "힘을 조절해요",
    description: "比較 ㄱ／ㅋ／ㄲ 等聲音，感受送氣、平音與緊音的不同。",
    minutes: "約 60 分鐘",
    guide: "루미 Lumi",
    guideColor: "pink",
    teachingTitle: "一張紙就能看見送氣",
    teachingCopy:
      "把薄紙放在嘴前念 카，紙張會明顯晃動；念 까 時聲音緊而短。不要用力喊，重點是氣流。",
    sounds: [
      { char: "ㅋ", label: "카", hint: "ㄱ 的送氣音" },
      { char: "ㅌ", label: "타", hint: "ㄷ 的送氣音" },
      { char: "ㅍ", label: "파", hint: "ㅂ 的送氣音" },
      { char: "ㅊ", label: "차", hint: "ㅈ 的送氣音" },
      { char: "ㄲ", label: "까", hint: "ㄱ 的緊音" },
    ],
    question: "ㄱ 的送氣音是哪一個？",
    options: ["ㅋ", "ㄲ", "ㄴ"],
    answer: "ㅋ",
    listenText: "가, 카, 까. 다, 타, 따. 바, 파, 빠",
    mission: [
      "用紙張測試 가／카 的氣流差異",
      "錄下自己念 가、카、까 的聲音再比較",
      "將平音、送氣音、緊音各抄寫一列",
    ],
  },
  {
    day: 7,
    eyebrow: "星球底部也能藏著聲音",
    title: "收尾音 Batchim 入門",
    korean: "받침을 만나요",
    description: "認識音節方塊下方的收尾音，練習 각、안、밥、옷、밤。",
    minutes: "約 60 分鐘",
    guide: "하루 Haru",
    guideColor: "cyan",
    teachingTitle: "Batchim 是音節最後停住的位置",
    teachingCopy:
      "看到方塊底部的子音時，聲音要在那裡收住。先誇張地慢念，再縮短成自然的韓語節奏。",
    sounds: [
      { char: "각", label: "각", hint: "底部是 ㄱ" },
      { char: "안", label: "안", hint: "底部是 ㄴ" },
      { char: "밥", label: "밥", hint: "底部是 ㅂ" },
      { char: "옷", label: "옷", hint: "底部是 ㅅ" },
      { char: "밤", label: "밤", hint: "底部是 ㅁ" },
    ],
    question: "밥 的收尾音是哪一個子音？",
    options: ["ㅂ", "ㅁ", "ㄴ"],
    answer: "ㅂ",
    listenText: "각, 안, 밥, 옷, 밤",
    mission: [
      "圈出五個音節底部的 Batchim",
      "用手勢表示聲音在最後收住",
      "比較 바 與 밥、오 與 옷 的差異",
    ],
  },
  {
    day: 8,
    eyebrow: "完成第一次發音巡航",
    title: "韓文字發音總複習",
    korean: "한글 체크포인트",
    description: "整合母音、子音、音節與收尾音，完成第一個韓文字檢查點。",
    minutes: "約 55 分鐘",
    guide: "별 Byeol",
    guideColor: "violet",
    teachingTitle: "先拆解，再讀出完整方塊",
    teachingCopy:
      "遇到不熟的字，依序找出開頭子音、母音與底部收尾音。每一格都能用同一套方法解碼。",
    sounds: [
      { char: "한", label: "ㅎ + ㅏ + ㄴ", hint: "有收尾音" },
      { char: "글", label: "ㄱ + ㅡ + ㄹ", hint: "上下加收尾" },
      { char: "친", label: "ㅊ + ㅣ + ㄴ", hint: "送氣音開頭" },
      { char: "구", label: "ㄱ + ㅜ", hint: "上下排列" },
      { char: "별", label: "ㅂ + ㅕ + ㄹ", hint: "Y 系母音" },
    ],
    question: "哪一個音節包含 ㅕ？",
    options: ["한", "구", "별"],
    answer: "별",
    listenText: "한글, 친구, 별, 안녕",
    mission: [
      "拆解 한글 兩個音節的三個位置",
      "隨機抽十張字卡並朗讀",
      "整理目前最容易混淆的三組聲音",
    ],
  },
  {
    day: 9,
    eyebrow: "向新的朋友發出第一道訊號",
    title: "第一次打招呼",
    korean: "안녕하세요!",
    description: "學會日常招呼、道謝與道歉，完成第一段兩人對話。",
    minutes: "約 50 分鐘",
    guide: "누리 Nuri",
    guideColor: "pink",
    teachingTitle: "招呼語要和情境一起記",
    teachingCopy:
      "不要只背單字。想像進教室、收到幫助或準備離開時的畫面，句子會更容易留在記憶裡。",
    sounds: [
      { char: "안녕", label: "안녕하세요", hint: "您好／你好" },
      { char: "감사", label: "감사합니다", hint: "謝謝" },
      { char: "미안", label: "미안해요", hint: "對不起" },
      { char: "반가워", label: "반가워요", hint: "很高興見到你" },
      { char: "또 봐", label: "또 봐요", hint: "再見／再見面" },
    ],
    question: "第一次見面時，可以先說哪一句？",
    options: ["안녕하세요", "얼마예요", "물 주세요"],
    answer: "안녕하세요",
    listenText: "안녕하세요. 만나서 반가워요. 감사합니다. 또 봐요.",
    mission: [
      "對著鏡子說三次 안녕하세요",
      "將招呼、道謝、道歉分成三個情境",
      "和家人完成一段 20 秒的韓語招呼",
    ],
  },
  {
    day: 10,
    eyebrow: "在星圖上寫下自己的名字",
    title: "韓文自我介紹",
    korean: "저를 소개해요",
    description: "用 저는～예요／이에요，介紹姓名、學生身分與來自哪裡。",
    minutes: "約 60 分鐘",
    guide: "온 On",
    guideColor: "cyan",
    teachingTitle: "自我介紹像三塊可以替換的積木",
    teachingCopy:
      "先說 저는，再放姓名或身分，最後接 예요／이에요。把內容換掉，就能創造自己的句子。",
    sounds: [
      { char: "저는", label: "저는 민수예요", hint: "我是敏洙" },
      { char: "학생", label: "저는 학생이에요", hint: "我是學生" },
      { char: "중학생", label: "중학생이에요", hint: "是國中生" },
      { char: "대만", label: "대만에서 왔어요", hint: "來自台灣" },
      { char: "반가워요", label: "만나서 반가워요", hint: "很高興見到你" },
    ],
    question: "名字以母音結尾時，通常接哪一個？",
    options: ["예요", "이에요", "에서"],
    answer: "예요",
    listenText: "안녕하세요. 저는 민수예요. 저는 중학생이에요. 대만에서 왔어요.",
    mission: [
      "替換姓名，朗讀自己的介紹三次",
      "寫下姓名、身分、來自哪裡三行積木",
      "不看稿完成 30 秒自我介紹",
    ],
  },
  {
    day: 11,
    eyebrow: "讓句子的主角亮起來",
    title: "은／는 與 이／가",
    korean: "누가 주인공이에요?",
    description: "認識主題助詞與主格助詞，在簡短句子中找出談論的主角。",
    minutes: "約 55 分鐘",
    guide: "루미 Lumi",
    guideColor: "violet",
    teachingTitle: "助詞像貼在名詞後面的角色標籤",
    teachingCopy:
      "은／는常用來設定談論主題，이／가常用來指出句中的主角。先熟悉固定句型，不必一次背完所有差異。",
    sounds: [
      { char: "저는", label: "저는 학생이에요", hint: "以我為主題" },
      { char: "민수는", label: "민수는 친구예요", hint: "子音後接 은／는中的 는" },
      { char: "책은", label: "책은 여기 있어요", hint: "子音後接 은" },
      { char: "비가", label: "비가 와요", hint: "雨是句子主角" },
      { char: "친구가", label: "친구가 있어요", hint: "有朋友" },
    ],
    question: "「至於我，我是學生」應該用哪一個開頭？",
    options: ["저는", "제가를", "저에서"],
    answer: "저는",
    listenText: "저는 학생이에요. 친구가 있어요. 비가 와요.",
    mission: [
      "圈出三個句子中的助詞",
      "用自己的名字造一個 는 句子",
      "將 은／는 與 이／가 例句各念兩輪",
    ],
  },
  {
    day: 12,
    eyebrow: "在宇宙教室裡尋找物品",
    title: "這個、那個與什麼",
    korean: "이것은 뭐예요?",
    description: "學會 이것、그것、저것、뭐예요，在教室情境中詢問物品。",
    minutes: "約 50 分鐘",
    guide: "하루 Haru",
    guideColor: "pink",
    teachingTitle: "距離決定要用哪一個「這／那」",
    teachingCopy:
      "靠近說話者用 이것，靠近對方用 그것，離雙方都遠用 저것。搭配手勢練習最容易理解。",
    sounds: [
      { char: "이것", label: "이것은 책이에요", hint: "這是書" },
      { char: "그것", label: "그것은 뭐예요", hint: "那是什麼" },
      { char: "저것", label: "저것은 학교예요", hint: "遠處那個是學校" },
      { char: "뭐", label: "뭐예요", hint: "是什麼" },
      { char: "책", label: "책이에요", hint: "是書" },
    ],
    question: "靠近說話者的「這個」是哪一個？",
    options: ["이것", "그것", "저것"],
    answer: "이것",
    listenText: "이것은 뭐예요? 이것은 책이에요. 저것은 학교예요.",
    mission: [
      "指著身邊三樣物品說 이것",
      "和同伴用 뭐예요 問答五次",
      "畫出近、中、遠三個位置並填入詞語",
    ],
  },
  {
    day: 13,
    eyebrow: "確認星艙裡有什麼",
    title: "있어요／없어요",
    korean: "있어요? 없어요?",
    description: "用 있어요 與 없어요 表達有、沒有，也能詢問人物或物品。",
    minutes: "約 55 分鐘",
    guide: "별 Byeol",
    guideColor: "cyan",
    teachingTitle: "一組相反詞就能回答很多問題",
    teachingCopy:
      "있어요 表示存在或擁有，없어요 表示不存在或沒有。前面的名詞通常搭配 이／가。",
    sounds: [
      { char: "있어요", label: "책이 있어요", hint: "有書" },
      { char: "없어요", label: "시간이 없어요", hint: "沒有時間" },
      { char: "친구", label: "친구가 있어요", hint: "有朋友" },
      { char: "고양이", label: "고양이가 있어요", hint: "有貓" },
      { char: "질문", label: "질문이 있어요", hint: "有問題" },
    ],
    question: "「有一隻貓」是哪一句？",
    options: ["고양이가 있어요", "고양이가 없어요", "고양이를 가요"],
    answer: "고양이가 있어요",
    listenText: "책이 있어요. 시간이 없어요. 친구가 있어요.",
    mission: [
      "列出書包裡有的三樣物品",
      "用 없어요 說出兩樣沒有的物品",
      "完成五組 있어요／없어요 快速問答",
    ],
  },
  {
    day: 14,
    eyebrow: "為星星編上自己的號碼",
    title: "韓文數字與年齡",
    korean: "몇 살이에요?",
    description: "學會固有數詞 하나到 다섯，並用 몇 살이에요 詢問年齡。",
    minutes: "約 60 分鐘",
    guide: "누리 Nuri",
    guideColor: "violet",
    teachingTitle: "數物品和說年齡，先從五個數字開始",
    teachingCopy:
      "하나、둘、셋、넷、다섯 是常用的固有數詞。接 살 時部分形式會縮短，例如 하나變成 한 살。",
    sounds: [
      { char: "하나", label: "하나", hint: "一" },
      { char: "둘", label: "둘", hint: "二" },
      { char: "셋", label: "셋", hint: "三" },
      { char: "넷", label: "넷", hint: "四" },
      { char: "다섯", label: "다섯", hint: "五" },
    ],
    question: "韓文固有數詞的「三」是哪一個？",
    options: ["둘", "셋", "넷"],
    answer: "셋",
    listenText: "하나, 둘, 셋, 넷, 다섯. 몇 살이에요?",
    mission: [
      "數五樣身邊的物品",
      "用手指配合 하나到 다섯朗讀",
      "練習問答 몇 살이에요",
    ],
  },
  {
    day: 15,
    eyebrow: "讓日常動作沿著時間前進",
    title: "動詞現在式",
    korean: "오늘 뭐 해요?",
    description: "認識 아요／어요／해요，將常用動詞變成禮貌的現在式。",
    minutes: "約 60 分鐘",
    guide: "온 On",
    guideColor: "pink",
    teachingTitle: "先去掉 다，再選擇句尾",
    teachingCopy:
      "字典中的動詞多以 다 結尾。去掉 다 後，依母音接 아요 或 어요；하다 類通常變成 해요。",
    sounds: [
      { char: "가요", label: "학교에 가요", hint: "가다 → 가요" },
      { char: "먹어요", label: "밥을 먹어요", hint: "먹다 → 먹어요" },
      { char: "봐요", label: "영화를 봐요", hint: "보다 → 봐요" },
      { char: "공부해요", label: "한국어를 공부해요", hint: "공부하다 → 공부해요" },
      { char: "좋아해요", label: "음악을 좋아해요", hint: "좋아하다 → 좋아해요" },
    ],
    question: "먹다 的現在式是哪一個？",
    options: ["먹어요", "먹가요", "먹이에요"],
    answer: "먹어요",
    listenText: "학교에 가요. 밥을 먹어요. 한국어를 공부해요.",
    mission: [
      "將五個 다 動詞改成現在式",
      "說出自己今天做的三件事",
      "把三個動詞排成一天的時間線",
    ],
  },
  {
    day: 16,
    eyebrow: "標記動作發生的座標",
    title: "을／를、에／에서",
    korean: "어디에서 공부해요?",
    description: "用 을／를標記動作對象，用 에／에서表達目的地與動作地點。",
    minutes: "約 60 分鐘",
    guide: "루미 Lumi",
    guideColor: "cyan",
    teachingTitle: "助詞讓句子的路線更清楚",
    teachingCopy:
      "에常標示目的地或存在位置；에서標示動作發生的地方。을／를則貼在動作影響的對象後。",
    sounds: [
      { char: "학교에", label: "학교에 가요", hint: "去學校" },
      { char: "학교에서", label: "학교에서 공부해요", hint: "在學校讀書" },
      { char: "음악을", label: "음악을 들어요", hint: "聽音樂" },
      { char: "친구를", label: "친구를 만나요", hint: "見朋友" },
      { char: "집에", label: "집에 있어요", hint: "在家" },
    ],
    question: "動作在學校發生，應該使用哪一個？",
    options: ["학교에", "학교에서", "학교를에"],
    answer: "학교에서",
    listenText: "학교에 가요. 학교에서 공부해요. 음악을 들어요.",
    mission: [
      "在句子中圈出地點助詞",
      "用 에 與 에서 各造兩句",
      "描述放學後去的地方與做的事情",
    ],
  },
  {
    day: 17,
    eyebrow: "學會表達不要與不能",
    title: "否定表達 안／못",
    korean: "안 해요, 못 해요",
    description: "分辨「不做」與「無法做」，用 안 和 못 建立簡短否定句。",
    minutes: "約 50 分鐘",
    guide: "하루 Haru",
    guideColor: "violet",
    teachingTitle: "안 是不做，못 是做不到",
    teachingCopy:
      "把 안 或 못 放在動詞前面，就能快速形成否定。先抓住意願與能力的差別。",
    sounds: [
      { char: "안 가요", label: "오늘 학교에 안 가요", hint: "今天不去學校" },
      { char: "못 먹어요", label: "매운 음식을 못 먹어요", hint: "不能吃辣" },
      { char: "안 봐요", label: "TV를 안 봐요", hint: "不看電視" },
      { char: "못 해요", label: "수영을 못 해요", hint: "不會游泳" },
      { char: "안 어려워요", label: "한국어가 안 어려워요", hint: "韓語不難" },
    ],
    question: "想表達「我做不到／沒有能力做」時，應該說哪一句？",
    options: ["못 해요", "안 있어요를", "해요 못을"],
    answer: "못 해요",
    listenText: "오늘 안 가요. 매운 음식을 못 먹어요. 수영을 못 해요.",
    mission: [
      "分別列出兩件不做與兩件做不到的事",
      "把三個肯定句改成否定句",
      "和同伴進行 할 수 있어요 問答",
    ],
  },
  {
    day: 18,
    eyebrow: "說出讓自己發光的喜好",
    title: "喜歡與想要",
    korean: "뭘 좋아해요?",
    description: "用 좋아해요 表達喜歡，用 고 싶어요 表達想做的事情。",
    minutes: "約 55 分鐘",
    guide: "별 Byeol",
    guideColor: "pink",
    teachingTitle: "喜歡名詞，想做動作",
    teachingCopy:
      "名詞後搭配 좋아해요；想做某個動作時，去掉 다 後接 고 싶어요。",
    sounds: [
      { char: "좋아해요", label: "음악을 좋아해요", hint: "喜歡音樂" },
      { char: "보고 싶어요", label: "영화를 보고 싶어요", hint: "想看電影" },
      { char: "먹고 싶어요", label: "떡볶이를 먹고 싶어요", hint: "想吃辣炒年糕" },
      { char: "가고 싶어요", label: "한국에 가고 싶어요", hint: "想去韓國" },
      { char: "공부하고 싶어요", label: "한국어를 공부하고 싶어요", hint: "想學韓語" },
    ],
    question: "「我想學韓語」是哪一句？",
    options: ["한국어를 공부하고 싶어요", "한국어가 없어요", "한국어를 안 가요"],
    answer: "한국어를 공부하고 싶어요",
    listenText: "음악을 좋아해요. 한국에 가고 싶어요. 한국어를 공부하고 싶어요.",
    mission: [
      "列出三樣自己喜歡的事物",
      "用 고 싶어요 說三個願望",
      "完成一分鐘喜好訪問",
    ],
  },
  {
    day: 19,
    eyebrow: "前往韓語商店完成任務",
    title: "購物與點餐",
    korean: "이거 주세요",
    description: "學會 주세요、얼마예요 與簡單數量詞，完成購物及點餐對話。",
    minutes: "約 60 分鐘",
    guide: "누리 Nuri",
    guideColor: "cyan",
    teachingTitle: "指出物品、詢問價格、禮貌請求",
    teachingCopy:
      "先用 이거 指出物品，再加 주세요。需要確認價格時說 얼마예요，就能完成最基本的購物對話。",
    sounds: [
      { char: "주세요", label: "이거 주세요", hint: "請給我這個" },
      { char: "얼마", label: "얼마예요", hint: "多少錢" },
      { char: "물", label: "물 주세요", hint: "請給我水" },
      { char: "하나", label: "비빔밥 하나 주세요", hint: "請給我一份拌飯" },
      { char: "맛있어요", label: "정말 맛있어요", hint: "真的很好吃" },
    ],
    question: "「請給我水」是哪一句？",
    options: ["물 주세요", "물이 가요", "물 안녕하세요"],
    answer: "물 주세요",
    listenText: "이거 얼마예요? 물 주세요. 비빔밥 하나 주세요.",
    mission: [
      "用桌上三樣物品練習 이거 주세요",
      "扮演店員與客人完成三輪對話",
      "寫下自己想點的一份韓國料理",
    ],
  },
  {
    day: 20,
    eyebrow: "初級航線最終成果舞台",
    title: "星光成果舞台",
    korean: "나의 첫 한국어 무대",
    description: "整合 20 天內容，完成自我介紹、喜好與生活句子的最終任務。",
    minutes: "約 60 分鐘",
    guide: "온 On",
    guideColor: "violet",
    teachingTitle: "把學過的句型串成自己的故事",
    teachingCopy:
      "不需要使用艱難的句子。清楚說出招呼、姓名、身分、來自哪裡、喜好與想做的事，就是完整的初級成果。",
    sounds: [
      { char: "안녕하세요", label: "안녕하세요", hint: "先打招呼" },
      { char: "저는", label: "저는 유진이에요", hint: "介紹姓名" },
      { char: "학생", label: "저는 중학생이에요", hint: "介紹身分" },
      { char: "좋아해요", label: "음악을 좋아해요", hint: "說出喜好" },
      { char: "싶어요", label: "한국에 가고 싶어요", hint: "說出願望" },
    ],
    question: "哪一句是自然的身分介紹？",
    options: ["저는 중학생이에요", "저를 중학생 가요", "중학생을 없어요"],
    answer: "저는 중학생이에요",
    listenText:
      "안녕하세요. 저는 유진이에요. 저는 중학생이에요. 음악을 좋아해요. 한국에 가고 싶어요.",
    mission: [
      "寫出五句自己的韓語介紹",
      "用正常速度朗讀並自行修正一次",
      "不看稿完成 60 秒初級成果發表",
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

const levelMeta: Record<
  Level,
  {
    name: string;
    shortName: string;
    eyebrow: string;
    mapTitle: string;
    mapCopy: string;
    completion: string;
  }
> = {
  beginner: {
    name: "初級 · 韓文練習生",
    shortName: "初級",
    eyebrow: "BEGINNER CONSTELLATION · 20 DAYS",
    mapTitle: "你的韓語學習星圖",
    mapCopy:
      "從韓文字母一路前進到完整自我介紹。每一天都包含教學、八種練習、聽力、自習與結算。",
    completion: "完成初級 20 天航線",
  },
  intermediate: {
    name: "中級 · 舞台準備中",
    shortName: "中級",
    eyebrow: "INTERMEDIATE REHEARSAL · 15 DAYS",
    mapTitle: "舞台準備中 · 彩排地圖",
    mapCopy:
      "從時態、連接句與敬語一路前進到兩分鐘情境發表，讓韓語從單句成為完整表達。",
    completion: "完成中級 15 天彩排",
  },
  advanced: {
    name: "高級 · 正式出道",
    shortName: "高級",
    eyebrow: "ADVANCED DEBUT · 15 DAYS",
    mapTitle: "正式出道 · 發表航線",
    mapCopy:
      "練習轉述、推測、條件、正式語體與意見發表，最後完成 2–3 分鐘韓語主題舞台。",
    completion: "完成高級 15 天正式舞台",
  },
};

const finalRubrics: Record<Level, readonly string[]> = {
  beginner: [
    "至少說出五句完整韓語",
    "包含招呼、姓名、身分、喜好與願望",
    "發音清楚，完成約 60 秒介紹",
    "能在少量提示下完成，不逐字念中文",
  ],
  intermediate: [
    "完成約兩分鐘的情境發表",
    "至少使用五種中級句型",
    "內容包含過去經驗、現在情況與未來計畫",
    "句子之間使用原因、轉折或順接連接",
  ],
  advanced: [
    "完成 2–3 分鐘、有開場與結尾的正式發表",
    "至少使用六種中高級句型",
    "提出一個觀點、兩個理由與一個具體例子",
    "語氣符合正式場合，內容連貫且容易理解",
  ],
};

const guideProfiles = [
  { key: "루미", name: "루미 Lumi", role: "發音與聽力", image: "/guides/lumi-v1.webp" },
  { key: "하루", name: "하루 Haru", role: "文法與字卡", image: "/guides/haru-v1.webp" },
  { key: "별", name: "별 Byeol", role: "口說與勇氣", image: "/guides/byeol-v1.webp" },
  { key: "누리", name: "누리 Nuri", role: "閱讀與筆記", image: "/guides/nuri-v1.webp" },
  { key: "온", name: "온 On", role: "複習與完課", image: "/guides/on-v1.webp" },
] as const;

function getLevelLessons(level: Level): readonly Lesson[] {
  if (level === "beginner") return lessons;
  if (level === "intermediate")
    return intermediateLessons as readonly Lesson[];
  return advancedLessons as readonly Lesson[];
}

function getLevelTitles(level: Level): readonly string[] {
  if (level === "beginner") return dayTitles;
  if (level === "intermediate") return intermediateDayTitles;
  return advancedDayTitles;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [activeLevel, setActiveLevel] = useState<Level>("beginner");
  const [activeDay, setActiveDay] = useState(1);
  const [activeStage, setActiveStage] = useState(0);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [completedIntermediateDays, setCompletedIntermediateDays] = useState<
    number[]
  >([]);
  const [completedAdvancedDays, setCompletedAdvancedDays] = useState<number[]>(
    [],
  );
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [completedPractice, setCompletedPractice] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState<Record<string, number>>({});
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>(
    {},
  );
  const [revealedAnswers, setRevealedAnswers] = useState<
    Record<string, boolean>
  >({});
  const [hintUsage, setHintUsage] = useState<Record<string, number>>({});
  const [detailedMistakes, setDetailedMistakes] = useState<
    Record<string, DetailedMistake>
  >({});
  const [questionReports, setQuestionReports] = useState<QuestionReport[]>([]);
  const [teacherQuestionReports, setTeacherQuestionReports] = useState<
    TeacherQuestionReport[]
  >([]);
  const [reportStatus, setReportStatus] = useState("");
  const [showCardHints, setShowCardHints] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [completionDates, setCompletionDates] = useState<
    Record<string, string>
  >({});
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [syncStatus, setSyncStatus] = useState(
    "免登入模式：資料保存在這台裝置",
  );
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null>(null);
  const [syncConflict, setSyncConflict] = useState(false);
  const [profileRole, setProfileRole] = useState<
    "student" | "teacher" | "parent"
  >("student");
  const [classCode, setClassCode] = useState("");
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [ownedClasses, setOwnedClasses] = useState<CloudClass[]>([]);
  const [memberships, setMemberships] = useState<
    { classCode: string; role: string }[]
  >([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [parentLinkDrafts, setParentLinkDrafts] = useState<
    Record<string, { parentEmail: string; studentEmail: string }>
  >({});
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentLevel, setAssignmentLevel] =
    useState<Level>("beginner");
  const [assignmentDay, setAssignmentDay] = useState(1);
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [highContrast, setHighContrast] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [preferredVoiceName, setPreferredVoiceName] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "ready" | "denied" | "unsupported"
  >("idle");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [pronunciationRating, setPronunciationRating] = useState(0);
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const restoredUrl = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("starlight-korean-progress");
      const savedIntermediate = localStorage.getItem(
        "starlight-korean-intermediate-progress",
      );
      const savedAdvanced = localStorage.getItem(
        "starlight-korean-advanced-progress",
      );
      const savedNotes = localStorage.getItem("starlight-korean-notes");
      const savedMistakes = localStorage.getItem("starlight-korean-mistakes");
      const savedDetailedMistakes = localStorage.getItem(
        "starlight-korean-detailed-mistakes",
      );
      const savedHintUsage = localStorage.getItem(
        "starlight-korean-hint-usage",
      );
      const savedQuestionReports = localStorage.getItem(
        "starlight-korean-question-reports",
      );
      const savedDates = localStorage.getItem(
        "starlight-korean-completion-dates",
      );
      const savedSessions = localStorage.getItem(
        "starlight-korean-study-sessions",
      );
      const savedContrast = localStorage.getItem(
        "starlight-korean-high-contrast",
      );
      const savedRole = localStorage.getItem("starlight-korean-profile-role");
      const savedClassCode = localStorage.getItem(
        "starlight-korean-class-code",
      );
      const savedVoice = localStorage.getItem("starlight-korean-voice");
      if (saved) setCompletedDays(JSON.parse(saved));
      if (savedIntermediate)
        setCompletedIntermediateDays(JSON.parse(savedIntermediate));
      if (savedAdvanced)
        setCompletedAdvancedDays(JSON.parse(savedAdvanced));
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedMistakes) setMistakes(JSON.parse(savedMistakes));
      if (savedDetailedMistakes)
        setDetailedMistakes(JSON.parse(savedDetailedMistakes));
      if (savedHintUsage) setHintUsage(JSON.parse(savedHintUsage));
      if (savedQuestionReports)
        setQuestionReports(JSON.parse(savedQuestionReports));
      if (savedDates) setCompletionDates(JSON.parse(savedDates));
      if (savedSessions) setStudySessions(JSON.parse(savedSessions));
      if (savedContrast === "true") setHighContrast(true);
      if (savedRole && ["student", "teacher", "parent"].includes(savedRole))
        setProfileRole(savedRole as "student" | "teacher" | "parent");
      if (savedClassCode) setClassCode(savedClassCode);
      if (savedVoice) setPreferredVoiceName(savedVoice);
    } catch {
      // The course remains usable when browser storage is unavailable.
    }
    const params = new URLSearchParams(window.location.search);
    const targetView = params.get("view") as View | null;
    const targetLevel = params.get("level") as Level | null;
    const targetDay = Number(params.get("day"));
    const targetStage = Number(params.get("stage"));
    const targetQuestion = Number(params.get("question"));
    if (
      targetView === "lesson" &&
      targetLevel &&
      ["beginner", "intermediate", "advanced"].includes(targetLevel) &&
      Number.isInteger(targetDay) &&
      targetDay >= 1 &&
      targetDay <= (targetLevel === "beginner" ? 20 : 15)
    ) {
      setView("lesson");
      setActiveLevel(targetLevel);
      setActiveDay(targetDay);
      setActiveStage(
        Number.isInteger(targetStage) ? Math.max(0, Math.min(5, targetStage)) : 0,
      );
      setPracticeIndex(
        Number.isInteger(targetQuestion)
          ? Math.max(0, Math.min(targetDay % 5 === 0 ? 9 : 7, targetQuestion))
          : 0,
      );
    } else if (targetView && ["home", "map", "journal", "coach"].includes(targetView)) {
      setView(targetView);
    }
    restoredUrl.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    fetch("/api/session")
      .then((response) => response.json())
      .then((data: { user?: SessionUser | null }) => {
        if (data.user) {
          setUser(data.user);
          setSyncStatus(`已登入：${data.user.displayName}`);
        }
      })
      .catch(() => {
        // Anonymous local mode remains fully usable.
      });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {
        // Offline installation is an enhancement, not a learning blocker.
      });
    }
    if ("speechSynthesis" in window) {
      const updateVoices = () =>
        setAvailableVoices(
          window.speechSynthesis
            .getVoices()
            .filter((voice) => voice.lang.toLowerCase().startsWith("ko")),
        );
      updateVoices();
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
      return () =>
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          updateVoices,
        );
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      "starlight-korean-progress",
      JSON.stringify(completedDays),
    );
    localStorage.setItem(
      "starlight-korean-intermediate-progress",
      JSON.stringify(completedIntermediateDays),
    );
    localStorage.setItem(
      "starlight-korean-advanced-progress",
      JSON.stringify(completedAdvancedDays),
    );
    localStorage.setItem("starlight-korean-notes", JSON.stringify(notes));
    localStorage.setItem(
      "starlight-korean-mistakes",
      JSON.stringify(mistakes),
    );
    localStorage.setItem(
      "starlight-korean-detailed-mistakes",
      JSON.stringify(detailedMistakes),
    );
    localStorage.setItem(
      "starlight-korean-hint-usage",
      JSON.stringify(hintUsage),
    );
    localStorage.setItem(
      "starlight-korean-question-reports",
      JSON.stringify(questionReports),
    );
    localStorage.setItem(
      "starlight-korean-completion-dates",
      JSON.stringify(completionDates),
    );
    localStorage.setItem(
      "starlight-korean-study-sessions",
      JSON.stringify(studySessions),
    );
    localStorage.setItem(
      "starlight-korean-high-contrast",
      String(highContrast),
    );
    localStorage.setItem("starlight-korean-profile-role", profileRole);
    localStorage.setItem("starlight-korean-class-code", classCode);
    localStorage.setItem("starlight-korean-voice", preferredVoiceName);
  }, [
    completedDays,
    completedIntermediateDays,
    completedAdvancedDays,
    notes,
    mistakes,
    detailedMistakes,
    hintUsage,
    questionReports,
    completionDates,
    studySessions,
    highContrast,
    profileRole,
    classCode,
    preferredVoiceName,
    hydrated,
  ]);

  useEffect(() => {
    if (!hydrated || !restoredUrl.current) return;
    const params = new URLSearchParams();
    if (view !== "home") params.set("view", view);
    if (view === "lesson") {
      params.set("level", activeLevel);
      params.set("day", String(activeDay));
      params.set("stage", String(activeStage));
      if (activeStage === 2) params.set("question", String(practiceIndex));
    }
    const query = params.toString();
    window.history.replaceState({}, "", query ? `/?${query}` : "/");
  }, [hydrated, view, activeLevel, activeDay, activeStage, practiceIndex]);

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const timer = window.setInterval(
      () => setTimerSeconds((value) => value - 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [timerRunning, timerSeconds]);

  useEffect(() => {
    if (view === "coach" && user) void refreshClasses();
  }, [view, user]);

  const completedByLevel: Record<Level, number[]> = {
    beginner: completedDays,
    intermediate: completedIntermediateDays,
    advanced: completedAdvancedDays,
  };
  const activeLessons = getLevelLessons(activeLevel);
  const activeTitles = getLevelTitles(activeLevel);
  const activeCompleted = completedByLevel[activeLevel];
  const activeNextDay =
    activeLessons.find((item) => !activeCompleted.includes(item.day))?.day ??
    activeLessons.length;
  const lesson: Lesson =
    (activeLessons[activeDay - 1] as Lesson | undefined) ??
    (activeLessons[0] as Lesson);
  const progress = Math.round(
    (activeCompleted.length / activeLessons.length) * 100,
  );
  const beginnerProgress = Math.round((completedDays.length / lessons.length) * 100);
  const intermediateProgress = Math.round(
    (completedIntermediateDays.length / intermediateLessons.length) * 100,
  );
  const advancedProgress = Math.round(
    (completedAdvancedDays.length / advancedLessons.length) * 100,
  );
  const progressByLevel: Record<Level, number> = {
    beginner: beginnerProgress,
    intermediate: intermediateProgress,
    advanced: advancedProgress,
  };
  const homeLevel: Level =
    beginnerProgress < 100
      ? "beginner"
      : intermediateProgress < 100
        ? "intermediate"
        : "advanced";
  const homeLessons = getLevelLessons(homeLevel);
  const homeCompleted = completedByLevel[homeLevel];
  const homeProgress = progressByLevel[homeLevel];
  const nextDay =
    homeLessons.find((item) => !homeCompleted.includes(item.day))?.day ??
    homeLessons.length;
  const nextLesson = homeLessons[nextDay - 1];
  const highestCompletedDay = activeCompleted.length
    ? Math.max(...activeCompleted)
    : 0;
  const highestUnlockedDay = Math.min(
    activeLessons.length,
    highestCompletedDay + 1,
  );
  const noteKey = `${activeLevel}-${activeDay}`;
  const mistakeKey = `${activeLevel}-${activeDay}`;
  const isCheckpoint = activeDay % 5 === 0;
  const practiceExercises: PracticeExercise[] = isCheckpoint
    ? buildCheckpointExercises(activeLessons, activeDay, activeLevel)
    : buildLessonExercises(lesson, activeLevel);
  const currentExercise = practiceExercises[practiceIndex] ?? practiceExercises[0];
  const currentExerciseKey = `${activeLevel}-${activeDay}-${currentExercise.id}`;
  const currentAttempts = attemptCounts[currentExerciseKey] ?? 0;
  const isAnswerRevealed =
    currentAttempts >= 3 || Boolean(revealedAnswers[currentExerciseKey]);
  const isPracticeCorrect = answersMatch(
    selectedAnswer,
    currentExercise.answer,
    currentExercise.acceptedAnswers,
  );
  const currentGuide =
    guideProfiles.find((profile) => lesson.guide.startsWith(profile.key)) ??
    guideProfiles[0];
  const lessonAudioPath = `/audio/${activeLevel}-day-${String(activeDay).padStart(2, "0")}.mp3`;
  const isFinalDay = activeDay === activeLessons.length;
  const mistakeDays = Object.entries(mistakes)
    .filter(([key, count]) => key.startsWith(`${activeLevel}-`) && count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);
  const personalizedReviews = Object.values(detailedMistakes)
    .filter((item) => !item.resolved)
    .map((item) => ({
      ...item,
      priority:
        item.attempts * 2 +
        (item.hintLevel ?? hintUsage[item.key] ?? 0) +
        Math.min(
          5,
          Math.floor(
            (Date.now() - new Date(item.updatedAt).getTime()) / 86_400_000,
          ),
        ),
    }))
    .sort((a, b) => b.priority - a.priority || b.updatedAt.localeCompare(a.updatedAt));
  const unresolvedMistakes = personalizedReviews
    .filter((item) => item.level === activeLevel)
    .slice(0, 6);
  const totalMinutes = studySessions.reduce(
    (total, session) => total + session.minutes,
    0,
  );
  const sessionDates = Array.from(
    new Set(studySessions.map((session) => session.completedAt.slice(0, 10))),
  ).sort((a, b) => b.localeCompare(a));
  let streak = 0;
  if (sessionDates.length) {
    const cursor = new Date();
    const newest = new Date(`${sessionDates[0]}T00:00:00`);
    const todayGap = Math.floor(
      (cursor.getTime() - newest.getTime()) / 86_400_000,
    );
    if (todayGap <= 1) {
      cursor.setHours(0, 0, 0, 0);
      if (todayGap === 1) cursor.setDate(cursor.getDate() - 1);
      for (const date of sessionDates) {
        if (date !== cursor.toISOString().slice(0, 10)) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }
  }
  const reviewSchedule = [1, 3, 7, 14];
  const dueReviews = Object.entries(completionDates)
    .map(([key, date]) => {
       const separator = key.lastIndexOf("-");
       const level = key.slice(0, separator);
       const dayText = key.slice(separator + 1);
      const age = Math.floor(
        (Date.now() - new Date(date).getTime()) / 86_400_000,
      );
      return {
        key,
        level: level as Level,
        day: Number(dayText),
        age,
        due: reviewSchedule.includes(age) || (mistakes[key] ?? 0) > 0,
      };
    })
    .filter((item) => item.due)
    .slice(0, 6);
  const earnedBadges = [
    {
      name: "第一道星光",
      earned: studySessions.length >= 1,
      hint: "完成第一課",
    },
    {
      name: "五日練習生",
      earned: studySessions.length >= 5,
      hint: "完成五次學習",
    },
    {
      name: "連續七日",
      earned: streak >= 7,
      hint: "連續學習七天",
    },
    {
      name: "錯題修復師",
      earned: Object.values(mistakes).some((count) => count >= 2),
      hint: "勇敢重練錯題",
    },
    {
      name: "初級出發",
      earned: beginnerProgress === 100,
      hint: "完成初級",
    },
    {
      name: "正式出道",
      earned: advancedProgress === 100,
      hint: "完成三階段",
    },
  ];
  const timerLabel = `${String(Math.floor(timerSeconds / 60)).padStart(
    2,
    "0",
  )}:${String(timerSeconds % 60).padStart(2, "0")}`;

  const encouragement = useMemo(() => {
    if (activeCompleted.length === 0)
      return activeLevel === "beginner"
        ? "第一顆星正等著你點亮"
        : activeLevel === "intermediate"
          ? "第一場中級彩排正等著你"
          : "正式出道的第一道聚光燈已亮起";
    if (progress < 40) return "你的句子正在變得更完整";
    if (progress < 75) return "你已經能連接想法與情境";
    if (progress < 100) return "成果彩排就在前方";
    return activeLevel === "beginner"
      ? "初級 20 天航線全部點亮"
      : activeLevel === "intermediate"
        ? "中級 15 天彩排全部完成"
        : "高級 15 天正式舞台全部完成";
  }, [activeCompleted.length, activeLevel, progress]);

  function navigate(next: View) {
    if (next !== "lesson" && view === "lesson") clearRecording();
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearRecording() {
    mediaRecorder.current?.stream.getTracks().forEach((track) => track.stop());
    mediaRecorder.current = null;
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl("");
    setRecordingState("idle");
    setPronunciationRating(0);
  }

  function openLesson(
    day: number,
    level: Level = activeLevel,
    options?: { stage?: number; question?: number },
  ) {
    const targetLessons = getLevelLessons(level);
    if (day < 1 || day > targetLessons.length) return;
    clearRecording();
    setActiveLevel(level);
    setActiveDay(day);
    setActiveStage(options?.stage ?? 0);
    setSelectedAnswer("");
    setDraftAnswer("");
    setPracticeIndex(options?.question ?? 0);
    setCompletedPractice([]);
    setAttemptCounts({});
    setRevealedAnswers({});
    setReportStatus("");
    setShowCardHints(true);
    setTimerSeconds(15 * 60);
    setTimerRunning(false);
    navigate("lesson");
  }

  function openMistakeReview(item: DetailedMistake) {
    const targetLessons = getLevelLessons(item.level);
    const targetLesson = targetLessons[item.day - 1] as Lesson;
    const exercises =
      item.day % 5 === 0
        ? buildCheckpointExercises(targetLessons, item.day, item.level)
        : buildLessonExercises(targetLesson, item.level);
    const question = Math.max(
      0,
      exercises.findIndex((exercise) => exercise.id === item.exerciseId),
    );
    openLesson(item.day, item.level, { stage: 2, question });
  }

  async function copyLessonLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "lesson");
    url.searchParams.set("level", activeLevel);
    url.searchParams.set("day", String(activeDay));
    url.searchParams.set("stage", String(activeStage));
    if (activeStage === 2)
      url.searchParams.set("question", String(practiceIndex));
    await navigator.clipboard.writeText(url.toString());
    setReportStatus("已複製目前學習位置，可在其他裝置接續。");
  }

  function speak(text: string, slow = false) {
    if (!("speechSynthesis" in window)) return;
    activeAudio.current?.pause();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    const voice =
      availableVoices.find((item) => item.name === preferredVoiceName) ??
      availableVoices[0];
    if (voice) utterance.voice = voice;
    utterance.rate = slow ? 0.62 : 0.88;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function playFixedAudio(path: string, fallbackText: string, slow = false) {
    window.speechSynthesis?.cancel();
    activeAudio.current?.pause();
    const audio = new Audio(path);
    activeAudio.current = audio;
    audio.playbackRate = slow ? 0.72 : 1;
    audio.play().catch(() => speak(fallbackText, slow));
  }

  async function startRecording() {
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setRecordingState("unsupported");
      return;
    }
    try {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      setRecordingUrl("");
      setPronunciationRating(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunks.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) recordingChunks.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(recordingChunks.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setRecordingUrl(URL.createObjectURL(blob));
        setRecordingState("ready");
        stream.getTracks().forEach((track) => track.stop());
      });
      mediaRecorder.current = recorder;
      recorder.start();
      setRecordingState("recording");
    } catch {
      setRecordingState("denied");
    }
  }

  function stopRecording() {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
  }

  async function completeLesson() {
    const key = `${activeLevel}-${activeDay}`;
    const completedAt = new Date().toISOString();
    const estimatedMinutes = Math.min(
      60,
      Math.max(45, 45 + Math.round((15 * 60 - timerSeconds) / 60)),
    );
    const update = (days: number[]) =>
      days.includes(activeDay) ? days : [...days, activeDay];
    if (activeLevel === "beginner") setCompletedDays(update);
    else if (activeLevel === "intermediate")
      setCompletedIntermediateDays(update);
    else setCompletedAdvancedDays(update);
    setCompletionDates((current) => ({
      ...current,
      [key]: current[key] ?? completedAt,
    }));
    setStudySessions((current) => [
      {
        key: `${key}-${completedAt}`,
        level: activeLevel,
        day: activeDay,
        completedAt,
        minutes: estimatedMinutes,
      },
      ...current,
    ].slice(0, 300));
    if (user) {
      const firstTryCorrect = practiceExercises.filter(
        (exercise) =>
          (attemptCounts[`${activeLevel}-${activeDay}-${exercise.id}`] ?? 0) ===
          0,
      ).length;
      const score = Math.round(
        (firstTryCorrect / practiceExercises.length) * 100,
      );
      await fetch("/api/assignments/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          level: activeLevel,
          day: activeDay,
          score,
          totalQuestions: practiceExercises.length,
        }),
      }).catch(() => undefined);
    }
    navigate(activeDay === activeLessons.length ? "journal" : "map");
  }

  function choosePracticeAnswer(option: string) {
    setSelectedAnswer(option);
    if (
      answersMatch(
        option,
        currentExercise.answer,
        currentExercise.acceptedAnswers,
      )
    ) {
      setCompletedPractice((current) =>
        current.includes(practiceIndex)
          ? current
          : [...current, practiceIndex],
      );
      setDetailedMistakes((current) => {
        const previous = current[currentExerciseKey];
        if (!previous) return current;
        return {
          ...current,
          [currentExerciseKey]: {
            ...previous,
            resolved: true,
            updatedAt: new Date().toISOString(),
          },
        };
      });
      return;
    }
    const nextAttempts = currentAttempts + 1;
    const nextHintLevel = Math.min(2, nextAttempts);
    setAttemptCounts((current) => ({
      ...current,
      [currentExerciseKey]: (current[currentExerciseKey] ?? 0) + 1,
    }));
    setMistakes((current) => ({
      ...current,
      [mistakeKey]: (current[mistakeKey] ?? 0) + 1,
    }));
    setHintUsage((current) => ({
      ...current,
      [currentExerciseKey]: Math.max(
        current[currentExerciseKey] ?? 0,
        nextHintLevel,
      ),
    }));
    setDetailedMistakes((current) => ({
      ...current,
      [currentExerciseKey]: {
        key: currentExerciseKey,
        level: activeLevel,
        day: activeDay,
        exerciseId: currentExercise.id,
        kicker: currentExercise.kicker,
        question: currentExercise.question,
        submittedAnswer: option,
        correctAnswer: currentExercise.answer,
        attempts: nextAttempts,
        hintLevel: nextHintLevel,
        errorType: currentExercise.kicker,
        resolved: false,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function advancePractice() {
    if (
      !answersMatch(
        selectedAnswer,
        currentExercise.answer,
        currentExercise.acceptedAnswers,
      )
    )
      return;
    if (practiceIndex < practiceExercises.length - 1) {
      setPracticeIndex((index) => index + 1);
      setSelectedAnswer("");
      setDraftAnswer("");
      setReportStatus("");
      return;
    }
    setActiveStage(3);
  }

  function learningPayload() {
    return {
      version: 4,
      completedDays,
      completedIntermediateDays,
      completedAdvancedDays,
      notes,
      mistakes,
      detailedMistakes,
      hintUsage,
      questionReports,
      completionDates,
      studySessions,
    };
  }

  function applyLearningPayload(data: Record<string, unknown>) {
    if (Array.isArray(data.completedDays))
      setCompletedDays(data.completedDays as number[]);
    if (Array.isArray(data.completedIntermediateDays))
      setCompletedIntermediateDays(data.completedIntermediateDays as number[]);
    if (Array.isArray(data.completedAdvancedDays))
      setCompletedAdvancedDays(data.completedAdvancedDays as number[]);
    if (data.notes && typeof data.notes === "object")
      setNotes(data.notes as Record<string, string>);
    if (data.mistakes && typeof data.mistakes === "object")
      setMistakes(data.mistakes as Record<string, number>);
    if (data.detailedMistakes && typeof data.detailedMistakes === "object")
      setDetailedMistakes(
        data.detailedMistakes as Record<string, DetailedMistake>,
      );
    if (data.hintUsage && typeof data.hintUsage === "object")
      setHintUsage(data.hintUsage as Record<string, number>);
    if (Array.isArray(data.questionReports))
      setQuestionReports(data.questionReports as QuestionReport[]);
    if (data.completionDates && typeof data.completionDates === "object")
      setCompletionDates(data.completionDates as Record<string, string>);
    if (Array.isArray(data.studySessions))
      setStudySessions(data.studySessions as StudySession[]);
  }

  async function markQuestionIssue() {
    const report: QuestionReport = {
      key: `${currentExerciseKey}-${Date.now()}`,
      level: activeLevel,
      day: activeDay,
      exerciseId: currentExercise.id,
      kicker: currentExercise.kicker,
      question: currentExercise.question,
      submittedAnswer: selectedAnswer || draftAnswer || "尚未作答",
      expectedAnswer: currentExercise.answer,
      createdAt: new Date().toISOString(),
    };
    setQuestionReports((current) => [report, ...current].slice(0, 100));
    setReportStatus("已在這台裝置標記此題。");
    const targetClassCode = classCode || memberships[0]?.classCode || "";
    if (user && targetClassCode) {
      const response = await fetch("/api/question-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          classCode: targetClassCode,
          level: activeLevel,
          day: activeDay,
          exerciseId: currentExercise.id,
          kicker: currentExercise.kicker,
          question: currentExercise.question,
          submittedAnswer: report.submittedAnswer,
          expectedAnswer: currentExercise.answer,
        }),
      });
      const result = (await response.json()) as { error?: string };
      setReportStatus(
        response.ok
          ? "已送到班級老師的題目回報中心。"
          : result.error ?? "已保存在這台裝置。",
      );
    }
    const reportText = [
      "별빛韓語研究所題目回報",
      `階段：${activeLevel}`,
      `課程：Day ${activeDay}`,
      `題型：${currentExercise.kicker}`,
      `題目：${currentExercise.question}`,
      `學生答案：${report.submittedAnswer}`,
      `系統答案：${currentExercise.answer}`,
    ].join("\n");
    navigator.clipboard
      ?.writeText(reportText)
      .then(() => {
        if (!user || !targetClassCode)
          setReportStatus("已標記並複製回報資料，可直接貼給老師。");
      })
      .catch(() => undefined);
  }

  function exportLearningData() {
    const blob = new Blob([JSON.stringify(learningPayload(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `starlight-korean-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importLearningData(file: File | undefined) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>;
      applyLearningPayload(data);
      setSyncStatus("學習資料已成功匯入這台裝置");
    } catch {
      setSyncStatus("匯入失敗：請選擇由本站匯出的 JSON 檔案");
    }
  }

  function resetCurrentLevel() {
    if (!window.confirm(`確定要重設${levelMeta[activeLevel].shortName}進度嗎？`))
      return;
    if (activeLevel === "beginner") setCompletedDays([]);
    else if (activeLevel === "intermediate") setCompletedIntermediateDays([]);
    else setCompletedAdvancedDays([]);
    setCompletionDates((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([key]) => !key.startsWith(`${activeLevel}-`),
        ),
      ),
    );
    setSyncStatus(`${levelMeta[activeLevel].shortName}進度已重設`);
  }

  async function syncToCloud(force = false) {
    if (!user) {
      window.location.href = "/signin-with-chatgpt?return_to=%2F";
      return;
    }
    setSyncStatus("正在同步到雲端…");
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: learningPayload(),
        role: profileRole,
        classCode,
        baseUpdatedAt: cloudUpdatedAt,
        force,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      conflict?: boolean;
      updatedAt?: string;
    };
    if (response.status === 409 && result.conflict) {
      setSyncConflict(true);
      setSyncStatus(result.error ?? "雲端已有較新的進度");
      return;
    }
    if (response.ok) {
      setCloudUpdatedAt(result.updatedAt ?? new Date().toISOString());
      setSyncConflict(false);
      setSyncStatus("雲端同步完成，可在其他裝置接續學習");
    } else {
      setSyncStatus(result.error ?? "同步失敗");
    }
  }

  async function loadFromCloud() {
    if (!user) {
      window.location.href = "/signin-with-chatgpt?return_to=%2F";
      return;
    }
    setSyncStatus("正在讀取雲端進度…");
    const response = await fetch("/api/sync");
    const result = (await response.json()) as {
      error?: string;
      profile?: {
        data?: Record<string, unknown>;
        role?: "student" | "teacher" | "parent";
        classCode?: string;
        updatedAt?: string;
      } | null;
    };
    if (response.ok && result.profile?.data) {
      applyLearningPayload(result.profile.data);
      if (result.profile.role) setProfileRole(result.profile.role);
      if (result.profile.classCode) setClassCode(result.profile.classCode);
      setCloudUpdatedAt(result.profile.updatedAt ?? new Date().toISOString());
      setSyncConflict(false);
      setSyncStatus("已載入雲端進度");
    } else {
      setSyncStatus(result.error ?? "目前沒有雲端進度");
    }
  }

  async function deleteCloudLearningData() {
    if (!user) return;
    if (!window.confirm("確定刪除雲端學習進度嗎？這台裝置的本機資料會保留。"))
      return;
    const response = await fetch("/api/sync", { method: "DELETE" });
    const result = (await response.json()) as { error?: string };
    if (response.ok) {
      setCloudUpdatedAt(null);
      setSyncConflict(false);
      setSyncStatus("雲端學習資料已刪除；本機資料仍保留");
    } else {
      setSyncStatus(result.error ?? "無法刪除雲端資料");
    }
  }

  async function refreshClasses() {
    if (!user) return;
    const [response, reportResponse] = await Promise.all([
      fetch("/api/classes"),
      fetch("/api/question-reports"),
    ]);
    const result = (await response.json()) as {
      owned?: CloudClass[];
      memberships?: { classCode: string; role: string }[];
      assignments?: ClassAssignment[];
      linkedStudents?: LinkedStudent[];
      error?: string;
    };
    if (response.ok) {
      setOwnedClasses(result.owned ?? []);
      setMemberships(result.memberships ?? []);
      setAssignments(result.assignments ?? []);
      setLinkedStudents(result.linkedStudents ?? []);
    } else {
      setSyncStatus(result.error ?? "無法讀取班級");
    }
    if (reportResponse.ok) {
      const reportResult = (await reportResponse.json()) as {
        reports?: TeacherQuestionReport[];
      };
      setTeacherQuestionReports(reportResult.reports ?? []);
    }
  }

  async function updateQuestionReport(
    id: number,
    status: TeacherQuestionReport["status"],
  ) {
    const response = await fetch("/api/question-reports", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok) {
      setTeacherQuestionReports((current) =>
        current.map((report) =>
          report.id === id ? { ...report, status } : report,
        ),
      );
    } else {
      const result = (await response.json()) as { error?: string };
      setSyncStatus(result.error ?? "無法更新題目回報");
    }
  }

  async function createClass() {
    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", name: className }),
    });
    const result = (await response.json()) as { code?: string; error?: string };
    if (response.ok) {
      setClassCode(result.code ?? "");
      setProfileRole("teacher");
      setClassName("");
      setSyncStatus(`班級建立完成，邀請碼：${result.code}`);
      await refreshClasses();
    } else setSyncStatus(result.error ?? "建立班級失敗");
  }

  async function joinClass() {
    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "join",
        code: joinCode,
        role: profileRole === "parent" ? "parent" : "student",
      }),
    });
    const result = (await response.json()) as { code?: string; error?: string };
    if (response.ok) {
      setClassCode(result.code ?? joinCode.toUpperCase());
      setJoinCode("");
      setSyncStatus("已加入班級");
      await refreshClasses();
    } else setSyncStatus(result.error ?? "加入班級失敗");
  }

  async function createAssignment(code: string) {
    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        code,
        title: assignmentTitle,
        level: assignmentLevel,
        day: assignmentDay,
        dueDate: assignmentDueDate,
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (response.ok) {
      setAssignmentTitle("");
      setSyncStatus("課程指派完成");
      await refreshClasses();
    } else setSyncStatus(result.error ?? "指派失敗");
  }

  async function regenerateClassCode(code: string) {
    if (!window.confirm("確定重新產生邀請碼嗎？舊邀請碼會立即失效。")) return;
    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "regenerate-code", code }),
    });
    const result = (await response.json()) as { code?: string; error?: string };
    if (response.ok) {
      if (classCode === code) setClassCode(result.code ?? "");
      setSyncStatus(`新邀請碼：${result.code}`);
      await refreshClasses();
    } else setSyncStatus(result.error ?? "無法更新邀請碼");
  }

  async function linkParentStudent(code: string) {
    const draft = parentLinkDrafts[code];
    if (!draft?.parentEmail || !draft.studentEmail) {
      setSyncStatus("請先選擇家長與學生");
      return;
    }
    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "link-parent", code, ...draft }),
    });
    const result = (await response.json()) as { error?: string };
    if (response.ok) {
      setSyncStatus("家長與學生關聯已建立");
      await refreshClasses();
    } else setSyncStatus(result.error ?? "無法建立關聯");
  }

  async function removeClassResource(
    resource: "member" | "assignment" | "class",
    code: string,
    options?: { email?: string; id?: number; label?: string },
  ) {
    const label = options?.label ?? "這筆資料";
    if (!window.confirm(`確定刪除${label}嗎？此操作無法復原。`)) return;
    const params = new URLSearchParams({ resource, code });
    if (options?.email) params.set("email", options.email);
    if (options?.id) params.set("id", String(options.id));
    const response = await fetch(`/api/classes?${params}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string };
    if (response.ok) {
      setSyncStatus(`${label}已刪除`);
      await refreshClasses();
    } else setSyncStatus(result.error ?? "刪除失敗");
  }

  async function leaveClass(code: string) {
    if (!window.confirm(`確定離開班級 ${code} 嗎？`)) return;
    const response = await fetch(
      `/api/classes?${new URLSearchParams({ resource: "leave", code })}`,
      { method: "DELETE" },
    );
    const result = (await response.json()) as { error?: string };
    if (response.ok) {
      if (classCode === code) setClassCode("");
      setSyncStatus("已離開班級");
      await refreshClasses();
    } else setSyncStatus(result.error ?? "無法離開班級");
  }

  function exportClassReport(course: CloudClass) {
    const rows = [
      ["姓名", "身分", "完成率", "學習分鐘", "錯題次數", "最後活動"],
      ...(course.members ?? []).map((member) => [
        member.displayName,
        member.role,
        `${member.progress ?? 0}%`,
        String(member.minutes ?? 0),
        String(member.mistakes ?? 0),
        member.lastActive?.slice(0, 10) ?? "",
      ]),
      [],
      ["作業", "課程", "截止日期", "完成", "平均分數", "遲交", "逾期未交"],
      ...(course.assignments ?? []).map((assignment) => [
        assignment.title,
        `${levelMeta[assignment.level].shortName} Day ${assignment.day}`,
        assignment.dueDate,
        `${assignment.completedCount ?? 0}/${assignment.totalStudents ?? 0}`,
        assignment.averageScore == null ? "" : String(assignment.averageScore),
        String(assignment.lateCount ?? 0),
        String(assignment.overdueCount ?? 0),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${course.name}-學習報告.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resetCurrentLesson() {
    if (!window.confirm(`確定要重設 Day ${activeDay} 的完成與錯題紀錄嗎？`))
      return;
    const key = `${activeLevel}-${activeDay}`;
    const removeDay = (days: number[]) => days.filter((day) => day !== activeDay);
    if (activeLevel === "beginner") setCompletedDays(removeDay);
    else if (activeLevel === "intermediate")
      setCompletedIntermediateDays(removeDay);
    else setCompletedAdvancedDays(removeDay);
    setCompletionDates((current) =>
      Object.fromEntries(Object.entries(current).filter(([item]) => item !== key)),
    );
    setMistakes((current) =>
      Object.fromEntries(Object.entries(current).filter(([item]) => item !== key)),
    );
    setSyncStatus(`${levelMeta[activeLevel].shortName} Day ${activeDay} 已重設`);
  }

  return (
    <div className={`site-shell ${highContrast ? "high-contrast" : ""}`}>
      <a className="skip-link" href="#main-content">
        跳到主要內容
      </a>
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
            onClick={() => openLesson(activeNextDay, activeLevel)}
          >
            練習室
          </button>
          <button
            className={view === "journal" ? "nav-active" : ""}
            onClick={() => navigate("journal")}
          >
            我的手帳
          </button>
          <button
            className={view === "coach" ? "nav-active" : ""}
            onClick={() => navigate("coach")}
          >
            教學管理
          </button>
        </nav>
        {user ? (
          <a className="account-pill" href="/signout-with-chatgpt?return_to=%2F">
            {user.displayName} · 登出
          </a>
        ) : (
          <a className="account-pill" href="/signin-with-chatgpt?return_to=%2F">
            登入同步
          </a>
        )}
      </header>

      <main id="main-content">
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
                    onClick={() => openLesson(nextDay, homeLevel)}
                  >
                    <span>
                      {homeProgress === 100
                        ? "重溫"
                        : homeProgress
                          ? "繼續"
                          : "開始"}{" "}
                      {levelMeta[homeLevel].shortName} Day {nextDay}
                    </span>
                    <b>→</b>
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => navigate("map")}
                  >
                    查看完整學習航線
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
                  <h2>
                    Day {nextDay} · {nextLesson.eyebrow}
                  </h2>
                </div>
                <div className="duration">
                  <span>◷</span>
                  <strong>{nextLesson.minutes}</strong>
                </div>
              </div>
              <div className="stage-strip">
                {stages.map((stage, index) => (
                  <button
                    key={stage.name}
                    onClick={() => {
                      openLesson(nextDay, homeLevel);
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
                    <i style={{ width: `${beginnerProgress}%` }} />
                  </div>
                  <b>{beginnerProgress}% COMPLETE</b>
                </article>
                <button
                  type="button"
                  className="level-card level-available"
                  onClick={() => {
                    setActiveLevel("intermediate");
                    navigate("map");
                  }}
                >
                  <span className="level-number">02</span>
                  <div className="level-planet planet-violet">문</div>
                  <p>INTERMEDIATE · 15 DAYS</p>
                  <h3>中級 · 舞台準備中</h3>
                  <span>時態、敬語、連接句與情境任務</span>
                  <div className="mini-progress">
                    <i style={{ width: `${intermediateProgress}%` }} />
                  </div>
                  <b>{intermediateProgress}% COMPLETE · 點擊進入</b>
                </button>
                <button
                  type="button"
                  className="level-card level-available"
                  onClick={() => {
                    setActiveLevel("advanced");
                    navigate("map");
                  }}
                >
                  <span className="level-number">03</span>
                  <div className="level-planet planet-pink">별</div>
                  <p>ADVANCED · 15 DAYS</p>
                  <h3>高級 · 正式出道</h3>
                  <span>轉述、推測、正式語體與成果發表</span>
                  <div className="mini-progress">
                    <i style={{ width: `${advancedProgress}%` }} />
                  </div>
                  <b>{advancedProgress}% COMPLETE · 點擊進入</b>
                </button>
              </div>
            </section>
          </div>
        )}

        {view === "map" && (
          <section className="map-view">
            <div className="level-switcher" aria-label="選擇學習階段">
              <button
                className={activeLevel === "beginner" ? "is-active" : ""}
                onClick={() => {
                  setActiveLevel("beginner");
                  setActiveDay(1);
                }}
              >
                <span>01</span>
                <strong>初級 · 韓文練習生</strong>
                <small>20 天 · {beginnerProgress}%</small>
              </button>
              <button
                className={activeLevel === "intermediate" ? "is-active" : ""}
                onClick={() => {
                  setActiveLevel("intermediate");
                  setActiveDay(1);
                }}
              >
                <span>02</span>
                <strong>中級 · 舞台準備中</strong>
                <small>15 天 · {intermediateProgress}%</small>
              </button>
              <button
                className={activeLevel === "advanced" ? "is-active" : ""}
                onClick={() => {
                  setActiveLevel("advanced");
                  setActiveDay(1);
                }}
              >
                <span>03</span>
                <strong>高級 · 正式出道</strong>
                <small>15 天 · {advancedProgress}%</small>
              </button>
            </div>
            <div className="page-intro">
              <p className="eyebrow">{levelMeta[activeLevel].eyebrow}</p>
              <h1>{levelMeta[activeLevel].mapTitle}</h1>
              <p>{levelMeta[activeLevel].mapCopy}</p>
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
              {activeTitles.map((title, index) => {
                const day = index + 1;
                const available = day <= highestUnlockedDay;
                const done = activeCompleted.includes(day);
                return (
                  <button
                    key={title}
                    className={`day-node ${available ? "available" : ""} ${
                      done ? "completed" : ""
                    } ${day % 5 === 0 ? "checkpoint" : ""}`}
                    onClick={() => openLesson(day, activeLevel)}
                    disabled={!available}
                    aria-label={`Day ${day} ${title}${
                      available ? "" : "，尚未開放"
                    }`}
                  >
                    <span className="node-star">{done ? "✓" : day}</span>
                    <small>DAY {String(day).padStart(2, "0")}</small>
                    <strong>{title}</strong>
                    <em>
                      {day % 5 === 0
                        ? done
                          ? "階段考完成"
                          : available
                            ? "階段考"
                            : "階段考 · 依序解鎖"
                        : available
                          ? done
                            ? "已點亮"
                            : "可學習"
                          : "依序解鎖"}
                    </em>
                  </button>
                );
              })}
            </div>

            <div className="future-levels">
              {(["beginner", "intermediate", "advanced"] as const)
                .filter((level) => level !== activeLevel)
                .map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => {
                      setActiveLevel(level);
                      setActiveDay(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <span>
                      {level === "beginner"
                        ? "01"
                        : level === "intermediate"
                          ? "02"
                          : "03"}
                    </span>
                    <div>
                      <p>{level.toUpperCase()}</p>
                      <h2>{levelMeta[level].name}</h2>
                    </div>
                    <b>切換地圖 →</b>
                  </button>
                ))}
            </div>
          </section>
        )}

        {view === "journal" && (
          <section className="journal-view">
            <div className="page-intro">
              <p className="eyebrow">MY STARDUST JOURNAL</p>
              <h1>我的星光手帳</h1>
              <p>
                免登入時保存在這台裝置；登入後可手動同步到雲端，在其他裝置接續學習。
              </p>
            </div>
            <div className="learning-stats" aria-label="學習統計">
              <article>
                <span>累積學習</span>
                <strong>{totalMinutes}</strong>
                <small>分鐘</small>
              </article>
              <article>
                <span>連續學習</span>
                <strong>{streak}</strong>
                <small>天</small>
              </article>
              <article>
                <span>完成課次</span>
                <strong>{studySessions.length}</strong>
                <small>次</small>
              </article>
              <article>
                <span>今日複習</span>
                <strong>{dueReviews.length}</strong>
                <small>課</small>
              </article>
            </div>
            <div className="journal-grid">
              <article className="journal-summary">
                <div className="big-progress">
                  <span>{progress}%</span>
                </div>
                <div>
                  <p>{activeLevel.toUpperCase()} PROGRESS</p>
                  <h2>{encouragement}</h2>
                  <span>
                    已完成 {activeCompleted.length} / {activeLessons.length}{" "}
                    個{levelMeta[activeLevel].shortName}任務
                  </span>
                  <button onClick={() => navigate("map")}>繼續學習</button>
                </div>
              </article>
              <article className="badge-card">
                <p>成就徽章</p>
                <div className="badge-grid">
                  {earnedBadges.map((badge) => (
                    <div
                      key={badge.name}
                      className={badge.earned ? "badge earned" : "badge"}
                    >
                      <span>{badge.earned ? "✦" : "◇"}</span>
                      <strong>{badge.name}</strong>
                      <small>{badge.hint}</small>
                    </div>
                  ))}
                </div>
              </article>
              <article className="notes-card">
                <p>最近的自習筆記</p>
                {[1, 2, 3].map((day) => (
                  <button
                    key={day}
                    onClick={() => openLesson(day, activeLevel)}
                  >
                    <span>DAY {day}</span>
                    <strong>
                      {(
                        notes[`${activeLevel}-${day}`] ||
                        (activeLevel === "beginner" ? notes[String(day)] : "")
                      )?.trim() || "尚未留下筆記，點此開始"}
                    </strong>
                  </button>
                ))}
              </article>
              <article className="mistake-card">
                <div className="mistake-card-head">
                  <div>
                    <p>錯題星球</p>
                    <h2>答錯後再練一次，記憶會更穩</h2>
                  </div>
                  <span>
                    {mistakeDays.reduce((total, [, count]) => total + count, 0)}{" "}
                    次
                  </span>
                </div>
                {mistakeDays.length ? (
                  <>
                    <div className="mistake-list">
                      {mistakeDays.map(([key, count]) => {
                        const day = Number(key.split("-")[1]);
                        return (
                          <button
                            key={key}
                            onClick={() => openLesson(day, activeLevel)}
                          >
                            <span>DAY {day}</span>
                            <strong>{activeTitles[day - 1]}</strong>
                            <small>{count} 次錯誤 · 重新挑戰 →</small>
                          </button>
                        );
                      })}
                    </div>
                    {unresolvedMistakes.length > 0 && (
                      <div className="detailed-mistake-list">
                        <h3>為你安排的逐題複習</h3>
                        {unresolvedMistakes.map((item) => (
                          <button
                            key={item.key}
                            onClick={() => openMistakeReview(item)}
                          >
                            <span>
                              Day {item.day} · {item.kicker}
                            </span>
                            <strong>{item.question}</strong>
                            <small>
                              {item.errorType || "綜合練習"} · 錯誤 {item.attempts} 次 ·
                              使用 {item.hintLevel ?? 0} 層提示 · 直接回到本題 →
                            </small>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mistake-empty">
                    還沒有錯題紀錄。完成互動練習後，需複習的題目會出現在這裡。
                  </p>
                )}
              </article>
              <article className="review-card">
                <div className="mistake-card-head">
                  <div>
                    <p>間隔複習</p>
                    <h2>完成後第 1、3、7、14 天回來看一次</h2>
                  </div>
                  <span>{dueReviews.length} 課</span>
                </div>
                <div className="review-list">
                  {dueReviews.length ? (
                    dueReviews.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => openLesson(item.day, item.level)}
                      >
                        <span>{levelMeta[item.level].shortName}</span>
                        <strong>
                          Day {item.day} · {getLevelTitles(item.level)[item.day - 1]}
                        </strong>
                        <small>
                          {item.age} 天前完成
                          {(mistakes[item.key] ?? 0) > 0 ? " · 含錯題" : ""}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p>目前沒有到期複習，完成新課後會自動排入。</p>
                  )}
                </div>
              </article>
              <article className="guide-team-card">
                <div className="guide-team-copy">
                  <p className="card-kicker">ORIGINAL STUDY GUIDES</p>
                  <h2>五位嚮導，各自守護一種能力</h2>
                  <div className="guide-role-list">
                    <span>루미 · 發音</span>
                    <span>하루 · 文法</span>
                    <span>별 · 聽力</span>
                    <span>누리 · 複習</span>
                    <span>온 · 自習</span>
                  </div>
                  <small>
                    角色皆為原創虛構人物，與任何真實藝人、團體或娛樂公司無關。
                  </small>
                </div>
                <div className="guide-gallery">
                  {guideProfiles.map((profile) => (
                    <figure key={profile.key}>
                      <img
                        src={profile.image}
                        alt={`${profile.name}，${profile.role}嚮導`}
                      />
                      <figcaption>
                        <strong>{profile.name}</strong>
                        <small>{profile.role}</small>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </article>
              <article className="data-tools-card">
                <div>
                  <p className="card-kicker">DATA & ACCESSIBILITY</p>
                  <h2>資料管理與閱讀設定</h2>
                  <p>{syncStatus}</p>
                </div>
                <div className="data-tool-actions">
                  <label className="voice-picker">
                    韓語聲音
                    <select
                      value={preferredVoiceName}
                      onChange={(event) =>
                        setPreferredVoiceName(event.target.value)
                      }
                    >
                      <option value="">裝置預設</option>
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button onClick={exportLearningData}>匯出學習資料</button>
                  <label>
                    匯入學習資料
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(event) =>
                        void importLearningData(event.target.files?.[0])
                      }
                    />
                  </label>
                  <button onClick={() => void syncToCloud()}>
                    {user ? "同步到雲端" : "登入並同步"}
                  </button>
                  {user && (
                    <button onClick={() => void loadFromCloud()}>
                      載入雲端進度
                    </button>
                  )}
                  {user && (
                    <button
                      className="danger-action"
                      onClick={() => void deleteCloudLearningData()}
                    >
                      刪除雲端進度
                    </button>
                  )}
                  <button
                    aria-pressed={highContrast}
                    onClick={() => setHighContrast((enabled) => !enabled)}
                  >
                    {highContrast ? "關閉高對比" : "開啟高對比"}
                  </button>
                  <button className="danger-action" onClick={resetCurrentLesson}>
                    重設目前 Day {activeDay}
                  </button>
                  <button className="danger-action" onClick={resetCurrentLevel}>
                    重設目前階段
                  </button>
                </div>
                {syncConflict && (
                  <div className="sync-conflict" role="alert">
                    <strong>偵測到另一台裝置的較新進度</strong>
                    <p>先載入雲端資料最安全；確認本機資料較新時才覆蓋。</p>
                    <button onClick={() => void loadFromCloud()}>
                      先載入雲端
                    </button>
                    <button onClick={() => void syncToCloud(true)}>
                      確認以本機覆蓋
                    </button>
                  </div>
                )}
              </article>
            </div>
          </section>
        )}

        {view === "coach" && (
          <section className="coach-view">
            <div className="page-intro">
              <p className="eyebrow">LEARNING SUPPORT CENTER</p>
              <h1>教學與家庭陪伴中心</h1>
              <p>
                建立班級、使用邀請碼加入，並用簡潔報告了解學習進度。學生筆記不會出現在班級名單中。
              </p>
            </div>

            {!user ? (
              <article className="signin-panel">
                <span>✦</span>
                <div>
                  <h2>登入後使用班級與跨裝置功能</h2>
                  <p>公開課程與本機進度不需登入，登入只用於自願同步與班級管理。</p>
                </div>
                <a href="/signin-with-chatgpt?return_to=%2F">使用 ChatGPT 登入</a>
              </article>
            ) : (
              <>
                <div className="coach-summary">
                  <article>
                    <small>目前帳號</small>
                    <strong>{user.displayName}</strong>
                    <span>{user.email}</span>
                  </article>
                  <article>
                    <small>學習完成</small>
                    <strong>
                      {completedDays.length +
                        completedIntermediateDays.length +
                        completedAdvancedDays.length}{" "}
                      / 50
                    </strong>
                    <span>累積 {totalMinutes} 分鐘</span>
                  </article>
                  <article>
                    <small>需複習</small>
                    <strong>{dueReviews.length} 課</strong>
                    <span>連續 {streak} 天</span>
                  </article>
                </div>

                <div className="coach-grid">
                  <article className="profile-role-card">
                    <p className="card-kicker">PROFILE</p>
                    <h2>選擇使用身分</h2>
                    <label>
                      <span>我是</span>
                      <select
                        value={profileRole}
                        onChange={(event) =>
                          setProfileRole(
                            event.target.value as
                              | "student"
                              | "teacher"
                              | "parent",
                          )
                        }
                      >
                        <option value="student">學生</option>
                        <option value="teacher">教師</option>
                        <option value="parent">家長</option>
                      </select>
                    </label>
                    <button onClick={() => void syncToCloud()}>
                      保存身分與進度
                    </button>
                    <p>{syncStatus}</p>
                    {syncConflict && (
                      <div className="sync-conflict compact" role="alert">
                        <strong>雲端已有較新資料</strong>
                        <button onClick={() => void loadFromCloud()}>
                          載入雲端
                        </button>
                        <button onClick={() => void syncToCloud(true)}>
                          以本機覆蓋
                        </button>
                      </div>
                    )}
                  </article>

                  {profileRole === "teacher" ? (
                    <article className="class-action-card">
                      <p className="card-kicker">CREATE CLASS</p>
                      <h2>建立新的韓語班級</h2>
                      <label>
                        <span>班級名稱</span>
                        <input
                          value={className}
                          onChange={(event) => setClassName(event.target.value)}
                          placeholder="例如：星光韓語七年一班"
                          maxLength={40}
                        />
                      </label>
                      <button onClick={createClass}>建立並產生邀請碼</button>
                    </article>
                  ) : (
                    <article className="class-action-card">
                      <p className="card-kicker">JOIN CLASS</p>
                      <h2>使用邀請碼加入班級</h2>
                      <label>
                        <span>六碼班級代碼</span>
                        <input
                          value={joinCode}
                          onChange={(event) =>
                            setJoinCode(event.target.value.toUpperCase())
                          }
                          placeholder="ABC234"
                          maxLength={12}
                        />
                      </label>
                      <button onClick={joinClass}>加入班級</button>
                    </article>
                  )}
                </div>

                <div className="class-board">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">CLASS OVERVIEW</p>
                      <h2>班級與成員</h2>
                    </div>
                    <button onClick={refreshClasses}>重新整理</button>
                  </div>
                  {ownedClasses.map((course) => (
                    <article className="class-card" key={course.code}>
                      <div>
                        <span>邀請碼</span>
                        <strong>{course.code}</strong>
                        <button onClick={() => exportClassReport(course)}>
                          匯出報告
                        </button>
                        <button onClick={() => void regenerateClassCode(course.code)}>
                          更新邀請碼
                        </button>
                        <button
                          className="danger-action"
                          onClick={() =>
                            void removeClassResource("class", course.code, {
                              label: `班級「${course.name}」`,
                            })
                          }
                        >
                          刪除班級
                        </button>
                      </div>
                      <div>
                        <h3>{course.name}</h3>
                        <p>{course.members?.length ?? 0} 位成員</p>
                      </div>
                      <div className="roster-list">
                        {course.members?.map((member) => (
                          <span key={member.email}>
                            <strong>{member.displayName}</strong>
                            <small>
                              {member.role === "teacher"
                                ? "教師"
                                : member.role === "parent"
                                  ? "家長"
                                  : "學生"}
                            </small>
                            {member.role === "student" && (
                              <>
                                <small>
                                  {member.progress ?? 0}% · {member.minutes ?? 0}{" "}
                                  分鐘 · 錯題 {member.mistakes ?? 0}
                                </small>
                                <div className="student-diagnostics">
                                  {!!course.assignments?.length && (
                                    <p>
                                      已完成指派：
                                      {
                                        course.assignments.filter((assignment) =>
                                          assignment.results?.some(
                                            (result) =>
                                              result.studentEmail === member.email,
                                          ),
                                        ).length
                                      }
                                      /{course.assignments.length}
                                    </p>
                                  )}
                                  {!!member.recentMistakes?.length && (
                                    <details>
                                      <summary>
                                        最近 {member.recentMistakes.length} 題需協助
                                      </summary>
                                      {member.recentMistakes.map((mistake) => (
                                        <p key={mistake.key}>
                                          Day {mistake.day} · {mistake.kicker}
                                          <br />
                                          <b>學生：</b>{mistake.submittedAnswer}
                                          <br />
                                          <b>答案：</b>{mistake.correctAnswer}
                                        </p>
                                      ))}
                                    </details>
                                  )}
                                </div>
                              </>
                            )}
                            {member.role !== "teacher" && (
                              <button
                                className="remove-member-button"
                                onClick={() =>
                                  void removeClassResource(
                                    "member",
                                    course.code,
                                    {
                                      email: member.email,
                                      label: `成員「${member.displayName}」`,
                                    },
                                  )
                                }
                              >
                                移除成員
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      {!!course.members?.some((member) => member.role === "parent") &&
                        !!course.members?.some((member) => member.role === "student") && (
                          <div className="parent-link-panel">
                            <strong>家長與學生關聯</strong>
                            <select
                              aria-label="選擇家長"
                              value={parentLinkDrafts[course.code]?.parentEmail ?? ""}
                              onChange={(event) =>
                                setParentLinkDrafts((current) => ({
                                  ...current,
                                  [course.code]: {
                                    parentEmail: event.target.value,
                                    studentEmail:
                                      current[course.code]?.studentEmail ?? "",
                                  },
                                }))
                              }
                            >
                              <option value="">選擇家長</option>
                              {course.members
                                .filter((member) => member.role === "parent")
                                .map((member) => (
                                  <option key={member.email} value={member.email}>
                                    {member.displayName}
                                  </option>
                                ))}
                            </select>
                            <select
                              aria-label="選擇學生"
                              value={parentLinkDrafts[course.code]?.studentEmail ?? ""}
                              onChange={(event) =>
                                setParentLinkDrafts((current) => ({
                                  ...current,
                                  [course.code]: {
                                    parentEmail:
                                      current[course.code]?.parentEmail ?? "",
                                    studentEmail: event.target.value,
                                  },
                                }))
                              }
                            >
                              <option value="">選擇學生</option>
                              {course.members
                                .filter((member) => member.role === "student")
                                .map((member) => (
                                  <option key={member.email} value={member.email}>
                                    {member.displayName}
                                  </option>
                                ))}
                            </select>
                            <button onClick={() => void linkParentStudent(course.code)}>
                              建立關聯
                            </button>
                            {!!course.parentLinks?.length && (
                              <small>
                                已建立 {course.parentLinks.length} 組家庭關聯
                              </small>
                            )}
                          </div>
                        )}
                      <div className="assignment-panel">
                        <strong>指派課程</strong>
                        <input
                          value={assignmentTitle}
                          onChange={(event) =>
                            setAssignmentTitle(event.target.value)
                          }
                          placeholder="任務名稱（選填）"
                        />
                        <select
                          value={assignmentLevel}
                          onChange={(event) => {
                            const level = event.target.value as Level;
                            setAssignmentLevel(level);
                            setAssignmentDay(1);
                          }}
                        >
                          <option value="beginner">初級</option>
                          <option value="intermediate">中級</option>
                          <option value="advanced">高級</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={assignmentLevel === "beginner" ? 20 : 15}
                          value={assignmentDay}
                          onChange={(event) =>
                            setAssignmentDay(Number(event.target.value))
                          }
                          aria-label="指派課程天數"
                        />
                        <input
                          type="date"
                          value={assignmentDueDate}
                          onChange={(event) =>
                            setAssignmentDueDate(event.target.value)
                          }
                          aria-label="截止日期"
                        />
                        <button onClick={() => createAssignment(course.code)}>
                          指派
                        </button>
                      </div>
                      {!!course.assignments?.length && (
                        <div className="assignment-list">
                          {course.assignments.map((assignment) => (
                            <article key={assignment.id} className="assignment-result-card">
                              <div>
                                <strong>{assignment.title}</strong>
                                <small>
                                  {levelMeta[assignment.level].shortName} Day{" "}
                                  {assignment.day} · {assignment.dueDate} 截止
                                </small>
                              </div>
                              <div className="assignment-metrics">
                                <span>{assignment.completedCount ?? 0}/{assignment.totalStudents ?? 0} 完成</span>
                                <span>平均 {assignment.averageScore ?? "—"} 分</span>
                                <span>{assignment.lateCount ?? 0} 人遲交</span>
                                <span>{assignment.overdueCount ?? 0} 人逾期未交</span>
                              </div>
                              {!!assignment.results?.length && (
                                <details>
                                  <summary>查看學生結果</summary>
                                  {assignment.results.map((result) => (
                                    <p key={result.studentEmail}>
                                      <b>{result.displayName ?? result.studentEmail}</b> ·
                                      最佳 {result.bestScore} 分 · 重做 {result.redoCount} 次
                                      {result.late ? " · 遲交" : " · 準時"}
                                    </p>
                                  ))}
                                </details>
                              )}
                              <button
                                className="danger-action"
                                onClick={() =>
                                  void removeClassResource(
                                    "assignment",
                                    course.code,
                                    { id: assignment.id, label: `作業「${assignment.title}」` },
                                  )
                                }
                              >
                                刪除作業
                              </button>
                            </article>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                  {!ownedClasses.length && !memberships.length && (
                    <p className="empty-class">
                      尚未建立或加入班級。班級只顯示成員名稱與身分，不會公開自習筆記。
                    </p>
                  )}
                  {profileRole === "teacher" && (
                    <article className="question-report-inbox">
                      <div className="mistake-card-head">
                        <div>
                          <p>QUESTION REVIEW</p>
                          <h2>班級題目回報中心</h2>
                        </div>
                        <span>
                          {
                            teacherQuestionReports.filter(
                              (report) => report.status !== "resolved",
                            ).length
                          }{" "}
                          待處理
                        </span>
                      </div>
                      {teacherQuestionReports.length ? (
                        <div className="question-report-list">
                          {teacherQuestionReports.map((report) => (
                            <article key={report.id}>
                              <div>
                                <span>
                                  {report.classCode} · Day {report.day} ·{" "}
                                  {report.kicker}
                                </span>
                                <strong>{report.question}</strong>
                                <small>
                                  {report.reporterName} · 學生答案：
                                  {report.submittedAnswer}
                                </small>
                                <small>系統答案：{report.expectedAnswer}</small>
                              </div>
                              <div className="report-status-actions">
                                <button
                                  className={
                                    report.status === "reviewing" ? "active" : ""
                                  }
                                  onClick={() =>
                                    void updateQuestionReport(
                                      report.id,
                                      "reviewing",
                                    )
                                  }
                                >
                                  審閱中
                                </button>
                                <button
                                  className={
                                    report.status === "resolved" ? "active" : ""
                                  }
                                  onClick={() =>
                                    void updateQuestionReport(
                                      report.id,
                                      "resolved",
                                    )
                                  }
                                >
                                  已處理
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="mistake-empty">目前沒有班級題目回報。</p>
                      )}
                    </article>
                  )}
                  {!!memberships.length && (
                    <div className="membership-list">
                      {memberships.map((membership) => (
                        <span key={`${membership.classCode}-${membership.role}`}>
                          班級 {membership.classCode} ·{" "}
                          {membership.role === "teacher"
                            ? "教師"
                            : membership.role === "parent"
                              ? "家長"
                              : "學生"}
                          {membership.role !== "teacher" && (
                            <button onClick={() => void leaveClass(membership.classCode)}>
                              離開班級
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {!!assignments.length && (
                    <div className="student-assignments">
                      <h3>老師指派的任務</h3>
                      {assignments.map((assignment) => (
                        <button
                          key={assignment.id}
                          onClick={() =>
                            openLesson(assignment.day, assignment.level)
                          }
                        >
                          <span>{assignment.dueDate} 截止</span>
                          <strong>{assignment.title}</strong>
                          <small>
                            {levelMeta[assignment.level].shortName} Day{" "}
                            {assignment.day} · {assignment.result
                              ? `已完成 ${assignment.result.bestScore} 分 · 重做 ${assignment.result.redoCount} 次${assignment.result.late ? " · 遲交" : ""}`
                              : new Date().toISOString().slice(0, 10) > assignment.dueDate
                                ? "已逾期 · 點此補交"
                                : "尚未完成"} →
                          </small>
                        </button>
                      ))}
                    </div>
                  )}
                  {profileRole === "parent" && !!linkedStudents.length && (
                    <div className="linked-student-list">
                      <h3>我的孩子學習報告</h3>
                      {linkedStudents.map((student) => (
                        <article key={`${student.classCode}-${student.email}`}>
                          <span>班級 {student.classCode}</span>
                          <strong>{student.displayName}</strong>
                          <p>
                            完成 {student.progress}% · {student.minutes} 分鐘 ·
                            錯題 {student.mistakes}
                          </p>
                          {!!student.recentMistakes?.length && (
                            <small>
                              最近需要協助：
                              {student.recentMistakes
                                .map((mistake) => `Day ${mistake.day} ${mistake.kicker}`)
                                .join("、")}
                            </small>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {view === "lesson" && (
          <section className="lesson-view">
            <aside className="lesson-sidebar">
              <button className="back-button" onClick={() => navigate("map")}>
                ← 返回星圖
              </button>
              <button
                className="lesson-link-button"
                onClick={() => void copyLessonLink()}
              >
                ⛓ 複製目前學習位置
              </button>
              {reportStatus && <small className="lesson-link-status">{reportStatus}</small>}
              <p>DAY {String(activeDay).padStart(2, "0")}</p>
              <h2>{lesson.title}</h2>
              <span>{lesson.minutes}</span>
              <div className="lesson-stage-list">
                {stages.map((stage, index) => (
                  <button
                    key={stage.name}
                    className={activeStage === index ? "stage-active" : ""}
                    onClick={() => setActiveStage(index)}
                    disabled={recordingState === "recording" && index !== 3}
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
                  <img src={currentGuide.image} alt="" aria-hidden="true" />
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
                  <div className="vocabulary-head">
                    <div>
                      <strong>今日單字卡</strong>
                      <small>點卡片播放韓語；中文輔助預設顯示，也可隨時隱藏自我測驗</small>
                    </div>
                    <button onClick={() => setShowCardHints((shown) => !shown)}>
                      {showCardHints ? "隱藏中文輔助" : "顯示中文輔助"}
                    </button>
                  </div>
                  <div className="sound-grid vocabulary-card-grid">
                    {lesson.sounds.map((sound) => {
                      const support = getCardChineseSupport(
                        activeLevel,
                        activeDay,
                        sound,
                      );
                      return (
                        <button
                          key={sound.char}
                          onClick={() => speak(sound.label)}
                          aria-label={`播放 ${sound.label} 發音`}
                        >
                          <strong>{sound.char}</strong>
                          <span>{sound.label}</span>
                          <span
                            className={`card-chinese-support ${
                              showCardHints ? "" : "hint-hidden"
                            }`}
                          >
                            {showCardHints ? (
                              <>
                                <small>
                                  <b>{support.label}</b>
                                  {support.summary}
                                </small>
                                {support.translation && (
                                  <small className="sentence-translation">
                                    <b>例句翻譯</b>
                                    {support.translation}
                                  </small>
                                )}
                              </>
                            ) : (
                              <small>先回想意思，再顯示中文輔助</small>
                            )}
                          </span>
                          <i>♫</i>
                        </button>
                      );
                    })}
                  </div>
                  <div className="lesson-actions">
                    <button
                      onClick={() =>
                        playFixedAudio(lessonAudioPath, lesson.listenText, true)
                      }
                    >
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
                  <div className="practice-heading">
                    <div>
                      <p className="card-kicker">
                        {isCheckpoint
                          ? "STAGE CHECKPOINT"
                          : "GUIDED PRACTICE"}
                      </p>
                      <h2>
                        {isCheckpoint
                          ? `Day ${activeDay} 階段考 · 前五課累積檢核`
                          : "今日八種能力練習"}
                      </h2>
                    </div>
                    <div className="practice-dots" aria-label="練習進度">
                      {practiceExercises.map((exercise, index) => (
                        <span
                          key={exercise.id}
                          role="img"
                          aria-label={`第 ${index + 1} 題${
                            completedPractice.includes(index)
                              ? "已完成"
                              : index === practiceIndex
                                ? "進行中"
                                : "尚未完成"
                          }`}
                          className={
                            completedPractice.includes(index)
                              ? "is-done"
                              : index === practiceIndex
                                ? "is-current"
                                : ""
                          }
                        >
                          {completedPractice.includes(index) ? "✓" : index + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="practice-type">{currentExercise.kicker}</p>
                  <h3>{currentExercise.question}</h3>
                  {(currentExercise.kind === "listen" ||
                    currentExercise.kind === "dictation") && (
                    <button
                      className="listen-question-button"
                      onClick={() =>
                        currentExercise.audioPath
                          ? playFixedAudio(
                              currentExercise.audioPath,
                              currentExercise.audio ?? "",
                              true,
                            )
                          : speak(currentExercise.audio ?? "", true)
                      }
                    >
                      ♫ 播放題目語音
                    </button>
                  )}
                  {currentExercise.interaction === "options" ? (
                    <div className="answer-grid">
                      {currentExercise.options.map((option) => (
                        <button
                          key={option}
                          className={
                            selectedAnswer === option ? "answer-selected" : ""
                          }
                          onClick={() => choosePracticeAnswer(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="written-answer">
                      <label htmlFor="written-practice-answer">
                        你的韓文答案
                      </label>
                      <textarea
                        id="written-practice-answer"
                        value={draftAnswer}
                        onChange={(event) => {
                          setDraftAnswer(event.target.value);
                          setSelectedAnswer("");
                        }}
                        placeholder="在這裡輸入韓文…"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                      <button
                        disabled={!draftAnswer.trim()}
                        onClick={() => choosePracticeAnswer(draftAnswer)}
                      >
                        檢查答案
                      </button>
                    </div>
                  )}
                  <div
                    className={`answer-feedback ${
                      selectedAnswer
                        ? isPracticeCorrect
                          ? "correct"
                          : "retry"
                        : "is-empty"
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {selectedAnswer
                      ? isPracticeCorrect
                        ? "정답이에요! 答對了，這顆星已經亮起來。"
                        : currentAttempts >= 3
                          ? "아직 아니에요. 完整答案與解析已開啟，理解後再答一次。"
                          : currentAttempts === 2
                            ? "아직 아니에요. 第二層提示已開啟，再比較一次。"
                            : "아직 아니에요. 先看第一層提示；這題已加入錯題星球。"
                      : ""}
                  </div>
                  {selectedAnswer && !isPracticeCorrect && (
                    <section className="solution-support" aria-label="解題支援">
                      <div className="solution-support-head">
                        <div>
                          <p>LEARNING SUPPORT</p>
                          <h4>解題支援 · 第 {currentAttempts} 次嘗試</h4>
                        </div>
                        <span>{Math.min(currentAttempts, 3)} / 3</span>
                      </div>
                      <ol className="hint-steps">
                        <li>
                          <strong>提示一</strong>
                          <span>{currentExercise.hintSteps[0]}</span>
                        </li>
                        {currentAttempts >= 2 && (
                          <li>
                            <strong>提示二</strong>
                            <span>{currentExercise.hintSteps[1]}</span>
                          </li>
                        )}
                      </ol>
                      {isAnswerRevealed ? (
                        <div className="answer-explanation">
                          <p className="answer-label">正確答案</p>
                          <strong lang="ko">{currentExercise.answer}</strong>
                          <p>{currentExercise.explanation}</p>
                          <small>
                            可接受寫法：
                            {currentExercise.acceptedAnswers.join("、")}
                          </small>
                          <em>看完後請重新作答一次，答對才能前往下一題。</em>
                        </div>
                      ) : (
                        <button
                          className="reveal-answer-button"
                          onClick={() => {
                            setRevealedAnswers((current) => ({
                              ...current,
                              [currentExerciseKey]: true,
                            }));
                            setHintUsage((current) => ({
                              ...current,
                              [currentExerciseKey]: 3,
                            }));
                            setDetailedMistakes((current) => {
                              const previous = current[currentExerciseKey];
                              return previous
                                ? {
                                    ...current,
                                    [currentExerciseKey]: {
                                      ...previous,
                                      hintLevel: 3,
                                      updatedAt: new Date().toISOString(),
                                    },
                                  }
                                : current;
                            });
                          }}
                        >
                          我需要看完整答案與解析
                        </button>
                      )}
                      <details className="teacher-support">
                        <summary>家長／老師協助（會顯示答案）</summary>
                        <div>
                          <p>
                            <b>正確答案：</b>
                            <span lang="ko">{currentExercise.answer}</span>
                          </p>
                          <p>
                            <b>常見錯誤：</b>
                            {currentExercise.commonMistake}
                          </p>
                          <p>
                            <b>建議教法：</b>
                            {currentExercise.teacherTip}
                          </p>
                        </div>
                      </details>
                      <div className="question-report-actions">
                        <button onClick={markQuestionIssue}>
                          這題可能有問題 · 標記並複製資料
                        </button>
                        {reportStatus && <small>{reportStatus}</small>}
                      </div>
                    </section>
                  )}
                  {selectedAnswer && isPracticeCorrect && (
                    <details className="correct-explanation">
                      <summary>查看本題解析</summary>
                      <p>{currentExercise.explanation}</p>
                      <small>常見錯誤：{currentExercise.commonMistake}</small>
                    </details>
                  )}
                  <button
                    className="primary-button"
                    disabled={!isPracticeCorrect}
                    onClick={advancePractice}
                  >
                    {practiceIndex < practiceExercises.length - 1
                      ? "答對了，前往下一題 →"
                      : isCheckpoint
                        ? "累積檢核完成，進入聽力 →"
                        : "八題完成，進入聽力 →"}
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
                    <button
                      onClick={() =>
                        playFixedAudio(lessonAudioPath, lesson.listenText)
                      }
                    >
                      ♫ 正常速度
                    </button>
                    <button
                      onClick={() =>
                        playFixedAudio(lessonAudioPath, lesson.listenText, true)
                      }
                    >
                      ◌ 慢速跟讀
                    </button>
                  </div>
                  <section className="pronunciation-lab" aria-label="發音錄音練習">
                    <div>
                      <p className="card-kicker">PRIVATE RECORDING</p>
                      <h3>錄下來，和示範音比較</h3>
                      <p>按下錄音才會要求麥克風權限；錄音只留在這個頁面，不會上傳。</p>
                    </div>
                    <div className="recording-actions">
                      {recordingState !== "recording" ? (
                        <button onClick={() => void startRecording()}>
                          ● 開始錄音
                        </button>
                      ) : (
                        <button className="recording-live" onClick={stopRecording}>
                          ■ 停止錄音
                        </button>
                      )}
                      {recordingUrl && (
                        <button onClick={clearRecording}>重新錄一次</button>
                      )}
                    </div>
                    {recordingUrl && (
                      <>
                        <audio controls src={recordingUrl}>
                          你的瀏覽器不支援錄音播放。
                        </audio>
                        <fieldset className="pronunciation-rating">
                          <legend>聽完後自評：音節、節奏和句尾有多接近？</legend>
                          {[1, 2, 3].map((rating) => (
                            <button
                              type="button"
                              key={rating}
                              className={pronunciationRating === rating ? "active" : ""}
                              aria-pressed={pronunciationRating === rating}
                              onClick={() => setPronunciationRating(rating)}
                            >
                              {"★".repeat(rating)} {rating === 1 ? "再練一次" : rating === 2 ? "大致接近" : "清楚完整"}
                            </button>
                          ))}
                        </fieldset>
                      </>
                    )}
                    {recordingState === "denied" && (
                      <p role="alert">無法使用麥克風。請在瀏覽器網站設定允許後再試一次。</p>
                    )}
                    {recordingState === "unsupported" && (
                      <p role="status">這個瀏覽器不支援頁面錄音，仍可使用示範音跟讀。</p>
                    )}
                  </section>
                  <p className="privacy-note">
                    固定語音檔可在各裝置保持一致；錄音不會加入學習同步或班級報告。
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setActiveStage(4)}
                    disabled={
                      recordingState === "recording" ||
                      (recordingUrl !== "" && pronunciationRating === 0)
                    }
                  >
                    {recordingUrl && pronunciationRating === 0
                      ? "請先完成發音自評"
                      : "我跟讀完成了 →"}
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
                      value={
                        notes[noteKey] ||
                        (activeLevel === "beginner"
                          ? notes[String(activeDay)] || ""
                          : "")
                      }
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [noteKey]: event.target.value,
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
                  {isFinalDay && (
                    <div className="final-rubric">
                      <div>
                        <p className="card-kicker">FINAL PERFORMANCE RUBRIC</p>
                        <h3>{levelMeta[activeLevel].name}成果評分表</h3>
                      </div>
                      {finalRubrics[activeLevel].map((item) => (
                        <label key={item}>
                          <input type="checkbox" />
                          <span>{item}</span>
                        </label>
                      ))}
                      <small>
                        建議每完成一項得一顆星；取得三顆星以上，就可以完成本階段。
                      </small>
                    </div>
                  )}
                  <button className="primary-button" onClick={completeLesson}>
                    {isFinalDay
                      ? levelMeta[activeLevel].completion
                      : `完成 Day ${activeDay} 任務`}
                  </button>
                </div>
              )}

              <div className="lesson-footer-nav">
                <button
                  onClick={() =>
                    setActiveStage((stage) => Math.max(0, stage - 1))
                  }
                  disabled={activeStage === 0 || recordingState === "recording"}
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
                  disabled={
                    activeStage === stages.length - 1 ||
                    recordingState === "recording"
                  }
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
          <span>從零基礎到正式發表的三階段韓語星光航線</span>
        </div>
        <p>
          原創學習角色與視覺世界觀，非任何藝人或娛樂公司的官方網站。
        </p>
        <div className="footer-links">
          <a href="/privacy">隱私與資料說明</a>
          <a href="mailto:odyliao@gmail.com?subject=韓語研究所問題回報">
            問題回報
          </a>
        </div>
      </footer>
    </div>
  );
}
