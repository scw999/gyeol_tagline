import { useState, useMemo, useCallback } from "react";

// ============================================================
// 결하다 소개 문구 v4
// 
// v4 변경:
// 1) "꼼꼼한" → 긍정 표현으로 교체
// 2) 직장명(개인정보) → 카테고리만 노출 (대기업 재직 등)
// 3) 옵션 인증(키/체형/차/부모자산/부모직업) 여부에 따라 문구 차별화
//    인증 완료 항목이 많을수록 매력 포인트 추가 가능
// ============================================================

// ── TRAIT: 성향 → 매력 키워드 ──
const TRAIT_CHARM = {
  개방성:   { male: "지적 호기심",      female: "감각적 취향" },
  성실성:   { male: "믿음직한 책임감",  female: "차분한 실행력" },
  외향성:   { male: "유쾌한 에너지",    female: "밝은 에너지" },
  우호성:   { male: "따뜻한 배려심",    female: "다정한 따뜻함" },
  정서안정: { male: "든든한 안정감",    female: "차분한 단단함" },
  애착안정: { male: "든든한 신뢰감",    female: "편안한 포근함" },
  애착불안: { male: "깊은 진심",        female: "깊은 애정" },
  애착회피: { male: "쿨한 독립심",      female: "당당한 주관" },
};

const COMBO_CHARM = {
  "개방성+외향성":    { male: "활기와 지적 호기심",      female: "밝은 감각과 열린 시선" },
  "개방성+우호성":    { male: "열린 마음과 따뜻한 배려",  female: "감각적 취향과 따뜻함" },
  "개방성+성실성":    { male: "지적 호기심과 탄탄한 실력", female: "감각과 실행력" },
  "개방성+정서안정":  { male: "지적인 차분함",            female: "감각적 여유" },
  "성실성+우호성":    { male: "책임감과 따뜻한 배려",     female: "차분한 다정함" },
  "성실성+정서안정":  { male: "묵직한 신뢰감",            female: "단단한 책임감" },
  "성실성+애착안정":  { male: "한결같은 믿음직함",        female: "성실하고 편안한 온기" },
  "외향성+우호성":    { male: "유쾌함과 따뜻한 배려",     female: "밝은 에너지와 다정함" },
  "외향성+애착안정":  { male: "밝은 에너지와 든든함",     female: "즐거운 활기와 편안함" },
  "외향성+정서안정":  { male: "활기와 안정감",            female: "밝으면서 차분한 여유" },
  "우호성+애착안정":  { male: "따뜻함과 든든한 신뢰",     female: "다정함과 편안한 온기" },
  "우호성+정서안정":  { male: "편안한 배려심",            female: "따뜻한 안정감" },
  "정서안정+애착안정":{ male: "흔들림 없는 든든함",       female: "편안한 안정감" },
  "개방성+애착회피":  { male: "자유로운 지적 감각",       female: "독립적인 감각" },
  "성실성+외향성":    { male: "실행력과 유쾌한 에너지",   female: "활발함과 차분한 실력" },
};

// ── APPEARANCE: 외모 → 명사구 ──
const APP_WORD = {
  APPEARANCE_TOP_1:    { male: "압도적 비주얼",   female: "눈부신 비주얼" },
  APPEARANCE_TOP_5:    { male: "훈훈한 외모",     female: "돋보이는 미모" },
  APPEARANCE_TOP_20:   { male: "호감형 외모",     female: "사랑스러운 이미지" },
  APPEARANCE_HIGH_AVG: { male: "깔끔한 인상",     female: "밝은 인상" },
  APPEARANCE_ABOVE_AVG:{ male: "호감 가는 인상",  female: "밝은 분위기" },
  APPEARANCE_AVG:      { male: null, female: null },
  APPEARANCE_BELOW_AVG:{ male: null, female: null },
};

// ── HEIGHT/BODY: 인증 시에만 사용 ──
const HT_WORD = {
  HEIGHT_OVER_180:           { male: "훤칠한 키",   female: null },
  HEIGHT_OVER_175:           { male: "좋은 체격",   female: null },
  HEIGHT_OVER_165_175_UNDER: { male: null,          female: "늘씬한 라인" },
};

// ── BODY: weight+height → BMI 계산 → 체형 판정 ──
// BMI = weight / (height_m)^2
// 남: 18.5~25 정상, 여: 18.5~23 정상
// 근육질(운동체형)은 BMI 높아도 정상 처리
const BODY_CHARM = {
  fit_high:  { male: "탄탄한 체격",  female: "건강미 넘치는 바디" },  // BMI정상 + 운동체형
  fit:       { male: "좋은 체격",    female: "날씬한 라인" },          // BMI정상
  // BMI 비정상이면 문구 미반영
};

