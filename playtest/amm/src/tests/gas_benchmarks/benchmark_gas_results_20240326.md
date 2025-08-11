# Benchmark cases

| #   | Action                                                               | Before | Gross  |
| --- | -------------------------------------------------------------------- | ------ | ------ |
| 1   | Create market                                                        | 34738  | 41421  |
| 2   | Add liquidity at previously uninitialised limit                      | 54041  | 64492  |
| 3   | Add liquidity at previously initialised limit                        | 56269  | 56631  |
| 4   | Add liquidity at prev. initialised lower + uninitialised upper limit | 56269  | 61051  |
| 5   | Remove partial liquidity from position (no fees)                     | 63301  | 63658  |
| 6   | Remove all liquidity from position (no fees)                         | 63301  | 59376  |
| 7   | Remove all liquidity from position (with fees)                       | 65447  | 62625  |
| 8   | Collect fees from position                                           | 58416  | 59650  |
| 9   | Swap with zero liquidity                                             | 41421  | 41514  |
| 10  | Swap within 1 tick                                                   | 56269  | 58425  |
| 11  | Swap with 1 tick crossed                                             | 64482  | 68225  |
| 12  | Swap with 2 ticks crossed                                            | 64482  | 69418  |
| 13  | Swap with 4 ticks crossed                                            | 72726  | 80425  |
| 14  | Swap with 4 ticks crossed (wide interval)                            | 75003  | 82814  |
| 15  | Swap with 6 ticks crossed                                            | 80973  | 91467  |
| 16  | Swap with 6 ticks crossed (wide interval)                            | 83217  | 93799  |
| 17  | Swap with 10 ticks crossed                                           | 97451  | 113496 |
| 18  | Swap with 10 ticks crossed (wide interval)                           | 99651  | 115765 |
| 19  | Swap with 20 ticks crossed                                           | 128401 | 158045 |
| 20  | Swap with 20 ticks crossed (wide interval)                           | 138873 | 171319 |
| 21  | Swap across a limit order, partial fill (cross 1 tick)               | 56247  | 60826  |
| 22  | Swap across a limit order, full fill (cross 1 tick)                  | 56247  | 58525  |
| 23  | Create limit order                                                   | 41421  | 56247  |
| 24  | Collect unfilled limit order                                         | 56247  | 49090  |
| 25  | Collect partially filled limit order                                 | 60826  | 52584  |
| 26  | Collect fully filled limit order                                     | 58525  | 54371  |
| 27  | Swap within a tick with strategy enabled, no position updates        | 103255 | 105074 |
| 28  | Swap within a tick with strategy enabled, one position update        | 103258 | 108798 |
| 29  | Swap within a tick with strategy enabled, both position updates      | 103258 | 114770 |

### Raw data

1. Create market
   1. Before: 34738
   2. Gross: 41421
   3. Net:
2. Add liquidity at previously uninitialised limit
   1. Before: 54041
   2. Gross: 64492
   3. Net:
3. Add liquidity at previously initialised limit
   1. Before: 56269
   2. Gross: 56631
   3. Net:
4. Add liquidity at prev. initialised lower + uninitialised upper limit
   1. Before: 56269
   2. Gross: 61051
   3. Net:
5. Remove partial liquidity from position (no fees)
   1. Before: 63301
   2. Gross: 63658
   3. Net:
6. Remove all liquidity from position (no fees)
   1. Before: 63301
   2. Gross: 59376
   3. Net:
7. Remove all liquidity from position (with fees)
   1. Before: 65447
   2. Gross: 62625
   3. Net:
8. Collect fees from position
   1. Before: 58416
   2. Gross: 59650
   3. Net:
9. Swap with zero liquidity
   1. Before: 41421
   2. Gross: 41514
   3. Net:
10. Swap within 1 tick
    1. Before: 56269
    2. Gross: 58425
    3. Net:
11. Swap with 1 tick crossed
    1. Before: 64482
    2. Gross: 68225
    3. Net:
12. Swap with 2 ticks crossed
    1. Before: 64482
    2. Gross: 69418
    3. Net:
13. Swap with 4 ticks crossed
    1. Before: 72726
    2. Gross: 80425
    3. Net:
14. Swap with 4 ticks crossed (wide interval)
    1. Before: 75003
    2. Gross: 82814
    3. Net:
15. Swap with 6 ticks crossed
    1. Before: 80973
    2. Gross: 91467
    3. Net:
16. Swap with 6 ticks crossed (wide interval)
    1. Before: 83217
    2. Gross: 93799
    3. Net:
17. Swap with 10 ticks crossed
    1. Before: 97451
    2. Gross: 113496
    3. Net:
18. Swap with 10 ticks crossed (wide interval)
    1. Before: 99651
    2. Gross: 115765
    3. Net:
19. Swap with 20 ticks crossed
    1. Before: 128401
    2. Gross: 158045
    3. Net:
20. Swap with 20 ticks crossed (wide interval)
    1. Before: 138873
    2. Gross: 171319
    3. Net:
21. Swap across a limit order, partial fill (cross 1 tick)
    1. Before: 56247
    2. Gross: 60826
    3. Net:
22. Swap across a limit order, full fill (cross 1 tick)
    1. Before: 56247
    2. Gross: 58525
    3. Net:
23. Create limit order
    1. Before: 41421
    2. Gross: 56247
    3. Net:
24. Collect unfilled limit order
    1. Before: 56247
    2. Gross: 49090
    3. Net:
25. Collect partially filled limit order
    1. Before: 60826
    2. Gross: 52584
    3. Net:
26. Collect fully filled limit order
    1. Before: 58525
    2. Gross: 54371
    3. Net:
27. Swap within a tick with strategy enabled, no position updates
    1. Before: 103255
    2. Gross: 105074
    3. Net:
28. Swap within a tick with strategy enabled, one position update
    1. Before: 103258
    2. Gross: 108798
    3. Net:
29. Swap within a tick with strategy enabled, both position updates
    1. Before: 103258
    2. Gross: 114770
    3. Net:
