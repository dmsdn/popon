// data/hotplaces.ts
//
// [결정] popup_hot_place는 백엔드 테이블+API가 있지만, 관리자용 업로드 화면이 없어서
// 데이터를 넣으려면 매번 SQL을 직접 만져야 했어요. 몇 개 안 되는 데이터를 지역
// 기준으로만 보여주면 되는 지금 요구사항엔 백엔드까지 갈 필요가 없다고 판단해서,
// 프론트 코드에 직접 데이터를 넣어두는 방식으로 바꿨어요.
//
// 나중에 데이터가 많아지거나 비개발자가 직접 관리해야 하는 시점이 오면, 그때
// popup_hot_place + 백엔드 API(이미 만들어둔 패치 있음)로 옮기면 돼요. 지금은
// 여기 배열에 항목 추가/수정하고 배포만 하면 바로 반영돼요.
//
// 매칭 기준: 팝업의 regionName(성수/강남/홍대 등, PopupDetail.regionName)과
// 아래 키가 일치하면 그 지역 리스트를 보여줍니다.

export interface HotPlace {
  category: string; // "카페" | "음식점" | "패션잡화" 등 자유 텍스트
  name: string;
  distance?: string; // 예: "114m" - 없으면 화면에 거리 표시 생략
  linkUrl?: string; // 네이버 지도 등 외부 링크
  imageUrl?: string; // 없으면 회색 placeholder로 자동 대체됨
}

