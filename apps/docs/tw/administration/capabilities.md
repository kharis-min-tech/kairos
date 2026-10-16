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

Nneɛma mmienu a ɛnni hɔ no, ɛyɛ hyɛ da:

- **`members:write` nni hɔ.** Ɔmanfoɔ nkrataa yɛ asɔre baa nsɛm, enti `branch:write` na ɛbɔ wɔn ho ban.
- **`membership:admin` nni kenkan/twerɛ nkyekyɛmu.** Asɔremufoɔ nhwɛmu biara a ɛma asɔremufoɔ no nhia akwannya biara, enti biribiara a akwannya no bɔ ho ban no yɛ sohwɛ adwuma.

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

Kane no na `welfare:read` gyina `branch:write` so. Ɛno kyerɛ sɛ Asɔre Baa Nkrataa Sohwɛfoɔ, dibea a adwuma nko ara wɔ mu a ɔhwɛ ho tumi biara nni mu no, tumi kenkan mmoa ne ahobammɔ nkrataa beaeɛ nyinaa. Sɛ wɔmaa mmoa ɔno ankasa akwannya no, ɛsiesieeɛ.

Sɛdeɛ ɛte seesei no yɛ hyɛ da wɔ afanu nyinaa:

- `BranchAdmin` kura `welfare:read` nanso **ɔnkura** `safeguarding:read`. Mmoa yɛ ɔhwɛ na ɛyɛ asɔre baa akannifoɔ dea.
- `SafeguardingLead` kura `safeguarding:read` nanso **ɔnkura** `welfare:read`. Ahobammɔ yɛ banbɔ na ɛyɛ obi a ɔnni asɔre baa akannifoɔ ase dea. Ahobammɔ Kannifoɔ no yɛ onipa foforɔ a ɔnyɛ asɔre baa no Sɔfopanin, hyɛ da.
- Sɔfopanin nya ahobammɔ ani denam `BranchPastor` tumi a ɛfiri dibea mu no so, enti Ɔsɔfoɔ a ɔkura Asɔre Baa Nhyehyɛeɛ Sohwɛfoɔ tumi korɔ no ara no nnya bi.
- `BranchDataAdmin` nkura emu biara.

## Sɛdeɛ wɔsi nhwɛsoɔ gyinae

Dwumadie baako na ɛsi akwannya nhwɛsoɔ biara gyinae wɔ nhyehyɛeɛ no mu: `matchesCapability` wɔ `packages/types/src/rbac.ts` mu. Sɛɛva no fa so hyɛ, na wɛb app ne mobile app no de bɔ wɔn bɔtin ho ban, enti bɔtin a app biara kyerɛ no yɛ bɔtin a sɛɛva no bɛgye atom. Wɔde nsa kopiee kɔɔ mmeaeɛ mmiɛnsa kɔsi sɛ asɔre no nyinaa beaeɛ no baeɛ; kopi no nni hɔ bio, na ɛnsɛ sɛ foforɔ pue.

Mmara no, sɛdeɛ ɛdidi so:

1. **`systemRole` yɛ `admin`.** Wɔma kwan bere biara. Yei ne ntɛmpɛ ɔkwan no.
2. **Wɔammisa beaeɛ biara.** Tumi biara a ɛkura akwannya no dɔɔso.
3. **Ɛhyia pɛpɛɛpɛ.** Tumi no beaeɛ su ne ne id ne deɛ wɔrepɛ no yɛ pɛ.
4. **Ɛhyia wɔ nnidisoɔ mu.** `branch` tumi sɔ `fellowship` anaa `department` ani wɔ asɔre baa korɔ no mu, sɛ deɛ ɔrebisa no de ne asɔre baa a ɛhyɛ so ka ho a.
5. **Asɔre tumi duru biribiara so.** Asɔre baako pɛ na ɛwɔ hɔ na ɛno ne ntini no, enti asɔre no nyinaa tumi sɔ biribiara ani wɔ baabiara: asɔre baa biara, fekuo biara, adwumakuo biara. Saa na Ahobammɔ Panin kenkan asɔre baa biara nhwɛmu firi tumi baako mu.
6. **Asɔre beaeɛ nnye nnidisoɔ mu ɔhyiaeɛ.** Ɛkɔ ɔkwan baako pɛ so. Asɔre baa so tumi biara, sɛ obi kura dodoɔ biara mpo a, nsɔ asɔre no nyinaa nhwɛsoɔ ani da. Asɔre tumi nko ara, anaa nhyehyɛeɛ sohwɛfoɔ, na ɛyɛ.

Mmara 6 no na ɛyɛ nnipa nwanwa. Ɔmanfoɔ a ɔyɛ Asɔre Baa Nhyehyɛeɛ Sohwɛfoɔ ma asɔre baa biara a ɛwɔ asɔre no mu no, ɔda so ntumi nhwɛ asɔremufoɔ nhyehyɛeɛ no so, ɛfiri sɛ nhyehyɛeɛ no yɛ asɔre no nyinaa dea na asɔre no nni asɔre baa biara mu.

## Baabi a tumi firi

Wɔhwehwɛ tumi firi nkrataakoraeɛ mu wɔ bisadeɛ biara mu, denam `resolveGrants` a ɛwɔ `apps/api/src/lib/grants.ts` mu so. Ɛde nneɛma mmienu bom:

1. **Tumi a wɔakora** wɔ `member_roles` tebo mu: nsɛntitire a woyɛ bere a wode dibea ma. Asɔre no nyinaa nsɛntitire kora id ananmusideɛ ma beaeɛ no, na asɔre baa a ɛwɔ nsɛntitire no so no yɛ sie beaeɛ pɛ, ɛnyɛ tumi no ntrɛsoɔ.
2. **Asɔre Baa Sɔfo tumi a ɛfiri dibea mu**, a wɔyɛ ma obi a ɔwɔ Sɔfopanin nsɛntitire no mu wɔ `branch_leadership` mu ma asɔre baa bi. Wɔntwerɛ no `member_roles` mu da na ɛmpue dibea nhwɛmu no mu da.

## Sɛdeɛ koodu no fa so bɔ ho ban

Wɔ sɛɛva so:

```ts
// One capability, scoped to a route parameter
requireCapability('branch:write', (c) => c.req.param('branchId'))

// Any one of a set is enough
requireAnyCapability(['branch:write', 'safeguarding:read'])

// Inside a service, where the entity is already loaded
enforceBranchScope(auth, branchId)
enforceLeaderOrAbove(auth, entity)
```

Wɔ wɛb app no mu:

```ts
const caps = useCapabilities()

if (caps.has('branch:write', { kind: 'branch', id: branchId })) {
  // show the edit control
}
```

Mmienu nyinaa frɛ ɔhwɛfoɔ korɔ no ara. Hunu sɛ afa bi, titiriw asɔremufoɔ afa no, yɛ wɔn nhwɛsoɔ wɔ adwuma fa no mu na ɛnyɛ ɔkwan no so, ɛfiri sɛ ɔkwan baako tumi ma nnipa ahodoɔ a wɔwɔ tumi soronko duru hɔ a wɔn ɛhyeɛ nsɛ. Kenkan adwuma fa no, na ɛnyɛ ɔkwan no nko ara, bere a wopɛ sɛ wohunu hwan na ɔtumi frɛ biribi.
