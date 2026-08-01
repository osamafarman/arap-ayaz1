# Arapça Yazı Atölyesi — Adım Adım Kurs

Türkçe konuşan **yeni başlayan** (ve küçük yaştaki) öğrenciler için Arapça harf yazma
kursu. Öğrenci hiçbir zaman "şimdi ne öğrensem?" diye seçim yapmaz: uygulama onu sırayla
götürür — **öğret → çalıştır → sına**.

Harici kütüphane yok, derleme adımı yok, internet gerekmez.

## Çalıştırma

`index.html` dosyasına çift tıkla. Hepsi bu.

Yerel sunucu tercih edersen (çevrimdışı kurulum ve servis çalışanı için gerekir):

```bash
python -m http.server 5173
```

Sonra `http://127.0.0.1:5173/index.html` adresini aç.

**Testler:** `test.html` sayfasını aç — müfredat, iskelet çıkarımı, yazım denetimi ve
depolama için **1500'den fazla otomatik kontrol** çalışır ve sonucu tek ekranda gösterir.
Bir şeyi değiştirdikten sonra buraya bakmak, bir yeri kırıp kırmadığını anında söyler.

**Tablete kurmak:** sunucu üzerinden açıp tarayıcının "Ana ekrana ekle / Uygulamayı
kur" seçeneğini kullan. Çevrimdışı çalışır (servis çalışanı yalnızca `http(s)`
üzerinde devreye girer; `file://` ile açarsan uygulama yine çalışır, sadece
çevrimdışı önbelleği olmaz).

**Yazı tipi (önerilir):** `fonts/` klasörüne bir nesih yazı tipi koyarsan tüm
cihazlarda aynı harf şekilleri kullanılır — bkz. [`fonts/README-FONT.md`](fonts/README-FONT.md).
Koymazsan sistemdeki Arapça yazı tipine düşer.

## Öğretim modeli

```
Aşama  →  Ünite  →  Adım
```

* **Adım** = ekrandaki tek iş, tek büyük düğme. (**734 adım**)
* **Ünite** = 4–8 adımlık küçük ders, 2–3 dakika. (**164 ünite**)
* **Aşama** = harf ailesi + sınavı. (**7 aşama — alfabenin tamamı, 28 harf**)

**Hiçbir şey kilitli değildir** — bütün aşamalar ve dersler baştan açıktır.
Uygulama yine de sıradaki dersi **BURADASIN** rozetiyle önerir; öğrenci isterse
ileri atlayabilir, isterse önerilen sırayı izler.

### Bir harf ünitesinin akışı (örnek: Be)

| # | Faz | Adım |
|---|-----|------|
| 1 | ÖĞREN | Harfi tanıt: ses, nokta, bağlanma davranışı, **nasıl yazılır** + 🔊 |
| 2 | **İZLE** | Harf, doğru uçtan başlayıp doğru yönde **canlı olarak yazılır** |
| 3 | **TAKİP** | Öğrenci yardımlar açıkken üstünden geçer |
| 4 | **YAZ** | Yardımsız yazar — **%80 altında kabul edilmez** |
| 5-6 | KONTROL | İki çoktan seçmeli: harfi tanı + formun yeri |

Ardından ikinci bir ünite gelir: **Bağlantı Hâlleri** — başta/ortada/sonda
biçimlerinin her biri için ayrı ayrı İZLE + YAZ.

Elif gibi bağlanmayan harflerde tekrar eden formlar otomatik atlanır, bunun yerine
"kendinden sonrakine bağlanır mı?" sorusu sorulur.

## Harf Şekilleri (başvuru bölümü)

Yol haritasının en üstündeki **📖 Harf Şekilleri** kartı, derslerden bağımsız bir
başvuru bölümü açar:

