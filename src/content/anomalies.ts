export interface AnomalyText {
  id: string
  seen: string
  real: string
  source: string
}

/** The anomalies, in Archive order. The sandbox id test-box is not listed. */
export const ANOMALIES: AnomalyText[] = [
  {
    id: 'tunnel-longer',
    seen: 'The tunnel back to the command module was longer than the tunnel out.',
    real: 'The real docking tunnel between the command module and the lunar module was short, about 80 cm across.',
    source: 'https://www.nasa.gov/history/afj/ap11fj/index.html',
  },
  {
    id: 'fourth-sleeper',
    seen: 'Three of you went to sleep. In the dark there were four rhythms of breathing, not three.',
    real: 'Apollo 11 crew members reported light flashes with their eyes closed, later linked to cosmic rays passing through the eye.',
    source: 'https://ntrs.nasa.gov/citations/19740020361',
  },
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
