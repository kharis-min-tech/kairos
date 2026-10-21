/**
 * Every clip's script, in Twi. Mirrors en.mjs entry for entry.
 *
 * Twi has no voice of its own in Deepgram either, so it too is read by an
 * English voice. The captions are the real language; they come from here, not
 * from the audio. Previously these were captions over the
 * footage with no audio. Written to be spoken all the same, so nothing needs
 * rewriting if a voice appears.
 *
 * Vocabulary follows the app's catalogue: asɔre baa for branch, fekuo for
 * fellowship, adwumakuo for department, ɔsom for service, ɔkra for soul.
 */
const general = [
  ['Wo Nhwɛbea', 'Ɛpono no ano, na deɛ wo dibea ka ho nko ara.', 'Yei ne Kairos. Ɛbue wɔ wo nhwɛbea so, na biribiara a wohunu ha fa deɛ wodi ho dwuma ankasa ho.'],
  ['Nkyɛnmu no', 'Akuo nsia. Wohunu deɛ ɛfa wo ho nko ara.', 'Nkyɛnmu no kyekyɛ mu: Nnipa, Akuo, Nhyiam, Nsɛm Nhwɛmu ne Nhyehyɛeɛ. Afa a wonhunu no, wo dibea nhia no.'],
  ['Asɔrefoɔ', 'Obiara wɔ nhwɛmu baako mu.', 'Asɔrefoɔ ne nhwɛmu no. Obiara a ɔwɔ asɔre no mu wɔ ha, ne n’asɔre baa ne sɛ wawie asɔrefoɔ adesua no anaa.'],
  ['Fekuo', 'Akuo nketewa, a asase mfonini ka ho.', 'Fekuo ne akuo nketewa no. K-Groups, Kharis Express, New Breeds ne nkaeɛ, a mfonini wɔ hɔ ma wohunu deɛ ɛbɛn wo.'],
  ['Adwumakuo', 'Asomdwuma akuo ne wɔn nnwuma nhyehyɛeɛ.', 'Adwumakuo ne asomdwuma akuo no. Biara kora ne mufoɔ, ne nnwuma nhyehyɛeɛ ne wɔn a wɔpɛ sɛ wɔka ho so.'],
  ['Mmaeɛ', 'Ɔsom, nkyerɛwee ne nkrataa.', 'Mmaeɛ fa ɔsom ne nkyerɛwee ho. Obiara tumi de QR kod kyerɛw ne din, anaa ɛpono ano hɔ kyerɛw no.'],
  ['Akra Kwan', 'Firi nkitahodie a ɛdi kan kɔsi adwumakuo mu.', 'Akra kwan di obi a yɛduruu ne ho wɔ asɛmpaka mu akyi: foforɔ, yɛredi akyi, n’ani gye ho, wasakra, na asuafoyɛ.'],
  ['Amanneɛbɔ', 'Mmaeɛ, nkɔsoɔ ne nkitahodie.', 'Amanneɛbɔ dane ne nyinaa ma ɛyɛ akontaa. Mmaeɛ nkɔsoɔ, asɔrefoɔ dodoɔ ne nkitahodie, sɛdeɛ wo dibea teɛ.'],
  ['Wo Kasa', 'Kairos ne saa akwankyerɛ yi, kasa ɛnan mu.', 'Kairos ka Borɔfo, Frenkye, Krio ne Twi. Sesa no wɔ nkyɛnmu no so, na akwankyerɛ no nso bue wɔ kasa korɔ no ara mu.'],
];

