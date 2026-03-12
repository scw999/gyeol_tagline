import { useState, useMemo, useCallback } from "react";

// ════════════════════════════════════════════════════════════
// 결하다 소개 문구 생성 시스템 v5
// 기술명세서 v5 완전 반영
// - 스펙 카테고리 교차 비교 (통합 점수 1~10)
// - 등급 매핑 테이블 자산/연봉 전체 7단계 반영
// - 저등급/미인증 회원 성향 기반 폴백 보장
// ════════════════════════════════════════════════════════════

// ── 1. 성향 키워드 ──
const TRAIT_CHARM = {
  개방성:   { male: "지적 호기심",      female: "감각적 센스" },
  성실성:   { male: "믿음직한 책임감",  female: "차분한 실행력" },
  외향성:   { male: "유쾌한 에너지",    female: "밝은 에너지" },
  우호성:   { male: "따뜻한 배려심",    female: "다정한 마음씨" },
  정서안정: { male: "든든한 안정감",    female: "차분한 내면" },
  애착안정: { male: "든든한 신뢰감",    female: "편안한 온기" },
  애착불안: { male: "깊은 진심",        female: "깊은 애정" },
  애착회피: { male: "쿨한 독립심",      female: "당당한 주관" },
};

const COMBO_CHARM = {
  "개방성+외향성":    { male: "활기와 지적 호기심",      female: "밝은 감각과 열린 시선" },
  "개방성+우호성":    { male: "열린 마음과 따뜻한 배려",  female: "감각과 따뜻한 마음" },
  "개방성+성실성":    { male: "지적 호기심과 탄탄한 실력", female: "감각과 실행력" },
  "개방성+정서안정":  { male: "지적인 차분함",            female: "감각적 여유" },
  "성실성+우호성":    { male: "책임감과 따뜻한 배려",     female: "성실함과 다정한 마음" },
  "성실성+정서안정":  { male: "묵직한 신뢰감",            female: "단단한 책임감" },
  "성실성+애착안정":  { male: "한결같은 믿음직함",        female: "성실함과 편안한 온기" },
  "외향성+우호성":    { male: "유쾌함과 따뜻한 배려",     female: "밝은 에너지와 다정함" },
  "외향성+애착안정":  { male: "밝은 에너지와 든든함",     female: "즐거운 활기와 편안함" },
  "외향성+정서안정":  { male: "활기와 안정감",            female: "밝고 차분한 여유" },
  "우호성+애착안정":  { male: "따뜻함과 든든한 신뢰",     female: "다정함과 편안한 온기" },
  "우호성+정서안정":  { male: "편안한 배려심",            female: "따뜻한 안정감" },
  "정서안정+애착안정":{ male: "흔들림 없는 든든함",       female: "편안한 안정감" },
  "개방성+애착회피":  { male: "자유로운 지적 감각",       female: "독립적인 감각" },
  "성실성+외향성":    { male: "실행력과 유쾌한 에너지",   female: "밝은 성실함" },
};

// ── 2. 외모 키워드 (배열로 베리에이션) ──
// ── 2. 외모 키워드 (배열로 베리에이션) ──
// 원칙: "~한 이미지"는 전체 인상이므로 사진과 충돌 안 함 ✅
// "~한 외모/미모/비주얼"도 추상적이므로 안전 ✅
// ❌ 구체적 묘사만 금지: "예쁜 미소", "상큼한 분위기" 등
const APP_WORD = {
  APPEARANCE_TOP_1:    { male: ["압도적 비주얼","넘사벽 비주얼","시선을 사로잡는 외모","범접할 수 없는 비주얼"],
                         female: ["눈부신 비주얼","압도적 아름다움","넘사벽 비주얼","시선을 사로잡는 미모"], priority: 10 },
  APPEARANCE_TOP_5:    { male: ["훈훈한 외모","눈에 띄는 외모","잘생긴 외모","호감형 비주얼","세련된 외모"],
                         female: ["돋보이는 미모","빼어난 미모","눈에 띄는 미모","여성스러운 이미지","사랑스러운 이미지"], priority: 8 },
  APPEARANCE_TOP_20:   { male: ["호감형 외모","준수한 외모","단정한 외모","댄디한 이미지","깔끔한 외모"],
                         female: ["매력적인 외모","눈길을 끄는 미모","호감형 외모","사랑스러운 이미지","청순한 이미지"], priority: 5 },
  APPEARANCE_HIGH_AVG: { male: ["깔끔한 인상","단정한 인상","호감 가는 이미지","깔끔한 이미지","신뢰감 있는 인상"],
                         female: ["호감 가는 인상","단정한 인상","여성스러운 이미지","청순한 이미지","단아한 이미지"], priority: 2 },
  APPEARANCE_ABOVE_AVG:{ male: ["호감 가는 이미지","깔끔한 이미지","편안한 이미지"],
                         female: ["호감 가는 이미지","단정한 이미지","단아한 이미지"], priority: 1 },
  APPEARANCE_AVG:      { male: ["친근한 이미지","편안한 이미지"],
                         female: ["친근한 이미지","편안한 이미지"], priority: 0 },
  APPEARANCE_BELOW_AVG:{ male: null, female: null, priority: 0 },
};

// ── 3. 키/체형/차/미인대회 키워드 (배열 베리에이션) ──
const HT_WORD = {
  HEIGHT_OVER_180:           { male: ["훤칠한 키","장신의 매력","큰 키"],   female: null },
  HEIGHT_OVER_175:           { male: ["좋은 체격","균형 잡힌 체격"],         female: null },
  HEIGHT_OVER_165_175_UNDER: { male: null, female: ["늘씬한 라인","시원한 비율","균형 잡힌 라인"] },
};

const BODY_CHARM = {
  fit_high: { male: ["탄탄한 체격","다져진 체격","운동으로 단련된 체격"],
              female: ["건강미 넘치는 바디","탄탄한 바디라인","건강한 아름다움"] },
  fit:      { male: ["좋은 체격","균형 잡힌 체격","건강한 체격"],
              female: ["날씬한 라인","슬림한 라인","균형 잡힌 라인"] },
};

const CAR_CHARM = {
  luxury:  { male: "여유로운 라이프", female: "여유로운 라이프" },
  premium: { male: "세련된 라이프",  female: "세련된 라이프" },
};
const LUXURY_CARS = ["porsche","lamborghini","ferrari","maserati","bentley","rolls_royce"];
const PREMIUM_CARS = ["mercedes_benz","bmw","audi","lexus","genesis","tesla","land_rover","jaguar","volvo"];

const CONTEST_CHARM = { male: "피트니스대회 수상 경력의", female: "미인대회 수상 경력의" };

// ── 4. 통합 점수 매핑 (기술명세서 2.1절) ──

