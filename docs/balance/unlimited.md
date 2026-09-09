# 전략 토너먼트 결과 — 무제한 (30분 후 무승부)

- 전략 33개, 총 8448판 (매치업당 16판, 진영 교대)
- 승률 신뢰구간: Wilson 95%. seed 4242.

| # | 전략 | 승률 | 95% CI | 승-패-무 | 평균 시간 | 최악의 상대 (승률) | 최고의 상대 (승률) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 표준 병영 업그레이드 없음 `std2_noBarracksUp` | 77.1% | 73–81% | 395-116-1 | 7.6분 | std2_mix_3L (56%) | std2_mix_1L (100%) |
| 2 | 표준 + 병영 업그레이드 집중 `std2_barracksFocus` | 69.3% | 65–73% | 355-120-37 | 8.8분 | std2_mix_4L_def1 (19%) | std2_mix_1L (100%) |
| 3 | 표준 + 성 업그레이드 집중 `std2_castleFocus` | 68.8% | 65–73% | 352-140-20 | 8.4분 | std2_noBarracksUp (13%) | rush1_ant_1L (100%) |
| 4 | 표준 성 업그레이드 없음 `std2_noCastle` | 67.8% | 64–72% | 347-165-0 | 7.5분 | std2_t2only (25%) | rush1_ant_1L (100%) |
| 5 | 표준 혼합 + 디펜스2/레인 `std2_mix_4L_def2` | 67.0% | 63–71% | 343-137-32 | 8.6분 | std2_noBarracksUp (25%) | ecoOnly12 (100%) |
| 6 | 표준 혼합 + 포탑1/레인 `std2_mix_4L_turret` | 67.0% | 63–71% | 343-136-33 | 8.9분 | std2_castleFocus (25%) | rush1_ant_1L (100%) |
| 7 | 표준 혼합 + 디펜스1/레인 `std2_mix_4L_def1` | 66.4% | 62–70% | 340-123-49 | 9.4분 | std2_t2only (19%) | std2_mix_1L (100%) |
| 8 | 표준 T2까지만 해금 `std2_t2only` | 66.2% | 62–70% | 339-130-43 | 9.1분 | std2_castleFocus (13%) | eco3_mix_4L_react (100%) |
| 9 | 표준(농장2) 혼합 4레인 `std2_mix_4L` | 66.0% | 62–70% | 338-140-34 | 8.6분 | std2_mix_4L_def1 (25%) | wallFirst_rush (100%) |
| 10 | 표준 개미 4레인 `std2_ant_4L` | 66.0% | 62–70% | 338-161-13 | 8.9분 | std2_mix_4L_turret (25%) | wallFirst_rush (100%) |
| 11 | 표준 혼합 + 가시덤불1/레인 `std2_mix_4L_wall` | 65.6% | 61–70% | 336-147-29 | 8.3분 | std2_t2only (25%) | wallFirst_rush (100%) |
| 12 | 표준 혼합 3레인 `std2_mix_3L` | 65.4% | 61–69% | 335-177-0 | 7.9분 | std2_ant_4L (25%) | ecoOnly12 (100%) |
| 13 | 표준 T1만 (해금 없음) `std2_noUnlock` | 61.7% | 57–66% | 316-196-0 | 7.2분 | std2_barracksFocus (19%) | ecoOnly12 (100%) |
| 14 | 러시(농장1) 혼합 4레인 `rush1_mix_4L` | 60.9% | 57–65% | 312-200-0 | 7.7분 | std2_mix_4L (25%) | ecoOnly12 (100%) |
| 15 | 표준 혼합 2레인 `std2_mix_2L` | 58.6% | 54–63% | 300-212-0 | 8.0분 | rush1_mix_4L (13%) | defenseOnly (100%) |
| 16 | 표준 혼합 반응형 `std2_mix_4L_react` | 58.6% | 54–63% | 300-195-17 | 8.2분 | std2_barracksFocus (19%) | ecoOnly12 (100%) |
| 17 | 표준 딱정벌레 4레인 `std2_beetle_4L` | 58.0% | 54–62% | 297-204-11 | 8.8분 | eco3_beetle_4L (13%) | rush1_ant_1L (100%) |
| 18 | 경제(농장3) 혼합 4레인 `eco3_mix_4L` | 57.2% | 53–61% | 293-213-6 | 7.0분 | eco3_beetle_4L (19%) | rush1_ant_1L (100%) |
| 19 | 꿀단지 경제(농장3) `honey_eco` | 56.6% | 52–61% | 290-212-10 | 7.0분 | std2_noCastle (19%) | turtle3_def2 (100%) |
| 20 | 러시(농장1) 혼합 2레인 `rush1_mix_2L` | 55.7% | 51–60% | 285-223-4 | 8.0분 | std2_t2only (19%) | turtle3_def2 (100%) |
| 21 | 경제 딱정벌레 4레인 `eco3_beetle_4L` | 50.0% | 46–54% | 256-245-11 | 8.3분 | std2_noBarracksUp (13%) | rush1_ant_1L (100%) |
| 22 | 표준 사마귀 4레인 `std2_mantis_4L` | 47.3% | 43–52% | 242-270-0 | 7.6분 | std2_castleFocus (13%) | std2_mix_1L (100%) |
| 23 | 러시 사마귀 2레인 `rush1_mantis_2L` | 41.0% | 37–45% | 210-302-0 | 8.0분 | std2_mix_4L_def1 (0%) | turtle3_def2 (100%) |
| 24 | 러시 혼합 2레인 반응형 `rush1_mix_2L_react` | 40.6% | 36–45% | 208-300-4 | 8.3분 | std2_mix_4L_def1 (0%) | turtle3_def2 (100%) |
| 25 | 경제 혼합 반응형 `eco3_mix_4L_react` | 37.5% | 33–42% | 192-312-8 | 7.1분 | std2_mix_4L (0%) | ecoOnly12 (100%) |
| 26 | 러시 딱정벌레 2레인 `rush1_beetle_2L` | 30.7% | 27–35% | 157-355-0 | 9.2분 | std2_noUnlock (0%) | ecoOnly12 (100%) |
| 27 | 탐욕(농장5) 혼합 4레인 `greedy5_mix_4L` | 28.7% | 25–33% | 147-365-0 | 6.7분 | std2_beetle_4L (0%) | std2_mix_1L (100%) |
| 28 | 러시 개미 1레인 올인 `rush1_ant_1L` | 16.8% | 14–20% | 86-422-4 | 8.6분 | eco3_mix_4L (0%) | turtle3_def2 (100%) |
| 29 | 표준 혼합 1레인 올인 `std2_mix_1L` | 16.2% | 13–20% | 83-425-4 | 8.4분 | greedy5_mix_4L (0%) | turtle3_def2 (100%) |
| 30 | 경제 올인(농장12) `ecoOnly12` | 9.6% | 7–12% | 49-463-0 | 6.3분 | rush1_mix_4L (0%) | defenseOnly (100%) |
| 31 | 벽 먼저 → 러시 `wallFirst_rush` | 9.2% | 7–12% | 47-465-0 | 6.9분 | std2_mix_4L (0%) | defenseOnly (100%) |
| 32 | 터틀(농장3→디펜스2→병영) `turtle3_def2` | 6.3% | 4–9% | 32-480-0 | 7.0분 | rush1_mix_2L (0%) | defenseOnly (100%) |
| 33 | 디펜스 올인 `defenseOnly` | 0.0% | 0–1% | 0-512-0 | 6.9분 | rush1_mix_4L (0%) | rush1_mix_4L (0%) |

## 상위 8개 상호 승률 (행 기준 승률 %)

| | `std2_noBarracksUp` | `std2_barracksFocus` | `std2_castleFocus` | `std2_noCastle` | `std2_mix_4L_def2` | `std2_mix_4L_turret` | `std2_mix_4L_def1` | `std2_t2only` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `std2_noBarracksUp` | — | 56 | 81 | 63 | 75 | 75 | 63 | 75 |
| `std2_barracksFocus` | 44 | — | 44 | 56 | 44 | 25 | 19 | 44 |
| `std2_castleFocus` | 13 | 44 | — | 56 | 50 | 44 | 50 | 38 |
| `std2_noCastle` | 38 | 44 | 44 | — | 31 | 50 | 44 | 25 |
| `std2_mix_4L_def2` | 25 | 44 | 50 | 69 | — | 38 | 31 | 25 |
| `std2_mix_4L_turret` | 25 | 25 | 25 | 50 | 38 | — | 38 | 44 |
| `std2_mix_4L_def1` | 38 | 19 | 44 | 56 | 31 | 38 | — | 19 |
| `std2_t2only` | 25 | 44 | 13 | 75 | 25 | 44 | 19 | — |

실행 시간 1064s