function calcBodyTier(weight, heightCm, gender, isMuscular) {
  if (!weight || !heightCm) return null;
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  const maxNormal = gender === "male" ? 25 : 23;
  
  // 근육질이면 BMI 상한을 30까지 허용 (보디빌더급 고려)
  const effectiveMax = isMuscular ? 30 : maxNormal;
  
  if (bmi >= 18.5 && bmi <= effectiveMax) {
    return isMuscular ? "fit_high" : "fit";
  }
  // 여성인데 BMI 18.5 미만 (저체중) → 날씬함은 매력이 될 수 있음
  if (gender === "female" && bmi >= 16 && bmi < 18.5) {
    return "fit";
  }
  return null; // BMI 비정상 → 문구 미반영
}

// ── CONTEST: 미인대회/피트니스대회 수상 ──
const CONTEST_CHARM = {
  male: "피트니스대회 수상 경력의",
  female: "미인대회 수상 경력의",
};

// ── CAR: 인증 시에만 / 럭셔리만 의미 있음 ──
const CAR_CHARM = {
  luxury:  { male: "럭셔리한 라이프", female: "럭셔리한 라이프" },
  premium: { male: "센스 있는 취향",  female: "센스 있는 취향" },
};
const LUXURY_CARS = ["porsche","lamborghini","ferrari","maserati","bentley","rolls_royce"];
const PREMIUM_CARS = ["mercedes_benz","bmw","audi","lexus","genesis","tesla","land_rover","jaguar","volvo"];

// ── OCCUPATION: 직업 표시명 ──
const OCC = {
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
};
const OCC_F = { securities:"증권 전문가", IT:"IT 전문가", data_engineer:"데이터 전문가", ai_engineer:"AI 전문가", aerospace:"항공우주 전문가" };

// ── COMPANY: 카테고리만 (이름 비공개) ──
const COMP_CATEGORY = {
  large: "대기업 재직",
  major_public: "주요 공기업 재직",
  major_finance: "주요 금융권 재직",
  major_media: "주요 언론사 재직",
  education: "교육기관 재직",
  government: "정부기관 재직",
  other_public: "공공기관 재직",
  national_research: "국공립 연구소 재직",
  medium: "중견기업 재직",
  company_other: null,
};

const UNI = { seoul:"서울대", yonsei:"연세대", korea:"고려대", skku:"성균관대", hanyang:"한양대" };
const EDU_TAG = {
  DOMESTIC_TOP_5_WORLD_50: "명문대 출신",
  DOMESTIC_TOP_8_WORLD_100: "명문대 출신",
  DOMESTIC_TOP_20: "주요 대학 출신",
};

// 부모 자산 (인증 시에만)
const PARENT_TAG = {
  PARENT_ASSET_OVER_100B: "든든한 집안",
  PARENT_ASSET_OVER_50B: "여유로운 집안",
  PARENT_ASSET_OVER_30B: "안정적 가정",
};

// ── 한국어 조사 ──
function hasBatchim(str) {
  const c = str.charAt(str.length - 1).charCodeAt(0);
  return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
}
function waGwa(s) { return hasBatchim(s) ? "과" : "와"; }
function eulReul(s) { return hasBatchim(s) ? "을" : "를"; }
function attachOf(s) { return s.endsWith("의") ? s : s + "의"; }
function stripOf(s) { return s.replace(/의$/, ""); }