// 학력 통합 점수 (등급 매핑 테이블 전체 반영)
const EDU_SCORE = {
  WORLD_TOP_10: 11,              // Harvard, MIT, Stanford, Cambridge, Oxford 등
  DOMESTIC_TOP_5_WORLD_50: 10,   // SKY, KAIST, POSTECH + Ivy League급
  DOMESTIC_TOP_8_WORLD_100: 9,   // 성균관/한양/서강 + 세계 100위권
  DOMESTIC_TOP_20: 7,            // 중앙/경희/이화 + GIST/UNIST
  DOMESTIC_TOP_50_OVERSEAS: 5,   // 홍익/숙명 + 해외 일반
  GENERAL_4YEAR: 3,              // 일반 4년제
  ASSOCIATE_DEGREE: 1,           // 전문대
  HIGH_SCHOOL: 0,                // 고졸/검정고시
};

// 학력 → 타이틀 컨텍스트
const UNI_NAMES = {
  // 국내 SKY
  seoul:"서울대", yonsei:"연세대", korea:"고려대",
  // 국내 과기원
  kaist:"KAIST", postech:"포항공대",
  // 국내 주요 8
  skku:"성균관대", hanyang:"한양대", sogang:"서강대",
  // 국내 주요 20
  chungang:"중앙대", kyunghee:"경희대", hufs:"한국외대", uos:"서울시립대",
  ewha:"이화여대", konkuk:"건국대", dongguk:"동국대", ajou:"아주대",
  pusan:"부산대", knu:"경북대", gist:"GIST", unist:"UNIST",
  // 세계 Top 10
  harvard:"Harvard", stanford:"Stanford", mit:"MIT",
  cambridge:"Cambridge", oxford:"Oxford", caltech:"Caltech",
  ethz:"ETH Zurich", imperial:"Imperial College", ucl:"UCL", nus:"NUS",
  // 세계 Top 50
  princeton:"Princeton", yale:"Yale", columbia:"Columbia",
  uchicago:"U of Chicago", upenn:"UPenn", berkeley:"UC Berkeley",
  ucla:"UCLA", nyu:"NYU", duke:"Duke", cornell:"Cornell",
  northwestern:"Northwestern", jhu:"Johns Hopkins",
  utoronto:"U of Toronto", ubc:"UBC", mcgill:"McGill",
  unimelb:"U of Melbourne", sydney:"U of Sydney",
  tokyo:"도쿄대", kyoto:"교토대",
  peking:"북경대", tsinghua:"칭화대",
  hku:"HKU", ntu_sg:"NTU Singapore",
  // 세계 100위권
  lse:"LSE", kcl:"KCL", epfl:"EPFL",
  tum:"TU Munich", warwick:"Warwick",
  monash:"Monash", osaka:"오사카대",
};
const EDU_CONTEXT = {
  WORLD_TOP_10: "세계 명문대 출신",
  DOMESTIC_TOP_5_WORLD_50: "명문대 출신",
  DOMESTIC_TOP_8_WORLD_100: "명문대 출신",
  DOMESTIC_TOP_20: "주요 대학 출신",
};

// 직업 통합 점수
const OCC_TIER_SCORE = {
  TOP_ELITE: 10,           // 판사, 검사, 상장사대표, 정치인
  HIGH_ELITE_G5: 9,        // 성형외과, 피부과, 100억 사업가
  SPECIAL_PROFESSION: 8,   // 의사, 변호사, 교수, 회계사
  MAJOR_CORP_PUBLIC: 6,    // 대기업, 공기업, 교사, 장교
  GENERAL_STABLE: 4,       // 중견, 공무원, 간호사
  SMALL_MID_SELF: 2,       // 중소, 프리랜서, 사업가
  OTHERS_LOW: 1,           // 알바, 무직, 취준
};

// occupation → tier 매핑 (등급 매핑 테이블 기반)
const OCC_TIERS = {
  judge:"TOP_ELITE", prosecutor:"TOP_ELITE", entrepreneur_listed:"TOP_ELITE", politician:"TOP_ELITE",
  plastic_surgeon:"HIGH_ELITE_G5", dermatologist:"HIGH_ELITE_G5", entrepreneur_10B_over:"HIGH_ELITE_G5", professor_major:"HIGH_ELITE_G5",
  doctor:"SPECIAL_PROFESSION", dentist:"SPECIAL_PROFESSION", pharmacist:"SPECIAL_PROFESSION", oriental_medicine_doctor:"SPECIAL_PROFESSION",
  veterinarian:"SPECIAL_PROFESSION", lawyer:"SPECIAL_PROFESSION", accountant:"SPECIAL_PROFESSION", patent_attorney:"SPECIAL_PROFESSION",
  professor:"SPECIAL_PROFESSION", entrepreneur_2B_over:"SPECIAL_PROFESSION", captain:"SPECIAL_PROFESSION",
  foreign_service_exam_passed:"SPECIAL_PROFESSION", administrative_exam_passed_grade5:"SPECIAL_PROFESSION", grade5_civil_servant:"SPECIAL_PROFESSION",
  domestic_large_corporation:"MAJOR_CORP_PUBLIC", public_enterprise:"MAJOR_CORP_PUBLIC", foreign_company:"MAJOR_CORP_PUBLIC",
  elementary_middle_high_school_teacher:"MAJOR_CORP_PUBLIC", school_staff:"MAJOR_CORP_PUBLIC", health_teacher:"MAJOR_CORP_PUBLIC",
  officer:"MAJOR_CORP_PUBLIC", grade6_civil_servant:"MAJOR_CORP_PUBLIC", announcer:"MAJOR_CORP_PUBLIC", journalist:"MAJOR_CORP_PUBLIC",
  PD:"MAJOR_CORP_PUBLIC", bank:"MAJOR_CORP_PUBLIC", securities:"MAJOR_CORP_PUBLIC", investment:"MAJOR_CORP_PUBLIC",
  fund_manager:"MAJOR_CORP_PUBLIC", analyst:"MAJOR_CORP_PUBLIC", asset_management:"MAJOR_CORP_PUBLIC",
  IT:"MAJOR_CORP_PUBLIC", bio:"MAJOR_CORP_PUBLIC", researcher:"MAJOR_CORP_PUBLIC", appraiser:"MAJOR_CORP_PUBLIC", pilot:"MAJOR_CORP_PUBLIC",
  domestic_mid_corporation:"GENERAL_STABLE", grade7_civil_servant:"GENERAL_STABLE", grade9_civil_servant:"GENERAL_STABLE",
  technical_civil_servant:"GENERAL_STABLE", police_officer:"GENERAL_STABLE", firefighter:"GENERAL_STABLE",
  nurse:"GENERAL_STABLE", tax_accountant:"GENERAL_STABLE", labor_attorney:"GENERAL_STABLE", architect:"GENERAL_STABLE",
  law_firm_staff:"GENERAL_STABLE", insurance:"GENERAL_STABLE", financial_consultant:"GENERAL_STABLE",
  aviation:"GENERAL_STABLE", academy_instructor:"GENERAL_STABLE", designer:"GENERAL_STABLE", actor:"GENERAL_STABLE",
  singer:"GENERAL_STABLE", musician:"GENERAL_STABLE", data_engineer:"GENERAL_STABLE", ai_engineer:"GENERAL_STABLE",
  domestic_small_corporation:"SMALL_MID_SELF", entrepreneur:"SMALL_MID_SELF", freelancer:"SMALL_MID_SELF",
  programmer:"SMALL_MID_SELF", web_developer:"SMALL_MID_SELF", app_developer:"SMALL_MID_SELF",
  fitness_trainer:"SMALL_MID_SELF", pilates:"SMALL_MID_SELF", yoga:"SMALL_MID_SELF", athlete:"SMALL_MID_SELF",
  beauty:"SMALL_MID_SELF", photographer:"SMALL_MID_SELF", dancer:"SMALL_MID_SELF",
  kindergarten_teacher:"SMALL_MID_SELF", childcare_teacher:"SMALL_MID_SELF",
  part_time:"OTHERS_LOW", job_seeker:"OTHERS_LOW", homemaker:"OTHERS_LOW", unemployed:"OTHERS_LOW",
};

