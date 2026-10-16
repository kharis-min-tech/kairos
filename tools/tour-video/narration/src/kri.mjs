/**
 * Every clip's script, in Krio. Mirrors en.mjs entry for entry.
 *
 * Krio has no voice in Deepgram, and had none in Kokoro, so these clips carry
 * captions over the footage with no audio track. The lines are still written
 * to be spoken rather than read off a page: if a voice ever becomes
 * available, nothing here has to be rewritten.
 *
 * Vocabulary follows the app's own catalogue: branch, fɛloship, dipatmɛnt,
 * sɛvis, sol, fɔlo ɔp.
 */
const general = [
  ['Yu Ɔvavyu', 'Di fɔs dɔ, ɛn na wetin yu rol kɔva nɔmɔ.', 'Dis na Kairos. I de opin pan yu ɔvavyu, ɛn ɔltin we yu de si ya na wetin na yu rispɔnsibiliti fɔ tru.'],
  ['Di Saydba', 'Siks grup. Yu de si di wan dɛn we fɔ yu.', 'Di saydba grup insay Pipul, Grup dɛn, Gadarin dɛn, Analitiks ɛn Ɔganizeshɔn. Sɛkshɔn we yu nɔ de si na wan we yu rol nɔ nid.'],
  ['Mɛmba dɛn', 'Ɔlman pan wan lis.', 'Mɛmba na di dairɛktri. Ɔlman insay di chɔch de ya, wit dɛn om branch ɛn if dɛn dɔn du di mɛmbaship klas.'],
  ['Fɛloship dɛn', 'Di smɔl grup dɛn, wit map.', 'Fɛloship dɛn na di smɔl grup dɛn. K-Groups, Kharis Express, New Breeds ɛn di ɔda dɛn, wit map fɔ fɛn di wan we nia yu.'],
  ['Dipatmɛnt dɛn', 'Ministri tim dɛn ɛn dɛn rota.', 'Dipatmɛnt dɛn na di ministri tim dɛn. Ɛvri wan kip in yon mɛmba lis, in sav rota ɛn di pipul we de aplay fɔ jɔyn.'],
  ['Atɛndans', 'Sɛvis, chɛk-in ɛn di rɛjista dɛn.', 'Atɛndans kɔva sɛvis ɛn chɛk-in. Pipul kin chɛk dɛnsɛf in wit QR kod, ɔ di dɛsk kin rɛkɔd dɛn we dɛn kam.'],
  ['Di Sol Paiplain', 'Frɔm di fɔs kɔntakt sote go na dipatmɛnt.', 'Di sol paiplain de fɔlo pɔsin we wi rich tru ɛvanjelizm: nyu, wi de fɔlo ɔp, i want, i kɔnvat, ɛn insay disaypulship.'],
  ['Ripɔt dɛn', 'Atɛndans, groth ɛn ɛngejmɛnt.', 'Ripɔt de tɔn ɔl dat to nɔmba. Atɛndans trɛnd, aw mɛmbaship de gro ɛn ɛngejmɛnt, ɔl insay wetin yu rol kɔva.'],
  ['Yu Langwej', 'Kairos ɛn dis gayd, na fo langwej.', 'Kairos de tɔk Inglish, Frɛnch, Krio ɛn Twi. Chenj am frɔm di saydba, ɛn di gayd go opin na di sem langwej.'],
];