// ── 문구 생성 ──
function generate(p) {
  const g = p.gender;

  // 1) 타이틀 조립
  const occName = (g === "female" && OCC_F[p.occupation]) || OCC[p.occupation] || "";

  // 직장: 카테고리만 (이름 비노출)
  const compCat = p.companyCategory ? COMP_CATEGORY[p.companyCategory] : null;

  // 학력
  let eduTag = "";
  if (p.university && UNI[p.university]) eduTag = UNI[p.university] + " 출신";
  else if (p.education && EDU_TAG[p.education]) eduTag = EDU_TAG[p.education];

  // 부모 자산 (인증 시에만)
  let famTag = "";
  if (p.v_parentAssets && p.parentAssets && PARENT_TAG[p.parentAssets])
    famTag = PARENT_TAG[p.parentAssets];

  // 타이틀 = [컨텍스트] + [직업]
  let title = "";
  if (compCat && occName) {
    // "대기업 재직 개발자", but if occupation already says "대기업 직장인" → "대기업 재직 직장인" is redundant
    if (["대기업 직장인","중견기업 직장인","공기업 직장인","외국계 직장인","직장인"].includes(occName)) {
      title = compCat.replace(" 재직", "") + " 직장인";
    } else {
      title = occName; // 전문직이면 직업명이 충분
    }
  } else if (eduTag) {
    title = `${eduTag} ${occName}`;
  } else if (famTag) {
    title = `${famTag}의 ${occName}`;
  } else if (p.salary === "SALARY_OVER_200M") {
    title = `능력 있는 ${occName}`;
  } else {
    title = occName;
  }

  // 2) 매력 후보 수집
  let candidates = [];
  const physicalTypes = ["height","body","appearance","car","contest"];

  // 외모 (항상 있음 — 코디네이터 평가)
  const appTier = { APPEARANCE_TOP_1:10, APPEARANCE_TOP_5:8, APPEARANCE_TOP_20:5, APPEARANCE_HIGH_AVG:3, APPEARANCE_ABOVE_AVG:1 };
  const appW = APP_WORD[p.appearance]?.[g];
  if (appW) candidates.push({ text: appW, priority: appTier[p.appearance]||0, type:"appearance" });

  // 키 (인증 시에만)
  if (p.v_height) {
    const htW = HT_WORD[p.height]?.[g];
    if (htW) candidates.push({ text: htW, priority: 6, type:"height" });
  }

  // 체형 (인증 시에만 — weight+height → BMI 계산)
  if (p.v_body && p.weight && p.heightCm) {
    const bodyTier = calcBodyTier(p.weight, p.heightCm, g, !!p.muscular);
    if (bodyTier && BODY_CHARM[bodyTier]?.[g]) {
      const priority = bodyTier === "fit_high" ? 5 : 4;
      candidates.push({ text: BODY_CHARM[bodyTier][g], priority, type:"body" });
    }
  }

  // 미인대회/피트니스대회 수상 (인증 시에만)
  if (p.v_contest) {
    candidates.push({ text: CONTEST_CHARM[g], priority: 9, type:"contest" });
  }

  // 차 (인증 시에만 + 프리미엄급만)
  if (p.v_car && p.carBrand) {
    if (LUXURY_CARS.includes(p.carBrand)) {
      candidates.push({ text: CAR_CHARM.luxury[g], priority: 5, type:"car" });
    } else if (PREMIUM_CARS.includes(p.carBrand) && p.carPrice >= 8000) {
      candidates.push({ text: CAR_CHARM.premium[g], priority: 3, type:"car" });
    }
  }

  // 성향 (항상)
  const pos = Object.entries(p.traits)
    .filter(([k]) => !["애착불안","애착회피"].includes(k))
    .sort((a,b) => b[1] - a[1]);
  const all = Object.entries(p.traits).sort((a,b) => b[1] - a[1]);
  const t1 = pos[0]?.[0], t2 = pos[1]?.[0];

  let traitText = "";
  let traitShort = TRAIT_CHARM[t1]?.[g] || "";
  const ck1 = `${t1}+${t2}`, ck2 = `${t2}+${t1}`;
  if (COMBO_CHARM[ck1]?.[g]) traitText = COMBO_CHARM[ck1][g];
  else if (COMBO_CHARM[ck2]?.[g]) traitText = COMBO_CHARM[ck2][g];
  else traitText = traitShort;

  if (all[0]?.[0] === "애착불안" && all[0][1] > (pos[0]?.[1]||0) + 1) {
    traitText = TRAIT_CHARM["애착불안"][g]; traitShort = traitText;
  }
  if (all[0]?.[0] === "애착회피" && all[0][1] > (pos[0]?.[1]||0) + 1) {
    traitText = TRAIT_CHARM["애착회피"][g]; traitShort = traitText;
  }

  if (traitText) candidates.push({ text: traitText, short: traitShort, priority: 7, type:"trait" });

  // 3) 우선순위 선택 (최대 2개, 물리적 특성 1개+성향 1개)
  candidates.sort((a,b) => b.priority - a.priority);
  let selected = [];
  let hasPhysical = false, hasTrait = false;
  for (const c of candidates) {
    if (selected.length >= 2) break;
    const isPhys = physicalTypes.includes(c.type);
    if (isPhys && hasPhysical) continue;
    if (c.type === "trait" && hasTrait) continue;
    selected.push(c);
    if (isPhys) hasPhysical = true;
    if (c.type === "trait") hasTrait = true;
  }

  // 4) 조합
  let tagline = "";
  if (selected.length === 0) {
    tagline = title;
  } else if (selected.length === 1) {
    tagline = attachOf(selected[0].text) + " " + title;
  } else {
    const phys = selected.find(s => physicalTypes.includes(s.type));
    const trait = selected.find(s => s.type === "trait");
    if (phys && trait) {
      const a = stripOf(phys.text);
      const b = stripOf(trait.short || trait.text);
      const overlapW = ["매력","비주얼","외모","미모","이미지","분위기","라인","체격","인상","취향","감각"];
      if (overlapW.some(w => a.includes(w) && b.includes(w))) {
        tagline = attachOf(selected[0].text) + " " + title;
      } else {
        tagline = `${a}${waGwa(a)} ${b}${eulReul(b)} 갖춘 ${title}`;
      }
    } else {
      tagline = attachOf(selected[0].text) + " " + title;
    }
  }

  tagline = tagline.replace(/의\s+의/g, "의").replace(/\s+/g, " ").trim();

  // 인증 뱃지 수 (UI 표시용)
  const verifiedCount = [p.v_height, p.v_body, p.v_car, p.v_parentAssets, p.v_contest].filter(Boolean).length;

  return { tagline, selected: selected.map(s => `${s.type}: ${s.text}`), title, traitText, t1, t2, verifiedCount };
}