// 연봉 통합 점수 + 매력 키워드 + 한글 라벨
const SALARY_MAP = {
  SALARY_OVER_200M:  { score: 10, charm: "탄탄한 경제력",     titleBoost: "능력 있는", label: "2억원 이상" },
  SALARY_150M_200M:  { score: 8,  charm: "안정적인 경제력",   titleBoost: null,        label: "1억 5천만원 ~ 2억원" },
  SALARY_100M_150M:  { score: 6,  charm: "탄탄한 커리어",     titleBoost: null,        label: "1억원 ~ 1억 5천만원" },
  SALARY_70M_100M:   { score: 4,  charm: "안정적인 커리어",   titleBoost: null,        label: "7천만원 ~ 1억원" },
  SALARY_50M_70M:    { score: 2,  charm: "성실한 커리어",     titleBoost: null,        label: "5천만원 ~ 7천만원" },
  SALARY_30M_50M:    { score: 1,  charm: "꾸준한 성장세",     titleBoost: null,        label: "3천만원 ~ 5천만원" },
  SALARY_UNDER_30M:  { score: 0,  charm: null,                titleBoost: null,        label: "3천만원 미만" },
};

// 본인 자산 통합 점수 + 매력 키워드 (전체 7단계) + 한글 라벨
const ASSET_MAP = {
  ASSET_OVER_1B:    { score: 10, charm: "자수성가의 저력",   label: "순자산 10억원 이상" },
  ASSET_500M_1B:    { score: 8,  charm: "탄탄한 자산 기반",  label: "순자산 5억원 ~ 10억원" },
  ASSET_300M_500M:  { score: 6,  charm: "안정적인 자산",     label: "순자산 3억원 ~ 5억원" },
  ASSET_100M_300M:  { score: 4,  charm: "건실한 자산 관리",  label: "순자산 1억원 ~ 3억원" },
  ASSET_50M_100M:   { score: 2,  charm: null,                label: "순자산 5천만원 ~ 1억원" },
  ASSET_10M_50M:    { score: 1,  charm: null,                label: "순자산 1천만원 ~ 5천만원" },
  ASSET_UNDER_10M:  { score: 0,  charm: null,                label: "순자산 1천만원 미만" },
};

// 부모자산 (옵션 인증)
const PARENT_TAG = {
  PARENT_ASSET_OVER_100B: "든든한 집안의",
  PARENT_ASSET_OVER_50B: "여유로운 집안의",
  PARENT_ASSET_OVER_30B: "안정적 가정의",
  PARENT_ASSET_OVER_10B: null, // 문구 미반영
};

// 직장 카테고리
const COMP_CATEGORY = {
  large:"대기업", major_public:"주요 공기업", major_finance:"주요 금융권",
  major_media:"주요 언론사", education:"교육기관", government:"정부기관",
  other_public:"공공기관", national_research:"국공립 연구소", medium:"중견기업",
  company_other: null,
};

// ── 5. 직업 표시명 ──
const OCC_NAME = {
  doctor:"의사", plastic_surgeon:"성형외과 전문의", dermatologist:"피부과 전문의",
  dentist:"치과의사", pharmacist:"약사", oriental_medicine_doctor:"한의사",
  veterinarian:"수의사", nurse:"간호사", dental_hygienist:"치위생사",
  physical_therapist:"물리치료사", health_teacher:"보건교사",
  judge:"판사", prosecutor:"검사", lawyer:"변호사", law_firm_staff:"로펌 직원",
  professor:"교수", professor_major:"명문대 교수",
  elementary_middle_high_school_teacher:"교사",
  kindergarten_teacher:"유치원 교사", childcare_teacher:"보육교사",
  academy_instructor:"강사", school_staff:"교직원",
  accountant:"공인회계사", tax_accountant:"세무사", patent_attorney:"변리사",
  labor_attorney:"노무사", architect:"건축사", appraiser:"감정평가사", captain:"기장",
  politician:"정치인", foreign_service_exam_passed:"외교관",
  administrative_exam_passed_grade5:"행시 출신 공무원",
  grade5_civil_servant:"고위 공무원", grade6_civil_servant:"6급 공무원",
  grade7_civil_servant:"공무원", grade9_civil_servant:"공무원",
  technical_civil_servant:"기술직 공무원",
  officer:"장교", police_officer:"경찰", firefighter:"소방관",
  bank:"금융인", securities:"증권맨", investment:"투자 전문가",
  fund_manager:"펀드매니저", analyst:"애널리스트",
  asset_management:"자산운용가", financial_consultant:"금융 컨설턴트",
  domestic_large_corporation:"대기업 직장인", domestic_mid_corporation:"중견기업 직장인",
  domestic_small_corporation:"직장인", public_enterprise:"공기업 직장인",
  foreign_company:"외국계 직장인",
  entrepreneur:"사업가", entrepreneur_2B_over:"성공한 사업가",
  entrepreneur_10B_over:"기업 CEO", entrepreneur_listed:"상장사 대표",
  freelancer:"프리랜서",
  IT:"IT 엔지니어", bio:"바이오 연구원", researcher:"연구원", aerospace:"항공우주 엔지니어",
  announcer:"아나운서", journalist:"기자", PD:"PD",
  fitness_trainer:"트레이너", pilates:"필라테스 강사", yoga:"요가 강사",
  athlete:"운동선수", sports_instructor:"스포츠 강사",
  actor:"배우", famous_actor:"배우", singer:"가수", designer:"디자이너",
  musician:"뮤지션", photographer:"포토그래퍼", dancer:"무용가",
  pilot:"파일럿", aviation:"승무원", beauty:"뷰티 전문가",
  programmer:"개발자", web_developer:"웹 개발자", app_developer:"앱 개발자",
  data_engineer:"데이터 엔지니어", ai_engineer:"AI 엔지니어",
  security_specialist:"보안 전문가",
  part_time:"아르바이트", job_seeker:"취업준비생", homemaker:"주부", unemployed:"회원",
};
const OCC_NAME_F = { securities:"증권 전문가", IT:"IT 전문가", data_engineer:"데이터 전문가", ai_engineer:"AI 전문가", aerospace:"항공우주 전문가" };

