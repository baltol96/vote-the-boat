import ReactWordcloud from 'react-wordcloud';

interface Word {
  text: string;
  value: number;
}

interface Props {
  words: Word[];
  getWordColor: (word: Word) => string;
}

const OPTIONS = {
  rotations: 2,
  rotationAngles: [0, 0] as [number, number],
  fontSizes: [13, 52] as [number, number],
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  fontWeight: 'bold',
  padding: 4,
  spiral: 'archimedean' as const,
  enableTooltip: false,
  deterministic: true,
};

export default function WordCloudChart({ words, getWordColor }: Props) {
  return (
    <ReactWordcloud
      words={words}
      options={OPTIONS}
      callbacks={{ getWordColor }}
    />
  );
}
