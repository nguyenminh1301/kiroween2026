export interface AnomalyText {
  id: string
  seen: string
  real: string
  source: string
}

/** The anomalies, in Archive order. The sandbox id test-box is not listed. */
export const ANOMALIES: AnomalyText[] = [
  {
    id: 'impostor-capcom',
    seen: 'Houston called in the dark corridor and asked how many were aboard. The corridor and the creature were a dream.',
    real: 'Behind the Moon the spacecraft had no radio contact with Earth at all, roughly 45 to 48 minutes on each orbit.',
    source: 'https://www.nasa.gov/history/afj/ap11fj/index.html',
  },
  {
    id: 'burn-baby-burn',
    seen: 'The ascent engine fired straight down into the descent stage, with it on top.',
    real: 'The lunar module used its descent stage as a launch pad: the ascent engine fired down onto it. The AGC routine that ignited the engines is named BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.',
    source: 'https://github.com/chrislgarry/Apollo-11/blob/master/Luminary099/BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.agc',
  },
]