const admin = [
  ['Yu ovavyu', 'Ɔl di branch wan tɛm.', 'Dis na di admin vyu. Chɔch Pɔls de kawnt ɔl di branch wan tɛm, ɛn Nid Yu de lis wetin de wet fɔ sɔmbɔdi tide.'],
  ['Branch dɛn', 'Mek dɛn, grup dɛn, pul dɛn.', 'Branch na yu yon nɔmɔ. Na admin nɔmɔ kin mek wan, muv am to ɔda rijɔn, ɔ pul am awt pan di aktiv wan dɛn.'],
  ['Insay wan branch', 'In ditel, ɛn udat de lid am.', 'Opin wan branch fɔ sɛt in ditel ɛn in lidaship. We yu nem di mayn pasto ya, dat de gi am say pan dat branch in sefgadin kyu.'],
  ['Rijɔn dɛn', 'Di ples dɛn we de grup yu branch.', 'Rijɔn de grup branch bay ples. Mek di rijɔn fɔs; yu nɔ kin mek branch te di rijɔn de.'],
  ['Di aproval kyu', 'Nɔbɔdi nɔ de ɛnta te sɔmbɔdi opin fɔ am.', 'Ɛnibɔdi we sayn ɔp insɛf de wet ya. Aprov am ɛn i gɛt ful mɛmba akses; rifyuz am ɛn dɛn pul di akawnt.'],
  ['Udat ol wetin', 'Na grant, nɔto job taytul.', 'Opin wan mɛmba fɔ manej in grant dɛn. Kairos de sev tu sistem rol nɔmɔ, so ɔltin ɛls de kam frɔm grant.'],
  ['Mɛmbaship klas dɛn', 'Chɔch-wayd, so no branch grant nɔ de rich am.', 'Di mɛmbaship program na chɔch-wayd. Kɔhɔt de tek pipul frɔm ɛvri branch, so fɔ administa am, yu nid chɔch-skop grant.'],
  ['Ripɔt akrɔs branch', 'Di onli vyu we de tan branch wit branch.', 'Ripɔt na di krɔs-branch vyu. Na yu nɔmɔ as rol kin si ɛvri branch sayd bay sayd, nɔto wan at a tɛm.'],
  ['Yu langwej', 'Kairos ɛn dis andbuk, insay fɔ langwej.', 'Kairos de tɔk Inglish, Frɛnch, Krio ɛn Twi. Chenj am frɔm di saydba, ɛn di andbuk de opin insay di sem langwej.'],
];

