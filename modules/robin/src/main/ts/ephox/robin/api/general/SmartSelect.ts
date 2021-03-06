import { Universe } from '@ephox/boss';
import { Option } from '@ephox/katamari';
import { WordRange } from '../../data/WordRange';
import Selection from '../../smartselect/Selection';

// The optimise parameter is no longer required in this API.
// Remove optimise as a code quality task: TBIO-4356
type WordFn = <E, D>(universe: Universe<E, D>, item: E, offset: number, optimise?: any) => Option<WordRange<E>>;
const word: WordFn = Selection.word;

export default {
  word
};