const admin = [
  ['Wo nhwɛmu', 'Asɔre mmaa nyinaa prɛko.', 'Yei ne sohwɛfoɔ nhwɛmu. Asɔre Nkwa kan asɔre mmaa nyinaa prɛko, na Ɛhia Wo kyerɛ deɛ ɛretwɛn obi ɛnnɛ.'],
  ['Asɔre Mmaa', 'Yɛ wɔn, hyehyɛ wɔn, yi wɔn.', 'Asɔre mmaa yɛ wo nko ara dea. Sohwɛfoɔ nko ara na ɔyɛ bi, de kɔ ɔmantam foforɔ mu, anaa ɔyi bi firi adwuma mu.'],
  ['Asɔre baa bi mu', 'Ne ho nsɛm, ne hwan na ɔdi anim.', 'Bue asɔre baa bi na hyɛ ne nsɛm ne n’akannifoɔ. Sɔfopanin a wobɔ ne din wɔ ha na ɛma ɔhunu saa asɔre baa no ahobammɔ nhwɛmu.'],
  ['Amantam', 'Mmeaeɛ a wɔde w’asɔre mmaa hyehyɛ mu.', 'Amantam de asɔre mmaa hyehyɛ mmeaeɛ so. Yɛ ɔmantam no kane; wontumi nyɛ asɔre baa kɔsi sɛ ne ɔmantam wɔ hɔ.'],
  ['Ɔpene nhwɛmu', 'Obiara nnuru mu kɔsi sɛ obi bue.', 'Obiara a ɔkyerɛw ne din ankasa twɛn wɔ ha. Pene no so na ɔnya akwannya nyinaa; po no na wɔyi n’akawnt.'],
  ['Hwan na ɔkura deɛn', 'Tumi, na ɛnyɛ dibea din.', 'Bue ɔmanfoɔ bi na hwɛ ne tumi so. Kairos kora nhyehyɛeɛ dibea mmienu pɛ, enti biribiara foforɔ firi tumi mu.'],
  ['Asɔremufoɔ adesua', 'Asɔre no nyinaa dea; asɔre baa tumi nnuru so.', 'Asɔremufoɔ nhyehyɛeɛ yɛ asɔre no nyinaa dea. Akuo no gye nnipa firi asɔre mmaa nyinaa so, enti ɛhia asɔre no nyinaa tumi.'],
  ['Nkaeɛbɔ a ɛtra asɔre mmaa so', 'Nhwɛmu korɔ a ɛtoto asɔre mmaa.', 'Nkaeɛbɔ ne nhwɛmu a ɛtra asɔre mmaa so. Wo nko ara ne dibea a wohunu asɔre baa biara bɔ mu, na ɛnyɛ baako baako.'],
  ['Wo kasa', 'Kairos ne nwoma yi, wɔ kasa nnan mu.', 'Kairos ka Borɔfo, Frɛnkye, Krio ne Twi. Sesa no firi nkyekyɛmu no mu, na nwoma no bue wɔ kasa korɔ no ara mu.'],
];