export default {
  general,
  admin,
  member: [
    ['Yu Ɔvavyu', 'Na wetin na fɔ yu nɔmɔ.', 'Dis na yu ɔvavyu. Ɔltin ya na fɔ yu: yu grup dɛn, yu atɛndans, ɛn wetin di chɔch nid frɔm yu dis wik.'],
    ['Wetin yu kin si', 'Shɔt saydba nɔto mistek.', 'Yu saydba shɔt bikɔs plɛnti pan Kairos nɔto fɔ yu fɔ ron. Natin nɔ de ayd frɔm yu bikɔs na sikrit.'],
    ['Yu Atɛndans', 'Ɛvri sɛvis usay dɛn mak yu.', 'Mi Atɛndans de sho ɛvri sɛvis usay dɛn rɛkɔd yu, yu strik naw, ɛn aw yu atɛndans tan di las fyu wik dɛn.'],
    ['Yu Fɛloship', 'Di smɔl grup we yu bilɔng to.', 'Fɛloship de sho di grup we yu bilɔng to, we tɛm dɛn de mit ɛn usay. If yu nɔ de na wan yet, di map go fɛn di wan we nia yu.'],
    ['Yu Dipatmɛnt dɛn', 'Di tim dɛn usay yu de sav.', 'Dipatmɛnt de lis di tim dɛn usay yu de sav, we tɛm yu de na di rota nɛks, ɛn di yunifɔm fɔ dat sɛvis if i de.'],
    ['Fɔ Chɛk In', 'Skan, ɛn dɛn mak yu se yu de.', 'We yu kam, opin Chɛk in ɛn skan di kod pan di skrin na di dɔ. Dat mak yu se yu de witawt fɔ layn ɔp na di dɛsk.'],
    ['Fɔm dɛn', 'Baptizm, tɛstimoni, fɔs vizit.', 'Fɔm na usay yu aks fɔ baptizm, shɛr tɛstimoni, ɔ rejista pɔsin we de kam fɔ di fɔs tɛm. Wan lida go tek am frɔm de.'],
    ['Yu Prɔfayl', 'Yu infɔmeshɔn, ɛn udat kin si am.', 'Yu prɔfayl kip yu kɔntakt infɔmeshɔn ɛn yu sɛtin dɛn, wit di langwej we Kairos de tɔk to yu.'],
  ],
  pastor: [
    ['Yu Ɔvavyu', 'Yu branch, ɛn wetin i nid tide.', 'Yu ɔvavyu de opin pan yu branch: omɔch pipul de na di kɔngrigeshɔn, ɛn wetin de wet fɔ yu fɔ du tide.'],
    ['Yu Branch', 'Ɔltin insay di wan we yu de lid.', 'Mi Branch na di ol wan we yu de lid. In mɛmba dɛn, in grup dɛn, in sɛvis dɛn, ɛn di pipul we jɔs jɔyn.'],
    ['Di Dairɛktri', 'Ɔlman, wit dɛn stetɔs.', 'Di dairɛktri de lis ɔlman insay yu branch. Di layn de tɛl yu if na vizitɔ, ritɔna, ɔ pɔsin we dɔn du di mɛmbaship klas.'],
    ['Fɔlo ɔp dɛn', 'Tri lis, pan shɔt tɛm.', 'Fɔlo ɔp gɛt tri lis: fɔs-tɛm pipul we nɔbɔdi nɔ tɔk to, pipul we nɔ de na grup, ɛn ɛnibɔdi we dɔn let fɔ kɔntakt.'],
    ['Wɔri dɛn', 'Wɛlfɛa ɛn sefgadin, sɛpret.', 'Wɔri na usay wɛlfɛa ɛn sefgadin de sidɔm. Na tu sɛpret inbɔks pɔposli, ɛn difrɛn pipul de rid dɛn.'],
    ['Yu Fɛloship', 'Di grup we yu de lid.', 'Fɔ di fɛloship we yu de lid, yu kin tek di rɛjista, rɛkɔd fɔlo ɔp, ɛn si udat dɔn stɔp fɔ kam.'],
    ['Yu Dipatmɛnt', 'Mɛmba lis, rota ɛn rikrutmɛnt.', 'Fɔ yu dipatmɛnt yu de manej di mɛmba lis, put di rota awt, ɛn wok tru di pipul we de aplay fɔ jɔyn.'],
    ['Di Sol Paiplain', 'Frɔm fɔs kɔntakt go na dipatmɛnt.', 'Di sol paiplain de fɔlo pɔsin we wi rich tru ɛvanjelizm, frɔm di fɔs kɔntakt sote i jɔyn wan dipatmɛnt.'],
    ['Ripɔt dɛn', 'Yu branch, insay nɔmba.', 'Ripɔt de tɔn yu branch to nɔmba: atɛndans trɛnd, udat nɔ de kam, ɛn aw di grup dɛn de gro.'],
  ],
  'platform-dashboard': [
    ['Chɔch Pɔls', 'Di fo nɔmba dɛn we impɔtant.', 'Chɔch Pɔls de na di tɔp pan di dashbɔd: branch dɛn, ɔl di kɔngrigeshɔn, kɔnfam mɛmba dɛn ɛn fɛloship dɛn.'],
    ['I Nid Yu', 'Di tin dɛn we de wet pan yu.', 'Dis sɛkshɔn de lis wetin de wet fɔ tru: aproval fɔ gi, branch we nɔ gɛt pasto, ɛni tin we stɔk. Klik fɔ go de.'],
    ['Rɛsɛnt Aktiviti', 'Udat jɔyn, ɛn we tɛm.', 'Bilo, rɛsɛnt aktiviti de sho udat rejista ɛn we tɛm, so yu kin si di wik witawt opin ɛni ɔda tin.'],
  ],
  'platform-members': [
    ['Di Dairɛktri', 'Ɔlman, pan wan lis.', 'Mɛmba na di dairɛktri. Ɔlman insay di chɔch de ya, wit dɛn om branch ɛn if dɛn dɔn du di mɛmbaship klas.'],
    ['Fɔ Fɛn Sɔmbɔdi', 'Wit nem, imel ɔ fon.', 'Rayt nem, imel ɔ fon nɔmba insay di sach bɔks. Yu kin filta bay branch, bay stetɔs, ɔ bay rol bak.'],
    ['Fɔ Opin Prɔfayl', 'Ɔl dɛn istri na wan ples.', 'If yu klik wan layn i de opin dat pɔsin: dɛn kɔntakt, dɛn grup, dɛn atɛndans ɛn ɛvri fɔlo ɔp bɔt dɛn.'],
  ],
  'platform-branches': [
    ['Ɛvri Branch', 'Di ol nɛtwɔk, lis.', 'Branch de lis ɛvri ples we di chɔch de ron, di siti, di rijɔn ɛn omɔch pipul de na di kɔngrigeshɔn.'],
    ['Insay Wan', 'Sɛtin, lidaship ɛn mɛmba dɛn.', 'Opin wan branch fɔ sɛt in infɔmeshɔn, gi in pasto ɛn admin dɛn, ɛn si di mɛmba, grup ɛn sɛvis dɛn we bilɔng to am.'],
  ],
  'platform-regions': [
    ['Rijɔn dɛn', 'Branch dɛn we dɛn grup bay ples.', 'Rijɔn de grup branch dɛn bay ples, so dat ripɔt kin kɔva wan kɔntri ɛn nɔto wan ples at a tɛm.'],
    ['Branch dɛn we Tay', 'Rijɔn we gɛt branch nɔ kin dilit.', 'Ɛvri rijɔn de sho di branch dɛn we tay pan am. Wan we gɛt branch nɔ go dilit sote dɛn muv ɛvri branch.'],
  ],
  'platform-fellowships': [
    ['Di Fɛloship dɛn', 'Ɛvri smɔl grup, ɛn in tayp.', 'Fɛloship de lis ɛvri smɔl grup: K-Groups, Kharis Express, New Breeds ɛn di ɔda dɛn, wit udat de lid ɛn we tɛm dɛn de mit.'],
    ['Filta bay Tayp', 'Mek am smɔl to wetin yu want.', 'Di bɔtin dɛn pan tɔp de filta bay tayp, ɛn di drɔpdawn de mek am smɔl to wan branch, we impɔtant if plɛnti de.'],
    ['Fɛn am pan Map', 'Di grup we nia di mɛmba.', 'Di map de put dɛn bay ples, we na di ansa to di kwɛstyɔn we pipul de aks: wetin wan nia mi.'],
  ],
  'platform-departments': [
    ['Ministri Tim dɛn', 'Ɛvri tim, ɛn udat de lid am.', 'Dipatmɛnt dɛn na di ministri tim dɛn. Ɛvri wan de sho in lida, in dɛpyuti, ɛn omɔch pipul de sav pan am.'],
    ['Insay wan Dipatmɛnt', 'Mɛmba lis, rota, rikrutmɛnt, yunifɔm.', 'Opin wan ɛn yu gɛt in mɛmba lis, in sav rota, di pipul we de aplay, ɛn di yunifɔm fɔ wan sɛvis we de kam.'],
  ],
  'platform-attendance': [
    ['Sɛvis dɛn', 'Ɛvri gadarin, ɛn in rɛjista.', 'Atɛndans de lis di sɛvis dɛn. Ɛvri wan de sho omɔch dɛn rɛkɔd ɛn if di rɛjista stil opin.'],
    ['Rɛkɔd Udat Kam', 'Di dɛsk, ɔ di mɛmba insɛf.', 'Opin wan sɛvis fɔ mak pipul prɛzɛnt, let ɔ vɔchwal. Mɛmba kin chɛk dɛnsɛf in wit di QR kod na di dɔ.'],
  ],
  'platform-membership': [
    ['Di Klas', 'Fo wik, ɛn wetin i de gi.', 'Mɛmbaship na di fo-wik klas. Fɔ finish am na wetin mek pɔsin Mɛmba fɔ tru, nɔ mata aw lɔng dɛn de kam.'],
    ['Koɔt dɛn', 'Intek, mak ɛn grajueshɔn.', 'Wan koɔt na wan intek. Yu skɛjul in fo sɛshɔn, mak atɛndans ɛn di las tɛst, ɛn grajuet di pipul we pas.'],
  ],
  'platform-new-believers': [
    ['Di Paiplain', 'Fo sɛshɔn, dɛn wan dipatmɛnt.', 'Nyu Biliva na di disaypulship trak. Fo sɛshɔn, dɛn jɔyn wan dipatmɛnt, wit ɛvri pɔsin we yu kin si pan di bɔd.'],
    ['Sɛshɔn dɛn', 'Skɛjul, tich ɛn rɛjista.', 'Dɛn de skɛjul sɛshɔn pɛ branch wit ticha ɛn de. Tek di rɛjista insay di sɛshɔn, dɛn muv pipul go di nɛks stej.'],
  ],
  'platform-follow-ups': [
    ['Di Lis dɛn', 'Fɔs-tɛm, nɔ grup, ɛn let.', 'Fɔlo ɔp gɛt tri lis: fɔs-tɛm pipul we nɔbɔdi nɔ tɔk to yet, pipul we nɔ de na ɛni grup, ɛn kɔntakt dɛn we dɔn let.'],
    ['Rɛkɔd Wan', 'Udat, aw, ɛn wetin nɛks.', 'Fɔ rɛkɔd fɔlo ɔp de kip udat tɔk to am, aw, wetin apin, ɛn wetin fɔ apin nɛks. Dɛn kin mak am as wɔri bak.'],
  ],
  'platform-concerns': [
    ['Wɛlfɛa ɛn Sefgadin', 'Tu inbɔks, sɛpret pɔposli.', 'Wɔri gɛt tu inbɔks. Wɛlfɛa ɛn sefgadin de sɛpret pɔposli, ɛn difrɛn pipul de rid dɛn.'],
    ['Fɔ Rid Wan', 'Di rɛkɔd, ɛn udat bring am.', 'If yu opin wan wɔri i de sho di fɔlo ɔp usay i kɔmɔt, udat bring am, ɛn wetin dɛn dɔn du bɔt am.'],
  ],
  'platform-outreach': [
    ['Program dɛn', 'Ɛvanjelizm, wit de ɛn ples.', 'Awtrich program dɛn na di ɛvanjelizm ivɛnt dɛn: usay, we tɛm, ɛn wetin wɔka dɛn de go awt.'],
    ['Kach wan Sol', 'Nem ɛn nɔmba inɔf.', 'Durin awtrich yu de kach di pipul we yu mit. Nem ɛn fon nɔmba inɔf fɔ stat; di paiplain go tek am frɔm de.'],
  ],
  'platform-forms': [
    ['Di Fɔm dɛn', 'Siks, fɔ wetin pipul de aks.', 'Fɔm kɔva fɔs-tɛm vizit, baptizm, tɛstimoni, pikin nem-gi, pikin dedikeshɔn ɛn di Nyu Biliva klas.'],
    ['Ful Wan', 'I de rich di rayt pɔsin.', 'Ful wan ɛn i de lan wit udat de andul am, wit di pɔsin link to dɛn rɛkɔd if dɛn dɔn gɛt wan.'],
  ],
  'platform-souls-pipeline': [
    ['Di Bɔd', 'Nyu, wi de fɔlo ɔp, i kɔnvat.', 'Di sol paiplain na wan bɔd. Pɔsin de muv frɔm nyu, to wi de fɔlo ɔp, to i kɔnvat, ɛn di kɔlɔ sho aw let di kɔntakt de.'],
    ['Muv Sɔmbɔdi', 'Drag am, ɔ opin ɛn ɔpdet.', 'Drag wan kad go di nɛks layn, ɔ opin am fɔ rɛkɔd wetin apin ɛn sɛt di nɛks fɔlo ɔp de.'],
  ],
  'platform-souls-dashboard': [
    ['Di Nɔmba dɛn', 'Aw di paiplain de du.', 'Di sol dashbɔd de tɔn di paiplain to nɔmba: omɔch na ɛvri stej, omɔch kɔnvat, ɛn aw fresh di fɔlo ɔp dɛn de.'],
    ['Bay Stetɔs', 'Klik wan ba fɔ si udat.', 'Di chat dɛn de brok am dɔŋ bay stetɔs ɛn bay ɔjɛnsi. Klik ɛni ba fɔ si ɛgzakli wetin pipul i de kawnt.'],
  ],
  'platform-profile': [
    ['Yu Infɔmeshɔn', 'Yu kɔntakt infɔmeshɔn.', 'Yu prɔfayl kip yu kɔntakt infɔmeshɔn, yu om branch, ɛn di rol dɛn we dɛn gi yu akrɔs di chɔch.'],
    ['Yu Sɛtin dɛn', 'Sikyuriti, notifikeshɔn, langwej.', 'Sɛtin kɔva yu paswɔd ɛn aw yu de sayn in, wetin notifikeshɔn yu de gɛt, ɛn di langwej we Kairos de tɔk to yu.'],
  ],
  'church-management-member-lifecycle': [
    ['Frɔm Vizitɔ to Mɛmba', 'Fo stej, wan lis.', 'Ɔlman de sidɔm sɔm say pan di sem jɔni: vizitɔ, ritɔna, dɛn mɛmba wan tɛm di fo-wik klas dɔn.'],
    ['Usay Stetɔs de Sho', 'Pan di layn, ɛn pan di prɔfayl.', 'Di dairɛktri layn de sho wetin stej pɔsin de, so yu kin si wantɛm udat nɔbɔdi nɔ eva fɔlo ɔp.'],
  ],
  'church-management-attendance-tracking': [
    ['Tek di Rɛjista', 'Na di dɛsk, we pipul de kam.', 'Opin di sɛvis ɛn mak pipul prɛzɛnt, let ɔ vɔchwal we dɛn de kam. Absɛns de kɔmɔt bay insɛf, so natin nɔ de fɔ mak.'],
    ['Sɛf Chɛk-in', 'QR kod na di dɔ.', 'Mɛmba kin skan di kod na di dɔ ɛn mak dɛnsɛf prɛzɛnt, we de lɛf di dɛsk fri fɔ di pipul we nid am.'],
  ],
  'church-management-fellowship-management': [
    ['Ron wan Fɛloship', 'Yu grup, yu rɛjista.', 'If yu de lid wan fɛloship yu de manej in mɛmba dɛn, rɛkɔd ɛvri mitin, ɛn si udat dɔn kwayɛt stɔp fɔ kam.'],
    ['In Mitin dɛn', 'Wan rɔl kɔl pɛ mitin.', 'Ɛvri mitin gɛt in yon rɔl kɔl. Ɔva fyu wik dat de tɔn di atɛndans patan we di ripɔt dɛn de rid.'],
  ],
  'church-management-branch-management': [
    ['Branch Sɛtin', 'Infɔmeshɔn, skɛjul, chɛk-in.', 'Wan branch kɛr in adrɛs, in sɛvis skɛjul, ɛn if sɛf chɛk-in de ɔn ɛn fɔ omɔch tɛm rawnd di sɛvis.'],
    ['Udat de Lid am', 'Pasto, minista, admin.', 'Dɛn de gi lidaship ya: di mayn pasto, ɛni minista, ɛn di branch admin dɛn we kin manej in data.'],
  ],
  'church-management-reporting': [
    ['Wetin dɛn de Ripɔt', 'Atɛndans, groth, ɛngejmɛnt.', 'Ripɔt kɔva atɛndans trɛnd, mɛmbaship groth, ɛngejmɛnt ɛn awtrich, ɛvri wan insay wetin yu rol kin si.'],
    ['Chenj di Tɛm', 'Di las mɔnt, ɔ di las ia.', 'Chenj di tɛm fɔ mek am big ɔ smɔl. Di nɔmba dɛn ɛn ɛvri chat de fɔlo am.'],
  ],
  'church-management-department-administration': [
    ['Mɛmba Lis ɛn Rota', 'Udat de sav, ɛn we tɛm.', 'Wan dipatmɛnt de kip lis fɔ udat de sav pan am ɛn rota fɔ udat de sav we tɛm, put awt fyu wik bifo.'],
    ['Rikrutmɛnt', 'Aplay, intavyu, trayal.', 'Rikrutmɛnt de ron frɔm apliksheɔn tru intavyu ɛn ɔfa go na trayal tɛm, wit ɛvri kandidet we yu kin si na dɛn stej.'],
  ],
  'administration-permissions': [
    ['Grant, Nɔto Jɔb Nem', 'Wan rol, tay to wan ples.', 'Pamishɔn kɔmɔt frɔm grant: wan rol we dɛn nem, tay to wan branch, wan fɛloship, wan dipatmɛnt, ɔ di ol chɔch.'],
    ['Gi Wan', 'Gi am, ɛn i wok wantɛm.', 'Gi wan grant ɛn dat pɔsin de si di ɛkstra sɛkshɔn dɛn wantɛm. Pul am ɛn i stɔp, bɔt dɛn istri de de.'],
  ],
  'administration-capabilities': [
    ['Wetin na Kapabiliti', 'Wetin wan grant de gi fɔ tru.', 'Wan grant na bɔndul fɔ kapabiliti. Wan kapabiliti na di wan tin we i alaw yu fɔ du, lɛk rid wan branch ɔ rayt to wan dipatmɛnt.'],
    ['Usay dɛn de Wok', 'Ɛvri pej de chɛk dɛn.', 'Ɛvri pej ɛn ɛvri akshɔn de chɛk wan kapabiliti, na dat mek tu pɔsin wit difrɛn grant de si difrɛn skrin fɔ tru.'],
  ],
  'administration-approvals': [
    ['Di Lis', 'Pipul we de wet fɔ kam insay.', 'Di aproval lis gɛt ɔlman we dɔn rejista bɔt dɛn nɔ aprov am yet. Sote dɛn aprov am, i nɔ kin sayn in.'],
    ['Aprov Sɔmbɔdi', 'Chɛk di branch, dɛn aprov.', 'Chɛk di branch we dɛn pik ɛn di infɔmeshɔn we dɛn gi, dɛn aprov. Dɛn kin sayn in frɔm dat minit.'],
  ],
  'administration-settings': [
    ['Yu Sɛtin dɛn', 'Akawnt, sikyuriti, aw i luk.', 'Sɛtin kɔva yu akawnt, aw yu de sayn in, aw Kairos de luk, ɛn wetin langwej i de tɔk to yu.'],
    ['Notifikeshɔn', 'Wetin de rich yu, ɛn omɔch tɛm.', 'Notifikeshɔn na pɛ katigɔri. Pik naw naw ɔ wan de sɔmari fɔ ɛvri wan, ɔ tɔn am ɔf. Sikyuriti alat de kam ɔltɛm.'],
  ],
  'analytics-church-health': [
    ['Di Chɔch Ɛlti?', 'Atɛndans agens di rɔl.', 'Chɔch ɛlt de kɔmpɛr udat de kam fɔ tru agens udat de pan di rɔl, we na wan at ɛn mɔ yuzful nɔmba dan ɛni wan wangren.'],
    ['Rid di Trɛnd', 'Di dairɛkshɔn impɔtant pas.', 'Wan wik wangren nɔ de tɔk mɔch. Na di trɛnd ɔva et wik de tɛl yu if sɔntin de wok.'],
  ],
  'analytics-engagement': [
    ['Udat de Tek Pat', 'Mɔ dan jɔs fɔ kam.', 'Ɛngejmɛnt de kawnt mɔ dan atɛndans: if pɔsin de na grup, de sav pan tim, ɛn if dɛn de fɔlo ɔp am.'],
    ['Di Ɛngejmɛnt Vyu', 'Usay pipul de fɔl awt.', 'Di brek dɔŋ de sho usay pipul de lɛf, we jenarali de apin bifo dɛn stɔp fɔ kam, nɔto afta.'],
  ],
  'analytics-growth-reports': [
    ['Groth', 'Nyu mɛmba dɛn, ɔva tɛm.', 'Groth ripɔt de kawnt nyu mɛmba dɛn ɔva di tɛm, usay dɛn jɔyn, ɛn aw dat tan agens di mɔnt dɛn bifo.'],
    ['Nyu Mɛmba dɛn', 'Usay dɛn kɔmɔt.', 'Di brek dɔŋ de sho wetin branch ɛn wetin we dɛn kam tru, so yu kin si wetin de bring pipul fɔ tru.'],
  ],
  'analytics-attendance-reports': [
    ['Atɛndans Ripɔt', 'Pɛ wik, pɛ branch.', 'Atɛndans ripɔt de sho chɛk-in pɛ wik agens difrɛn mɛmba, we de sɛpret di sem pipul we de kam ɔltɛm frɔm mɔ pipul we de kam.'],
    ['Udat Nɔ De', 'Sɔt bay aw lɔng.', 'Di misin mɛmba lis sɔt bay omɔch sɛvis pɔsin dɔn mis wan afta di ɔda, we na di lis we pastɔral kia nid fɔ tru.'],
  ],
  'getting-started-your-first-church': [
    ['Fɔ Sɛt Ɔp', 'Rijɔn fɔs, dɛn branch.', 'Fɔ sɛt ɔp de stat wit rijɔn, dɛn di branch dɛn insay dɛn, bikɔs ɛvri mɛmba ɛn ɛvri grup bilɔng to wan branch.'],
    ['Yu Fɔs Branch', 'Nem am, put am, lid am.', 'Gi di branch wan nem, wan siti ɛn sɛvis skɛjul, dɛn gi in pasto. Mɛmba dɛn kin kam afta dat.'],
  ],
  'getting-started-roles-permissions': [
    ['Udat Kin Du Wetin', 'Tu sistem rol, plɛnti grant.', 'Kairos de kip tu sistem rol nɔmɔ, admin ɛn mɛmba. Ɔl di ɔda tin na grant: wan rol we tay to wan spɛshal ples.'],
    ['Si am pan Akawnt', 'Opin di pɔsin, rid di grant dɛn.', 'Opin sɔmbɔdi ɛn yu kin si ɛvri grant we dɛn gɛt ɛn usay i de wok, we na di trutru ansa to wetin mek dɛn kin si wan pej.'],
  ],
};