// ── 6. BMI 계산 ──
function calcBodyTier(weight, heightCm, gender, muscular) {
  if (!weight || !heightCm) return null;
  const bmi = weight / Math.pow(heightCm / 100, 2);
  const max = muscular ? 30 : (gender === "male" ? 25 : 23);
  if (bmi >= 18.5 && bmi <= max) return muscular ? "fit_high" : "fit";
  if (gender === "female" && bmi >= 16 && bmi < 18.5) return "fit";
  return null;
}

// ── 7. 한국어 조사 ──
function hasBatchim(s) {
  const c = s.charAt(s.length - 1).charCodeAt(0);
  return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
}
function waGwa(s) { return hasBatchim(s) ? "과" : "와"; }
function eulReul(s) { return hasBatchim(s) ? "을" : "를"; }
function attachOf(s) { return s.endsWith("의") ? s : s + "의"; }
function stripOf(s) { return s.replace(/의$/, ""); }

// ── 랜덤 선택 (배열에서 1개) ──
function pick(arr) {
  if (!arr) return null;
  if (typeof arr === "string") return arr;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ════════════════════════════════════════════
// 문구 생성 함수 (v5.1: 성별별 결혼 매칭 우선순위)
// 남성→여성: 키/체격 > 경제력(연봉·자산) > 학력 > 성향
// 여성→남성: 외모 > 성향/분위기 > 직업 > 집안/자산
// ════════════════════════════════════════════
function generate(p) {
  const g = p.gender;
  const occName = (g === "female" && OCC_NAME_F[p.occupation]) || OCC_NAME[p.occupation] || "회원";

  // ── STEP 1: 스펙 교차 비교 (성별 가중치) ──
  const eduScore = EDU_SCORE[p.education] || 0;
  const occTier = OCC_TIERS[p.occupation] || "OTHERS_LOW";
  const occScore = OCC_TIER_SCORE[occTier] || 1;
  const salaryData = SALARY_MAP[p.salary] || { score: 0 };
  const assetData = ASSET_MAP[p.assets] || { score: 0 };

  let eduCtx = "";
  if (p.university && UNI_NAMES[p.university]) eduCtx = UNI_NAMES[p.university] + " 출신";
  else if (p.education && EDU_CONTEXT[p.education]) eduCtx = EDU_CONTEXT[p.education];

  const compCat = p.companyCategory ? COMP_CATEGORY[p.companyCategory] : null;

  let famCtx = "";
  if (p.v_parentAssets && p.parentAssets && PARENT_TAG[p.parentAssets])
    famCtx = PARENT_TAG[p.parentAssets];

  // 남성: 학력·경제력 부각 / 여성: 직업·집안 부각
  const tw = g === "male"
    ? { edu: 1.3, occ: 1.0, salary: 1.2, asset: 1.1 }
    : { edu: 0.7, occ: 1.0, salary: 0.8, asset: 0.9 };

  const scores = [
    { cat: "edu",    score: Math.round(eduScore * tw.edu * 10) / 10 },
    { cat: "occ",    score: Math.round(occScore * tw.occ * 10) / 10 },
    { cat: "salary", score: Math.round(salaryData.score * tw.salary * 10) / 10 },
    { cat: "asset",  score: Math.round(assetData.score * tw.asset * 10) / 10 },
  ].sort((a, b) => b.score - a.score);

  const winner = scores[0];

  let title = occName;
  if (occScore >= 8) {
    if (g === "male" && eduScore >= 10 && eduCtx) title = `${eduCtx} ${occName}`;
  } else if (winner.cat === "edu" && eduCtx) {
    title = `${eduCtx} ${occName}`;
  } else if (winner.cat === "salary" && salaryData.titleBoost) {
    title = `${salaryData.titleBoost} ${occName}`;
  } else if (compCat && occName.includes("직장인")) {
    title = `${compCat} 직장인`;
  } else if (famCtx) {
    title = `${famCtx} ${occName}`;
  }

  // ── STEP 2: 매력 후보 (성별별 우선순위) ──
  let candidates = [];
  const physTypes = ["appearance","height","body","car","contest","salary","asset"];

  // 외모: 여성 높게 유지, 남성은 경제력보다 낮게
  const appData = APP_WORD[p.appearance];
  if (appData) {
    const appText = pick(appData[g]);
    if (appText) {
      const pri = g === "female" ? appData.priority : Math.max(appData.priority - 2, 1);
      candidates.push({ text: appText, priority: pri, type: "appearance" });
    }
  }

  // 키: 남성 결혼시장 핵심
  if (p.v_height && p.height && HT_WORD[p.height]) {
    const htText = pick(HT_WORD[p.height][g]);
    if (htText) candidates.push({ text: htText, priority: g === "male" ? 9 : 4, type: "height" });
  }

  // 체형
  if (p.v_body && p.weight && p.heightCm) {
    const bt = calcBodyTier(p.weight, p.heightCm, g, !!p.muscular);
    if (bt && BODY_CHARM[bt]) {
      const bodyText = pick(BODY_CHARM[bt][g]);
      if (bodyText) {
        const pri = g === "male" ? (bt === "fit_high" ? 8 : 6) : (bt === "fit_high" ? 6 : 4);
        candidates.push({ text: bodyText, priority: pri, type: "body" });
      }
    }
  }

  // 미인대회: 여성 최상위
  if (p.v_contest)
    candidates.push({ text: CONTEST_CHARM[g], priority: g === "female" ? 11 : 7, type: "contest" });

  // 차
  if (p.v_car && p.carBrand) {
    if (LUXURY_CARS.includes(p.carBrand))
      candidates.push({ text: CAR_CHARM.luxury[g], priority: g === "male" ? 7 : 4, type: "car" });
    else if (PREMIUM_CARS.includes(p.carBrand) && p.carPrice >= 8000)
      candidates.push({ text: CAR_CHARM.premium[g], priority: g === "male" ? 5 : 3, type: "car" });
  }

  // 연봉: 남성 핵심, 여성 보조
  if (salaryData.charm) {
    const pri = g === "male"
      ? Math.round(salaryData.score * 0.8)
      : Math.round(salaryData.score * 0.3);
    candidates.push({ text: salaryData.charm, priority: pri, type: "salary" });
  }

  // 자산: 남성 핵심, 여성 중간
  if (assetData.charm) {
    const pri = g === "male"
      ? Math.round(assetData.score * 0.8)
      : Math.round(assetData.score * 0.5);
    candidates.push({ text: assetData.charm, priority: pri, type: "asset" });
  }

  // 성향: 여성 분위기 중요(높게), 남성 보조(낮게)
  const pos = Object.entries(p.traits)
    .filter(([k]) => !["애착불안","애착회피"].includes(k))
    .sort((a,b) => b[1] - a[1]);
  const all = Object.entries(p.traits).sort((a,b) => b[1] - a[1]);
  let t1 = pos[0] ? pos[0][0] : null;
  let t2 = pos[1] ? pos[1][0] : null;

  let traitFull = "";
  let traitShort = (t1 && TRAIT_CHARM[t1]) ? TRAIT_CHARM[t1][g] || "" : "";
  const ck1 = t1 + "+" + t2, ck2 = t2 + "+" + t1;
  if (COMBO_CHARM[ck1] && COMBO_CHARM[ck1][g]) traitFull = COMBO_CHARM[ck1][g];
  else if (COMBO_CHARM[ck2] && COMBO_CHARM[ck2][g]) traitFull = COMBO_CHARM[ck2][g];
  else traitFull = traitShort;

  if (all[0] && all[0][0] === "애착불안" && all[0][1] > ((pos[0] ? pos[0][1] : 0) + 1)) {
    traitFull = TRAIT_CHARM["애착불안"][g]; traitShort = traitFull;
    t2 = t1; t1 = "애착불안";
  }
  if (all[0] && all[0][0] === "애착회피" && all[0][1] > ((pos[0] ? pos[0][1] : 0) + 1)) {
    traitFull = TRAIT_CHARM["애착회피"][g]; traitShort = traitFull;
    t2 = t1; t1 = "애착회피";
  }

  if (traitFull)
    candidates.push({ text: traitFull, short: traitShort, priority: g === "female" ? 8 : 5, type: "trait" });

  // ── STEP 3: 3카테고리 슬롯 선택 (최대 2개) ──
  // 외형(appearance/height/body) / 경제력(salary/asset/car) / 성향(trait) / 특수(contest)
  // 각 카테고리 내에서 최고 1개씩, 전체 최대 2개
  const physCat = ["appearance","height","body"];
  const econCat = ["salary","asset","car"];
  const specCat = ["contest"];

  candidates.sort((a,b) => b.priority - a.priority);

  let bestPhys = null, bestEcon = null, bestTrait = null, bestSpec = null;
  for (const c of candidates) {
    if (physCat.includes(c.type) && !bestPhys) bestPhys = c;
    else if (econCat.includes(c.type) && !bestEcon) bestEcon = c;
    else if (c.type === "trait" && !bestTrait) bestTrait = c;
    else if (specCat.includes(c.type) && !bestSpec) bestSpec = c;
  }

  // 특수(미인대회)가 있으면 최우선
  let pool = [bestSpec, bestPhys, bestEcon, bestTrait].filter(Boolean);
  pool.sort((a,b) => b.priority - a.priority);
  let selected = pool.slice(0, 2);

  // 조합용 분류
  const nonTraitTypes = [...physCat, ...econCat, ...specCat];

  // ── STEP 4: 조합 ──
  let tagline = "";
  if (selected.length === 0) {
    tagline = title;
  } else if (selected.length === 1) {
    tagline = attachOf(selected[0].text) + " " + title;
  } else {
    const first = selected.find(function(s) { return nonTraitTypes.includes(s.type); });
    const trait = selected.find(function(s) { return s.type === "trait"; });
    if (first && trait) {
      const a = stripOf(first.text);
      const b = stripOf(trait.short || trait.text);
      const overlap = ["매력","비주얼","외모","미모","이미지","분위기","라인","체격","인상","취향","감각"];
      if (overlap.some(function(w) { return a.includes(w) && b.includes(w); })) {
        tagline = attachOf(selected[0].text) + " " + title;
      } else {
        tagline = a + waGwa(a) + " " + b + eulReul(b) + " 갖춘 " + title;
      }
    } else {
      // 둘 다 non-trait (예: 키 + 경제력)
      const a = stripOf(selected[0].text);
      const b = stripOf(selected[1].text);
      tagline = a + waGwa(a) + " " + b + eulReul(b) + " 갖춘 " + title;
    }
  }

  tagline = tagline.replace(/의\s+의/g, "의").replace(/\s+/g, " ").trim();

  const vCount = [p.v_height, p.v_body, p.v_car, p.v_parentAssets, p.v_contest].filter(Boolean).length;

  return {
    tagline: tagline, title: title, traitText: traitFull, t1: t1, t2: t2, vCount: vCount,
    selected: selected.map(function(s) { return s.type + "(" + s.priority + "): " + s.text; }),
    scores: scores.map(function(s) { return s.cat + ":" + s.score; }).join(" / "),
    winner: winner.cat + "(" + winner.score + ")",
  };
}

// ════════════════════════════════════════════
// UI
// ════════════════════════════════════════════
const LABELS = ["개방성","성실성","외향성","우호성","정서안정","애착안정","애착불안","애착회피"];
const OCC_GROUPS = [
  { label:"의료", o:[["doctor","의사"],["plastic_surgeon","성형외과"],["dermatologist","피부과"],["dentist","치과의사"],["pharmacist","약사"],["oriental_medicine_doctor","한의사"],["veterinarian","수의사"],["nurse","간호사"],["dental_hygienist","치위생사"],["physical_therapist","물리치료사"],["health_teacher","보건교사"]]},
  { label:"법조", o:[["judge","판사"],["prosecutor","검사"],["lawyer","변호사"],["law_firm_staff","로펌"]]},
  { label:"교육", o:[["professor_major","명문대교수"],["professor","교수"],["elementary_middle_high_school_teacher","교사"],["kindergarten_teacher","유치원교사"],["childcare_teacher","보육교사"],["academy_instructor","강사"]]},
  { label:"전문직", o:[["accountant","회계사"],["tax_accountant","세무사"],["patent_attorney","변리사"],["labor_attorney","노무사"],["architect","건축사"],["appraiser","감정평가사"],["captain","기장"]]},
  { label:"공무원·군인", o:[["foreign_service_exam_passed","외교관"],["administrative_exam_passed_grade5","행시출신"],["grade5_civil_servant","5급+"],["grade6_civil_servant","6급"],["grade7_civil_servant","7급"],["grade9_civil_servant","9급"],["technical_civil_servant","기술직"],["officer","장교"],["police_officer","경찰"],["firefighter","소방관"]]},
  { label:"금융", o:[["bank","은행"],["securities","증권"],["investment","투자"],["fund_manager","펀드매니저"],["analyst","애널리스트"],["asset_management","자산운용"]]},
  { label:"일반", o:[["domestic_large_corporation","대기업"],["domestic_mid_corporation","중견"],["domestic_small_corporation","중소"],["public_enterprise","공기업"],["foreign_company","외국계"],["entrepreneur_listed","상장사대표"],["entrepreneur_10B_over","CEO(100억+)"],["entrepreneur_2B_over","사업가(20억+)"],["entrepreneur","사업가"],["freelancer","프리랜서"],["job_seeker","취준생"],["part_time","알바"],["homemaker","주부"],["unemployed","무직"]]},
  { label:"IT·개발", o:[["programmer","개발자"],["web_developer","웹"],["app_developer","앱"],["data_engineer","데이터"],["ai_engineer","AI"],["security_specialist","보안"]]},
  { label:"연구·기술", o:[["IT","IT"],["bio","바이오"],["researcher","연구원"],["aerospace","항공우주"]]},
  { label:"방송", o:[["announcer","아나운서"],["journalist","기자"],["PD","PD"]]},
  { label:"체육", o:[["fitness_trainer","트레이너"],["pilates","필라테스"],["yoga","요가"],["athlete","선수"]]},
  { label:"예술", o:[["actor","배우"],["singer","가수"],["designer","디자이너"],["musician","뮤지션"],["dancer","무용가"]]},
  { label:"서비스", o:[["aviation","승무원"],["beauty","뷰티"],["pilot","파일럿"]]},
];
const COMP_OPTS = [["","선택안함"],["large","대기업"],["major_finance","주요금융권"],["major_public","주요공기업"],["other_public","기타공공기관"],["major_media","주요언론사"],["education","교육기관"],["government","정부기관"],["national_research","국공립연구소"],["medium","중견기업"]];
const UNI_BY_TIER = {
  WORLD_TOP_10: [["harvard","Harvard"],["stanford","Stanford"],["mit","MIT"],["cambridge","Cambridge"],["oxford","Oxford"],["caltech","Caltech"],["ethz","ETH Zurich"],["imperial","Imperial College"],["ucl","UCL"],["nus","NUS"]],
  DOMESTIC_TOP_5_WORLD_50: [["seoul","서울대"],["yonsei","연세대"],["korea","고려대"],["kaist","KAIST"],["postech","포항공대"],["princeton","Princeton"],["yale","Yale"],["columbia","Columbia"],["uchicago","U of Chicago"],["upenn","UPenn"],["berkeley","UC Berkeley"],["ucla","UCLA"],["nyu","NYU"],["duke","Duke"],["cornell","Cornell"],["northwestern","Northwestern"],["jhu","Johns Hopkins"],["utoronto","U of Toronto"],["unimelb","U of Melbourne"],["tokyo","도쿄대"],["kyoto","교토대"],["peking","북경대"],["tsinghua","칭화대"],["hku","HKU"]],
  DOMESTIC_TOP_8_WORLD_100: [["skku","성균관대"],["hanyang","한양대"],["sogang","서강대"],["lse","LSE"],["kcl","KCL"],["epfl","EPFL"],["tum","TU Munich"],["warwick","Warwick"],["monash","Monash"],["osaka","오사카대"]],
  DOMESTIC_TOP_20: [["chungang","중앙대"],["kyunghee","경희대"],["hufs","한국외대"],["uos","서울시립대"],["ewha","이화여대"],["konkuk","건국대"],["dongguk","동국대"],["ajou","아주대"],["pusan","부산대"],["knu","경북대"],["gist","GIST"],["unist","UNIST"]],
};
const CAR_OPTS = [["","미인증"],["porsche","포르쉐"],["lamborghini","람보르기니"],["ferrari","페라리"],["bentley","벤틀리"],["rolls_royce","롤스로이스"],["maserati","마세라티"],["mercedes_benz","벤츠"],["bmw","BMW"],["audi","아우디"],["lexus","렉서스"],["genesis","제네시스"],["tesla","테슬라"],["land_rover","랜드로버"],["volvo","볼보"],["hyundai","현대"],["kia","기아"]];

const P0 = { gender:"male", traits:{개방성:3,성실성:3,외향성:3,우호성:3,정서안정:3,애착안정:3,애착불안:1,애착회피:1},
  appearance:"APPEARANCE_AVG", v_height:false, height:"", v_body:false, weight:0, heightCm:0, muscular:false,
  occupation:"grade9_civil_servant", companyCategory:"government", education:"", university:"",
  salary:"SALARY_30M_50M", assets:"ASSET_UNDER_10M", v_parentAssets:false, parentAssets:"", v_car:false, carBrand:"", carPrice:0, v_contest:false };

const PRESETS = [
  { name:"남·SKY 치과의사", p:{...P0, occupation:"dentist", companyCategory:"", education:"DOMESTIC_TOP_5_WORLD_50", university:"yonsei", appearance:"APPEARANCE_TOP_20", salary:"SALARY_100M_150M", assets:"ASSET_300M_500M", traits:{개방성:2,성실성:4,외향성:1,우호성:5,정서안정:3,애착안정:4,애착불안:0,애착회피:1}, v_height:true, height:"HEIGHT_OVER_180", v_body:true, weight:78, heightCm:182, muscular:true }},
  { name:"여·대기업(인증多)", p:{...P0, gender:"female", occupation:"domestic_large_corporation", companyCategory:"large", education:"DOMESTIC_TOP_8_WORLD_100", appearance:"APPEARANCE_TOP_5", salary:"SALARY_70M_100M", assets:"ASSET_50M_100M", traits:{개방성:5,성실성:3,외향성:4,우호성:2,정서안정:3,애착안정:3,애착불안:1,애착회피:0}, v_height:true, height:"HEIGHT_OVER_165_175_UNDER", v_body:true, weight:50, heightCm:167, v_parentAssets:true, parentAssets:"PARENT_ASSET_OVER_50B" }},
  { name:"남·9급+서울대+자산10억", p:{...P0, education:"DOMESTIC_TOP_5_WORLD_50", university:"seoul", salary:"SALARY_150M_200M", assets:"ASSET_OVER_1B", traits:{개방성:2,성실성:4,외향성:3,우호성:4,정서안정:3,애착안정:4,애착불안:1,애착회피:0} }},
  { name:"여·미인대회 수상", p:{...P0, gender:"female", occupation:"pilates", companyCategory:"", education:"", appearance:"APPEARANCE_TOP_1", traits:{개방성:4,성실성:2,외향성:4,우호성:4,정서안정:3,애착안정:3,애착불안:1,애착회피:0}, v_height:true, height:"HEIGHT_OVER_165_175_UNDER", v_contest:true, salary:"", assets:"" }},
  { name:"남·소방관(체형인증)", p:{...P0, occupation:"firefighter", companyCategory:"", appearance:"APPEARANCE_ABOVE_AVG", salary:"SALARY_50M_70M", assets:"ASSET_10M_50M", traits:{개방성:1,성실성:5,외향성:2,우호성:4,정서안정:5,애착안정:3,애착불안:0,애착회피:1}, v_height:true, height:"HEIGHT_OVER_180", v_body:true, weight:85, heightCm:183, muscular:true }},
  { name:"여·유치원교사(미인증)", p:{...P0, gender:"female", occupation:"kindergarten_teacher", companyCategory:"", appearance:"APPEARANCE_HIGH_AVG", salary:"", assets:"", traits:{개방성:3,성실성:3,외향성:3,우호성:5,정서안정:4,애착안정:5,애착불안:1,애착회피:0} }},
  { name:"남·프리랜서(자산5억)", p:{...P0, occupation:"freelancer", companyCategory:"", appearance:"APPEARANCE_AVG", salary:"SALARY_70M_100M", assets:"ASSET_500M_1B", traits:{개방성:4,성실성:3,외향성:3,우호성:3,정서안정:4,애착안정:3,애착불안:0,애착회피:2} }},
  { name:"남·취준생(미인증)", p:{...P0, occupation:"job_seeker", companyCategory:"", appearance:"APPEARANCE_AVG", salary:"SALARY_UNDER_30M", assets:"ASSET_UNDER_10M", traits:{개방성:4,성실성:3,외향성:5,우호성:4,정서안정:2,애착안정:2,애착불안:2,애착회피:1} }},
  { name:"남·재벌2세(풀인증)", p:{...P0, occupation:"entrepreneur_listed", education:"DOMESTIC_TOP_5_WORLD_50", university:"korea", appearance:"APPEARANCE_TOP_20", salary:"SALARY_OVER_200M", assets:"ASSET_OVER_1B", traits:{개방성:3,성실성:2,외향성:3,우호성:3,정서안정:3,애착안정:2,애착불안:1,애착회피:2}, v_height:true, height:"HEIGHT_OVER_175", v_body:true, weight:75, heightCm:178, v_parentAssets:true, parentAssets:"PARENT_ASSET_OVER_100B", v_car:true, carBrand:"porsche", carPrice:11000 }},
  { name:"여·승무원(키인증)", p:{...P0, gender:"female", occupation:"aviation", education:"DOMESTIC_TOP_20", appearance:"APPEARANCE_TOP_5", salary:"SALARY_50M_70M", assets:"", traits:{개방성:4,성실성:3,외향성:4,우호성:5,정서안정:3,애착안정:3,애착불안:2,애착회피:0}, v_height:true, height:"HEIGHT_OVER_165_175_UNDER" }},
];

function Sel({value,onChange,children}) {
  return <select value={value} onChange={e=>onChange(e.target.value)}
    className="w-full text-xs border border-gray-200 rounded-lg p-1.5 bg-white focus:ring-1 focus:ring-purple-200 outline-none">{children}</select>;
}
function Toggle({label,checked,onChange}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <div className={`w-8 h-4 rounded-full relative transition-colors ${checked?"bg-green-400":"bg-gray-200"}`} onClick={()=>onChange(!checked)}>
        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${checked?"left-4":"left-0.5"}`}/>
      </div>
      <span className={`text-xs ${checked?"text-green-700 font-medium":"text-gray-400"}`}>{label}</span>
    </label>
  );
}

export default function App() {
  const [profile, setProfile] = useState(PRESETS[0].p);
  const s = useCallback((k,v) => setProfile(p=>({...p,[k]:v})),[]);
  const st = useCallback((t,v) => setProfile(p=>({...p,traits:{...p.traits,[t]:parseInt(v)}})),[]);

  const res = useMemo(() => generate(profile), [profile]);
  const opp = useMemo(() => generate({...profile, gender: profile.gender==="male"?"female":"male"}), [profile]);
  const [detail, setDetail] = useState(false);
  const isMale = profile.gender === "male";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/30 p-3 md:p-5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="text-2xl font-bold text-purple-800" style={{fontFamily:'serif'}}>결</span>
            <span className="text-lg text-gray-600">하다</span>
          </div>
          <p className="text-xs text-gray-400">소개 문구 생성기 v5 — 스펙 교차 비교 + 인증 기반 매력 조합</p>
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-2 gap-2.5 mb-3">
          {[{male:true,label:"남성 → 여성에게 표시",color:"blue",data:isMale?res:opp},
            {male:false,label:"여성 → 남성에게 표시",color:"pink",data:!isMale?res:opp}].map(({male:m,label,color,data})=>(
            <div key={label} className={`rounded-2xl shadow-md p-5 border-2 transition-all ${(m===isMale)?"bg-white border-"+color+"-200":"bg-white/60 border-gray-200"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full bg-${color}-500`}/>
                  <span className={`text-xs text-${color}-500 font-medium`}>{label}</span>
                </div>
                {data.vCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600">인증 {data.vCount}개</span>}
              </div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">{data.tagline}</h2>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="text-center mb-4">
          <button onClick={()=>setDetail(!detail)} className="text-xs text-purple-400 hover:text-purple-600">
            {detail?"▲ 접기":"▼ 교차 비교 결과 보기"}
          </button>
          {detail && (
            <div className="mt-2 bg-white rounded-lg border p-3 text-left text-xs text-gray-600 space-y-1">
              <p><strong>스펙 점수:</strong> {res.scores}</p>
              <p><strong>승리 카테고리:</strong> {res.winner}</p>
              <p><strong>타이틀:</strong> {res.title}</p>
              <p><strong>매력 요소:</strong> {res.selected.join(" / ") || "없음"}</p>
              <p><strong>성향:</strong> {res.t1}+{res.t2} → {res.traitText}</p>
            </div>
          )}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1 mb-4">
          {PRESETS.map((pr,i) => (
            <button key={i} onClick={()=>setProfile({...pr.p})}
              className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 hover:bg-purple-50 hover:border-purple-300 transition whitespace-nowrap">{pr.name}</button>
          ))}
        </div>

        {/* Inputs */}
        <div className="grid md:grid-cols-3 gap-3">
          {/* Col 1: 성향 */}
          <div className="bg-white rounded-xl shadow-sm border p-3.5">
            <h3 className="font-bold text-gray-700 text-sm mb-2.5">성향 (8축)</h3>
            <div className="flex gap-2 mb-2.5">
              <button onClick={()=>s("gender","male")} className={`flex-1 py-1 rounded-lg text-xs font-medium ${isMale?"bg-blue-500 text-white":"bg-gray-100 text-gray-400"}`}>남성</button>
              <button onClick={()=>s("gender","female")} className={`flex-1 py-1 rounded-lg text-xs font-medium ${!isMale?"bg-pink-500 text-white":"bg-gray-100 text-gray-400"}`}>여성</button>
            </div>
            <div className="space-y-1.5">
              {LABELS.map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className={`text-xs w-14 shrink-0 ${t===res.t1?"font-bold text-purple-700":t===res.t2?"font-medium text-purple-500":"text-gray-400"}`}>{t===res.t1?"★ ":""}{t}</span>
                  <input type="range" min="0" max="6" value={profile.traits[t]} onChange={e=>st(t,e.target.value)}
                    className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                  <span className="text-xs font-mono text-gray-400 w-3">{profile.traits[t]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: 외모 + 옵션 인증 */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-sm border p-3.5">
              <h3 className="font-bold text-gray-700 text-sm mb-2">외모 (필수)</h3>
              <Sel value={profile.appearance} onChange={v=>s("appearance",v)}>
                {Object.entries(APP_WORD).map(([k,v])=>(
                  <option key={k} value={k}>{k.replace("APPEARANCE_","").replace(/_/g," ")}</option>
                ))}
              </Sel>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3.5">
              <h3 className="font-bold text-gray-700 text-sm mb-2">옵션 인증 <span className="text-xs font-normal text-gray-400">(토글 = 인증 여부)</span></h3>
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <Toggle label="키 인증" checked={!!profile.v_height} onChange={v=>s("v_height",v)}/>
                  {profile.v_height && <Sel value={profile.height||""} onChange={v=>s("height",v)}><option value="">선택</option><option value="HEIGHT_OVER_180">180+</option><option value="HEIGHT_OVER_175">175+</option><option value="HEIGHT_OVER_165_175_UNDER">165~175</option></Sel>}
                </div>
                <div className="space-y-1">
                  <Toggle label="몸무게 인증" checked={!!profile.v_body} onChange={v=>s("v_body",v)}/>
                  {profile.v_body && (
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="relative"><input type="number" placeholder="키(cm)" value={profile.heightCm||""} onChange={e=>s("heightCm",parseInt(e.target.value)||0)} className="w-full text-xs border border-gray-200 rounded-lg p-1.5 pr-8 outline-none"/><span className="absolute right-2 top-1.5 text-xs text-gray-300">cm</span></div>
                        <div className="relative"><input type="number" placeholder="몸무게(kg)" value={profile.weight||""} onChange={e=>s("weight",parseInt(e.target.value)||0)} className="w-full text-xs border border-gray-200 rounded-lg p-1.5 pr-8 outline-none"/><span className="absolute right-2 top-1.5 text-xs text-gray-300">kg</span></div>
                      </div>
                      <Toggle label="운동 체형 (근육질)" checked={!!profile.muscular} onChange={v=>s("muscular",v)}/>
                      {profile.weight > 0 && profile.heightCm > 0 && <p className="text-xs text-gray-400">BMI: {(profile.weight/Math.pow(profile.heightCm/100,2)).toFixed(1)} {(()=>{const b=profile.weight/Math.pow(profile.heightCm/100,2);const m=profile.gender==="male"?25:23;const e=profile.muscular?30:m;if(b>=18.5&&b<=e)return "✅ 정상";if(profile.gender==="female"&&b>=16&&b<18.5)return "✅ 슬림";return "⚠️ 문구 미반영";})()}</p>}
                    </div>
                  )}
                </div>
                <Toggle label="미인대회/피트니스 수상" checked={!!profile.v_contest} onChange={v=>s("v_contest",v)}/>
                <div className="space-y-1">
                  <Toggle label="차 인증" checked={!!profile.v_car} onChange={v=>s("v_car",v)}/>
                  {profile.v_car && (
                    <div className="space-y-1">
                      <Sel value={profile.carBrand||""} onChange={v=>s("carBrand",v)}>{CAR_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel>
                      <Sel value={profile.carPrice||""} onChange={v=>s("carPrice",parseInt(v)||0)}><option value="0">차량 가격대</option><option value="5000">3~5천만</option><option value="7000">5~7천만</option><option value="8000">7~8천만</option><option value="9000">8~9천만</option><option value="11000">1억+</option></Sel>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Toggle label="부모님 자산 인증" checked={!!profile.v_parentAssets} onChange={v=>s("v_parentAssets",v)}/>
                  {profile.v_parentAssets && <Sel value={profile.parentAssets||""} onChange={v=>s("parentAssets",v)}><option value="">선택</option><option value="PARENT_ASSET_OVER_100B">100억+</option><option value="PARENT_ASSET_OVER_50B">50억+</option><option value="PARENT_ASSET_OVER_30B">30억+</option><option value="PARENT_ASSET_OVER_10B">10억+</option></Sel>}
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: 직업/학력/연봉/자산 */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-sm border p-3.5">
              <h3 className="font-bold text-gray-700 text-sm mb-2">직업 · 직장</h3>
              <div className="space-y-1.5">
                <Sel value={profile.occupation||""} onChange={v=>s("occupation",v)}>
                  <option value="">직업 선택</option>
                  {OCC_GROUPS.map((g,i)=>(<optgroup key={i} label={g.label}>{g.o.map(([v,l])=><option key={v} value={v}>{l}</option>)}</optgroup>))}
                </Sel>
                <Sel value={profile.companyCategory||""} onChange={v=>s("companyCategory",v)}>
                  {COMP_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </Sel>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3.5">
              <h3 className="font-bold text-gray-700 text-sm mb-2">학력</h3>
              <div className="space-y-1.5">
                <Sel value={profile.education||""} onChange={v=>{s("education",v); s("university","");}}>
                  <option value="">해당 없음</option>
                  <option value="WORLD_TOP_10">세계 Top 10 (Harvard, MIT, Oxford 등)</option>
                  <option value="DOMESTIC_TOP_5_WORLD_50">SKY / 세계 Top 50</option>
                  <option value="DOMESTIC_TOP_8_WORLD_100">주요 8개 대학 / 세계 Top 100</option>
                  <option value="DOMESTIC_TOP_20">주요 20개 대학</option>
                  <option value="DOMESTIC_TOP_50_OVERSEAS">수도권/해외 대학</option>
                  <option value="GENERAL_4YEAR">일반 4년제</option>
                  <option value="ASSOCIATE_DEGREE">전문대</option>
                  <option value="HIGH_SCHOOL">고졸/검정고시</option>
                </Sel>
                {profile.education && UNI_BY_TIER[profile.education] && (
                  <Sel value={profile.university||""} onChange={v=>s("university",v)}>
                    <option value="">대학 선택</option>
                    {UNI_BY_TIER[profile.education].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </Sel>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3.5">
              <h3 className="font-bold text-gray-700 text-sm mb-2">연봉 · 본인 자산</h3>
              <div className="space-y-1.5">
                <Sel value={profile.salary||""} onChange={v=>s("salary",v)}>
                  <option value="">연봉</option>
                  {Object.entries(SALARY_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </Sel>
                <Sel value={profile.assets||""} onChange={v=>s("assets",v)}>
                  <option value="">본인 자산</option>
                  {Object.entries(ASSET_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </Sel>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 text-center text-xs text-gray-300 space-y-0.5">
          <p>학력·직업·연봉·자산을 교차 비교하여 가장 높은 점수의 카테고리가 타이틀을 결정합니다</p>
          <p>옵션 인증을 켜면 매력 수식어에 반영 | 성향은 항상 반영되어 저등급도 문구 보장</p>
        </div>
      </div>
    </div>
  );
}