* **28 harfin tamamı** — her biri için yalın / başta / ortada / sonda biçimleri
  (tekrar eden biçimler tek sekmede birleştirilir; ör. Elif'te "Yalın / Başta").
* Seçilen biçim **canlı olarak yazılır**: kalem doğru uçtan başlar, doğru yönde
  ilerler, noktalar (ve ك'deki iç işaret gibi ek parçalar) en sona bırakılır.
* **Hız denetimi**: 0.5× · 0.75× · Normal · 1.5× · 2×. Seçim kaydedilir ve
  derslerdeki İZLE adımlarında da geçerlidir.
* Her harfte yazım yönünün kaynağı belirtilir: kitapçığın ilgili sayfası ya da
  "aynı iskeleti paylaşan aile" notu.

## Öğrenci profilleri, tekrar ve ödüller

* **Profiller** — aynı cihazı birden çok öğrenci kullanabilir; her birinin ilerlemesi,
  yıldızı ve raporu ayrıdır. Üstteki isim şeridinden geçiş yapılır.
* **Bugünün tekrarı (aralıklı tekrar)** — her yazma adımı, yapıldığı tarih ve puanla
  saklanır. Aralıklar **1 → 3 → 7 → 16 → 35 gün** diye açılır; %85’in altında bir
  puan aralığı başa döndürür. Tekrar zamanı gelenler haritanın üstünde tek bir
  kartta toplanır ve normal ders akışıyla çalışılır.
* **Yıldız ve seri** — tamamlanan her ünite ortalama puanına göre 1–3 yıldız alır;
  üst üste çalışılan günler 🔥 serisi olarak sayılır.
* **📊 Rapor** — öğretmen/veli için: beceri ortalamaları (şekil, başlangıç, yön,
  nokta, büyüklük, satıra oturma), **en sık yapılan hatalar** ve en çok zorlanılan
  alıştırmalar. Yazdırılabilir.

## Ekran düzeni (telefon ve tablet)

Yazma ekranı tek ekrana sığacak şekilde düzenlendi — düğmeye basmak ya da puanı
görmek için sayfayı aşağı yukarı kaydırmak gerekmiyor:

* **Yan araç çubuğu** — göster / geri al / temizle / büyüt düğmeleri yazı alanının
  **yanında** durur; izleme adımında hız düğmeleri de oradadır.
* **⛶ Büyüt** — yazı alanını neredeyse tüm ekrana yayar (telefonda 422 px → 780 px).
  Parmakla yazan çocuk için asıl fark budur.
* **Yapışkan ana düğme** — "Kontrol Et" sayfanın altına yapışır, hep elin altındadır.
* **Küçülen başlık** — üst çubuk 54 px’e indi ve aşağı kaydırırken gizlenir,
  yukarı kaydırınca geri gelir.
* Telefonda yazı alanı ekranın **%52**’sini kaplar (önceden sabit 240 px idi).

Arap alfabesi listelerinde harfler **sağdan sola** dizilir (ا sağ üstte başlar) —
hem Harf Şekilleri ekranında hem çalışma kâğıdı seçiminde hem yönetici panelinde.

## Çalışma kâğıdı (kâğıt üstünde tekrar)

Haritadaki **🖨 Çalışma Kâğıdı** kartı, seçtiğin harfler için kılavuz çizgili bir
sayfa üretir: her satırda önce **solmuş örnekler**, sonra boş kutular. Satır sayısı
ayarlanır, doğrudan yazıcıya gönderilir (yazdırma stili hazırdır: arayüz gizlenir).

## Arayüz dili

Başlıktaki **ع / TR** düğmesi arayüzü Arapçaya çevirir ve sayfayı sağdan sola alır.
**Kapsam dürüstçe:** çevrilen şey arayüzdür (düğmeler, ekran başlıkları, faz adları).
**Ders içeriği Türkçe kalır** — harf adları (Elif, Be…), kelimelerin Türkçe karşılıkları
ve yazım ipuçları öğretimin kendisidir ve öğrenci Türkçe konuşmaktadır. Arapça
seçeneği, uygulamayı yöneten Arapça konuşan öğretmen içindir.

## Yönetici (öğretmen) modu

Başlıktaki **🔧** düğmesi (ya da adres sonuna `#admin` eklemek) yönetici modunu açar.
Varsayılan PIN uygulamayla birlikte gelir; **Yedek** sekmesinden istediğin zaman
değiştirebilir ya da varsayılana döndürebilirsin.

| Sekme | Ne yapar |
|---|---|
| **Kelimeler** | Her satırda **✏️ Düzenle · ✒️ Yolu çiz · 🗑 Sil**; yeni kelime ekle |
| **Harfler** | Her harf kutusunda **✏️** düğmesi — ad, ses, "nasıl yazılır", not |
| **Çizim Yolu** | **Harfin/kelimenin yazım yolunu kendin çiz** |
| **Ses Kaydı** | **Kendi sesinle telaffuz kaydet** (28 harf + 94 kelime) |
| **Yedek** | JSON’u **dosyaya kaydet / dosyadan yükle**, kopyala-yapıştır, hepsini sıfırla |

### Ses kaydı

Cihazda Arapça ses paketi olmayabilir (test makinesinde yoktu). Kendi sesini
kaydedersen 🔊 düğmesi **senin sesini** çalar; kayıt yoksa cihazın Arapça sesine
düşer. Kayıtlar IndexedDB’de tutulur — boyutları yüzünden **JSON yedeğine dâhil
değildir**, ayrı saklanır.

### Çizim yolu düzenleyici

123 hedef seçilebilir (28 harfin tekrar etmeyen tüm biçimleri + müfredattaki kelimeler).
Seçince, o an kullanılan yol düzenlemeye açılır (kayıtlı yol yoksa yazı tipinden
hesaplanan otomatik yol gelir).

**Hamleler (birden çok başlangıç).** Bir kelimede harfler ayrı yazılır — ör. `باب`
= `با` + `ب`. Bu yüzden yol tek parça değil, **hamle listesidir**; her hamlenin
kendi başlangıcı vardır ve numarası düğümün üstünde görünür (1, 2, 3 …).
Otomatik yol da bitişik parçalara göre kendiliğinden hamlelere ayrılır.
`＋ Yeni hamle` ile istediğin kadar yeni başlangıç ekleyebilirsin; her hamle ayrı
renkte çizilir, tek tek silinebilir ve `⇄` ile yönü ters çevrilebilir.

| Araç | İş |
|---|---|
| **✥ Taşı** | düğümleri ve noktaları sürükle |
| **＋ Nokta ekle** | aktif hamlenin sonuna nokta ekle |
| **⇱ Araya ekle** | iki düğümün arasına yeni düğüm sok |
| **🗑 Nokta sil** | düğüm kaldır |
| **🟠 Harf noktası** | tıkla = varsayılan boy · **sol üstten sağ alta sürükle = alanı sen belirle** · üstüne tıkla = sil |
| **✋ Kaydır** | tuvali kaydır (büyütülmüşken) |
| **↶ Geri al / ↷ Yinele** | 60 adımlık geçmiş |
| **➕ ➖ ⤢** | %50–%600 arası büyüt/küçült — noktaları hassas koymak için |
| **Mürekkebe yapış** | konulan düğümü harfin en yakın mürekkep pikseline çeker |
| **▶ Önizle** | animasyonu kaydetmeden dene |

**Boyut denetimleri** (üç kaydırıcı):

| Kaydırıcı | Neyi değiştirir | Nerede saklanır |
|---|---|---|
| **Boyanan alan** | Animasyonda harfi açan bandın genişliği. **Varsayılan %8.** `varsayılan` kutusunun işaretini kaldırıp %8–%90 arası istediğin değeri verebilirsin. | O harfin/kelimenin kaydında (`brush`) |
| **Başlangıç halkası** | **Öğrenciye görünen** yeşil başlangıç halkasının ve turuncu nokta halkalarının boyu (%40–%220) | Genel ayar (tüm harfler) |
| **Hareket eden kalem ucu** | Yazarken yol boyunca ilerleyen yeşil topun boyu (%20–%200) | Genel ayar (tüm harfler) |
| **Tutamak boyu** | Düzenleyicideki düğüm tutamaklarının boyu (%50–%200) | Genel ayar (yalnızca yönetici görünümü) |

Boyanan alan, tuvalde **mavi saydam bir bant** olarak canlı gösterilir; kaydırıcıyı
oynattıkça daralıp genişler, böylece "çok geniş boyuyor" durumunu görerek ayarlarsın.

### ⬇ Video indir (yalnızca yönetici sayfasında)

Seçili harfin/kelimenin yazım animasyonunu **.webm video** olarak indirir —
öğrenciye WhatsApp'tan göndermek, sunuma koymak ya da tahtada oynatmak için.

* Dosya adı: `harf-ح-isolated.webm`, `kelime-باب.webm` gibi.
* 800×450, 30 kare/sn, ~3,2 sn + 1 sn bekleme; o an ekrandaki ayarlar
  (boyanan alan, kalem ucu, çok hamleli yol) videoya aynen yansır.
* Kayıt sırasında bir **önizleme penceresi** açılır. Bu şart: tarayıcılar
  görünmeyen tuvalden kare yakalamadığı için gizli kayıt boş dosya üretiyordu.
  Bu yüzden kayıt bitince dosya boyutu denetlenir; kare yakalanamamışsa bozuk
  dosya indirmek yerine "sekmeyi ön planda tutup tekrar dene" uyarısı verilir.
* Biçim WebM'dir (Chrome, Edge, Firefox oynatır). MP4 gerekiyorsa dönüştürmen gerekir.

Harf noktaları ayrı bir listede de görünür; her birinin yanındaki **✕** ile tek tek
silinir, çapı (`ø`) listede yazar.

Yeşil düğüm **başlangıç**, mor düğüm **bitiş**, oklar yazım yönüdür — yani kalemin
nereden başlayıp sona nasıl gideceğini tamamen sen belirlersin.

### 💾 Çizimlerin kalıcılığı (önemli)

Elle çizdiğin yollar **iki yerde** durabilir:

1. **Tarayıcıda** (`localStorage`) — kaydeder kaydetmez geçerli olur, ama tarayıcı
   verisi silinirse kaybolur.
2. **Uygulamanın içinde** (`js/custom-paths.js`) — `💾 Uygulamaya kaydet` düğmesi
   bu dosyanın yeni içeriğini üretip indirir; indirileni `js/` klasöründeki dosyayla
   değiştirdiğinde çizimlerin **projenin bir parçası** olur.

Çözümleme sırası: *tarayıcıdaki taze düzenleme → uygulamadaki dosya → otomatik yol.*

**Kural:** `js/custom-paths.js` içeriği **senin açık onayın olmadan değiştirilmez
veya silinmez.** Müfredat/veri güncellemeleri bu yolları etkilemez; anahtarlar
harfin/kelimenin kendisidir (`"ب"`, `"باب"`), dolayısıyla ders eklenip çıkarılması
kaydını bozmaz. Çizimi silebilecek her işlem (otomatik yola dönme, kaydı silme,
yedek içe aktarma, "tümünü sil") artık **önce onay sorar** ve kaç çizimin
etkileneceğini söyler.

Doğrulandı: tarayıcı verisinin tamamı silindikten sonra bile `js/custom-paths.js`
içindeki yol birebir aynı koordinatlarla yüklendi; düzenlenmemiş harfler otomatik
yolla çalışmaya devam etti.

Kaydedilen yol **hem animasyonda hem öğrenci denetiminde** kullanılır. Doğrulandı:
ت için yol ters yönde kaydedildiğinde, harfi eski (özgün) yönde yazan öğrenci
%58 alıp reddedildi; yöneticinin tanımladığı yönde yazınca %100 aldı.

Çok hamleli yollarda animasyon da hamleler arasında **kalemi kaldırır** (aradaki
boşluğa iz bırakmaz) ve öğrenci denetimi her hamlenin başlangıcını ayrı bilir:
`باب` için 2. hamleden (soldaki harften) başlayan öğrenci %76 alıp reddedildi,
doğru sırada yazan %98 aldı.

Yollar tuval ölçüsünden bağımsız saklanır (u = sağ kenardan sola / harf genişliği,
v = satır çizgisinden aşağı / font boyu; noktalarda ayrıca yarıçap), bu yüzden
büyütme/kaydırma ya da ekran boyutu değişince bozulmaz.

> **Güvenlik notu:** PIN bir kolaylık kilididir, güvenlik değildir. Uygulama tamamen
> tarayıcıda çalıştığı için dosyalara erişebilen herkes bunu aşabilir; amaç yalnızca
> öğrencinin yanlışlıkla ayarları bozmasını önlemektir. Değişiklikler bu tarayıcının
> `localStorage`'ında durur — kalıcı olsun istiyorsan **Yedek** sekmesinden JSON'u
> dışa aktar.

## Yazım denetimi — "nasıl yazdı?"

Kaynak: **"كراسة خط النسخ للمبتدئين"** — منصة الخطاط, الخطاط مختار عالم
(kitapçıkta her harf, yönü oklarla ve aşamaları numaralarla gösterilen tek sürekli
kalem hareketiyle yazılır; noktalar en sona bırakılır).

Uygulama "şekil benziyor mu?" diye bakmaz; **yazım disiplinini** ölçer:

| Ölçüt | Ne denetler |
|---|---|
| **Başlangıç** | Kalemi doğru uçtan mı indirdi? (yeşil halka) |
| **Yön / Sıra** | Hareketi doğru yönde, baştan sona mı sürdürdü? |
| **Şekil** | Harfin gövdesini ne kadar doğru kapladı? |
| **Noktalar** | Kaç tane, doğru yerde mi? (turuncu halkalar) |
| **Büyüklük** | Harf, olması gereken boyutta mı? (kılavuz çizgileri dolduruyor mu) |
| **Satıra oturma** | Harf satır çizgisine oturuyor mu, yoksa kaymış mı? |

### Satır hizası düzeltmesi

Yazı tiplerinin "alphabetic" taban çizgisi, Arapça harflerin gerçekte **oturduğu**
satır değildir. Ölçüldüğünde ا د ذ ط ظ ك ف ه ت ث ب gibi düz tabanlı harfler kırmızı
satırın **~0,06 em üstünde havada** kalıyordu (160 px boyutta ~9 px). Artık uygulama
açılışta bu farkı yazı tipinden ölçüp metni o kadar aşağı kaydırıyor; ölçüm yazı
tipine göre yapıldığı için `fonts/` klasörüne başka bir yazı tipi koysan da doğru
çalışır. Otomatik test bunu sürekli denetler: **11 düz tabanlı harfte ortalama sapma
0,004 em.**

### Noktalar

Parmakla tek dokunuşta konulan nokta, çizgi hiç hareket etmediği için "uzunluk 0"
oluyordu ve nokta sayılmıyordu; gövdeye karışıp hem "nokta eksik" hem de "yanlış
yerden başladın" hatası veriyordu. Artık tek dokunuşlar da nokta olarak tanınıyor ve
nokta boyutu eşiği daha geniş.

Son iki ölçüt kitapçığın ölçü anlayışından gelir (harfler nokta ölçüsüyle tanımlanır)
ve yeni başlayanın en sık iki hatasını yakalar: harfi çok küçük yazmak ve satırdan
kaydırmak. Ölçüm, harfin dış hattına değil **takip edilen yola** göre yapılır.

Geçmek için **%80** *ve* şu üç şart: doğru başlangıç, doğru yön, eksiksiz ve yerinde
noktalar. Yani harfi **ters yönden** kusursuz çizen öğrenci **geçemez** — şekil %100
olsa bile puan ~%50'de kalır ve "TERS UÇTAN başladın" uyarısı verilir. Aynı şekilde
gövdesi mükemmel ama **noktasız** bir ب, %84 alsa da kabul edilmez.

Aynı denetim **kelimelerde de** çalışır (باب, ثبت, حجاب …). Kelime birden çok
bitişik parçadan oluşabildiği için (ör. با + ب) parçalar sağdan sola sıralanır ve
kalemin **en sağdaki harften** başlaması beklenir. Başlangıç iki ölçütle birlikte
denetlenir: doğru noktaya uzaklık **ve** yol üzerindeki konum — böylece harfin
ortasından başlayan öğrenci de yakalanır. Hata mesajı duruma göre değişir:

| Öğrenci ne yaptı | Sonuç |
|---|---|
| Doğru sırada yazdı | %100 — geçti |
| **Soldaki (son) harften** başladı | %79 — "Arapça sağdan sola yazılır" |
| Harfin **ortasından** başladı | %87 ama **reddedildi** — "ORTADAN başlamışsın" |

Kontrolden sonra tuvalde **kırmızı halka** öğrencinin gerçekte başladığı yeri,
**yeşil halka** başlaması gereken yeri gösterir; ikisi arasına kesik çizgi çekilir.
Bitirdiği yer de ayrıca işaretlenir.

İki başarısız denemeden sonra harfin soluk hâli (hayalet) otomatik açılır, üçüncüden
sonra animasyon yeniden oynatılır — öğrenci takılıp kalmaz.

### Harfin orta ekseni nereden geliyor?

Yazılış yolu elle koordinat girilerek tanımlanmadı (yazı tipi değişince bozulurdu).
`skeleton.js` ekrandaki **gerçek harften** hesaplar:

```
maske → bileşenlere ayır (gövde + noktalar) → inceltme (Zhang–Suen)
      → çıkıntıları buda → uçtan uca yürü (BFS) → sadeleştir (RDP)
```

Böylece yol harfin tam ortasından geçer, **noktaların yeri piksel piksel ölçülür**
(bazı yazı tiplerinde ت/ث noktaları birleşik çizildiği için beklenen sayıya göre
k-ortalama ile ayrılır). `letterforms.js` yalnızca kitapçıktan gelen pedagojik
bilgiyi taşır: hangi uçtan başlanır, hangi aşamalar, kaç nokta nereye.

Animasyon da bu yolu kullanır: harfin gerçek yazı tipi görüntüsü, yol boyunca
maskelenerek **açılır** — yani öğrenci gerçek harf biçimini doğru sırayla
yazılırken izler.

### Kelime ünitesinin akışı

ÖĞREN (kelime + anlamı + denklemi + 🔊) → **KUR** (sürükle-bırak) → **YAZ** (tuval).

### Aşama sınavı

* Tanıma + anlam + form yeri soruları, ardından **ezberden yazma**.
* Yazma sorularında **hayalet kapalıdır**; öğrenci sadece Türkçe karşılığı görür.
* Her soruda **2 hak**, ipucu yok, "şimdilik geç" yok.
* Geçme notu **%70**. Geçilemezse sınav sıfırlanır ve baştan alınır.
* Sınav bir ölçme aracıdır; hiçbir dersi kilitlemez (kilit yoktur).

## Müfredat — 28 harfin tamamı

Aşamalar kitapçığın **şekil ailelerini** izler; her aşamanın kelimeleri yalnızca
**o ana kadar öğretilmiş harflerden** kurulur (kümülatif iskele).

| Aşama | Harfler | Ailenin özelliği |
|---|---|---|
| 1 | ا ب ت ث | Çanak ailesi — aynı gövde, farklı nokta |
| 2 | ج ح خ | Kayık ailesi — kuyruk satırın altına iner |
| 3 | د ذ ر ز | Bağlanmayan kısa harfler |
| 4 | س ش ص ض | Dişli ve gözlü harfler |
| 5 | ط ظ ع غ | Boğaz harfleri, iki hamleli Tı |
| 6 | ف ق ك ل | Gözlü ve dik harfler |
| 7 | م ن ه و ي | Son beş harf; He’nin dört yüzü |

Toplam **94 kelime/hece alıştırması**. Türkçeye geçmiş **ortak kelimeler**
önceliklidir: تاج (Tac), تخت (Taht), بخت (Baht), بحث (Bahis), درس (Ders),
كتاب (Kitap), قلم (Kalem), عقل (Akıl), صبر (Sabır), خبر (Haber), نور (Nur),
سلام (Selam)…

Denklemler (bağlı biçimler) **elle yazılmaz**, `buildEquation()` ile bağlanma
kuralından üretilir — böylece "بـ ـا ب" gibi dizilişlerde insan hatası olmaz.
`test.html` her kelimede denklemin kelimeye eşit olduğunu ve **öğretilmemiş harf
kullanılmadığını** ayrıca doğrular.

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `index.html` | Uygulama kabuğu, modül yükleme sırası |
| `css/style.css` | Tüm görsel katman (duyarlı tasarım dahil) |
| `test.html` | **Otomatik testler** — 1500+ kontrol, tek tıkla |
| `js/data.js` | 28 harflik alfabe + 7 aşamalık **müfredat** + `buildEquation()` |
| `js/letterforms.js` | Kitapçıktan gelen **yazım kuralları**: başlangıç ucu, aşamalar, noktalar |
| `js/admin.js` | **Yönetici modu**: içerik + çizim yolu + ses kaydı + yedek + video |
| `js/audio.js` | Öğretmenin ses kayıtları (IndexedDB) |
| `js/i18n.js` | Arayüz dili (Türkçe / Arapça) |
| `sw.js` · `manifest.webmanifest` | Çevrimdışı çalışma ve tablete kurulum |
| `js/skeleton.js` | Harfin orta eksenini ve nokta yerlerini yazı tipinden çıkarır |
| `js/strokecheck.js` | **Yazım denetimi**: başlangıç · yön · şekil · noktalar (%80) |
| `js/course.js` | Veriyi doğrusal ünite/adım dizisine çevirir, soruları üretir |
| `js/storage.js` | İlerleme ve sınav notları (kilit yok) |
| `js/app.js` | İki ekran: yol haritası + adım oynatıcı |
| `js/tracing.js` | Yazma tuvali: kılavuz çizgiler, hayalet, **kalem gösterisi (animasyon)** |
| `js/assembly.js` | Sürükle-bırak kelime kurma |
| `js/speech.js` | Web Speech API (`ar-SA`) telaffuz |
| `js/confetti.js` | Ödül animasyonu |

Modüller ES module değil, klasik `<script>` olarak yüklenir ve `window.AH` ad alanını
paylaşır — böylece `file://` üzerinden çift tıklayarak açılabilir.

## Öne çıkan teknik ayrıntılar

**İki ayrı denetim vardır.**

*Harflerde* (yukarıdaki "Yazım denetimi" bölümü) başlangıç, yön, şekil ve noktalar
birlikte ölçülür; geçme %80. Bu bir harf **tanıma** (OCR) sistemi değildir — kalemin
izlediği yolu referans orta eksenle karşılaştırır. Öğrencinin çizgisini yola izdüşürüp
ilerleyişin tek yönlü olup olmadığına bakar; bu yüzden "şekli doğru ama yöntemi yanlış"
durumları yakalayabilir.

*Kelimelerde* de aynı denetim çalışır; tek fark, referans yolun bitişik parçalara
bölünmesi ve başlangıcın **en sağdaki harfe** göre belirlenmesidir.

Kelime alıştırmalarında iki başarısız denemeden sonra "şimdilik geç" çıkar (öğrenci
takılmasın); **sınavda çıkmaz**.

### Sınırlar (dürüstçe)

* Yazım yönü kitapçığın **şekil ailelerinden** gelir. Diyagramı doğrudan görülen
  aileler `booklet`, aynı iskeleti paylaşan kardeş harfler (ذ↔د, ز↔ر, ش↔س, ض↔ص,
  ظ↔ط, غ↔ع, ق↔ف, ي↔ن …) `family` olarak işaretlidir; arayüzde bu belirtilir.
* Orta eksen tek sürekli bir yoldur. Gerçekte iki kalem hareketiyle yazılan
  harflerde (ör. ك) gövde tek hamlede gösterilir, ayrı duran iç işaret ise en sona
  bırakılır — sıralama doğrudur, ama "iki ayrı hamle" olduğu ayrıca vurgulanmaz.
* Denetim kalemin izlediği yolu ölçer; kalem **kaç kez kaldırıldığını** puanlamaz.

**Sürükle-bırak her cihazda aynı kod yolu.** HTML5 Drag & Drop mobilde çalışmadığı için
Pointer Events üzerine kuruldu; ayrıca *parçaya dokun → yuvaya dokun* şeklinde klavyeyle
de çalışan ikinci bir yol var.

**Telaffuz cihaza bağlıdır.** Web Speech API işletim sistemindeki Arapça ses paketini
kullanır. Yoksa uygulama bunu gizlemez: uyarır ve dinleme sorularında harfin adını
ipucu olarak yazar (Windows: Ayarlar → Saat ve Dil → Dil → Arapça konuşma paketi).

## Müfredatı genişletme

Yeni aşama eklemek için `js/data.js` içindeki `STAGES` dizisine bir nesne ekle:

```js
{
  stageId: 3,
  title: '3. Aşama',
  lettersLabel: 'د · ذ · ر · ز',
  subtitle: '…', intro: '…',
  letters: [{ char:'د', name:'Dal', sound:'D sesi',
              write:'Nasıl yazılacağının tarifi…',
              forms:{ isolated:'د', initial:'د', medial:'ـد', final:'ـد' },
              note:'…', dots:'Noktasız' }],
  exercises: {
    twoLetters: [], threeLetters: [],
    cumulative: [{ id:'s3-k-bad', equation:['بـ','ـا','د'], result:'باد',
                   vowelled:'بَاد', tr:'…', kind:'kelime', tag:'Ortak Kelime', note:'…' }]
  }
}
```

`js/course.js` bundan üniteleri, adımları ve sınav sorularını **otomatik** üretir;
yüzdeler kendiliğinden işler. Tek şart: `id` alanları benzersiz olmalı
(ilerleme anahtarı olarak kullanılırlar).

Yeni harfin **yazılışının** öğretilmesi için `js/letterforms.js` içine de bir kayıt
gerekir — sadece kural, koordinat değil:

```js
'د': { family: DAL, dots: { count: 0, side: null } }
// DAL = { isolated: { startRule:'top', phases:[…], startTip:'…', dirTip:'…' }, … }
```

`startRule` kalemin hangi uçtan başlayacağını söyler (`top`, `right`, `left`,
`topleft`, `topright`, `bottom`). Harfin orta ekseni ve nokta konumları yazı
tipinden ölçüldüğü için başka veri girmeye gerek yoktur. Kaydı olmayan harflerde
İZLE/YAZ adımları üretilmez; harf yalnızca kelime alıştırmalarında görünür.

## İlerleme verisi

`localStorage` anahtarları:

| Anahtar | İçerik |
|---|---|
| `arapca-harfler-profiles-v1` | Öğrenci listesi ve seçili öğrenci |
| `arapca-harfler-course-v3::<profil>` | O öğrencinin ilerlemesi, tekrar planı, yıldız, seri, deneme kaydı |
| `arapca-harfler-prefs-v2` | Animasyon hızı |
| `arapca-harfler-lang-v1` | Arayüz dili |
| `arapca-harfler-admin-v1` | Yönetici değişiklikleri (**↺ Sıfırla bunu silmez**) |

Ses kayıtları ayrıca **IndexedDB**’de (`arapca-harfler-audio`) durur.
Eski `arapca-harfler-course-v2` verisi ilk açılışta otomatik taşınır.

```json
{ "v":2, "steps": { "<adımId>": 0-100 }, "exams": { "<aşamaId>": 0-100 }, "last": "<üniteId>" }
```

Üst çubuktaki **↺ Sıfırla** tümünü temizler.
