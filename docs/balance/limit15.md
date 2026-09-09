# 전략 토너먼트 결과 — 15분 제한

- 전략 33개, 총 8448판 (매치업당 16판, 진영 교대)
- 승률 신뢰구간: Wilson 95%. seed 4242.

| # | 전략 | 승률 | 95% CI | 승-패-무 | 평균 시간 | 최악의 상대 (승률) | 최고의 상대 (승률) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 표준 병영 업그레이드 없음 `std2_noBarracksUp` | 77.3% | 74–81% | 396-116-0 | 7.5분 | std2_mix_3L (56%) | std2_mix_1L (100%) |
| 2 | 표준 + 병영 업그레이드 집중 `std2_barracksFocus` | 72.5% | 68–76% | 371-139-2 | 7.6분 | std2_mix_4L_turret (38%) | std2_mix_1L (100%) |
| 3 | 표준 혼합 + 디펜스1/레인 `std2_mix_4L_def1` | 71.5% | 67–75% | 366-139-7 | 7.8분 | std2_t2only (38%) | std2_mix_1L (100%) |
| 4 | 표준 혼합 + 디펜스2/레인 `std2_mix_4L_def2` | 70.9% | 67–75% | 363-149-0 | 7.6분 | std2_noBarracksUp (25%) | ecoOnly12 (100%) |
| 5 | 표준 혼합 + 포탑1/레인 `std2_mix_4L_turret` | 70.9% | 67–75% | 363-148-1 | 7.7분 | std2_noBarracksUp (25%) | rush1_ant_1L (100%) |
| 6 | 표준 + 성 업그레이드 집중 `std2_castleFocus` | 70.7% | 67–74% | 362-150-0 | 7.6분 | std2_noBarracksUp (13%) | rush1_ant_1L (100%) |
| 7 | 표준 T2까지만 해금 `std2_t2only` | 69.7% | 66–74% | 357-151-4 | 7.8분 | std2_noBarracksUp (25%) | eco3_mix_4L_react (100%) |
| 8 | 표준(농장2) 혼합 4레인 `std2_mix_4L` | 68.9% | 65–73% | 353-157-2 | 7.6분 | std2_noBarracksUp (31%) | wallFirst_rush (100%) |
| 9 | 표준 혼합 + 가시덤불1/레인 `std2_mix_4L_wall` | 68.2% | 64–72% | 349-163-0 | 7.4분 | std2_beetle_4L (31%) | wallFirst_rush (100%) |
| 10 | 표준 성 업그레이드 없음 `std2_noCastle` | 67.8% | 64–72% | 347-165-0 | 7.3분 | std2_t2only (25%) | rush1_ant_1L (100%) |
| 11 | 표준 개미 4레인 `std2_ant_4L` | 65.6% | 61–70% | 336-176-0 | 7.7분 | std2_mix_4L_def1 (19%) | wallFirst_rush (100%) |
| 12 | 표준 혼합 3레인 `std2_mix_3L` | 65.4% | 61–69% | 335-177-0 | 7.8분 | std2_ant_4L (25%) | ecoOnly12 (100%) |
| 13 | 표준 T1만 (해금 없음) `std2_noUnlock` | 61.7% | 57–66% | 316-196-0 | 7.2분 | std2_barracksFocus (19%) | ecoOnly12 (100%) |
| 14 | 러시(농장1) 혼합 4레인 `rush1_mix_4L` | 60.9% | 57–65% | 312-200-0 | 7.7분 | std2_mix_4L (25%) | ecoOnly12 (100%) |
| 15 | 표준 혼합 반응형 `std2_mix_4L_react` | 60.4% | 56–64% | 309-203-0 | 7.6분 | honey_eco (19%) | ecoOnly12 (100%) |
| 16 | 표준 혼합 2레인 `std2_mix_2L` | 58.6% | 54–63% | 300-212-0 | 7.9분 | rush1_mix_4L (13%) | defenseOnly (100%) |
| 17 | 꿀단지 경제(농장3) `honey_eco` | 58.2% | 54–62% | 298-214-0 | 6.7분 | std2_noCastle (19%) | turtle3_def2 (100%) |
| 18 | 표준 딱정벌레 4레인 `std2_beetle_4L` | 58.2% | 54–62% | 298-214-0 | 8.4분 | eco3_beetle_4L (19%) | rush1_ant_1L (100%) |
| 19 | 경제(농장3) 혼합 4레인 `eco3_mix_4L` | 57.6% | 53–62% | 295-217-0 | 6.8분 | eco3_beetle_4L (19%) | rush1_ant_1L (100%) |
| 20 | 러시(농장1) 혼합 2레인 `rush1_mix_2L` | 56.1% | 52–60% | 287-225-0 | 7.9분 | std2_t2only (19%) | turtle3_def2 (100%) |
| 21 | 경제 딱정벌레 4레인 `eco3_beetle_4L` | 52.0% | 48–56% | 266-246-0 | 7.9분 | std2_noBarracksUp (13%) | rush1_ant_1L (100%) |
| 22 | 표준 사마귀 4레인 `std2_mantis_4L` | 47.3% | 43–52% | 242-270-0 | 7.6분 | std2_castleFocus (13%) | std2_mix_1L (100%) |
| 23 | 러시 사마귀 2레인 `rush1_mantis_2L` | 41.0% | 37–45% | 210-302-0 | 8.0분 | std2_mix_4L_def1 (0%) | turtle3_def2 (100%) |
| 24 | 러시 혼합 2레인 반응형 `rush1_mix_2L_react` | 41.0% | 37–45% | 210-302-0 | 8.1분 | std2_mix_4L_def1 (0%) | turtle3_def2 (100%) |
| 25 | 경제 혼합 반응형 `eco3_mix_4L_react` | 37.9% | 34–42% | 194-318-0 | 6.8분 | std2_mix_4L (0%) | ecoOnly12 (100%) |
| 26 | 러시 딱정벌레 2레인 `rush1_beetle_2L` | 30.7% | 27–35% | 157-355-0 | 9.1분 | std2_noUnlock (0%) | ecoOnly12 (100%) |
| 27 | 탐욕(농장5) 혼합 4레인 `greedy5_mix_4L` | 28.7% | 25–33% | 147-365-0 | 6.7분 | std2_beetle_4L (0%) | std2_mix_1L (100%) |
| 28 | 러시 개미 1레인 올인 `rush1_ant_1L` | 17.2% | 14–21% | 88-424-0 | 8.5분 | eco3_mix_4L (0%) | turtle3_def2 (100%) |
| 29 | 표준 혼합 1레인 올인 `std2_mix_1L` | 16.6% | 14–20% | 85-427-0 | 8.3분 | greedy5_mix_4L (0%) | turtle3_def2 (100%) |
| 30 | 경제 올인(농장12) `ecoOnly12` | 9.6% | 7–12% | 49-463-0 | 6.3분 | rush1_mix_4L (0%) | defenseOnly (100%) |
| 31 | 벽 먼저 → 러시 `wallFirst_rush` | 9.2% | 7–12% | 47-465-0 | 6.9분 | std2_mix_4L (0%) | defenseOnly (100%) |
| 32 | 터틀(농장3→디펜스2→병영) `turtle3_def2` | 6.3% | 4–9% | 32-480-0 | 7.0분 | rush1_mix_2L (0%) | defenseOnly (100%) |
| 33 | 디펜스 올인 `defenseOnly` | 0.0% | 0–1% | 0-512-0 | 6.9분 | rush1_mix_4L (0%) | rush1_mix_4L (0%) |

## 상위 8개 상호 승률 (행 기준 승률 %)

| | `std2_noBarracksUp` | `std2_barracksFocus` | `std2_mix_4L_def1` | `std2_mix_4L_def2` | `std2_mix_4L_turret` | `std2_castleFocus` | `std2_t2only` | `std2_mix_4L` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `std2_noBarracksUp` | — | 56 | 63 | 75 | 75 | 88 | 75 | 69 |
| `std2_barracksFocus` | 44 | — | 38 | 44 | 38 | 50 | 50 | 50 |
| `std2_mix_4L_def1` | 38 | 56 | — | 50 | 44 | 50 | 38 | 50 |
| `std2_mix_4L_def2` | 25 | 56 | 50 | — | 50 | 50 | 56 | 50 |
| `std2_mix_4L_turret` | 25 | 63 | 50 | 50 | — | 50 | 50 | 50 |
| `std2_castleFocus` | 13 | 50 | 50 | 50 | 50 | — | 69 | 56 |
| `std2_t2only` | 25 | 50 | 38 | 44 | 50 | 31 | — | 50 |
| `std2_mix_4L` | 31 | 44 | 44 | 50 | 50 | 44 | 50 | — |

실행 시간 828s