export default {
  general,
  admin,
  member: [
    ['Wo Nhwɛbea', 'Deɛ ɛyɛ wo dea nko ara.', 'Yei ne wo nhwɛbea. Biribiara a ɛwɔ ha yɛ wo dea: wo akuo, wo mmaeɛ, ne deɛ asɔre no hia firi wo hɔ nnawɔtwe yi.'],
    ['Deɛ wotumi hunu', 'Nkyɛnmu tiawa nkyerɛ sɛ biribi ayera.', 'Wo nkyɛnmu yɛ tiawa ɛfiri sɛ Kairos fa kɛseɛ no nyɛ wo dea sɛ wohwɛ so. Yɛmfa biribiara nsie wo.'],
    ['Wo Mmaeɛ', 'Ɔsom biara a wɔkyerɛwee wo din.', 'Me Mmaeɛ kyerɛ ɔsom biara a wɔkyerɛwee wo, wo ntoatoasoɔ, ne sɛdeɛ wo mmaeɛ teɛ nnawɔtwe kakra a atwam.'],
    ['Wo Fekuo', 'Kuo ketewa a woka ho.', 'Fekuo kyerɛ kuo a woka ho, berɛ a wɔhyia ne baabi. Sɛ wonka bi ho a, mfonini no bɛhwehwɛ deɛ ɛbɛn wo.'],
    ['Wo Adwumakuo', 'Akuo a woyɛ adwuma wɔ mu.', 'Adwumakuo kyerɛ akuo a wosom wɔ mu, berɛ a ɛdi hɔ a wobɛyɛ adwuma, ne atadeɛ a wɔde bɛyɛ saa ɔsom no.'],
    ['Kyerɛw wo din', 'Skan, na wɔakyerɛw sɛ wobaeɛ.', 'Sɛ woduru a, bue Nkyerɛwee na skan kod a ɛwɔ ɛpono ano hɔ. Ɛno kyerɛw wo sɛ wobaeɛ a wonnyina ntoatoasoɔ mu.'],
    ['Nkrataa', 'Asubɔ, adanseɛ, ɔhɔhoɔ a ɔaba foforɔ.', 'Nkrataa ne baabi a wobisa asubɔ, woka adanseɛ, anaa wokyerɛw obi a ɔaba nnansa din. Ɔkannifoɔ gye firi hɔ.'],
    ['Wo Nsɛm', 'Wo nsɛm, ne hwan na ɔhunu.', 'Wo nsɛm kora wo nkitahodie ne wo nhyehyɛeɛ, a kasa a Kairos de kasa kyerɛ wo ka ho.'],
  ],
  pastor: [
    ['Wo Nhwɛbea', 'W’asɔre baa, ne deɛ ɛhia ɛnnɛ.', 'Wo nhwɛbea bue w’asɔre baa so: dodoɔ a wɔwɔ asafo no mu, ne deɛ ɛretwɛn wo sɛ wobɛyɛ ɛnnɛ.'],
    ['W’asɔre baa', 'Biribiara a ɛwɔ deɛ wodi anim no mu.', 'M’asɔre Baa ne deɛ wodi anim no nyinaa. Ne mufoɔ, n’akuo, n’ɔsom, ne wɔn a wɔaba foforɔ.'],
    ['Nhwɛmu no', 'Obiara, ne ne gyinabea.', 'Nhwɛmu no kyerɛ obiara a ɔwɔ w’asɔre baa mu. Nsensaneɛ no kyerɛ sɛ ɔyɛ ɔhɔhoɔ, ɔsanba, anaa wawie adesua no.'],
    ['Nkɔdi Akyi', 'Nhwɛmu mmiɛnsa, a berɛ nni mu.', 'Nkɔdi Akyi wɔ nhwɛmu mmiɛnsa: ahɔhoɔ foforɔ a obiara ne wɔn nkasaeɛ, wɔn a wɔnni kuo mu, ne nkitahodie a berɛ atwam.'],
    ['Nsɛm a Ɛha Adwene', 'Yiedie ne ahobammɔ, soronko.', 'Nsɛm a Ɛha Adwene kura yiedie ne ahobammɔ. Ɛyɛ nkrataa beaeɛ mmienu soronko, a nnipa a wɔnsɛ na wɔkenkan.'],
    ['Wo Fekuo', 'Kuo a wodi anim.', 'Fekuo a wodi anim no, wotumi kyerɛw mmaeɛ, kyerɛw nkɔdi akyi, na wohunu hwan na wagyae ba.'],
    ['W’adwumakuo', 'Mufoɔ, nnwuma nhyehyɛeɛ ne adwumayɛfoɔ pɛ.', 'W’adwumakuo mu no wohwɛ mufoɔ so, woyi nnwuma nhyehyɛeɛ adi, na wodi wɔn a wɔpɛ sɛ wɔka ho ho dwuma.'],
    ['Akra Kwan', 'Firi nkitahodie kɔsi adwumakuo mu.', 'Akra kwan di obi a yɛduruu ne ho wɔ asɛmpaka mu akyi, firi nkitahodie a ɛdi kan kɔsi adwumakuo mu kɔ.'],
    ['Amanneɛbɔ', 'W’asɔre baa, wɔ akontaa mu.', 'Amanneɛbɔ dane w’asɔre baa yɛ akontaa: mmaeɛ nkɔsoɔ, hwan na ɔnni hɔ, ne sɛdeɛ akuo no renyini.'],
  ],
  'platform-dashboard': [
    ['Asɔre Nkwa', 'Akontaa ɛnan a ɛho hia.', 'Asɔre Nkwa wɔ dashboard no atifi: asɔre mmaa, asafo no nyinaa, asɔrefoɔ a wɔahyɛ mu den, ne fekuo.'],
    ['Ɛhia Wo', 'Nneɛma a ɛretwɛn wo.', 'Saa afa yi kyerɛ deɛ ɛretwɛn: ɔpene a ɛsɛ sɛ woyɛ, asɔre mmaa a wonni ɔsɔfoɔ. Mia na kɔ hɔ.'],
    ['Nneyɛeɛ a Ɛbaa Nnansa', 'Hwan na ɔbaeɛ, ne berɛ bɛn.', 'Aseɛ hɔ, nneyɛeɛ a ɛbaa nnansa kyerɛ hwan na ɔkyerɛwee ne din ne berɛ bɛn, a wommue biribi foforɔ.'],
  ],
  'platform-members': [
    ['Nhwɛmu no', 'Obiara, wɔ nhwɛmu baako mu.', 'Asɔrefoɔ ne nhwɛmu no. Obiara a ɔwɔ asɔre no mu wɔ ha, ne n’asɔre baa ne sɛ wawie asɔrefoɔ adesua no anaa.'],
    ['Obi hwehwɛ', 'Fa din, email anaa telefon.', 'Twerɛ din, email anaa telefon nɔma wɔ hwehwɛbea hɔ. Wotumi nso yi no mu fa asɔre baa, gyinabea anaa dibea so.'],
    ['Bue obi nsɛm', 'N’abakɔsɛm nyinaa wɔ faako.', 'Sɛ womia nsensaneɛ a, ɛbue saa onipa no: ne nkitahodie, n’akuo, ne mmaeɛ ne nkɔdi akyi biara a ɛfa ne ho.'],
  ],
  'platform-branches': [
    ['Asɔre Baa Biara', 'Nhyehyɛeɛ no nyinaa.', 'Asɔre Mmaa kyerɛ beaeɛ biara a asɔre no wɔ, ne kurow, ne ɔmantam ne dodoɔ a wɔwɔ n’asafo mu.'],
    ['Emu', 'Nhyehyɛeɛ, akannifoɔ ne mufoɔ.', 'Bue asɔre baa bi na siesie ne nsɛm, fa ne sɔfoɔ ne sohwɛfoɔ ma, na hunu asɔrefoɔ, akuo ne ɔsom a ɛwɔ ne ase.'],
  ],
  'platform-regions': [
    ['Mpɔtam', 'Asɔre mmaa a wɔakyekyɛ wɔ asase so.', 'Mpɔtam kyekyɛ asɔre mmaa wɔ asase so, sɛdeɛ amanneɛbɔ bɛtumi aka ɔman mu nyinaa na ɛnyɛ beaeɛ baako.'],
    ['Asɔre mmaa a ɛbata ho', 'Ɔmantam a ɛwɔ mmaa no, wɔrentumi nyi.', 'Ɔmantam biara kyerɛ asɔre mmaa a ɛbata ho. Deɛ ɛwɔ bi no, wɔrentumi nyi no kɔsɛ wɔayi baa biara afiri hɔ.'],
  ],
  'platform-fellowships': [
    ['Fekuo no', 'Kuo ketewa biara, ne ne su.', 'Fekuo kyerɛ kuo ketewa biara: K-Groups, Kharis Express, New Breeds, ne hwan na ɔdi anim ne berɛ a wɔhyia.'],
    ['Yi mu fa su so', 'Te so ma ɛyɛ deɛ wopɛ.', 'Nkorabata a ɛwɔ atifi no yiyi mu fa su so, na deɛ ɛsiane no te so ma ɛyɛ asɔre baa baako.'],
    ['Hunu no wɔ mfonini so', 'Kuo a ɛbɛn ɔmanfoɔ no.', 'Mfonini no de wɔn si asase so, na ɛbua asɛm no: deɛ ɛbɛn me ne hwan.'],
  ],
  'platform-departments': [
    ['Asomdwuma Akuo', 'Kuo biara, ne hwan na ɔdi anim.', 'Adwumakuo ne asomdwuma akuo no. Biara kyerɛ ne kannifoɔ, ne boafoɔ, ne dodoɔ a wɔsom wɔ mu.'],
    ['Adwumakuo bi mu', 'Mufoɔ, nnwuma, adwumayɛfoɔ pɛ, atadeɛ.', 'Bue bi na wobɛnya ne mufoɔ, ne nnwuma nhyehyɛeɛ, wɔn a wɔpɛ sɛ wɔka ho, ne atadeɛ a ɛwɔ ɔsom a ɛreba no ho.'],
  ],
  'platform-attendance': [
    ['Ɔsom', 'Nhyiam biara, ne ne krataa.', 'Mmaeɛ kyerɛ ɔsom ahodoɔ no. Biara kyerɛ dodoɔ a wɔkyerɛwee ne sɛ krataa no da so bue anaa.'],
    ['Kyerɛw wɔn a wɔbaeɛ', 'Ɛpono ano, anaa ɔmanfoɔ no ankasa.', 'Bue ɔsom bi na kyerɛ sɛ obi wɔ hɔ, waka akyi anaa ɔwɔ intanɛt so. Asɔrefoɔ nso tumi de QR kod kyerɛw wɔn din.'],
  ],
  'platform-membership': [
    ['Adesua no', 'Nnawɔtwe nnan, ne deɛ ɛde ba.', 'Asɔrefoɔ Mufoɔ ne nnawɔtwe nnan adesua no. Sɛ wowie a, ɛno na ɛma obi yɛ Ɔmanfoɔ ankasa.'],
    ['Akuo', 'Nkyerɛwee, nkyerɛwee ne awieeɛ.', 'Kuo yɛ nkyerɛwee baako. Wohyehyɛ n’adesua ɛnan, wokyerɛw mmaeɛ ne nsɔhwɛ a ɛtwa toɔ, na woma wɔn a wodii nkonim wie.'],
  ],
  'platform-new-believers': [
    ['Kwan no', 'Adesua ɛnan, na adwumakuo.', 'Gyidifoɔ Foforɔ ne asuafoyɛ kwan no. Adesua ɛnan, na adwumakuo bi mu kɔ, a obiara wɔ board no so.'],
    ['Adesua', 'Wɔahyehyɛ, wɔakyerɛkyerɛ, wɔakyerɛw.', 'Wɔhyehyɛ adesua ma asɔre baa biara a ɔkyerɛkyerɛni ne ɛda ka ho. Kyerɛw mmaeɛ wɔ adesua no mu, na yi nnipa kɔ gyinaberɛ a ɛdi hɔ.'],
  ],
  'platform-follow-ups': [
    ['Nhwɛmu no', 'Ahɔhoɔ foforɔ, wɔn a wɔnni kuo mu, ne berɛ a atwam.', 'Nkɔdi Akyi wɔ nhwɛmu mmiɛnsa: ahɔhoɔ foforɔ a obiara ne wɔn nkasaeɛ, wɔn a wɔnni kuo biara mu, ne deɛ berɛ atwam.'],
    ['Kyerɛw bi', 'Hwan, ɛkwan bɛn, ne deɛ ɛdi hɔ.', 'Sɛ wokyerɛw nkɔdi akyi a, ɛkora hwan na ɔfrɛeɛ, ɛkwan bɛn so, deɛ ɛsiiɛ, ne deɛ ɛsɛ sɛ ɛdi hɔ. Wobɛtumi ahyɛ no asɛm nso.'],
  ],
  'platform-concerns': [
    ['Yiedie ne Ahobammɔ', 'Nkrataa beaeɛ mmienu, soronko.', 'Nsɛm a Ɛha Adwene wɔ nkrataa beaeɛ mmienu. Yiedie ne ahobammɔ da soronko, na nnipa a wɔnsɛ na wɔkenkan.'],
    ['Kenkan bi', 'Nkrataa no, ne hwan na ɔde baeɛ.', 'Sɛ wobue asɛm bi a, ɛkyerɛ nkɔdi akyi a ɛfirii mu baeɛ, hwan na ɔde baeɛ, ne deɛ wɔayɛ wɔ ho firi saa berɛ no.'],
  ],
  'platform-outreach': [
    ['Nhyehyɛeɛ', 'Asɛmpaka, a ɛda ne beaeɛ wɔ ho.', 'Asɛmpaka nhyehyɛeɛ ne asɛmpaka adwuma no: baabi, berɛ bɛn, ne adwumayɛfoɔ a wɔrekɔ.'],
    ['Kyerɛw ɔkra', 'Din ne nɔma dɔɔso.', 'Wɔ asɛmpaka mu, wokyerɛw nnipa a wohyia wɔn. Din ne telefon nɔma dɔɔso sɛ wode bɛfiri aseɛ; kwan no gye firi hɔ.'],
  ],
  'platform-forms': [
    ['Nkrataa no', 'Nsia, ma deɛ nnipa bisa.', 'Nkrataa fa ɔhɔhoɔ foforɔ, asubɔ, adanseɛ, abɔfra dintoɔ, abɔfra nhyira ne Gyidifoɔ Foforɔ adesua ho.'],
    ['Hyɛ bi ma', 'Ɛduru onipa a ɛsɛ no nkyɛn.', 'Hyɛ bi ma na ɛbɛduru obi a ɔhwɛ so nkyɛn, a wɔde onipa no abata ne nkrataa ho sɛ ɔwɔ bi dada a.'],
  ],
  'platform-souls-pipeline': [
    ['Board no', 'Foforɔ, yɛredi akyi, wasakra.', 'Akra kwan yɛ board. Obi firi foforɔ kɔ yɛredi akyi kɔsi wasakra, na kɔla no kyerɛ sɛdeɛ nkitahodie no berɛ atwam.'],
    ['Yi obi kɔ anim', 'Twe no, anaa bue na sesa.', 'Twe kaad kɔ nsensaneɛ a ɛdi hɔ, anaa bue no na kyerɛw deɛ ɛsiiɛ na hyɛ nkɔdi akyi a ɛdi hɔ ɛda.'],
  ],
  'platform-souls-dashboard': [
    ['Akontaa no', 'Sɛdeɛ kwan no rekɔ.', 'Akra dashboard dane kwan no yɛ akontaa: dodoɔ a wɔwɔ gyinaberɛ biara, dodoɔ a wɔasakra, ne sɛdeɛ nkɔdi akyi no yɛ foforɔ.'],
    ['Fa gyinabea so', 'Mia nsensaneɛ na hunu hwan.', 'Mfonini no kyekyɛ mu fa gyinabea ne deɛ ɛho hia so. Mia nsensaneɛ biara na hunu nnipa a ɛrekan wɔn pɛpɛɛpɛ.'],
  ],
  'platform-profile': [
    ['Wo nsɛm', 'Wo nkitahodie nsɛm.', 'Wo nsɛm kora wo nkitahodie, w’asɔre baa, ne dibea a wɔde ama wo wɔ asɔre no mu.'],
    ['Wo nhyehyɛeɛ', 'Ahobammɔ, amanneɛbɔ, kasa.', 'Nhyehyɛeɛ fa wo password ne akwan a wonam so hyɛ mu, amanneɛbɔ a wonya, ne kasa a Kairos de kasa kyerɛ wo.'],
  ],
  'church-management-member-lifecycle': [
    ['Firi ɔhɔhoɔ kɔsi ɔmanfoɔ', 'Ɛtwa ɛnan, nhwɛmu baako.', 'Obiara wɔ kwan korɔ no ara so baabi: ɔhɔhoɔ, ɔsanba, na ɔmanfoɔ sɛ nnawɔtwe nnan adesua no wie a.'],
    ['Baabi a gyinabea pue', 'Wɔ nsensaneɛ so, ne nsɛm no mu.', 'Nhwɛmu nsensaneɛ no kyerɛ gyinaberɛ a obi wɔ, enti wohunu ntɛm sɛ hwan na obiara nnii n’akyi da.'],
  ],
  'church-management-attendance-tracking': [
    ['Kyerɛw nkrataa', 'Ɛpono ano, bere a wɔreba.', 'Bue ɔsom no na kyerɛ sɛ obi wɔ hɔ, waka akyi anaa ɔwɔ intanɛt so bere a wɔreba. Deɛ wamma no, yɛhunu no, enti biribiara nni hɔ.'],
    ['W’ankasa nkyerɛwee', 'QR kod wɔ ɛpono ano.', 'Asɔrefoɔ tumi skan kod a ɛwɔ ɛpono ano na wɔakyerɛw sɛ wɔwɔ hɔ, na ɛma ɛpono ano hɔ da hɔ ma wɔn a wɔhia.'],
  ],
  'church-management-fellowship-management': [
    ['Fekuo ho hwɛ', 'Wo kuo, wo nkrataa.', 'Sɛ wodi fekuo bi anim a, wohwɛ ne mufoɔ so, wokyerɛw nhyiam biara, na wohunu hwan na wagyae ba komm.'],
    ['Ne nhyiam', 'Din kenkan nhyiam biara mu.', 'Nhyiam biara wɔ n’ankasa din kenkan. Nnawɔtwe kakra akyi, ɛno na ɛyɛ mmaeɛ su a amanneɛbɔ no kenkan.'],
  ],
  'church-management-branch-management': [
    ['Asɔre baa nhyehyɛeɛ', 'Nsɛm, berɛ, nkyerɛwee.', 'Asɔre baa kura n’adres, n’ɔsom berɛ, ne sɛ w’ankasa nkyerɛwee abue anaa ne berɛ tenten a ɛtwa ɔsom no ho hyia.'],
    ['Hwan na ɔdi anim', 'Ɔsɔfoɔ, asomfoɔ, sohwɛfoɔ.', 'Wɔde akannifoɔ ma wɔ ha: ɔsɔfoɔ panin, asomfoɔ sɛ wɔwɔ hɔ a, ne asɔre baa sohwɛfoɔ a wɔtumi hwɛ ne nsɛm so.'],
  ],
  'church-management-reporting': [
    ['Deɛ wɔbɔ amanneɛ', 'Mmaeɛ, nkɔsoɔ, nkitahodie.', 'Amanneɛbɔ fa mmaeɛ nkɔsoɔ, asɔrefoɔ dodoɔ nkɔanim, nkitahodie ne asɛmpaka ho, biara sɛdeɛ wo dibea tumi hunu.'],
    ['Sesa berɛ no', 'Bosome a atwam, anaa afe.', 'Sesa berɛ no ma ɛtrɛ anaa ɛte so. Akontaa no ne mfonini biara di akyi.'],
  ],
  'church-management-department-administration': [
    ['Mufoɔ ne nnwuma nhyehyɛeɛ', 'Hwan na ɔsom, ne berɛ bɛn.', 'Adwumakuo kora wɔn a wɔsom wɔ mu din ne nhyehyɛeɛ a ɛkyerɛ hwan na ɔsom berɛ bɛn, a wɔyi adi nnawɔtwe kakra ansa.'],
    ['Adwumayɛfoɔ pɛ', 'Abisadeɛ, nsɛmmisa, nsɔhwɛ.', 'Adwumayɛfoɔ pɛ firi abisadeɛ kɔ nsɛmmisa ne deɛ wɔde ma kɔsi nsɔhwɛ berɛ, a obiara wɔ ne gyinaberɛ so.'],
  ],
  'administration-permissions': [
    ['Akyɛdeɛ, ɛnyɛ dibea din', 'Dibea a wɔde abata beaeɛ ho.', 'Kwan a wɔma firi akyɛdeɛ mu: dibea a wɔabɔ din a wɔde abata asɔre baa, fekuo, adwumakuo anaa asɔre no nyinaa ho.'],
    ['Fa bi ma', 'Fa ma, na ɛyɛ adwuma ntɛm ara.', 'Fa akyɛdeɛ ma na saa onipa no hunu afa foforɔ no ntɛm ara. Yi na ɛgyae, nanso n’abakɔsɛm da so wɔ hɔ.'],
  ],
  'administration-capabilities': [
    ['Deɛ tumi yɛ', 'Deɛ akyɛdeɛ de ma ankasa.', 'Akyɛdeɛ yɛ tumi ahodoɔ bi. Tumi baako ne adeɛ baako a ɛma wotumi yɛ, te sɛ asɔre baa kenkan anaa adwumakuo nsesa.'],
    ['Baabi a wɔyɛ adwuma', 'Kratafa biara hwɛ wɔn.', 'Kratafa biara ne dwumadie biara hwɛ tumi bi, ɛno na ɛma nnipa mmienu a wɔwɔ akyɛdeɛ soronko hunu nneɛma soronko ankasa.'],
  ],
  'administration-approvals': [
    ['Nhwɛmu no', 'Nnipa a wɔretwɛn sɛ wɔbɛgye wɔn.', 'Ɔpene nhwɛmu no kura obiara a wakyerɛw ne din nanso wɔnnyee no ntoo mu. Kɔsɛ wɔgye no, ɔntumi nhyɛ mu.'],
    ['Gye obi to mu', 'Hwɛ asɔre baa no, na gye no.', 'Hwɛ asɔre baa a wayi ne nsɛm a ɔde maeɛ, na gye no to mu. Ɔbɛtumi ahyɛ mu firi saa berɛ no.'],
  ],
  'administration-settings': [
    ['Wo nhyehyɛeɛ', 'Akawnt, ahobammɔ, ne sɛdeɛ ɛyɛ.', 'Nhyehyɛeɛ fa w’akawnt, akwan a wonam so hyɛ mu, sɛdeɛ Kairos yɛ, ne kasa a ɔde kasa kyerɛ wo.'],
    ['Amanneɛbɔ', 'Deɛ ɛduru wo nkyɛn, ne mpɛn ahe.', 'Amanneɛbɔ yɛ ɛkuo biara dea. Yi ntɛm ara anaa daa nsɛm tiawa ma biara, anaa dum no. Ahobammɔ kɔkɔbɔ deɛ, ɛba daa.'],
  ],
  'analytics-church-health': [
    ['Asɔre no ho yɛ den?', 'Mmaeɛ ne nkrataa so dodoɔ.', 'Asɔre akwahosan de wɔn a wɔba ankasa toto wɔn a wɔwɔ nkrataa so ho, na ɛno yɛ den na ɛho wɔ mfasoɔ sene emu biara.'],
    ['Kenkan nkɔanim no', 'Ɛkwan a ɛrekɔ na ɛho hia.', 'Nnawɔtwe baako nka hwee. Nkɔanim a ɛwɔ nnawɔtwe nwɔtwe mu na ɛkyerɛ sɛ biribi reyɛ adwuma anaa.'],
  ],
  'analytics-engagement': [
    ['Hwan na ɔde ne ho hyɛ mu', 'Ɛboro sɛ wobɛba kɛkɛ.', 'Nkitahodie kan nneɛma pii sene mmaeɛ: sɛ obi wɔ kuo mu, ɔsom wɔ kuo bi mu, na yɛredi n’akyi.'],
    ['Nkitahodie nhwɛbea', 'Baabi a nnipa gyae.', 'Nkyekyɛmu no kyerɛ baabi a nnipa twe wɔn ho, na ɛtaa ba ansa na wɔagyae ba, ɛnyɛ akyire.'],
  ],
  'analytics-growth-reports': [
    ['Nkɔsoɔ', 'Asɔrefoɔ foforɔ, berɛ mu.', 'Nkɔsoɔ amanneɛbɔ kan asɔrefoɔ foforɔ wɔ berɛ no mu, baabi a wɔbaeɛ, ne sɛdeɛ ɛne abosome a atwam toto.'],
    ['Asɔrefoɔ foforɔ', 'Baabi a wɔfiri baeɛ.', 'Nkyekyɛmu no kyerɛ asɔre baa ne ɛkwan a wɔfaa so baeɛ, enti wohunu deɛ ɛde nnipa ba ankasa.'],
  ],
  'analytics-attendance-reports': [
    ['Mmaeɛ amanneɛbɔ', 'Nnawɔtwe biara, asɔre baa biara.', 'Mmaeɛ amanneɛbɔ kyerɛ nkyerɛwee nnawɔtwe biara ne nnipa soronko dodoɔ, na ɛpae nnipa korɔ a wɔba pii ne nnipa pii a wɔba mu.'],
    ['Hwan na ɔnni hɔ', 'Wɔahyehyɛ no sɛdeɛ ɛkyɛreeɛ.', 'Wɔn a wɔnni hɔ nhwɛmu no, wɔde ɔsom dodoɔ a obi amma a ɛdi so ahyehyɛ, na ɛno ne nhwɛmu a ɔhwɛ hia ankasa.'],
  ],
  'getting-started-your-first-church': [
    ['Nsiesieeɛ', 'Mpɔtam, na asɔre mmaa.', 'Nsiesieeɛ firi mpɔtam so, na asɔre mmaa a ɛwɔ mu, ɛfiri sɛ ɔmanfoɔ biara ne kuo biara wɔ asɔre baa bi ase.'],
    ['W’asɔre baa a ɛdi kan', 'To no din, si no, di n’anim.', 'Fa din, kurow ne ɔsom berɛ ma asɔre baa no, na fa ne sɔfoɔ ma. Asɔrefoɔ bɛtumi aba akyire yi.'],
  ],
  'getting-started-roles-permissions': [
    ['Hwan na ɔtumi yɛ ɛdeɛn', 'Dibea mmienu, akyɛdeɛ pii.', 'Kairos kora dibea mmienu pɛ so, admin ne member. Nkaeɛ nyinaa yɛ akyɛdeɛ a wɔde abata beaeɛ pɔtee ho.'],
    ['Hunu no wɔ akawnt so', 'Bue onipa no, kenkan n’akyɛdeɛ.', 'Bue obi na wobɛhunu akyɛdeɛ biara a ɔwɔ ne baabi a ɛyɛ adwuma, na ɛno ne mmuaeɛ pa a ɛkyerɛ deɛ enti a ɔhunu kratafa bi.'],
  ],
};
