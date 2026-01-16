export interface Stimulus {
  /**
   * Unique identifier for this stimulus pair.
   * Used to link resposnes to images in the dataset.
   */
  id: string;

  /**
   * URL of the honest image in this pair
   */
  honestImage: string;

  /**
   * URL of the deceptive image in this pair
   */
  deceptiveImage: string;
}

/**
 * Hard coded set of all stimuli for this experiment.
 */
export const STIMULI_SET: Stimulus[] = [
  {
    id: "test_pair_1",
    honestImage: "/stimuli/test_honest.png",
    deceptiveImage: "/stimuli/test_deceptive.png ",
  },
  {
    id: "test_pair_2",
    honestImage: "/stimuli/test_honest.png",
    deceptiveImage: "/stimuli/test_deceptive.png ",
  },
  {
    id: "test_pair_3",
    honestImage: "/stimuli/test_honest.png",
    deceptiveImage: "/stimuli/test_deceptive.png ",
  },
  {
    id: "test_pair_4",
    honestImage: "/stimuli/test_honest.png",
    deceptiveImage: "/stimuli/test_deceptive.png ",
  },
  {
    id: "test_pair_5",
    honestImage: "/stimuli/test_honest.png",
    deceptiveImage: "/stimuli/test_deceptive.png ",
  },
];
