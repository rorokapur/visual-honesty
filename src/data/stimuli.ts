export interface Stimulus {
  id: string;
  honestImage: string;
  deceptiveImage: string;
}

export const STIMULI_SET: Stimulus[] = [
  {
    id: "test_pair_1",
    honestImage: "/stimuli/test_honest.jpg",
    deceptiveImage: "/stimuli/test_deceptive.jpg",
  },
];
