import {
  Button,
  Card,
  List,
  Paper,
  Stepper,
  Text,
  Title,
  createTheme,
} from "@mantine/core";
import classes from "./PixelTheme.module.css";

export const theme = createTheme({
  fontFamily: '"VCR OSD Mono", monospace',
  headings: {
    fontFamily: '"Upheaval Pro", sans-serif',
  },
  components: {
    Title: Title.extend({
      classNames: {
        root: classes.title,
      },
    }),
    Text: Text.extend({
      classNames: {
        root: classes.copy,
      },
    }),
    List: List.extend({
      classNames: {
        root: classes.copy,
      },
    }),
    Card: Card.extend({
      classNames: {
        root: classes.card,
      },
    }),
    Paper: Paper.extend({
      classNames: {
        root: classes.card,
      },
    }),
    Button: Button.extend({
      styles: {
        root: {
          fontFamily: '"Upheaval Pro", sans-serif',
        },
      },
      classNames: {
        root: classes.button,
      },
    }),
    Stepper: Stepper.extend({
      styles: {
        stepIcon: {
          fontFamily: '"Upheaval Pro", sans-serif',
        },
      },
      classNames: {
        root: classes.stepperRoot,
        stepLabel: classes.stepperStepLabel,
        separator: classes.stepperSeparator,
        stepIcon: classes.stepperStepIcon,
        stepCompletedIcon: classes.stepperStepCompletedIcon,
      },
    }),
  },
});