// ── UI DATA ──
const LABELS = ["개방성","성실성","외향성","우호성","정서안정","애착안정","애착불안","애착회피"];
const OCC_GROUPS = [
  { label:"의료", o:[["doctor","의사"],["plastic_surgeon","성형외과"],["dermatologist","피부과"],["dentist","치과의사"],["pharmacist","약사"],["oriental_medicine_doctor","한의사"],["veterinarian","수의사"],["nurse","간호사"],["dental_hygienist","치위생사"],["physical_therapist","물리치료사"],["health_teacher","보건교사"]]},
  { label:"법조", o:[["judge","판사"],["prosecutor","검사"],["lawyer","변호사"],["law_firm_staff","로펌"]]},
  { label:"교육", o:[["professor_major","명문대교수"],["professor","교수"],["elementary_middle_high_school_teacher","교사"],["kindergarten_teacher","유치원교사"],["childcare_teacher","보육교사"],["academy_instructor","강사"]]},
  { label:"전문직", o:[["accountant","회계사"],["tax_accountant","세무사"],["patent_attorney","변리사"],["labor_attorney","노무사"],["architect","건축사"],["appraiser","감정평가사"],["captain","기장"]]},
  { label:"공무원·군인", o:[["foreign_service_exam_passed","외교관"],["administrative_exam_passed_grade5","행시출신"],["grade5_civil_servant","5급+"],["grade6_civil_servant","6급"],["grade7_civil_servant","7급"],["grade9_civil_servant","9급"],["technical_civil_servant","기술직"],["officer","장교"],["police_officer","경찰"],["firefighter","소방관"]]},
  { label:"금융", o:[["bank","은행"],["securities","증권"],["investment","투자"],["fund_manager","펀드매니저"],["analyst","애널리스트"],["asset_management","자산운용"]]},
  { label:"일반", o:[["domestic_large_corporation","대기업"],["domestic_mid_corporation","중견"],["domestic_small_corporation","중소"],["public_enterprise","공기업"],["foreign_company","외국계"],["entrepreneur_listed","상장사대표"],["entrepreneur_10B_over","CEO(100억+)"],["entrepreneur_2B_over","사업가(20억+)"],["entrepreneur","사업가"],["freelancer","프리랜서"]]},
  { label:"IT·개발", o:[["programmer","개발자"],["web_developer","웹"],["app_developer","앱"],["data_engineer","데이터"],["ai_engineer","AI"],["security_specialist","보안"]]},
  { label:"연구·기술", o:[["IT","IT"],["bio","바이오"],["researcher","연구원"],["aerospace","항공우주"]]},
  { label:"방송", o:[["announcer","아나운서"],["journalist","기자"],["PD","PD"]]},
  { label:"체육", o:[["fitness_trainer","트레이너"],["pilates","필라테스"],["yoga","요가"],["athlete","선수"]]},
  { label:"예술", o:[["actor","배우"],["singer","가수"],["designer","디자이너"],["musician","뮤지션"],["dancer","무용가"]]},
  { label:"서비스", o:[["aviation","승무원"],["beauty","뷰티"],["pilot","파일럿"]]},
];
const COMP_CAT_OPTS = [["","선택안함"],["large","대기업"],["major_finance","주요 금융권"],["major_public","주요 공기업"],["other_public","기타 공공기관"],["major_media","주요 언론사"],["education","교육기관"],["government","정부기관"],["national_research","국공립 연구소"],["medium","중견기업"]];
const UNI_OPTS = [["","선택안함"],["seoul","서울대"],["yonsei","연세대"],["korea","고려대"],["skku","성균관대"],["hanyang","한양대"]];
const CAR_OPTS = [["","미인증"],["porsche","포르쉐"],["lamborghini","람보르기니"],["ferrari","페라리"],["bentley","벤틀리"],["rolls_royce","롤스로이스"],["maserati","마세라티"],["mercedes_benz","벤츠"],["bmw","BMW"],["audi","아우디"],["lexus","렉서스"],["genesis","제네시스"],["tesla","테슬라"],["land_rover","랜드로버"],["volvo","볼보"],["hyundai","현대"],["kia","기아"],["chevrolet","쉐보레"],["other","기타"]];

