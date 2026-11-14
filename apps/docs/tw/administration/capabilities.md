# Tumi Nhwɛmu

<SectionClip slug="administration/capabilities" />

Kratafa yi ne [Akwannya](/tw/administration/permissions) no deɛ emu da hɔ pɔtee. Wɔatwerɛ ama obi a ɛsɛ sɛ ɔbua sɛ "adɛn enti na onipa yi tumi hunu saa?" a akyinnyeɛ biara nni mu, ne wɔn a wɔreyɛ nhyehyɛeɛ no mu adwuma.

Wɔnhwɛ tumi no tẽẽ. Wɔdane tumi biara kɔ **akwannya** bagua bi mu, na ɔpon biara a ɛwɔ Kairos mu, wɔ sɛɛva so ne app mmienu no mu, bisa asɛm korɔ no ara: onipa yi kura saa akwannya yi wɔ saa beaeɛ yi anaa?

## Akwannya nhwɛmu

Yeinom ne ne nyinaa. Foforɔ biara nni hɔ.

| Akwannya | Deɛ ɛbɔ ho ban |
|------------|---------------|
| `branch:read` | Asɔre baa nsɛm a wokenkan a ɛtra asɔre mmaa ɛhyeɛ so |
| `branch:write` | Asɔre baa adwuma: ɔmanfoɔ nkrataa, nsɛm a wɔde ba ne deɛ wɔyi, mmaeɛ, nkɔdi akyi nhwɛmu |
| `branch:rbac` | Asɔre Baa Nhyehyɛeɛ Sohwɛfoɔ a wode ma, ne akannifoɔ a wopaw anaa woyi |
| `fellowship:read` | Fekuo baako mufoɔ ne nhyiamu a wokenkan |
| `fellowship:write` | Fekuo baako a wohwɛ so: mufoɔ, abisadeɛ, nhyiamu, mmaeɛ |
| `department:read` | Adwumakuo baako mufoɔ a wokenkan |
| `department:write` | Adwumakuo baako a wohwɛ so: mufoɔ, abisadeɛ, nnidisoɔ, ntadeɛ, adwumayɛfoɔ gyeɛ |
| `safeguarding:read` | [Nsɛm a Ɛhaw](/tw/platform/concerns) nkrataa beaeɛ no ahobammɔ tab |
| `safeguarding:write` | Ahobammɔ asɛm bi a woyɛ ho adeɛ |
| `welfare:read` | [Nsɛm a Ɛhaw](/tw/platform/concerns) nkrataa beaeɛ no mmoa tab |
| `signup:approve` | Obi a ɔkyerɛw ne din ankasa a wopene so anaa wopo |
| `newbelievers:mentor` | Ɔkwankyerɛ adwuma wɔ Gyidifoɔ Foforɔ ɔkwan no mu |
| `newbelievers:teach` | Nkyerɛkyerɛ adwuma wɔ Gyidifoɔ Foforɔ ɔkwan no mu |
| `membership:admin` | [Asɔremufoɔ adesua nhyehyɛeɛ](/tw/platform/membership) no sohwɛ adwuma nyinaa |
| `membership:branch:read` | Asɔremufoɔ Ɔboafoɔ kenkan-nko nhwɛmu wɔ asɔre baa baako nkɔsoɔ so |

## Tumi biara akwannya

| Tumi | Akwannya |
|-------|--------------|
| `BranchAdmin` | `branch:read`, `branch:write`, `branch:rbac`, `signup:approve`, `welfare:read` |
| `BranchDataAdmin` | `branch:read`, `branch:write`, `signup:approve` |
| `FellowshipLeader` | `fellowship:read`, `fellowship:write` |
| `DepartmentLeader` | `department:read`, `department:write` |
| `DepartmentDeputy` | `department:read`, `department:write` |
| `SafeguardingLead` | `safeguarding:read`, `safeguarding:write` |
| `SafeguardingHead` | `safeguarding:read`, `safeguarding:write` |
| `BranchPastor` (ɛfiri dibea mu) | `safeguarding:read`, `safeguarding:write` |
| `NewBelieversMentor` | `newbelievers:mentor` |
| `NewBelieversTeacher` | `newbelievers:teach` |
| `MembershipAdmin` | `membership:admin` |
| `MembershipChampion` | `membership:branch:read` |

### Deɛ enti a mmoa ne ahobammɔ da nsow

Sɛdeɛ ɛte seesei no yɛ hyɛ da wɔ afanu nyinaa:

- `BranchAdmin` kura `welfare:read` nanso **ɔnkura** `safeguarding:read`. Mmoa yɛ ɔhwɛ na ɛyɛ asɔre baa akannifoɔ dea.
- `SafeguardingLead` kura `safeguarding:read` nanso **ɔnkura** `welfare:read`. Ahobammɔ yɛ banbɔ na ɛyɛ obi a ɔnni asɔre baa akannifoɔ ase dea. Ahobammɔ Kannifoɔ no yɛ onipa foforɔ a ɔnyɛ asɔre baa no Sɔfopanin, hyɛ da.
- Sɔfopanin nya ahobammɔ ani denam `BranchPastor` tumi a ɛfiri dibea mu no so, enti Ɔsɔfoɔ a ɔkura Asɔre Baa Nhyehyɛeɛ Sohwɛfoɔ tumi korɔ no ara no nnya bi.
- `BranchDataAdmin` nkura emu biara.

## Sɛdeɛ wɔsi nhwɛsoɔ gyinae

Mmara no, sɛdeɛ ɛdidi so:

1. **`systemRole` yɛ `admin`.** Wɔma kwan bere biara. Yei ne ntɛmpɛ ɔkwan no.
2. **Wɔammisa beaeɛ biara.** Tumi biara a ɛkura akwannya no dɔɔso.
3. **Ɛhyia pɛpɛɛpɛ.** Tumi no beaeɛ su ne ne id ne deɛ wɔrepɛ no yɛ pɛ.
4. **Ɛhyia wɔ nnidisoɔ mu.** `branch` tumi sɔ `fellowship` anaa `department` ani wɔ asɔre baa korɔ no mu, sɛ deɛ ɔrebisa no de ne asɔre baa a ɛhyɛ so ka ho a.
5. **Asɔre tumi duru biribiara so.** Asɔre baako pɛ na ɛwɔ hɔ na ɛno ne ntini no, enti asɔre no nyinaa tumi sɔ biribiara ani wɔ baabiara: asɔre baa biara, fekuo biara, adwumakuo biara. Saa na Ahobammɔ Panin kenkan asɔre baa biara nhwɛmu firi tumi baako mu.
6. **Asɔre beaeɛ nnye nnidisoɔ mu ɔhyiaeɛ.** Ɛkɔ ɔkwan baako pɛ so. Asɔre baa so tumi biara, sɛ obi kura dodoɔ biara mpo a, nsɔ asɔre no nyinaa nhwɛsoɔ ani da. Asɔre tumi nko ara, anaa nhyehyɛeɛ sohwɛfoɔ, na ɛyɛ.

Mmara 6 no na ɛyɛ nnipa nwanwa. Ɔmanfoɔ a ɔyɛ Asɔre Baa Nhyehyɛeɛ Sohwɛfoɔ ma asɔre baa biara a ɛwɔ asɔre no mu no, ɔda so ntumi nhwɛ asɔremufoɔ nhyehyɛeɛ no so, ɛfiri sɛ nhyehyɛeɛ no yɛ asɔre no nyinaa dea na asɔre no nni asɔre baa biara mu.
