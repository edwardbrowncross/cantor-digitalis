import { VowelTable } from "cantor-digitalis";

/**
 * British English vowel table.
 * taken from recordings of the author
 */
export const englishVowelTable: VowelTable = {
  vowels: [
    {
      ipa: "iː",
      h: 1,
      v: 0,
      formants: [
        { frequency: 308.6, amplitude: -10, bandwidth: 35.2 },
        { frequency: 2269.3, amplitude: -10, bandwidth: 281.6 },
        { frequency: 2619.8, amplitude: -15, bandwidth: 314.2 },
        { frequency: 3250.8, amplitude: -15, bandwidth: 239.5 },
        { frequency: 4628.3, amplitude: -20, bandwidth: 471.9 },
        { frequency: 6501.6, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: 0,
    },
    {
      ipa: "ɪ",
      h: 0.95,
      v: 0.2,
      formants: [
        { frequency: 373.4, amplitude: -10, bandwidth: 55.1 },
        { frequency: 2212.7, amplitude: -10, bandwidth: 146.1 },
        { frequency: 2790.1, amplitude: -15, bandwidth: 260.0 },
        { frequency: 3477.6, amplitude: -15, bandwidth: 225.6 },
        { frequency: 5172.7, amplitude: -20, bandwidth: 3646.1 },
        { frequency: 6955.2, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: 0,
    },
    {
      // 598.9	222.1	1631.1	478.5	2546.9	359.7	3880.0	1255.9	4055.2	917.0
      ipa: "e",
      h: 0.55,
      v: 0.75,
      formants: [
        { frequency: 598.9, amplitude: -10, bandwidth: 222.1 },
        { frequency: 1631.1, amplitude: -10, bandwidth: 478.5 },
        { frequency: 2546.9, amplitude: -15, bandwidth: 359.7 },
        { frequency: 3880.0, amplitude: -15, bandwidth: 1255.9 },
        { frequency: 4055.2, amplitude: -20, bandwidth: 917.0 },
        { frequency: 7760.0, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: -5,
    },
    {
      // 672.9	268.3	1227.9	113.4	2765.2	194.8	3146.2	1945.8	4386.8	233.0
      ipa: "æ",
      h: 0.3,
      v: 0.95,
      formants: [
        { frequency: 672.9, amplitude: -10, bandwidth: 268.3 },
        { frequency: 1227.9, amplitude: -10, bandwidth: 113.4 },
        { frequency: 2765.2, amplitude: -15, bandwidth: 194.8 },
        { frequency: 3146.2, amplitude: -15, bandwidth: 1945.8 },
        { frequency: 4386.8, amplitude: -20, bandwidth: 233.0 },
        { frequency: 6292.4, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: -3
    },
    {
      // 691.2	303.6	1061.3	380.2	2676.8	178.2	3628.0	555.0	4855.3	612.9
      ipa: "ɑː",
      h: 0.2,
      v: 0.95,
      formants: [
        { frequency: 691.2, amplitude: -10, bandwidth: 303.6 },
        { frequency: 1061.3, amplitude: -10, bandwidth: 380.2 },
        { frequency: 2676.8, amplitude: -15, bandwidth: 178.2 },
        { frequency: 3628.0, amplitude: -15, bandwidth: 555.0 },
        { frequency: 4855.3, amplitude: -20, bandwidth: 612.9 },
        { frequency: 7256.0, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: -4,
    },
    {
      // 638.7	265.5	919.2	89.6	2729.1	127.3	3412.3	216.8	4324.2	287.3
      ipa: "ɒ",
      h: 0.05,
      v: 0.85,
      formants: [
        { frequency: 638.7, amplitude: -10, bandwidth: 265.5 },
        { frequency: 919.2, amplitude: -10, bandwidth: 89.6 },
        { frequency: 2729.1, amplitude: -15, bandwidth: 127.3 },
        { frequency: 3412.3, amplitude: -15, bandwidth: 216.8 },
        { frequency: 4324.2, amplitude: -20, bandwidth: 287.3 },
        { frequency: 6824.6, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: -1,
    },
    {
      // 444.2	647.2	822.1	142.5	2640.6	88.5	3355.0	188.4	4281.6	59.5
      ipa: "ɔː",
      h: 0,
      v: 0.35,
      formants: [
        { frequency: 444.2, amplitude: -15, bandwidth: 647.2 },
        { frequency: 822.1, amplitude: -5, bandwidth: 142.5 },
        { frequency: 2640.6, amplitude: -15, bandwidth: 88.5 },
        { frequency: 3355.0, amplitude: -15, bandwidth: 188.4 },
        { frequency: 4281.6, amplitude: -20, bandwidth: 59.5 },
        { frequency: 6543.4, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: -4,
    },
    {
      // 456.7	192.2	968.8	116.5	2746.0	184.2	3359.2	662.8	4265.8	543.2
      ipa: "ʊ",
      h: 0.1,
      v: 0.4,
      formants: [
        { frequency: 456.7, amplitude: -10, bandwidth: 192.2 },
        { frequency: 968.8, amplitude: -10, bandwidth: 116.5 },
        { frequency: 2746.0, amplitude: -15, bandwidth: 184.2 },
        { frequency: 3359.2, amplitude: -15, bandwidth: 662.8 },
        { frequency: 4265.8, amplitude: -20, bandwidth: 543.2 },
        { frequency: 6718.4, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: -3,
    },
    {
      // 1.0	0.0002	5	301.5	88.1	1149.6	246.0	2482.0	411.3	3700.3	530.6	4511.2	406.0
      ipa: "uː",
      h: 0.25,
      v: 0,
      formants: [
        { frequency: 301.5, amplitude: -10, bandwidth: 88.1 },
        { frequency: 1149.6, amplitude: -10, bandwidth: 246.0 },
        { frequency: 2482.0, amplitude: -15, bandwidth: 411.3 },
        { frequency: 3700.3, amplitude: -15, bandwidth: 530.6 },
        { frequency: 4511.2, amplitude: -20, bandwidth: 406.0 },
        { frequency: 7400.6, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: -4,
    },
    {
      // 495.2	66.2	1333.8	198.2	2468.8	209.8	3175.4	77.8	4673.3	825.3
      ipa: "ɜː",
      h: 0.35, // central
      v: 0.5, // mid
      formants: [
        { frequency: 495.2, amplitude: -10, bandwidth: 66.2 },
        { frequency: 1333.8, amplitude: -10, bandwidth: 198.2 },
        { frequency: 2468.8, amplitude: -15, bandwidth: 209.8 },
        { frequency: 3175.4, amplitude: -15, bandwidth: 77.8 },
        { frequency: 4673.3, amplitude: -20, bandwidth: 825.3 },
        { frequency: 6350.8, amplitude: -20, bandwidth: 150 },
      ],
    },
  ],
  idwPower: 2,
};