const PRESETS = [
  { name:"남·SKY 치과의사", p:{ gender:"male", traits:{개방성:2,성실성:4,외향성:1,우호성:5,정서안정:3,애착안정:4,애착불안:0,애착회피:1}, appearance:"APPEARANCE_TOP_20", v_height:true, height:"HEIGHT_OVER_180", v_body:true, weight:78, heightCm:182, muscular:true, occupation:"dentist", companyCategory:"", education:"DOMESTIC_TOP_5_WORLD_50", university:"yonsei", salary:"SALARY_100M_150M", assets:"", v_parentAssets:false, parentAssets:"", v_car:false, carBrand:"", carPrice:0, v_contest:false }},
  { name:"여·대기업(인증多)", p:{ gender:"female", traits:{개방성:5,성실성:3,외향성:4,우호성:2,정서안정:3,애착안정:3,애착불안:1,애착회피:0}, appearance:"APPEARANCE_TOP_5", v_height:true, height:"HEIGHT_OVER_165_175_UNDER", v_body:true, weight:50, heightCm:167, muscular:false, occupation:"domestic_large_corporation", companyCategory:"large", education:"DOMESTIC_TOP_8_WORLD_100", university:"", salary:"SALARY_70M_100M", assets:"", v_parentAssets:true, parentAssets:"PARENT_ASSET_OVER_50B", v_car:false, carBrand:"", carPrice:0, v_contest:false }},
  { name:"남·서울대 CEO", p:{ gender:"male", traits:{개방성:5,성실성:3,외향성:4,우호성:3,정서안정:4,애착안정:2,애착불안:0,애착회피:3}, appearance:"APPEARANCE_HIGH_AVG", v_height:true, height:"HEIGHT_OVER_180", v_body:false, weight:0, heightCm:0, muscular:false, occupation:"entrepreneur_10B_over", companyCategory:"", education:"DOMESTIC_TOP_5_WORLD_50", university:"seoul", salary:"SALARY_OVER_200M", assets:"ASSET_OVER_1B", v_parentAssets:false, parentAssets:"", v_car:true, carBrand:"porsche", carPrice:11000, v_contest:false }},
  { name:"여·미인대회 수상", p:{ gender:"female", traits:{개방성:4,성실성:2,외향성:4,우호성:4,정서안정:3,애착안정:3,애착불안:1,애착회피:0}, appearance:"APPEARANCE_TOP_1", v_height:true, height:"HEIGHT_OVER_165_175_UNDER", v_body:true, weight:48, heightCm:170, muscular:false, occupation:"pilates", companyCategory:"", education:"", university:"", salary:"", assets:"", v_parentAssets:false, parentAssets:"", v_car:false, carBrand:"", carPrice:0, v_contest:true }},
  { name:"남·소방관(인증多)", p:{ gender:"male", traits:{개방성:1,성실성:5,외향성:2,우호성:4,정서안정:5,애착안정:3,애착불안:0,애착회피:1}, appearance:"APPEARANCE_ABOVE_AVG", v_height:true, height:"HEIGHT_OVER_180", v_body:true, weight:85, heightCm:183, muscular:true, occupation:"firefighter", companyCategory:"", education:"", university:"", salary:"SALARY_50M_70M", assets:"", v_parentAssets:false, parentAssets:"", v_car:false, carBrand:"", carPrice:0, v_contest:false }},
  { name:"여·유치원교사(미인증)", p:{ gender:"female", traits:{개방성:3,성실성:3,외향성:3,우호성:5,정서안정:4,애착안정:5,애착불안:1,애착회피:0}, appearance:"APPEARANCE_HIGH_AVG", v_height:false, height:"", v_body:false, weight:0, heightCm:0, muscular:false, occupation:"kindergarten_teacher", companyCategory:"", education:"", university:"", salary:"", assets:"", v_parentAssets:false, parentAssets:"", v_car:false, carBrand:"", carPrice:0, v_contest:false }},
  { name:"남·재벌2세(풀인증)", p:{ gender:"male", traits:{개방성:3,성실성:2,외향성:3,우호성:3,정서안정:3,애착안정:2,애착불안:1,애착회피:2}, appearance:"APPEARANCE_TOP_20", v_height:true, height:"HEIGHT_OVER_175", v_body:true, weight:75, heightCm:178, muscular:false, occupation:"entrepreneur_listed", companyCategory:"", education:"DOMESTIC_TOP_5_WORLD_50", university:"korea", salary:"SALARY_OVER_200M", assets:"ASSET_OVER_1B", v_parentAssets:true, parentAssets:"PARENT_ASSET_OVER_100B", v_car:true, carBrand:"porsche", carPrice:11000, v_contest:false }},
  { name:"여·승무원(키인증)", p:{ gender:"female", traits:{개방성:4,성실성:3,외향성:4,우호성:5,정서안정:3,애착안정:3,애착불안:2,애착회피:0}, appearance:"APPEARANCE_TOP_5", v_height:true, height:"HEIGHT_OVER_165_175_UNDER", v_body:false, weight:0, heightCm:0, muscular:false, occupation:"aviation", companyCategory:"", education:"DOMESTIC_TOP_20", university:"", salary:"", assets:"", v_parentAssets:false, parentAssets:"", v_car:false, carBrand:"", carPrice:0, v_contest:false }},
  { name:"남·근육질 트레이너", p:{ gender:"male", traits:{개방성:2,성실성:4,외향성:4,우호성:3,정서안정:4,애착안정:3,애착불안:0,애착회피:1}, appearance:"APPEARANCE_TOP_5", v_height:true, height:"HEIGHT_OVER_180", v_body:true, weight:92, heightCm:181, muscular:true, occupation:"fitness_trainer", companyCategory:"", education:"", university:"", salary:"", assets:"", v_parentAssets:false, parentAssets:"", v_car:false, carBrand:"", carPrice:0, v_contest:false }},
  { name:"남·9급(미인증)", p:{ gender:"male", traits:{개방성:2,성실성:4,외향성:3,우호성:4,정서안정:3,애착안정:4,애착불안:1,애착회피:0}, appearance:"APPEARANCE_AVG", v_height:false, height:"", v_body:false, weight:0, heightCm:0, muscular:false, occupation:"grade9_civil_servant", companyCategory:"government", education:"", university:"", salary:"SALARY_30M_50M", assets:"", v_parentAssets:false, parentAssets:"", v_car:false, carBrand:"", carPrice:0, v_contest:false }},
];

