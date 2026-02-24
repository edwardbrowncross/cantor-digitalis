import { VowelTable } from "cantor-digitalis";

/**
 * British English vowel table.
 * taken from recordings of the author
 */
export const englishVowelTable: VowelTable = {
  vowels: [
    {
      ipa: "ɪ",
      h: 0.95,
      v: 0.2,
      formants: [
        { frequency: 373.4, amplitude: -10, bandwidth: 55.1 },
        { frequency: 2212.7, amplitude: -10, bandwidth: 150 },
        { frequency: 2790.1, amplitude: -15, bandwidth: 150 },
        { frequency: 3477.6, amplitude: -15, bandwidth: 300 },
        { frequency: 5172.7, amplitude: -20, bandwidth: 300 },
        { frequency: 6955.2, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: 2,
    },
    {
      // 598.9	222.1	1631.1	478.5	2546.9	359.7	3880.0	1255.9	4055.2	917.0
      ipa: "e",
      h: 0.55,
      v: 0.75,
      formants: [
        { frequency: 598.9, amplitude: -10, bandwidth: 150 },
        { frequency: 1631.1, amplitude: -10, bandwidth: 150 },
        { frequency: 2546.9, amplitude: -15, bandwidth: 150 },
        { frequency: 3880.0, amplitude: -15, bandwidth: 300 },
        { frequency: 4055.2, amplitude: -20, bandwidth: 300 },
        { frequency: 7760.0, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: 0,
    },
    {
      // 691.2	303.6	1061.3	380.2	2676.8	178.2	3628.0	555.0	4855.3	612.9
      ipa: "ɑː",
      h: 0.2,
      v: 0.95,
      formants: [
        { frequency: 691.2, amplitude: -10, bandwidth: 150 },
        { frequency: 1061.3, amplitude: -10, bandwidth: 150 },
        { frequency: 2676.8, amplitude: -15, bandwidth: 150 },
        { frequency: 3628.0, amplitude: -15, bandwidth: 300 },
        { frequency: 4855.3, amplitude: -20, bandwidth: 300 },
        { frequency: 7256.0, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: 0,
    },
    {
      // 456.7	192.2	968.8	116.5	2746.0	184.2	3359.2	662.8	4265.8	543.2
      ipa: "ʊ",
      h: 0.1,
      v: 0.4,
      formants: [
        { frequency: 456.7, amplitude: -10, bandwidth: 150 },
        { frequency: 968.8, amplitude: -10, bandwidth: 150 },
        { frequency: 2746.0, amplitude: -15, bandwidth: 150 },
        { frequency: 3359.2, amplitude: -15, bandwidth: 300 },
        { frequency: 4265.8, amplitude: -20, bandwidth: 300 },
        { frequency: 6718.4, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: -1,
    },
    {
      // 1.0	0.0002	5	301.5	88.1	1149.6	246.0	2482.0	411.3	3700.3	530.6	4511.2	406.0
      ipa: "uː",
      h: 0.25,
      v: 0,
      formants: [
        { frequency: 301.5, amplitude: -10, bandwidth: 88.1 },
        { frequency: 1149.6, amplitude: -10, bandwidth: 150 },
        { frequency: 2482.0, amplitude: -15, bandwidth: 150 },
        { frequency: 3700.3, amplitude: -15, bandwidth: 300 },
        { frequency: 4511.2, amplitude: -20, bandwidth: 300 },
        { frequency: 7400.6, amplitude: -20, bandwidth: 150 },
      ],
      volumeAdjustment: 0,
    },
  ],
  idwPower: 2,
  sourceVocalTractSize: 0.28,
};