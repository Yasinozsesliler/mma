// Yeni görünüm: yan ekranların başlık bandında kullanılan çizilmiş sahneler (scripts/*-art.html ile üretildi).
// Burada oyun durumu yok; yalnızca görsel kaynakları ve piksel boyutları (CoverImage yerleşimi için). Ekranlar <Title art="..."> ile seçer.
export const SCENE_ART = {
  salon: { src: require('../../assets/art/camp_salon.jpg'), w: 900, h: 300 },
  arena: { src: require('../../assets/art/lights_t2.jpg'), w: 936, h: 468 },
  dev: { src: require('../../assets/art/lights_t3.jpg'), w: 936, h: 468 },
  tribun: { src: require('../../assets/art/crowd_t2.jpg'), w: 936, h: 468 },
  altin: { src: require('../../assets/art/arena_gold.jpg'), w: 1170, h: 1560 },
  basin: { src: require('../../assets/art/press.jpg'), w: 1200, h: 720 },
  sehir: { src: require('../../assets/art/scene_sehir.jpg'), w: 900, h: 375 },
  studyo: { src: require('../../assets/art/scene_studyo.jpg'), w: 900, h: 375 },
  elit: { src: require('../../assets/art/camp_elit.jpg'), w: 900, h: 300 },
  tayland: { src: require('../../assets/art/camp_tayland.jpg'), w: 900, h: 300 },
  dag: { src: require('../../assets/art/camp_dagistan.jpg'), w: 900, h: 300 },
  ev: { src: require('../../assets/art/camp_ev.jpg'), w: 900, h: 300 },
} as const;

export type SceneKey = keyof typeof SCENE_ART;