function Sel({value,onChange,children,className=""}) {
  return <select value={value} onChange={e=>onChange(e.target.value)}
    className={`w-full text-xs border border-gray-200 rounded-lg p-1.5 bg-white focus:ring-1 focus:ring-purple-200 outline-none ${className}`}>{children}</select>;
}

function Toggle({label, checked, onChange}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked?"bg-green-400":"bg-gray-200"}`}
        onClick={()=>onChange(!checked)}>
        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${checked?"left-4":"left-0.5"}`}/>
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
          <p className="text-xs text-gray-400">소개 문구 생성기 v4 — 인증 기반 매력 조합</p>
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-2 gap-2.5 mb-3">
          <div className={`rounded-2xl shadow-md p-5 border-2 transition-all ${isMale?"bg-white border-blue-200":"bg-white/60 border-gray-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                <span className="text-xs text-blue-500 font-medium">남성 → 여성에게 표시</span>
              </div>
              {(isMale ? res : opp).verifiedCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                  인증 {(isMale ? res : opp).verifiedCount}개
                </span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">{isMale?res.tagline:opp.tagline}</h2>
          </div>
          <div className={`rounded-2xl shadow-md p-5 border-2 transition-all ${!isMale?"bg-white border-pink-200":"bg-white/60 border-gray-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"/>
                <span className="text-xs text-pink-500 font-medium">여성 → 남성에게 표시</span>
              </div>
              {(!isMale ? res : opp).verifiedCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                  인증 {(!isMale ? res : opp).verifiedCount}개
                </span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">{!isMale?res.tagline:opp.tagline}</h2>
          </div>
        </div>

        <div className="text-center mb-4">
          <button onClick={()=>setDetail(!detail)} className="text-xs text-purple-400 hover:text-purple-600">
            {detail?"▲ 접기":"▼ 선택된 매력 요소"}
          </button>
          {detail && (
            <div className="mt-2 bg-white rounded-lg border p-3 text-left text-xs text-gray-600 space-y-1">
              <p><strong>매력 요소:</strong> {res.selected.join(" / ") || "없음"}</p>
              <p><strong>타이틀:</strong> {res.title}</p>
              <p><strong>성향:</strong> {res.t1}+{res.t2} → {res.traitText}</p>
              <p><strong>옵션 인증:</strong> 키{profile.v_height?"✅":"❌"} 체형{profile.v_body?"✅":"❌"} 차{profile.v_car?"✅":"❌"} 부모자산{profile.v_parentAssets?"✅":"❌"} 수상{profile.v_contest?"✅":"❌"}</p>
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
                <option value="APPEARANCE_TOP_1">상위 1%</option>
                <option value="APPEARANCE_TOP_5">상위 5%</option>
                <option value="APPEARANCE_TOP_20">상위 20%</option>
                <option value="APPEARANCE_HIGH_AVG">상위 35%</option>
                <option value="APPEARANCE_ABOVE_AVG">평균 이상</option>
                <option value="APPEARANCE_AVG">평균</option>
                <option value="APPEARANCE_BELOW_AVG">평균 이하</option>
              </Sel>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-3.5">
              <h3 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-1.5">
                옵션 인증
                <span className="text-xs font-normal text-gray-400">(토글 = 인증 여부)</span>
              </h3>
              <div className="space-y-2.5">
                {/* 키 인증 */}
                <div className="space-y-1">
                  <Toggle label="키 인증" checked={!!profile.v_height} onChange={v=>s("v_height",v)}/>
                  {profile.v_height && (
                    <Sel value={profile.height||""} onChange={v=>s("height",v)}>
                      <option value="">선택</option>
                      <option value="HEIGHT_OVER_180">180+</option>
                      <option value="HEIGHT_OVER_175">175+</option>
                      <option value="HEIGHT_OVER_165_175_UNDER">165~175</option>
                    </Sel>
                  )}
                </div>
                {/* 체형 인증 */}
                <div className="space-y-1">
                  <Toggle label="몸무게 인증" checked={!!profile.v_body} onChange={v=>s("v_body",v)}/>
                  {profile.v_body && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="relative">
                          <input type="number" placeholder="키(cm)" value={profile.heightCm||""} 
                            onChange={e=>s("heightCm",parseInt(e.target.value)||0)}
                            className="w-full text-xs border border-gray-200 rounded-lg p-1.5 pr-8 outline-none focus:ring-1 focus:ring-purple-200"/>
                          <span className="absolute right-2 top-1.5 text-xs text-gray-300">cm</span>
                        </div>
                        <div className="relative">
                          <input type="number" placeholder="몸무게(kg)" value={profile.weight||""} 
                            onChange={e=>s("weight",parseInt(e.target.value)||0)}
                            className="w-full text-xs border border-gray-200 rounded-lg p-1.5 pr-8 outline-none focus:ring-1 focus:ring-purple-200"/>
                          <span className="absolute right-2 top-1.5 text-xs text-gray-300">kg</span>
                        </div>
                      </div>
                      <Toggle label="운동 체형 (근육질)" checked={!!profile.muscular} onChange={v=>s("muscular",v)}/>
                      {profile.weight > 0 && profile.heightCm > 0 && (
                        <p className="text-xs text-gray-400">
                          BMI: {(profile.weight / Math.pow(profile.heightCm/100, 2)).toFixed(1)}
                          {(() => {
                            const bmi = profile.weight / Math.pow(profile.heightCm/100, 2);
                            const max = profile.gender === "male" ? 25 : 23;
                            const effMax = profile.muscular ? 30 : max;
                            if (bmi >= 18.5 && bmi <= effMax) return " ✅ 정상";
                            if (profile.gender === "female" && bmi >= 16 && bmi < 18.5) return " ✅ 슬림";
                            return " ⚠️ 문구 미반영";
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {/* 미인대회/피트니스 수상 */}
                <div className="space-y-1">
                  <Toggle label="미인대회/피트니스대회 수상" checked={!!profile.v_contest} onChange={v=>s("v_contest",v)}/>
                </div>
                {/* 차 인증 */}
                <div className="space-y-1">
                  <Toggle label="차 인증" checked={!!profile.v_car} onChange={v=>s("v_car",v)}/>
                  {profile.v_car && (
                    <div className="space-y-1">
                      <Sel value={profile.carBrand||""} onChange={v=>s("carBrand",v)}>
                        {CAR_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                      </Sel>
                      <Sel value={profile.carPrice||""} onChange={v=>s("carPrice",parseInt(v)||0)}>
                        <option value="0">차량 가격대</option>
                        <option value="3000">3천만원 이하</option>
                        <option value="5000">3~5천만원</option>
                        <option value="7000">5~7천만원</option>
                        <option value="8000">7~8천만원</option>
                        <option value="9000">8~9천만원</option>
                        <option value="10000">9천~1억</option>
                        <option value="11000">1억 이상</option>
                      </Sel>
                    </div>
                  )}
                </div>
                {/* 부모 자산 인증 */}
                <div className="space-y-1">
                  <Toggle label="부모님 자산 인증" checked={!!profile.v_parentAssets} onChange={v=>s("v_parentAssets",v)}/>
                  {profile.v_parentAssets && (
                    <Sel value={profile.parentAssets||""} onChange={v=>s("parentAssets",v)}>
                      <option value="">선택</option>
                      <option value="PARENT_ASSET_OVER_100B">100억+</option>
                      <option value="PARENT_ASSET_OVER_50B">50억+</option>
                      <option value="PARENT_ASSET_OVER_30B">30억+</option>
                    </Sel>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: 직업/학력/자산 */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-sm border p-3.5">
              <h3 className="font-bold text-gray-700 text-sm mb-2">직업 · 직장 카테고리</h3>
              <div className="space-y-1.5">
                <Sel value={profile.occupation||""} onChange={v=>s("occupation",v)}>
                  <option value="">직업 선택</option>
                  {OCC_GROUPS.map((g,i)=>(<optgroup key={i} label={g.label}>{g.o.map(([v,l])=><option key={v} value={v}>{l}</option>)}</optgroup>))}
                </Sel>
                <Sel value={profile.companyCategory||""} onChange={v=>s("companyCategory",v)}>
                  {COMP_CAT_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </Sel>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3.5">
              <h3 className="font-bold text-gray-700 text-sm mb-2">학력</h3>
              <div className="space-y-1.5">
                <Sel value={profile.education||""} onChange={v=>s("education",v)}>
                  <option value="">해당 없음</option>
                  <option value="DOMESTIC_TOP_5_WORLD_50">SKY</option>
                  <option value="DOMESTIC_TOP_8_WORLD_100">주요 8개 대학</option>
                  <option value="DOMESTIC_TOP_20">주요 20개 대학</option>
                </Sel>
                <Sel value={profile.university||""} onChange={v=>s("university",v)}>
                  {UNI_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </Sel>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3.5">
              <h3 className="font-bold text-gray-700 text-sm mb-2">연봉 · 본인 자산</h3>
              <div className="space-y-1.5">
                <Sel value={profile.salary||""} onChange={v=>s("salary",v)}>
                  <option value="">연봉</option>
                  <option value="SALARY_OVER_200M">2억+</option>
                  <option value="SALARY_150M_200M">1.5~2억</option>
                  <option value="SALARY_100M_150M">1~1.5억</option>
                  <option value="SALARY_70M_100M">7천~1억</option>
                  <option value="SALARY_50M_70M">5~7천만</option>
                  <option value="SALARY_30M_50M">3~5천만</option>
                </Sel>
                <Sel value={profile.assets||""} onChange={v=>s("assets",v)}>
                  <option value="">본인 자산</option>
                  <option value="ASSET_OVER_1B">10억+</option>
                  <option value="ASSET_500M_1B">5~10억</option>
                </Sel>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 text-center text-xs text-gray-300 space-y-0.5">
          <p>옵션 인증(키·체형·차·부모자산)을 켜면 해당 매력 요소가 문구에 반영됩니다</p>
          <p>직장명은 개인정보 보호를 위해 카테고리(대기업/공기업 등)만 표시합니다</p>
        </div>
      </div>
    </div>
  );
}