export const hotPlacesByRegion: Record<string, HotPlace[]> = {
  강남: [
    { category: '도서관', name: '코엑스 별마당 도서관', linkUrl: 'https://naver.me/FqWtKj05', imageUrl: '/hotplaces/gangnam_star.jpg' },
    { category: '컨벤션센터', name: '코엑스몰', linkUrl: 'https://map.naver.com/v5/search/코엑스몰', imageUrl: '/hotplaces/gangnam_coex.jpg' },
    { category: '아쿠아리움', name: '씨라이프 코엑스 아쿠아리움', linkUrl: 'https://naver.me/Fuz5Lmcr', imageUrl: '/hotplaces/gangnam_coex_aquarium.jpg' },
    { category: '거리', name: '가로수길', linkUrl: 'https://naver.me/5T4AXKfg', imageUrl: '/hotplaces/gangnam_garosu_gil.jpg' },
    { category: '거리', name: '압구정로데오거리', linkUrl: 'https://naver.me/FzSZbdhx', imageUrl: '/hotplaces/gangnam_apgujeong_rodeo.jpg' },
    { category: '전시', name: '현대모터스튜디오 서울', linkUrl: 'https://map.naver.com/v5/search/현대모터스튜디오 서울', imageUrl: '/hotplaces/gangnam_hyeondai.jpg' },
    { category: '체험관', name: '삼성 딜라이트', linkUrl: 'https://map.naver.com/v5/search/삼성딜라이트', imageUrl: '/hotplaces/gangnam_samsung.jpg' },
    { category: '한식', name: '정식당(Jungsik Seoul)', linkUrl: 'https://naver.me/xv3DHt17', imageUrl: '/hotplaces/gangnam_jeong.jpg' },
    { category: '한식', name: '명동관', linkUrl: 'https://naver.me/xGIPZR97', imageUrl: '/hotplaces/gangnam_myeongdong.jpg' },
    { category: '한식', name: '밍글스', linkUrl: 'https://map.naver.com/v5/search/밍글스', imageUrl: '/hotplaces/gangnam_mingles.jpg' },
    { category: '일식', name: '키세카츠', linkUrl: 'https://naver.me/FfeO1eh0', imageUrl: '/hotplaces/gangnam_kisekatsu.jpg' },
    { category: '베이커리', name: '런던베이글뮤지엄 도산점', linkUrl: 'https://map.naver.com/v5/search/런던베이글뮤지엄 도산', imageUrl: '/hotplaces/gangnam_bagel.jpg' },
  ],
  잠실: [
    { category: '서울 랜드마크·전망대', name: '롯데월드타워', linkUrl: 'https://naver.me/xcnaM22P', imageUrl: '/hotplaces/jamsil_lotteworld_tower.jpg' },
    { category: '테마파크', name: '롯데월드 어드벤처', linkUrl: 'https://naver.me/FJbWZztq', imageUrl: '/hotplaces/jamsil_lotteworld.jpg' },
    { category: '공원', name: '석촌호수', linkUrl: 'https://naver.me/5r9zuGqs', imageUrl: '/hotplaces/jamsil_seokchon_lake.jpg' },
    { category: '쇼핑복합시설', name: '롯데월드몰', linkUrl: 'https://map.naver.com/v5/search/롯데월드몰', imageUrl: '/hotplaces/jamsil_lotteworld_mall.jpg' },
    { category: '아쿠아리움', name: '롯데월드 아쿠아리움', linkUrl: 'https://naver.me/GaldtpJ2', imageUrl: '/hotplaces/jamsil_lotteworld_aquarium.jpg' },
    { category: '거리', name: '송리단길', linkUrl: 'https://map.naver.com/v5/search/송리단길', imageUrl: '/hotplaces/jamsil_songnidan_gil.jpg' },
    { category: '공원', name: '잠실한강공원', linkUrl: 'https://naver.me/58N6MBRS', imageUrl: '/hotplaces/jamsil_hangang_park.jpg' },
    { category: '야구장', name: '잠실야구장', linkUrl: 'https://map.naver.com/v5/search/잠실야구장', imageUrl: '/hotplaces/jamsil_baseball.jpg' },
    { category: '국수', name: '신라제면 잠실 롯데몰점', linkUrl: 'https://naver.me/5dAAXix0', imageUrl: '/hotplaces/jamsil_silla.jpg' },
    { category: '육류', name: '잠실 고박사', linkUrl: 'https://naver.me/xq3aIiOP', imageUrl: '/hotplaces/jamsil_go.jpg' },
    { category: '평양냉면 맛집', name: '진미평양냉면 잠실점', linkUrl: 'https://map.naver.com/v5/search/진미평양냉면 잠실점', imageUrl: '/hotplaces/jamsil_jinmi.jpg' },
  ],
  용산: [
    { category: '박물관', name: '국립중앙박물관', linkUrl: 'https://map.naver.com/v5/search/국립중앙박물관', imageUrl: '/hotplaces/yongsan_museum.jpg' },
    { category: '미술관', name: '리움미술관', linkUrl: 'https://map.naver.com/v5/search/리움미술관', imageUrl: '/hotplaces/yongsan_leeum.jpg' },
    { category: '미술관', name: '아모레퍼시픽미술관(APMA)', linkUrl: 'https://map.naver.com/v5/search/아모레퍼시픽미술관', imageUrl: '/hotplaces/yongsan_amorepacific.jpg' },
    { category: '카페·편집숍 거리', name: '용리단길', linkUrl: 'https://map.naver.com/v5/search/용리단길', imageUrl: '/hotplaces/yongsan_yongridan_gil.jpg' },
    { category: '쇼핑몰', name: '용산아이파크몰', linkUrl: 'https://map.naver.com/v5/search/용산아이파크몰', imageUrl: '/hotplaces/yongsan_ipark_mall.jpg' },
    { category: '공원', name: '용산어린이정원', linkUrl: 'https://map.naver.com/v5/search/용산어린이정원', imageUrl: '/hotplaces/yongsan_children_park.jpg' },
    { category: '한강 야경', name: '노들섬', linkUrl: 'https://map.naver.com/v5/search/노들섬', imageUrl: '/hotplaces/yongsan_nodeul.jpg' },
    { category: '골목·카페·바', name: '해방촌 신흥시장', linkUrl: 'https://map.naver.com/v5/search/해방촌 신흥시장', imageUrl: '/hotplaces/yongsan_sinheung.jpg' },
    { category: 'K-POP 명소', name: '하이브 사옥', linkUrl: 'https://map.naver.com/v5/search/HYBE 사옥', imageUrl: '/hotplaces/yongsan_hybe.jpg' },
    { category: '브런치·파스타', name: 'sam sam sam', linkUrl: 'https://map.naver.com/v5/search/sam sam sam', imageUrl: '/hotplaces/yongsan_sam.jpg' },
    { category: '숙성 삼겹살', name: '도야집 용산본점', linkUrl: 'https://map.naver.com/v5/search/도야집 용산본점', imageUrl: '/hotplaces/yongsan_doyajip.jpg' },
    { category: '숙성 돼지고기', name: '육몽 용산점', linkUrl: 'https://map.naver.com/v5/search/육몽 용산점', imageUrl: '/hotplaces/yongsan_yukmong.jpg' },
    { category: '돼지국밥·수육', name: '백옥 용산', linkUrl: 'https://map.naver.com/v5/search/백옥 용산', imageUrl: '/hotplaces/yongsan_baekok.jpg' },
    { category: '삼겹살·갈비', name: '무뚝', linkUrl: 'https://map.naver.com/v5/search/무뚝 용산', imageUrl: '/hotplaces/yongsan_muttuk.jpg' },
    { category: '즉석떡볶이·분식', name: '현선이네 용산본점', linkUrl: 'https://map.naver.com/v5/search/현선이네 용산본점', imageUrl: '/hotplaces/yongsan_hyunsene.jpg' },
    { category: '미나리곰탕', name: '능동미나리', linkUrl: 'https://map.naver.com/v5/search/능동미나리', imageUrl: '/hotplaces/yongsan_neungdong.jpg' },
    { category: '파스타·스테이크', name: '이태리이층집', linkUrl: 'https://map.naver.com/v5/search/이태리이층집', imageUrl: '/hotplaces/yongsan_italy_2fl.jpg' },
    { category: '생면 파스타', name: '판콘 용산', linkUrl: 'https://map.naver.com/v5/search/판콘 용산', imageUrl: '/hotplaces/yongsan_pancone.jpg' },
    { category: '삼겹살 노포', name: '삼각정', linkUrl: 'https://map.naver.com/v5/search/삼각정', imageUrl: '/hotplaces/yongsan_samgakjeong.jpg' },
  ],
  성수: [
    { category: '공원', name: '서울숲', linkUrl: 'https://map.naver.com/v5/search/서울숲', imageUrl: '/hotplaces/seongsu_seoul_forest.jpg' },
    { category: '카페', name: '카페 어니언 성수', linkUrl: 'https://map.naver.com/v5/search/카페 어니언 성수', imageUrl: '/hotplaces/seongsu_onion.jpg' },
    { category: '카페', name: '대림창고', linkUrl: 'https://map.naver.com/v5/search/대림창고', imageUrl: '/hotplaces/seongsu_daerim_changgo.jpg' },
    { category: '편집숍·전시', name: 'LCDC SEOUL', linkUrl: 'https://map.naver.com/v5/search/LCDC SEOUL', imageUrl: '/hotplaces/seongsu_lcdc.jpg' },
    { category: '패션 쇼핑', name: '무신사 스토어 성수', linkUrl: 'https://map.naver.com/v5/search/무신사 스토어 성수', imageUrl: '/hotplaces/seongsu_musinsa.jpg' },
    { category: '거리', name: '연무장길', linkUrl: 'https://map.naver.com/v5/search/연무장길', imageUrl: '/hotplaces/seongsu_yeonmujang.jpg' },
    { category: '카페거리', name: '성수 카페거리', linkUrl: 'https://map.naver.com/v5/search/성수 카페거리', imageUrl: '/hotplaces/seongsu_cafe_street.jpg' },
    { category: '문화공간·플리마켓', name: '언더스탠드에비뉴', linkUrl: 'https://map.naver.com/v5/search/언더스탠드에비뉴', imageUrl: '/hotplaces/seongsu_understand_avenue.jpg' },
    { category: '거리', name: '성수 수제화거리', linkUrl: 'https://map.naver.com/v5/search/성수수제화거리', imageUrl: '/hotplaces/seongsu_handmade_shoes.jpg' },
    { category: '차(Tea) 전문', name: '리브레 티하우스 성수', linkUrl: 'https://map.naver.com/v5/search/리브레 티하우스 성수', imageUrl: '/hotplaces/seongsu_libre_teahouse.jpg' },
    { category: '이탈리안', name: '스케줄 성수', linkUrl: 'https://map.naver.com/v5/search/스케줄 성수', imageUrl: '/hotplaces/seongsu_schedule.jpg' },
    { category: '오므라이스·파스타', name: '성수다락', linkUrl: 'https://map.naver.com/v5/search/성수다락', imageUrl: '/hotplaces/seongsu_darak.jpg' },
    { category: '생면 파스타', name: '이탈리국시 성수', linkUrl: 'https://map.naver.com/v5/search/이탈리국시 성수', imageUrl: '/hotplaces/seongsu_italy_guksi.jpg' },
    { category: '감자탕 노포', name: '소문난성수감자탕', linkUrl: 'https://map.naver.com/v5/search/소문난성수감자탕', imageUrl: '/hotplaces/seongsu_gamjatang.jpg' },
    { category: '돈까스', name: '홍익돈까스 성수', linkUrl: 'https://map.naver.com/v5/search/홍익돈까스 성수', imageUrl: '/hotplaces/seongsu_hongik_donkatsu.jpg' },
    { category: '멕시칸 타코', name: '타코튜즈데이 성수', linkUrl: 'https://map.naver.com/v5/search/타코튜즈데이 성수', imageUrl: '/hotplaces/seongsu_taco_tuesday.jpg' },
    { category: '대만식 바오', name: '바오서울', linkUrl: 'https://map.naver.com/v5/search/바오서울', imageUrl: '/hotplaces/seongsu_bao_seoul.jpg' },
    { category: '수제버거', name: 'BD버거', linkUrl: 'https://map.naver.com/v5/search/BD버거 성수', imageUrl: '/hotplaces/seongsu_bd_burger.jpg' },
    { category: '샌드위치 브런치', name: '산도스 성수', linkUrl: 'https://map.naver.com/v5/search/산도스 성수', imageUrl: '/hotplaces/seongsu_sandos.jpg' },
    { category: '브런치·양식', name: '브리비트', linkUrl: 'https://map.naver.com/v5/search/브리비트 성수', imageUrl: '/hotplaces/seongsu_brivit.jpg' },
  ],
  홍대: [
    { category: '버스킹·쇼핑', name: '홍대거리', linkUrl: 'https://map.naver.com/v5/search/홍대거리', imageUrl: '/hotplaces/hongdae_street.jpg' },
    { category: '야간 산책·공연', name: '레드로드', linkUrl: 'https://map.naver.com/v5/search/레드로드', imageUrl: '/hotplaces/hongdae_red_road.jpg' },
    { category: '산책 코스', name: '연남동 경의선숲길', linkUrl: 'https://map.naver.com/v5/search/경의선숲길 연남', imageUrl: '/hotplaces/hongdae_gyeongui.jpg' },
    { category: '전시·공연·디자인샵', name: 'KT&G 상상마당', linkUrl: 'https://map.naver.com/v5/search/KT&G 상상마당 홍대', imageUrl: '/hotplaces/hongdae_sangsang_madang.jpg' },
    { category: '대형 테마 카페', name: '코코넛박스', linkUrl: 'https://map.naver.com/v5/search/코코넛박스', imageUrl: '/hotplaces/hongdae_coconut_box.jpg' },
    { category: '해리포터 컨셉 카페', name: '943 킹스크로스', linkUrl: 'https://map.naver.com/v5/search/943 킹스크로스', imageUrl: '/hotplaces/hongdae_943.jpg' },
    { category: '양 카페', name: 'Thanks Nature Cafe', linkUrl: 'https://map.naver.com/v5/search/Thanks Nature Cafe', imageUrl: '/hotplaces/hongdae_thanks_nature.jpg' },
    { category: '쇼핑·카페', name: 'AK PLAZA 홍대', linkUrl: 'https://map.naver.com/v5/search/AK플라자 홍대', imageUrl: '/hotplaces/hongdae_ak_plaza.jpg' },
    { category: '패션 쇼핑', name: '무신사 스토어 홍대', linkUrl: 'https://map.naver.com/v5/search/무신사 홍대', imageUrl: '/hotplaces/hongdae_musinsa.jpg' },
    { category: '밤 데이트 명소', name: '걷고싶은거리', linkUrl: 'https://map.naver.com/v5/search/홍대 걷고싶은거리', imageUrl: '/hotplaces/hongdae_walking.jpg' },
    { category: '숙성 삼겹살·목살', name: '육몽 홍대본점', linkUrl: 'https://map.naver.com/v5/search/육몽 홍대본점', imageUrl: '/hotplaces/hongdae_yukmong.jpg' },
    { category: '룸식 한식, 데이트 인기', name: '우물집 홍대점', linkUrl: 'https://map.naver.com/v5/search/우물집 홍대점', imageUrl: '/hotplaces/hongdae_umuljib.jpg' },
    { category: '쭈꾸미·볶음밥', name: '홍스쭈꾸미', linkUrl: 'https://map.naver.com/v5/search/홍스쭈꾸미', imageUrl: '/hotplaces/hongdae_hongs_jjukumi.jpg' },
    { category: '미쉐린 돼지곰탕', name: '옥동식', linkUrl: 'https://map.naver.com/v5/search/옥동식', imageUrl: '/hotplaces/hongdae_okdongsik.jpg' },
    { category: '철판 오코노미야키', name: '우와 홍대본점', linkUrl: 'https://map.naver.com/v5/search/우와 홍대본점', imageUrl: '/hotplaces/hongdae_uwa.jpg' },
    { category: '솥밥 전문', name: '솔솥 연남점', linkUrl: 'https://map.naver.com/v5/search/솔솥 연남점', imageUrl: '/hotplaces/hongdae_solsot.jpg' },
    { category: '미국식 피자', name: '레이몬드 홍대', linkUrl: 'https://map.naver.com/v5/search/레이몬드 홍대', imageUrl: '/hotplaces/hongdae_raymond.jpg' },
    { category: '가성비 한식', name: '밥장인 홍대', linkUrl: 'https://map.naver.com/v5/search/밥장인 홍대', imageUrl: '/hotplaces/hongdae_babjangin.jpg' },
    { category: '한우·와규 구이', name: '도마 홍대본점', linkUrl: 'https://map.naver.com/v5/search/도마 홍대본점', imageUrl: '/hotplaces/hongdae_doma.jpg' },
    { category: '규동·파스타', name: '연남토마', linkUrl: 'https://map.naver.com/v5/search/연남토마', imageUrl: '/hotplaces/hongdae_yeonnam_toma.jpg' },
  ],
  여의도: [
    { category: '쇼핑·문화 복합몰', name: '더현대 서울', linkUrl: 'https://map.naver.com/v5/search/더현대서울', imageUrl: '/hotplaces/yeouido_the_hyundai.jpg' },
    { category: '쇼핑·맛집·영화관', name: 'IFC몰', linkUrl: 'https://map.naver.com/v5/search/IFC몰', imageUrl: '/hotplaces/yeouido_ifc_mall.jpg' },
    { category: '피크닉·치맥', name: '여의도한강공원', linkUrl: 'https://map.naver.com/v5/search/여의도한강공원', imageUrl: '/hotplaces/yeouido_hangang_park.jpg' },
    { category: '전망대·아쿠아리움', name: '63스퀘어', linkUrl: 'https://map.naver.com/v5/search/63스퀘어', imageUrl: '/hotplaces/yeouido_63_square.jpg' },
    { category: '요트·한강 야경', name: '서울마리나', linkUrl: 'https://map.naver.com/v5/search/서울마리나', imageUrl: '/hotplaces/yeouido_marina.jpg' },
    { category: '도심 속 자연 산책', name: '여의도 샛강생태공원', linkUrl: 'https://map.naver.com/v5/search/여의도샛강생태공원', imageUrl: '/hotplaces/yeouido_saetgang.jpg' },
    { category: '전시 공간', name: '세마벙커', linkUrl: 'https://map.naver.com/v5/search/세마벙커', imageUrl: '/hotplaces/yeouido_sema_bunker.jpg' },
    { category: '벚꽃·계절 산책', name: '윤중로', linkUrl: 'https://map.naver.com/v5/search/윤중로', imageUrl: '/hotplaces/yeouido_yunjungro.jpg' },
    { category: '한강 공연·야경', name: '물빛무대', linkUrl: 'https://map.naver.com/v5/search/물빛무대', imageUrl: '/hotplaces/yeouido_mulbit_stage.jpg' },
    { category: '중식 코스·딤섬', name: 'MUTAN 여의도', linkUrl: 'https://map.naver.com/v5/search/MUTAN 여의도', imageUrl: '/hotplaces/yeouido_mutan.jpg' },
    { category: '숙성 삼겹살', name: '하남돼지집 여의도', linkUrl: 'https://map.naver.com/v5/search/하남돼지집 여의도', imageUrl: '/hotplaces/yeouido_hanam_pig.jpg' },
    { category: '한우 오마카세', name: '우하나', linkUrl: 'https://map.naver.com/v5/search/우하나 여의도', imageUrl: '/hotplaces/yeouido_woohana.jpg' },
    { category: '한우구이·회식', name: '고우가 여의도', linkUrl: 'https://map.naver.com/v5/search/고우가 여의도', imageUrl: '/hotplaces/yeouido_gowuga.jpg' },
    { category: '유러피안 다이닝', name: '심퍼티쿠시 여의도', linkUrl: 'https://map.naver.com/v5/search/심퍼티쿠시 여의도', imageUrl: '/hotplaces/yeouido_symphatikuci.jpg' },
    { category: '전망 레스토랑', name: 'Walking on the Cloud', linkUrl: 'https://map.naver.com/v5/search/Walking on the Cloud', imageUrl: '/hotplaces/yeouido_walking_on_the_cloud.jpg' },
    { category: '콩국수·닭칼국수', name: '진주집', linkUrl: 'https://map.naver.com/v5/search/진주집 여의도', imageUrl: '/hotplaces/yeouido_jinjujip.jpg' },
    { category: '칼국수', name: '가양칼국수 버섯매운탕', linkUrl: 'https://map.naver.com/v5/search/가양칼국수버섯매운탕 여의도', imageUrl: '/hotplaces/yeouido_gayang_kalguksu.jpg' },
    { category: '닭한마리·닭곰탕', name: '여의도 닭한마리', linkUrl: 'https://map.naver.com/v5/search/여의도 닭한마리', imageUrl: '/hotplaces/yeouido_dakhanmari.jpg' },
  ],
};
export function getHotPlacesForRegion(
  regionName?: string | null,
  location?: string | null
): HotPlace[] {
  // [수정] regionName(addressKeyword FK)이 최근에 생긴 필드라, 기존 팝업들은 대부분
  // 아직 이 값이 비어있고 location(자유 텍스트)만 채워져 있어요. regionName이 없으면
  // location 문자열 안에 지역 이름이 포함되어 있는지로 한 번 더 시도합니다.
  if (regionName && hotPlacesByRegion[regionName]) {
    return hotPlacesByRegion[regionName];
  }
  if (location) {
    const matched = Object.keys(hotPlacesByRegion).find((key) => location.includes(key));
    if (matched) return hotPlacesByRegion[matched];
  }
  return [];
}

// 홈 화면 "내 주변 핫플" 섹션용 - 각 지역의 대표 좌표(지하철역 기준 근사치)
export const regionCenters: Record<string, { lat: number; lng: number }> = {
  성수: { lat: 37.5445, lng: 127.0557 },
  홍대: { lat: 37.5563, lng: 126.9236 },
  여의도: { lat: 37.5219, lng: 126.9245 },
  용산: { lat: 37.5311, lng: 126.981 },
  강남: { lat: 37.4979, lng: 127.0276 },
  잠실: { lat: 37.5133, lng: 127.1001 },
};

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function findNearestRegion(coords: { lat: number; lng: number }): string {
  let nearest = Object.keys(regionCenters)[0];
  let minDist = Infinity;
  for (const [region, center] of Object.entries(regionCenters)) {
    const dist = haversineDistance(coords, center);
    if (dist < minDist) {
      minDist = dist;
      nearest = region;
    }
  }
  return nearest;
}
